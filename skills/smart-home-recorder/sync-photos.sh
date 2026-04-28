#!/bin/bash
# 从 Nextcloud 下载新照片进行分析

NEXTCLOUD_URL="http://192.168.8.4/remote.php/dav/files/one/Photos/phone-capture"
USER="one"
PASS="one"
LOCAL_DIR="/home/one/phone-photos-pending"

mkdir -p "$LOCAL_DIR"

# 获取照片列表并下载
curl -s -u "$USER:$PASS" "$NEXTCLOUD_URL/" | grep -oP 'href="[^"]+\.jpg"' | sed 's/href="//;s/"//' | while read -r href; do
  filename=$(basename "$href")
  if [ ! -f "$LOCAL_DIR/$filename" ]; then
    echo "Downloading: $filename"
    curl -s -u "$USER:$PASS" "$NEXTCLOUD_URL/$filename" -o "$LOCAL_DIR/$filename"
  fi
done

echo "Photos downloaded to: $LOCAL_DIR"
ls -la "$LOCAL_DIR"/*.jpg 2>/dev/null | wc -l
echo "photos ready for analysis"