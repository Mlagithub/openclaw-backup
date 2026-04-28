#!/bin/bash
# Qwen3-TTS 离线服务器安装脚本
# 在离线服务器上运行

set -e

OFFLINE_DIR="${OFFLINE_DIR:-/opt/qwen3-tts-offline}"

echo "=== Qwen3-TTS 离线安装 ==="
echo "安装目录: $OFFLINE_DIR"

# 检查目录是否存在
if [ ! -d "$OFFLINE_DIR/packages" ]; then
  echo "错误: 请先解压离线包到 $OFFLINE_DIR"
  exit 1
fi

# 创建虚拟环境
echo "[1/4] 创建虚拟环境..."
python3 -m venv "$OFFLINE_DIR/venv"
source "$OFFLINE_DIR/venv/bin/activate"

# 升级 pip（使用本地包）
pip install --no-index --find-links="$OFFLINE_DIR/packages" pip setuptools wheel

# 安装 torch（优先安装，其他依赖会自动解析）
echo "[2/4] 安装 PyTorch..."
pip install --no-index --find-links="$OFFLINE_DIR/packages" \
  torch torchaudio

# 安装所有依赖
echo "[3/4] 安装依赖包..."
pip install --no-index --find-links="$OFFLINE_DIR/packages" \
  transformers accelerate gradio librosa soundfile sox onnxruntime einops \
  safetensors tokenizers huggingface_hub numpy

# 安装 qwen-tts
pip install --no-index --find-links="$OFFLINE_DIR/packages" qwen-tts

# 尝试安装 FlashAttention
echo "[4/4] 安装 FlashAttention..."
pip install --no-index --find-links="$OFFLINE_DIR/packages" flash-attn || \
  echo "FlashAttention 安装失败，尝试在线编译..."
  echo "如果失败，可以跳过（性能略降，但可运行）"

# 安装源代码（可选）
if [ -d "$OFFLINE_DIR/code/Qwen3-TTS" ]; then
  echo "安装源代码（开发模式）..."
  pip install --no-index --find-links="$OFFLINE_DIR/packages" \
    -e "$OFFLINE_DIR/code/Qwen3-TTS"
fi

# 验证安装
echo ""
echo "=== 验证安装 ==="
python3 -c "
try:
    import torch
    print(f'PyTorch: {torch.__version__}')
    print(f'CUDA available: {torch.cuda.is_available()}')
    if torch.cuda.is_available():
        print(f'GPU count: {torch.cuda.device_count()}')
        for i in range(torch.cuda.device_count()):
            print(f'  GPU {i}: {torch.cuda.get_device_name(i)}')
except Exception as e:
    print(f'PyTorch 错误: {e}')

try:
    from qwen_tts import QwenTTS
    print('qwen-tts: OK')
except Exception as e:
    print(f'qwen-tts 错误: {e}')
"

# 检查模型文件
echo ""
echo "模型文件:"
ls -la "$OFFLINE_DIR/models/"

echo ""
echo "=== 安装完成 ==="
echo "激活环境: source $OFFLINE_DIR/venv/bin/activate"
echo "模型路径: $OFFLINE_DIR/models/"