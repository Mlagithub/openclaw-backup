#!/bin/bash
# Qwen3-TTS 离线部署下载脚本
# 在联网机器上运行

set -e

OFFLINE_DIR="${OFFLINE_DIR:-~/qwen3-tts-offline}"
PYTHON_VER="${PYTHON_VER:-3.12}"

echo "=== Qwen3-TTS 离线包下载 ==="
echo "目标目录: $OFFLINE_DIR"
echo "Python 版本: $PYTHON_VER"

# 创建目录结构
mkdir -p "$OFFLINE_DIR"/{packages,models,code}

# 创建临时虚拟环境
echo "[1/5] 创建临时虚拟环境..."
python3 -m venv "$OFFLINE_DIR/venv-download"
source "$OFFLINE_DIR/venv-download/bin/activate"

# 安装下载工具
pip install -U pip modelscope huggingface_hub

# 下载依赖包（不含 sox，使用 soundfile + librosa 替代）
echo "[2/5] 下载 Python 依赖包..."
pip download -d "$OFFLINE_DIR/packages" \
  transformers==4.57.3 \
  accelerate==1.12.0 \
  gradio \
  librosa \
  torchaudio \
  soundfile \
  onnxruntime \
  einops \
  torch \
  numpy \
  safetensors \
  tokenizers \
  huggingface_hub \
  scipy \
  audioread \
  pydub

# 尝试下载 FlashAttention
echo "[3/5] 下载 FlashAttention..."
pip download -d "$OFFLINE_DIR/packages" flash-attn || \
  echo "FlashAttention 下载失败，离线安装时需要手动编译"

# 下载模型
echo "[4/5] 下载模型文件..."
modelscope download --model Qwen/Qwen3-TTS-Tokenizer-12Hz \
  --local_dir "$OFFLINE_DIR/models/Qwen3-TTS-Tokenizer-12Hz"

modelscope download --model Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice \
  --local_dir "$OFFLINE_DIR/models/Qwen3-TTS-12Hz-1.7B-CustomVoice"

# 下载源代码
echo "[5/5] 下载源代码..."
git clone --depth 1 https://github.com/QwenLM/Qwen3-TTS.git \
  "$OFFLINE_DIR/code/Qwen3-TTS"

# 清理临时环境
deactivate
rm -rf "$OFFLINE_DIR/venv-download"

# 统计大小
echo ""
echo "=== 下载完成 ==="
echo "总大小:"
du -sh "$OFFLINE_DIR"
echo ""
echo "目录结构:"
ls -la "$OFFLINE_DIR"

# 打包提示
echo ""
echo "下一步："
echo "  tar -czvf qwen3-tts-offline.tar.gz -C ~ qwen3-tts-offline"
echo "  然后传输到离线服务器"