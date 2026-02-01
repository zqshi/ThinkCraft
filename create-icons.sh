#!/bin/bash

# 创建图标目录（如果不存在）
mkdir -p icons

# 使用 ImageMagick 或 sips（macOS自带）从 SVG 生成 PNG
# 如果没有 SVG，创建一个简单的占位图标

# 检查是否有 sips 命令（macOS）
if command -v sips &> /dev/null; then
    echo "使用 sips 创建占位图标..."
    
    # 创建一个临时的纯色图片作为占位符
    sizes=(72 96 128 144 152 192 384 512)
    
    for size in "${sizes[@]}"; do
        # 使用 sips 创建一个简单的占位图标
        # 先创建一个基础图标（如果有 icon-template.svg）
        if [ -f "icons/icon-template.svg" ]; then
            # macOS 可以直接转换 SVG
            sips -s format png icons/icon-template.svg --out "icons/icon-${size}.png" --resampleWidth $size 2>/dev/null || {
                # 如果转换失败，创建一个纯色占位符
                python3 -c "
from PIL import Image, ImageDraw, ImageFont
img = Image.new('RGB', ($size, $size), color='#6366f1')
draw = ImageDraw.Draw(img)
# 绘制一个简单的 T 字母
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', int($size * 0.6))
except:
    font = ImageFont.load_default()
text = 'T'
bbox = draw.textbbox((0, 0), text, font=font)
text_width = bbox[2] - bbox[0]
text_height = bbox[3] - bbox[1]
x = ($size - text_width) // 2
y = ($size - text_height) // 2
draw.text((x, y), text, fill='white', font=font)
img.save('icons/icon-${size}.png')
" 2>/dev/null || echo "跳过 icon-${size}.png"
            }
        fi
    done
    
    echo "图标创建完成！"
else
    echo "未找到 sips 命令，请手动创建图标或安装 ImageMagick"
fi
