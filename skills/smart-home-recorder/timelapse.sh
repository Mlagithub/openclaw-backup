#!/bin/bash
ANALYZED_DIR="/home/one/phone-photos-analyzed"
OUTPUT_DIR="/home/one/phone-photos-analyzed/timelapse"
DATE=${1:-$(date +%Y-%m-%d)}
mkdir -p "$OUTPUT_DIR"
cd "$ANALYZED_DIR"
COUNT=$(ls *.jpg 2>/dev/null | wc -l)
if [ "$COUNT" -eq 0 ]; then echo "No photos"; exit 0; fi
echo "Creating timelapse from $COUNT photos..."
OUTPUT_FILE="$OUTPUT_DIR/timelapse-$DATE.mp4"
ffmpeg -y -framerate 2 -pattern_type glob -i "*.jpg" -c:v libx264 -pix_fmt yuv420p -s 640x480 "$OUTPUT_FILE" 2>/dev/null
echo "Created: $OUTPUT_FILE"
ls -la "$OUTPUT_FILE"
