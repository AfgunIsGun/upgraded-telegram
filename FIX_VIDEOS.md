# Steps to Fix All Videos in the WLASL Dataset

This guide provides the command to permanently re-encode all videos in the `src/assets/wlasl` directory to a format that is compatible with the external API.

This process will be run **one time** on the command line.

## Step 1: Navigate to the Project Root

Make sure your terminal is in the root directory of the project:

```bash
cd /workspaces/upgraded-telegram
```

## Step 2: Run the Video Fixing Command

Copy and paste the entire command block below into your terminal and press Enter. This command will find every `.mp4` file in your dataset, re-encode it to the correct format, and replace the original file.

This will take a significant amount of time to process all the videos.

```bash
for file in src/assets/wlasl/**/*.mp4; do
  echo "Processing $file..."
  # Use a temporary file to avoid issues with in-place editing
  ffmpeg -i "$file" -vf scale=1282:720 -ar 16000 -ac 1 -c:v libopenh264 -c:a aac "temp_output.mp4" && mv "temp_output.mp4" "$file"
  if [ $? -ne 0 ]; then
    echo "Error processing $file. Aborting."
    exit 1
  fi
done

echo "All videos have been successfully fixed!"
```

## Step 3: Confirm Completion

Once the command finishes and you see the "All videos have been successfully fixed!" message, the process is complete.

Let me know when you have finished, and I will provide the final, simplified code for the application.