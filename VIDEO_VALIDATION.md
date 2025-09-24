# How to Validate and Fix Videos for the API

The external API is sensitive to the video encoding profile. The error "Invalid video type" can occur if the video is not encoded with the correct H.264 profile.

This guide provides steps to check your videos and fix them by re-encoding them to the **H.264 High Profile**.

## Step 1: Check a Video File's Profile

You can use `ffprobe` to inspect a video file and see its encoding profile.

### Commands to Check Your Videos

**Working Video (High Profile):**
```bash
ffprobe -v quiet -print_format json -show_streams ./1.mp4
```

**Broken Videos (likely Baseline Profile):**
```bash
ffprobe -v quiet -print_format json -show_streams ./src/assets/wlasl/hello/27172.mp4
```
```bash
ffprobe -v quiet -print_format json -show_streams ./src/assets/wlasl/a/01610.mp4
```

### How to Interpret the Output

In the JSON output for the video stream, look for the `"profile"` field.
-   **Good Video:** `"profile": "High"`
-   **Bad Video:** `"profile": "Baseline"` or something other than "High".

## Step 2: Fix a Video by Re-encoding to H.264 High Profile

If a video does not have the "High" profile, you can fix it using `ffmpeg`.

### Command to Fix a Single Video

This command will re-encode the video to H.264 High Profile. Here is an example for one of the broken videos:

```bash
ffmpeg -i ./src/assets/wlasl/a/01610.mp4 -c:v libopenh264 -profile:v high -c:a copy ./src/assets/wlasl/a/01610_fixed.mp4
```

This will create a new file named `01610_fixed.mp4`.

## Step 3: Batch Process All Videos (Recommended)

This script will re-encode all videos in the `src/assets/wlasl` directory to the H.264 High profile.

**Important:** This will overwrite the original files. Make sure you have a backup if you need one.

```bash
#!/bin/bash

success_count=0
fail_count=0
skipped_count=0
total_count=0

for file in src/assets/wlasl/**/*.mp4; do
  total_count=$((total_count + 1))
  PROFILE=$(ffprobe -v error -select_streams v:0 -show_entries stream=profile -of csv=p=0 "$file")
  if [ "$PROFILE" != "High" ]; then
    echo "Fixing $file (re-encoding to High profile)..."
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
```

This script iterates through all videos, checks their profile, and re-encodes them if they are not already using the "High" profile.

After running this, all your videos should be compliant with the API's requirements.
