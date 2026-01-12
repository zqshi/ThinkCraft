# ThinkCraft PWA图标目录

## 📋 需要的图标文件

根据`manifest.json`配置，此目录需要包含以下图标：

### 主要图标（必需）
- [ ] icon-72.png
- [ ] icon-96.png
- [ ] icon-128.png
- [ ] icon-144.png
- [ ] icon-152.png
- [ ] icon-192.png ⭐ **最重要**
- [ ] icon-384.png
- [ ] icon-512.png ⭐ **最重要**

### 快捷方式图标
- [ ] mic-96.png (语音输入)
- [ ] camera-96.png (拍照)
- [ ] chat-96.png (新建对话)

---

## 🎨 使用模板生成图标

已提供`icon-template.svg`作为设计起点。

### 方法1：在线转换
1. 打开 https://cloudconvert.com/svg-to-png
2. 上传`icon-template.svg`
3. 设置输出尺寸（如512x512）
4. 下载转换后的PNG
5. 重命名为对应文件名（如icon-512.png）

### 方法2：使用命令行工具

#### macOS/Linux (使用ImageMagick)
```bash
# 安装ImageMagick
brew install imagemagick  # macOS
# sudo apt-get install imagemagick  # Linux

# 批量生成各尺寸
convert icon-template.svg -resize 72x72 icon-72.png
convert icon-template.svg -resize 96x96 icon-96.png
convert icon-template.svg -resize 128x128 icon-128.png
convert icon-template.svg -resize 144x144 icon-144.png
convert icon-template.svg -resize 152x152 icon-152.png
convert icon-template.svg -resize 192x192 icon-192.png
convert icon-template.svg -resize 384x384 icon-384.png
convert icon-template.svg -resize 512x512 icon-512.png
```

#### 或使用一键脚本
```bash
#!/bin/bash
sizes=(72 96 128 144 152 192 384 512)
for size in "${sizes[@]}"; do
  convert icon-template.svg -resize ${size}x${size} icon-${size}.png
  echo "✅ 生成 icon-${size}.png"
done
```

---

## 🔧 自定义设计

如果要修改图标设计：

1. **编辑SVG**: 使用任何矢量图编辑器（Figma/Sketch/Inkscape/Adobe Illustrator）打开`icon-template.svg`
2. **调整元素**: 修改颜色、形状、文字
3. **导出PNG**: 导出为各种所需尺寸

### 设计建议
- 保持简洁：小尺寸下也要清晰
- 高对比度：确保在各种背景下可见
- 品牌一致性：使用主题色#6366f1

---

## ⚡ 快捷图标设计

可以使用emoji或简单图标：

### mic-96.png (语音输入)
- 麦克风图标
- 推荐色：#ef4444 (红色)

### camera-96.png (拍照)
- 相机图标
- 推荐色：#10b981 (绿色)

### chat-96.png (新建对话)
- 对话气泡图标
- 推荐色：#6366f1 (蓝色)

---

## ✅ 测试检查清单

生成图标后：

1. [ ] 检查文件名是否正确
2. [ ] 检查图片尺寸是否精确
3. [ ] 在浏览器中打开查看效果
4. [ ] 使用Lighthouse PWA审计
5. [ ] 在真实设备上安装PWA测试

---

## 📱 临时解决方案

如果暂时没有图标，可以：

1. **使用占位符**: 纯色背景+文字
2. **使用在线生成器**: https://www.pwabuilder.com/imageGenerator
3. **使用Favicon Generator**: https://realfavicongenerator.net/

---

## 📚 参考资源

- [PWA图标规范](https://web.dev/add-manifest/)
- [Maskable图标编辑器](https://maskable.app/editor)
- [Icon设计最佳实践](https://developers.google.com/web/fundamentals/web-app-manifest)
