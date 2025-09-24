# How to Validate and Fix Videos for the API

The external API requires videos to have both a video and an audio stream. The error "Invalid video type" can occur if a video file is missing an audio stream, even if it's a valid `.mp4` file.

This guide provides steps to check your videos and fix them by adding a silent audio track if one is missing.

## Step 1: Check a Video File

You can use `ffprobe` (which comes with `ffmpeg`) to inspect a video file and see its streams.

### Command to Check a Video

To check a single video, run the following command, replacing `path/to/your/video.mp4` with the actual path to your video:

```bash
/home/Golgrax/upgraded-telegram/node_modules/ffmpeg-static/ffprobe -v quiet -print_format json -show_streams path/to/your/video.mp4
```

### How to Interpret the Output

-   **Good Video:** The output will be a JSON object with an array of `streams`. A valid video will have at least two entries in the `streams` array: one with `"codec_type": "video"` and another with `"codec_type": "audio"`.
-   **Bad Video:** If the video is missing an audio stream, you will only see a single stream entry with `"codec_type": "video"`.

## Step 2: Fix a Video by Adding a Silent Audio Track

If a video is missing an audio track, you can fix it by adding a silent one using `ffmpeg`.

### Command to Fix a Single Video

This command will create a new video file with a silent audio track.

```bash
/home/Golgrax/upgraded-telegram/node_modules/ffmpeg-static/ffmpeg -i path/to/your/video.mp4 -f lavfi -i anullsrc -c:v copy -c:a aac -shortest path/to/your/fixed_video.mp4
```

Replace `path/to/your/video.mp4` with the path to the broken video, and `path/to/your/fixed_video.mp4` with the desired output path.

## Step 3: Batch Process All Videos (Recommended)

To ensure all videos in the `src/assets/wlasl` directory are valid, you can run a script to check and fix them all. The following command will find all `.mp4` files, check if they have an audio stream, and if not, add a silent one.

**Important:** This will overwrite the original files. Make sure you have a backup if you need one.

```bash
for file in /home/Golgrax/upgraded-telegram/src/assets/wlasl/**/*.mp4; do
  HAS_AUDIO=$(/home/Golgrax/upgraded-telegram/node_modules/ffmpeg-static/ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$file")
  if [ -z "$HAS_AUDIO" ]; then
    echo "Fixing $file (adding silent audio)..."
    /home/Golgrax/upgraded-telegram/node_modules/ffmpeg-static/ffmpeg -i "$file" -f lavfi -i anullsrc -c:v copy -c:a aac -shortest "temp_output.mp4" && mv "temp_output.mp4" "$file"
  else
    echo "Skipping $file (already has audio)."
  fi
done

echo "All videos have been checked and fixed if necessary."
```

This script iterates through all videos. For each video, it checks for an audio stream. If no audio stream is found, it adds a silent AAC audio track and replaces the original video.

After running this, all your videos should be compliant with the API's requirements.