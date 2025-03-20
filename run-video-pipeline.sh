#!/bin/bash
set -e # Exit on error

# Check if search_term is provided
if [ -z "$1" ]; then
  echo "Error: Please provide a search_term."
  echo "Usage: $0 <search_term> [--start-date <YYYY-MM-DD>] [--end-date <YYYY-MM-DD>]"
  exit 1
fi

SEARCH_TERM="$1"
shift  # Move past the search term

# Parse additional arguments
START_DATE=""
END_DATE=""
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --start-date) START_DATE="$2"; shift ;;
        --end-date) END_DATE="$2"; shift ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

DB_NAME="video_analysis_db"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="postgres"
DB_PORT="5432"
OUTPUT_DIR="analysis_outputs"

# Ensure postgres is running
echo "Starting PostgreSQL..."
docker compose up -d postgres

# Create output directory if it doesn't exist
if [ ! -d "$OUTPUT_DIR" ]; then
  echo "Creating output directory: $OUTPUT_DIR"
  mkdir -p "$OUTPUT_DIR"
fi

# Define dynamic file names based on the search term
METADATA_FILE="$OUTPUT_DIR/${SEARCH_TERM}-metadata.json"
VIDEOIDS_FILE="$OUTPUT_DIR/${SEARCH_TERM}-videoids.json"
TRANSCRIPTS_FILE="$OUTPUT_DIR/${SEARCH_TERM}-transcripts.json"
ANALYSIS_FILE="$OUTPUT_DIR/${SEARCH_TERM}-analysis.json"
SEARCH_CONFIG_FILE="$OUTPUT_DIR/${SEARCH_TERM}-search-config.json"

# Function to check if search_term exists in SearchConfig and extract attributes
check_search_term() {
  echo "Checking if '$SEARCH_TERM' exists in SearchConfig table..."
  RESULT=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -v "search_term=$SEARCH_TERM" -c "SELECT param_id, user_id, search_phrase, search_name, creation_date FROM SearchConfig WHERE search_name = :search_term;" 2>/dev/null)

  if [ -n "$RESULT" ]; then
    echo "Search term '$SEARCH_TERM' found in SearchConfig table:"
    echo "$RESULT" | while read -r line; do
      if [ -n "$line" ]; then
        echo "  - $line"
      fi
    done
    VIDEO_COUNT=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -v "search_term=$SEARCH_TERM" -c "SELECT COUNT(*) FROM videos WHERE search_name = :search_term;" 2>/dev/null)
    echo "Found $VIDEO_COUNT videos with search_name '$SEARCH_TERM' in videos table."
    return 0 # Exists
  else
    echo "Search term '$SEARCH_TERM' not found in SearchConfig table."
    return 1 # Does not exist
  fi
}

# Function to run the full pipeline
run_pipeline() {
  echo "Running full pipeline for '$SEARCH_TERM' from ${START_DATE:-'beginning'} to ${END_DATE:-'now'}..."

  # Create search-config.json
  echo "Generating $SEARCH_CONFIG_FILE..."
  cat > "$SEARCH_CONFIG_FILE" <<EOF
[
  {
    "user_id": "default_user",
    "search_phrase": "$SEARCH_TERM symptoms",
    "search_name": "$SEARCH_TERM"
  }
]
EOF

  # Initialize videoids.json if it doesn't exist
  if [ ! -f "$VIDEOIDS_FILE" ]; then
    echo "Initializing $VIDEOIDS_FILE..."
    echo "[]" > "$VIDEOIDS_FILE"
  fi

  # Step 1: Fetch metadata and store in database
  echo "Running youtube-fetcher.ts..."
  FETCHER_CMD="npx tsx bin/youtube-fetcher.ts --disease \"$SEARCH_TERM\" --output-file \"$METADATA_FILE\" --video-ids-file \"$VIDEOIDS_FILE\""
  [ -n "$START_DATE" ] && FETCHER_CMD="$FETCHER_CMD --start-date \"$START_DATE\""
  [ -n "$END_DATE" ] && FETCHER_CMD="$FETCHER_CMD --end-date \"$END_DATE\""
  docker compose run -T app bash -c "$FETCHER_CMD" </dev/null || { echo "Error in youtube-fetcher.ts"; exit 1; }
  echo "Storing metadata in database..."
  docker compose run -T app npx tsx bin/database-manager.ts --metadata-file "$METADATA_FILE" </dev/null || { echo "Error storing metadata"; exit 1; }

  # Step 2: Fetch transcripts and store in database
  echo "Running transcript-fetcher.ts..."
  docker compose run -T app npx tsx bin/transcript-fetcher.ts --input-file "$VIDEOIDS_FILE" --output-file "$TRANSCRIPTS_FILE" </dev/null || { echo "Error in transcript-fetcher.ts"; exit 1; }
  echo "Storing transcripts in database..."
  docker compose run -T app npx tsx bin/database-manager.ts --transcripts-file "$TRANSCRIPTS_FILE" </dev/null || { echo "Error storing transcripts"; exit 1; }

  # Step 3: Analyze transcripts and store in database
  echo "Running llm-analyzer.ts..."
  docker compose run -T app npx tsx bin/llm-analyzer.ts --input-file "$TRANSCRIPTS_FILE" --output-file "$ANALYSIS_FILE" </dev/null || { echo "Error in llm-analyzer.ts"; exit 1; }
  echo "Storing analysis in database..."
  docker compose run -T app npx tsx bin/database-manager.ts --analysis-file "$ANALYSIS_FILE" </dev/null || { echo "Error storing analysis"; exit 1; }

  # Final step: Store search config
  echo "Storing search config in database..."
  docker compose run -T app npx tsx bin/database-manager.ts --search-config-file "$SEARCH_CONFIG_FILE" </dev/null || { echo "Error storing search config"; exit 1; }

  echo "Pipeline completed. Results stored in database with search_name '$SEARCH_TERM'."
}

# Main logic
if check_search_term && [ -z "$START_DATE" ] && [ -z "$END_DATE" ]; then
  echo "No need to run the pipeline; '$SEARCH_TERM' already exists in SearchConfig and no date range specified."
else
  run_pipeline
fi

echo "Script finished."
# Optional: Shut down
# docker compose down