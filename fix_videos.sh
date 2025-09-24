#!/bin/bash

success_count=0
fail_count=0
skipped_count=0
total_count=0

# Navigate to the script's directory to ensure correct relative paths
cd "$(dirname "$0")"

for file in src/assets/wlasl/**/*.mp4; do
  total_count=$((total_count + 1))
  PROFILE=$(ffprobe -v error -select_streams v:0 -show_entries stream=profile -of csv=p=0 "$file")
  if [ "$PROFILE" != "High" ]; then
    echo "Fixing $file (re-encoding to High profile)..."
    # Use a temporary file to avoid issues with in-place editing
    ffmpeg -i "$file" -c:v libopenh264 -profile:v high -c:a copy "temp_output.mp4"
    if [ $? -eq 0 ]; then
      mv "temp_output.mp4" "$file"
      if [ $? -eq 0 ]; then
        echo "Successfully fixed $file"
        success_count=$((success_count + 1))
      else
        echo "Error moving temp file for $file"
        fail_count=$((fail_count + 1))
        rm -f "temp_output.mp4"
      fi
    else
      echo "Error processing $file"
      fail_count=$((fail_count + 1))
      rm -f "temp_output.mp4"
    fi
  else
    echo "Skipping $file (already High profile)."
    skipped_count=$((skipped_count + 1))
  fi
done

echo ""
echo "Video processing complete."
echo "------------------------"
echo "Total videos processed: $total_count"
echo "Successfully fixed: $success_count"
echo "Failed to fix: $fail_count"
echo "Skipped (already High profile): $skipped_count"
