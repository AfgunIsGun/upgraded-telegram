# Steps to Download and Prune the Kaggle WLASL Dataset

This guide provides the full sequence of commands to download the dataset, reduce it to one video per word, and move it into the project's assets folder.

## Step 1: Set Your Kaggle Credentials

Run this command in your terminal, replacing the placeholders with your credentials from your `kaggle.json` file.

```bash
export KAGGLE_USERNAME="your-username"
export KAGGLE_KEY="your-key"
```

## Step 2: Full Cleanup (If Starting Over)

If you have previous partial downloads, run this first to ensure a clean state.

```bash
rm -rf dataset src/assets/wlasl sign-language-dataset-wlasl-videos.zip
```

## Step 3: Download and Process the Data

Run this entire block of commands. It will download the data, unzip it, prune the extra videos, move the clean files, and delete the temporary large files.

```bash
# 1. Download the 5.47 GB dataset (this will take a long time)
kaggle datasets download -d waseemnagahhenes/sign-language-dataset-wlasl-videos

# 2. Unzip the data
unzip sign-language-dataset-wlasl-videos.zip

# 3. Prune the extra videos from each folder
echo "Cleaning extra videos..."
find dataset/SL -mindepth 1 -maxdepth 1 -type d -print0 | while IFS= read -r -d '' dir; do
  (cd "$dir" && ls | tail -n +2 | xargs -r rm)
done

# 4. Move the clean data into your project
echo "Moving files..."
mkdir -p src/assets/wlasl
mv dataset/SL/* src/assets/wlasl/

# 5. Final cleanup of large files
echo "Final cleanup..."
rm sign-language-dataset-wlasl-videos.zip
rm -rf dataset

echo "Process complete!"
```

Once this is done, the `src/assets/wlasl` directory will contain the pruned dataset, ready for the application to use.
