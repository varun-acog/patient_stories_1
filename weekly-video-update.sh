#!/bin/bash
set -e # Exit on error

# Script for daily updates of video pipeline data
# This script will update all search terms from their creation date to the current date

DB_NAME="video_analysis_db"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="postgres"
DB_PORT="5432"
OUTPUT_DIR="analysis_outputs"

# Log file setup with timestamp to avoid overwriting during testing
LOG_FILE="$OUTPUT_DIR/daily_update_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$OUTPUT_DIR"

# Function to log messages in IST
log() {
    # Set timezone to IST (Asia/Kolkata) for the date command
    TZ='Asia/Kolkata' date '+%Y-%m-%d %H:%M:%S' | while read -r timestamp; do
        echo "[$timestamp] $1" | tee -a "$LOG_FILE"
    done
}

log "Starting daily video pipeline update"

# Ensure postgres is running
log "Starting PostgreSQL..."
docker compose up -d postgres || { log "Failed to start PostgreSQL"; exit 1; }

# Wait for PostgreSQL to be ready
log "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker compose exec postgres pg_isready -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" >/dev/null 2>&1; then
        log "PostgreSQL is ready."
        break
    fi
    log "PostgreSQL not ready yet, waiting... ($i/30)"
    sleep 2
done

if ! docker compose exec postgres pg_isready -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" >/dev/null 2>&1; then
    log "ERROR: PostgreSQL is not ready after 60 seconds."
    exit 1
fi

# Create output directory if it doesn't exist
if [ ! -d "$OUTPUT_DIR" ]; then
    log "Creating output directory: $OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR"
fi

