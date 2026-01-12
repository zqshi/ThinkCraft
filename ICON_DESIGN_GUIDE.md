# ThinkCraft PWA图标设计需求

## 图标尺寸列表

根据`manifest.json`配置，需要生成以下尺寸的图标：

### 主要图标
- **72x72** - Android小图标
- **96x96** - Android标准图标
- **128x128** - Chrome应用图标
- **144x144** - Windows磁贴
- **152x152** - iPad图标
- **192x192** - Android主屏幕图标（标准）⭐
- **384x384** - Android高清图标
- **512x512** - Android启动画面（标准）⭐

### 快捷方式图标
- **mic-96.png** - 语音输入快捷方式图标
- **camera-96.png** - 拍照快捷方式图标
- **chat-96.png** - 新建对话快捷方式图标

### 截图（可选）
- **home.png** (540x720) - 主界面截图
- **chat.png** (540x720) - 对话界面截图

---

## 设计规范

### 品牌色彩
- **主色调**: #6366f1 (Indigo 500)
- **背景色**: #ffffff (白色)
- **文字色**: #1f2937 (灰色900)

### 设计要素
1. **LOGO元素**：
   - 核心图形：灯泡+思维导图结合
   - 象征创意与思维引导

2. **图标风格**：
   - 扁平化设计
   - 圆角矩形容器（可选）
   - 清晰的轮廓和高对比度

3. **文字标识**（可选）：
   - 字体：Sans-serif
   - 仅在大尺寸图标（512x512）中包含"TC"或品牌名

### Maskable图标要求
192x192和512x512需要提供maskable版本：
- **安全区域**：中心80%区域必须包含关键元素
- **边缘留白**：周围10%留白，防止被裁切

---

## 设计建议

### 方案1：灯泡+脑图组合
```
┌─────────────────┐
│                 │
│      💡         │
│     / \         │
│    /   \        │
│   ━━━━━━━       │
│  (思维脉络)     │
│                 │
└─────────────────┘
```

### 方案2：对话泡+星星
```
┌─────────────────┐
│                 │
│   ┌─────┐       │
│   │ TC  │ ✨    │
│   └─────┘       │
│     ┘           │
│                 │
└─────────────────┘
```

### 方案3：字母T+思维线条
```
┌─────────────────┐
│                 │
│      ╱┃╲        │
│     ╱ ┃ ╲       │
│    ╱  ┃  ╲      │
│   ━━━━┻━━━━     │
│   ThinkCraft    │
│                 │
└─────────────────┘
```

---

## 快速生成工具

### 在线工具
1. **PWA Asset Generator**: https://www.pwabuilder.com/imageGenerator
2. **Favicon Generator**: https://realfavicongenerator.net/
3. **Canva**: https://www.canva.com/ (设计图标)

### 命令行工具
```bash
# 使用ImageMagick批量生成
convert source.png -resize 192x192 icons/icon-192.png
convert source.png -resize 512x512 icons/icon-512.png
```

---

## 文件结构

生成后放置在以下目录：

```
/icons/
├── icon-72.png
├── icon-96.png
├── icon-128.png
├── icon-144.png
├── icon-152.png
├── icon-192.png         ⭐ 关键
├── icon-384.png
├── icon-512.png         ⭐ 关键
├── mic-96.png
├── camera-96.png
└── chat-96.png

/screenshots/ (可选)
├── home.png
└── chat.png
```

---

## 测试清单

生成图标后需要测试：

- [ ] 在Android Chrome中安装PWA，检查主屏幕图标
- [ ] 在iOS Safari中"添加到主屏幕"，检查图标显示
- [ ] 长按PWA图标，检查快捷方式菜单
- [ ] 检查启动画面图标显示
- [ ] 检查通知栏图标显示
- [ ] 使用Lighthouse PWA审计检查图标

---

## 临时解决方案

如果暂时没有设计资源，可以使用以下方法：

### 1. 文字图标生成器
```html
<!-- 使用Canvas生成临时文字图标 -->
<canvas id="icon-generator" width="512" height="512"></canvas>
<script>
const canvas = document.getElementById('icon-generator');
const ctx = canvas.getContext('2d');

// 背景
ctx.fillStyle = '#6366f1';
ctx.fillRect(0, 0, 512, 512);

// 文字
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 200px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('TC', 256, 256);

// 下载图片
const dataURL = canvas.toDataURL('image/png');
// 保存为icons/icon-512.png
</script>
```

### 2. 使用emoji作为临时图标
- 💡 (灯泡) - 代表灵感
- 🧠 (大脑) - 代表思维
- ✨ (星星) - 代表创意

---

## 注意事项

⚠️ **重要提醒**：
1. 所有图标必须是PNG格式
2. 图标背景建议使用品牌色或白色
3. 图标设计要简洁，在小尺寸下也要清晰可辨
4. 确保在浅色和深色主题下都能看清
5. 测试不同设备和浏览器的显示效果

---

## 下一步行动

1. 设计主图标（512x512源文件）
2. 使用工具批量生成各尺寸
3. 创建`/icons/`目录并上传图标
4. 测试PWA安装和图标显示
5. 根据测试结果调整设计
