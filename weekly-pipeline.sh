# #!/bin/bash

# # weekly-run-pipeline.sh

# PROJECT_DIR="/home/varun/work/LLM-COE/LLM-Tech/patient_stories_llm/video_analysis"
# DB_USER="postgres"
# DB_NAME="video_analysis_db"
# DB_HOST="postgres"
# DB_PORT="5432"
# LOG_FILE="${PROJECT_DIR}/weekly-run-pipeline.log"

# log() {
#     # Set timezone to IST (Asia/Kolkata) for the date command
#     TZ='Asia/Kolkata' date '+%Y-%m-%d %H:%M:%S' | while read -r timestamp; do
#         echo "$timestamp - $1" >> "$LOG_FILE"
#     done
# }

# cd "$PROJECT_DIR" || { echo "Cannot cd to $PROJECT_DIR"; exit 1; }
# touch "$LOG_FILE" 2>/dev/null || { echo "Cannot create log file. Check permissions in $PROJECT_DIR."; exit 1; }

# log "Starting weekly run pipeline..."

# # Query the SearchConfig table for search terms and creation dates
# CONFIG_DATA=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -t -A -F"," -c "SELECT search_name, creation_date FROM SearchConfig;")

# if [ -z "$CONFIG_DATA" ]; then
#     log "ERROR: No data found in SearchConfig table."
#     exit 1
# fi

# CURRENT_DATE=$(date -I)

# IFS=$'\n'
# for row in $CONFIG_DATA; do
#     SEARCH_NAME=$(echo "$row" | cut -d',' -f1)
#     CREATION_DATE=$(echo "$row" | cut -d',' -f2 | cut -d' ' -f1)

#     log "Processing search_name: $SEARCH_NAME with creation_date: $CREATION_DATE"

#     if ! date -d "$CREATION_DATE" >/dev/null 2>&1 || [ -z "$SEARCH_NAME" ]; then
#         log "ERROR: Invalid creation_date ($CREATION_DATE) or empty search_name for row: $row"
#         continue
#     fi

#     # Use creation_date as the start date and current date as the end date
#     START="$CREATION_DATE"
#     END="$CURRENT_DATE"

#     log "Running pipeline for $SEARCH_NAME to fetch videos from $START to $END..."
#     if "$PROJECT_DIR/run-video-pipeline.sh" "$SEARCH_NAME" --start-date "$START" --end-date "$END" >/dev/null 2>&1; then
#         log "Successfully ran pipeline for $SEARCH_NAME from $START to $END"
#     else
#         log "ERROR: Pipeline failed for $SEARCH_NAME from $START to $END"
#         exit 1
#     fi
# done

# log "Weekly run pipeline completed."