# Function to run the pipeline for a specific search term
run_pipeline() {
    local search_term="$1"
    local start_date="$2"
    local end_date="$3"
    
    log "Running pipeline for '$search_term' from $start_date to $end_date..."

    # Define dynamic file names based on the search term
    METADATA_FILE="$OUTPUT_DIR/${search_term}-metadata.json"
    VIDEOIDS_FILE="$OUTPUT_DIR/${search_term}-videoids.json"
    TRANSCRIPTS_FILE="$OUTPUT_DIR/${search_term}-transcripts.json"
    ANALYSIS_FILE="$OUTPUT_DIR/${search_term}-analysis.json"
    SEARCH_CONFIG_FILE="$OUTPUT_DIR/${search_term}-search-config.json"

    # Create search-config.json
    log "Generating $SEARCH_CONFIG_FILE..."
    cat > "$SEARCH_CONFIG_FILE" <<EOF
[
  {
    "user_id": "default_user",
    "search_phrase": "$search_term symptoms",
    "search_name": "$search_term"
  }
]
EOF

    # Initialize videoids.json if it doesn't exist
    if [ ! -f "$VIDEOIDS_FILE" ]; then
        log "Initializing $VIDEOIDS_FILE..."
        echo "[]" > "$VIDEOIDS_FILE"
    fi

    # Step 1: Fetch metadata and store in database
    log "Running youtube-fetcher.ts..."
    FETCHER_CMD="npx tsx bin/youtube-fetcher.ts --disease \"$search_term\" --output-file \"$METADATA_FILE\" --video-ids-file \"$VIDEOIDS_FILE\" --start-date \"$start_date\" --end-date \"$end_date\""
    if ! docker compose run -T app bash -c "$FETCHER_CMD" </dev/null 2> "$OUTPUT_DIR/youtube-fetcher-error.log"; then
        log "Error in youtube-fetcher.ts. Check $OUTPUT_DIR/youtube-fetcher-error.log for details."
        cat "$OUTPUT_DIR/youtube-fetcher-error.log" | while IFS= read -r line; do
            log "youtube-fetcher.ts error: $line"
        done
        return 1
    fi

    # Check if any new videos were found
    if [ -s "$METADATA_FILE" ]; then
        VIDEO_COUNT=$(jq '. | length' "$METADATA_FILE" 2>/dev/null || echo 0)
        if [ "$VIDEO_COUNT" -eq 0 ]; then
            log "No new videos found for '$search_term' in the timeline $start_date to $end_date."
            # Skip further steps since there are no videos to process
            log "Skipping transcript fetching, analysis, and database storage for '$search_term'."
            return 0
        else
            log "Found $VIDEO_COUNT new videos for '$search_term' in the timeline $start_date to $end_date."
        fi
    else
        log "Metadata file $METADATA_FILE is empty or not created for '$search_term'."
        return 1
    fi

    log "Storing metadata in database..."
    if ! docker compose run -T app npx tsx bin/database-manager.ts --metadata-file "$METADATA_FILE" </dev/null 2> "$OUTPUT_DIR/database-manager-error.log"; then
        log "Error storing metadata. Check $OUTPUT_DIR/database-manager-error.log for details."
        cat "$OUTPUT_DIR/database-manager-error.log" | while IFS= read -r line; do
            log "database-manager.ts error: $line"
        done
        return 1
    fi

    # Step 2: Fetch transcripts and store in database
    log "Running transcript-fetcher.ts..."
    if ! docker compose run -T app npx tsx bin/transcript-fetcher.ts --input-file "$VIDEOIDS_FILE" --output-file "$TRANSCRIPTS_FILE" </dev/null 2> "$OUTPUT_DIR/transcript-fetcher-error.log"; then
        log "Error in transcript-fetcher.ts. Check $OUTPUT_DIR/transcript-fetcher-error.log for details."
        cat "$OUTPUT_DIR/transcript-fetcher-error.log" | while IFS= read -r line; do
            log "transcript-fetcher.ts error: $line"
        done
        return 1
    fi
    
    log "Storing transcripts in database..."
    if ! docker compose run -T app npx tsx bin/database-manager.ts --transcripts-file "$TRANSCRIPTS_FILE" </dev/null 2> "$OUTPUT_DIR/database-manager-error.log"; then
        log "Error storing transcripts. Check $OUTPUT_DIR/database-manager-error.log for details."
        cat "$OUTPUT_DIR/database-manager-error.log" | while IFS= read -r line; do
            log "database-manager.ts error: $line"
        done
        return 1
    fi

    # Step 3: Analyze transcripts and store in database
    log "Running llm-analyzer.ts..."
    if ! docker compose run -T app npx tsx bin/llm-analyzer.ts --input-file "$TRANSCRIPTS_FILE" --output-file "$ANALYSIS_FILE" </dev/null 2> "$OUTPUT_DIR/llm-analyzer-error.log"; then
        log "Error in llm-analyzer.ts. Check $OUTPUT_DIR/llm-analyzer-error.log for details."
        cat "$OUTPUT_DIR/llm-analyzer-error.log" | while IFS= read -r line; do
            log "llm-analyzer.ts error: $line"
        done
        return 1
    fi
    
    log "Storing analysis in database..."
    if ! docker compose run -T app npx tsx bin/database-manager.ts --analysis-file "$ANALYSIS_FILE" </dev/null 2> "$OUTPUT_DIR/database-manager-error.log"; then
        log "Error storing analysis. Check $OUTPUT_DIR/database-manager-error.log for details."
        cat "$OUTPUT_DIR/database-manager-error.log" | while IFS= read -r line; do
            log "database-manager.ts error: $line"
        done
        return 1
    fi

    log "Pipeline completed for '$search_term'."
    return 0
}

# Get all search terms and their creation dates
log "Retrieving search terms from database..."
SEARCH_TERMS=$(docker compose exec -T -e PGPASSWORD="$DB_PASSWORD" postgres psql -U "$DB_USER" -d "$DB_NAME" -t -A -F"," -c "SELECT search_name, TO_CHAR(creation_date, 'YYYY-MM-DD') FROM SearchConfig;" 2> "$OUTPUT_DIR/psql-error.log")

if [ $? -ne 0 ]; then
    log "Error retrieving search terms from database. Check $OUTPUT_DIR/psql-error.log for details."
    cat "$OUTPUT_DIR/psql-error.log" | while IFS= read -r line; do
        log "psql error: $line"
    done
    exit 1
fi

if [ -z "$SEARCH_TERMS" ]; then
    log "No search terms found in the database."
    exit 0
fi

# Get today's date
TODAY=$(date +%Y-%m-%d)

# Process each search term
echo "$SEARCH_TERMS" | while IFS=, read -r SEARCH_NAME CREATION_DATE; do
    if [ -n "$SEARCH_NAME" ] && [ -n "$CREATION_DATE" ]; then
        log "Processing search term: $SEARCH_NAME with creation date: $CREATION_DATE"
        
        # Run the pipeline for this search term
        if run_pipeline "$SEARCH_NAME" "$CREATION_DATE" "$TODAY"; then
            log "Successfully updated '$SEARCH_NAME' from $CREATION_DATE to $TODAY"
        else
            log "Failed to update '$SEARCH_NAME'"
        fi
    fi
done

log "Daily video pipeline update completed."