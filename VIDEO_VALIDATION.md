# How to Validate and Fix Videos for the API

The external API is sensitive to the video encoding profile. The error "Invalid video type" can occur if the video is not encoded with the correct H.264 profile.

This guide provides steps to check your videos and fix them by re-encoding them to the **H.264 High Profile**. These commands are intended to be run on your local machine where `ffmpeg` and `ffprobe` are installed and available in your system's PATH.

## Step 1: Navigate to Your Project Directory

Open a terminal on your local machine and navigate to your project's root directory.

```bash
cd /home/Golgrax/upgraded-telegram/
```

## Step 2: Check a Video File's Profile

You can use `ffprobe` to inspect a video file and see its encoding profile.

### Commands to Check Your Videos

Here are the commands to check the video files you mentioned:

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

## Step 3: Fix a Video by Re-encoding to H.264 High Profile

If a video does not have the "High" profile, you can fix it using `ffmpeg`.

### Command to Fix a Single Video

This command will re-encode the video to H.264 High Profile. Here is an example for one of the broken videos:

```bash
ffmpeg -i ./src/assets/wlasl/a/01610.mp4 -c:v libopenh264 -profile:v high -c:a copy ./src/assets/wlasl/a/01610_fixed.mp4
```

This will create a new file named `01610_fixed.mp4`.

## Step 4: Batch Process All Videos (Recommended)

A script named `fix_videos.sh` has been created in the root of your project to fix all the videos.

**Important:** This script will overwrite the original files. Make sure you have a backup if you need one.

To run the script, simply execute the following command in your terminal from the project root:

```bash
./fix_videos.sh
```

This script will iterate through all videos, checks their profile, and re-encodes them if they are not already using the "High" profile. It will also provide a summary of the process.

After running this, all your videos should be compliant with the API's requirements.
