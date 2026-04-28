#!/usr/bin/env python3
"""
Qwen3-TTS 有声书生成示例
离线服务器上运行
"""

import os
import argparse
from pathlib import Path

# 离线环境需要指定模型路径
OFFLINE_DIR = "/opt/qwen3-tts-offline"
MODEL_PATH = f"{OFFLINE_DIR}/models/Qwen3-TTS-12Hz-1.7B-CustomVoice"
TOKENIZER_PATH = f"{OFFLINE_DIR}/models/Qwen3-TTS-Tokenizer-12Hz"

def main():
    parser = argparse.ArgumentParser(description="有声书生成")
    parser.add_argument("--text", type=str, help="要转换的文本")
    parser.add_argument("--file", type=str, help="文本文件路径")
    parser.add_argument("--voice", type=str, default="zh_female_warm",
                        help="音色选择")
    parser.add_argument("--output", type=str, default="output.wav",
                        help="输出音频路径")
    parser.add_argument("--model", type=str, default=MODEL_PATH,
                        help="模型路径")
    parser.add_argument("--tokenizer", type=str, default=TOKENIZER_PATH,
                        help="Tokenizer 路径")
    args = parser.parse_args()

    # 获取文本
    if args.file:
        text = Path(args.file).read_text(encoding="utf-8")
    elif args.text:
        text = args.text
    else:
        print("请提供 --text 或 --file 参数")
        return

    print(f"加载模型: {args.model}")
    print(f"文本长度: {len(text)} 字符")
    print(f"音色: {args.voice}")
    
    # 导入模型
    from qwen_tts import QwenTTS
    
    # 加载模型（指定本地路径）
    tts = QwenTTS(
        model_name="Qwen3-TTS-12Hz-1.7B-CustomVoice",
        model_path=args.model,
        tokenizer_path=args.tokenizer
    )
    
    # 生成音频
    print("生成音频...")
    result = tts.generate(
        text=text,
        voice=args.voice,
        output_path=args.output
    )
    
    print(f"输出文件: {args.output}")
    print(f"音频时长: {result.get('duration', 'N/A')} 秒")

if __name__ == "__main__":
    main()


# ========== 批量生成示例 ==========

def batch_generate(input_dir: str, output_dir: str, voice: str = "zh_female_warm"):
    """
    批量生成有声书
    
    Args:
        input_dir: 章节文本目录（每章一个 .txt 文件）
        output_dir: 输出音频目录
        voice: 音色选择
    """
    from qwen_tts import QwenTTS
    
    # 加载模型
    tts = QwenTTS(
        model_name="Qwen3-TTS-12Hz-1.7B-CustomVoice",
        model_path=MODEL_PATH,
        tokenizer_path=TOKENIZER_PATH
    )
    
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    # 按章节生成
    for chapter_file in sorted(input_path.glob("*.txt")):
        print(f"处理: {chapter_file.name}")
        
        text = chapter_file.read_text(encoding="utf-8")
        output_file = output_path / f"{chapter_file.stem}.wav"
        
        tts.generate(
            text=text,
            voice=voice,
            output_path=str(output_file)
        )
        
        print(f"  -> {output_file.name}")

# 使用示例：
# batch_generate("/path/to/novel/chapters", "/path/to/audiobook")