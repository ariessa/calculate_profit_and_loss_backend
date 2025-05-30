#!/bin/bash

# Load environment variables from .env file (if it exists)
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

# Split comma-separated DUNE_QUERY_IDS into an array
IFS=',' read -r -a QUERY_ID_ARRAY <<< "$DUNE_QUERY_IDS"

# Function to poll query execution status until it completes or fails
wait_for_completion() {
  local execution_id=$1
  while true; do
    # Get the current status of the query execution
    STATUS=$(curl -s -H "x-dune-api-key: $DUNE_API_KEY" \
      "https://api.dune.com/api/v1/execution/$execution_id/status" \
      | jq -r '.state')

    echo "⏳ Query status: $STATUS"
    if [[ "$STATUS" == "QUERY_STATE_COMPLETED" ]]; then
      break
    elif [[ "$STATUS" == "QUERY_STATE_FAILED" ]]; then
      echo "❌ Query failed!"
      exit 1
    fi

    # Wait before checking again
    sleep 5
  done
}

# Iterate over each query ID from the environment variable
for QUERY_ID in "${QUERY_ID_ARRAY[@]}"; do
  OUTPUT_FILE="query_${QUERY_ID}.csv"
  echo "🚀 Executing query $QUERY_ID..."

  # Trigger execution of the query and get the execution ID
  EXECUTION_ID=$(curl -s -X POST -H "x-dune-api-key: $DUNE_API_KEY" \
    "https://api.dune.com/api/v1/query/$QUERY_ID/execute" \
    | jq -r '.execution_id')

  # If execution ID is null or empty, skip this query
  if [[ "$EXECUTION_ID" == "null" || -z "$EXECUTION_ID" ]]; then
    echo "❌ Failed to start query $QUERY_ID"
    continue
  fi
  
  # Wait until the query execution completes
  wait_for_completion "$EXECUTION_ID"

  # Initialize CSV output
  OFFSET=0
  HEADER_WRITTEN=false

  # Empty the output file before writing
  > "$OUTPUT_FILE"

  # Fetch paginated results until no more rows
  while true; do
    RESPONSE=$(curl -s -H "x-dune-api-key: $DUNE_API_KEY" \
      "https://api.dune.com/api/v1/execution/$EXECUTION_ID/results?limit=$DUNE_QUERY_LIMIT&offset=$OFFSET")

    ROWS=$(echo "$RESPONSE" | jq '.result.rows')
    COUNT=$(echo "$ROWS" | jq 'length')

    if [[ "$COUNT" -eq 0 ]]; then
      echo "✅ Completed fetching for $QUERY_ID"
      break
    fi

    # Write CSV header (only once)
    if [[ "$HEADER_WRITTEN" == false ]]; then
      HEADERS=$(echo "$ROWS" | jq -r '.[0] | keys_unsorted | @csv')
      echo "$HEADERS" >> "$OUTPUT_FILE"
      HEADER_WRITTEN=true
    fi

    # Write rows to the CSV file
    echo "$ROWS" | jq -r '.[] | [.[]] | @csv' >> "$OUTPUT_FILE"

    # Move to the next batch
    OFFSET=$((OFFSET + DUNE_QUERY_LIMIT))
    echo "➡️ Got $COUNT rows (offset $OFFSET) for $QUERY_ID"
  done

  echo "📁 Saved to $OUTPUT_FILE"
done

echo "🎉 All queries complete."
