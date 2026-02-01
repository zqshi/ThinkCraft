# 浏览器缓存清除指南

## 问题说明

修复已完成，但浏览器可能缓存了旧版本的JavaScript文件。已在 `index.html` 中添加版本号参数来强制刷新。

## 已更新的文件版本号

在 `index.html` 中，以下文件已添加 `?v=20260131-fix` 参数：

```html
<script src="frontend/js/utils/format.js?v=20260131-fix"></script>
<script src="frontend/js/utils/dom.js?v=20260131-fix"></script>
<script src="frontend/js/utils/icons.js?v=20260131-fix"></script>
<script src="frontend/js/app-boot.js?v=20260131-fix"></script>
<script src="frontend/js/boot/init.js?v=20260131-fix"></script>
```

## 清除浏览器缓存的方法

### 方法1：硬刷新（推荐）

**Chrome/Edge/Firefox (Windows/Linux):**
- `Ctrl + Shift + R` 或 `Ctrl + F5`

**Chrome/Edge/Firefox (macOS):**
- `Cmd + Shift + R`

**Safari (macOS):**
- `Cmd + Option + R`

### 方法2：开发者工具清除缓存

1. 打开开发者工具（F12）
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

### 方法3：手动清除缓存

**Chrome/Edge:**
1. 按 `Ctrl + Shift + Delete` (Windows) 或 `Cmd + Shift + Delete` (macOS)
2. 选择"缓存的图片和文件"
3. 时间范围选择"全部时间"
4. 点击"清除数据"

**Firefox:**
1. 按 `Ctrl + Shift + Delete` (Windows) 或 `Cmd + Shift + Delete` (macOS)
2. 勾选"缓存"
3. 点击"立即清除"

**Safari:**
1. 菜单栏 → 开发 → 清空缓存
2. 或按 `Cmd + Option + E`

## 验证修复是否生效

打开浏览器控制台（F12），检查是否还有以下错误：

### 应该消失的错误：
- ❌ `Uncaught SyntaxError: Unexpected token 'export'`
- ❌ `Uncaught ReferenceError: focusInput is not defined`
- ❌ `Uncaught ReferenceError: initChatAutoScroll is not defined`

### 可以忽略的警告：
- ⚠️ `GET http://localhost:8000/icons/icon-144.png 404` - 图标文件缺失，不影响功能
- ⚠️ `@ali/tongyi-next-theme` 相关警告 - 浏览器插件警告，不影响功能

## 如果仍然有错误

如果清除缓存后仍然看到 export 相关错误，请执行以下步骤：

1. **完全关闭浏览器**（不是只关闭标签页）
2. **重新打开浏览器**
3. **访问页面时按住 Shift 键点击刷新按钮**

## 验证文件已正确修改

运行以下命令确认文件没有 export 语句：

```bash
grep -n "^export" frontend/js/utils/format.js frontend/js/utils/dom.js frontend/js/utils/icons.js
```

应该没有任何输出（表示没有找到 export 语句）。

## 验证函数已添加

检查 initChatAutoScroll 函数是否存在：

```bash
grep -n "function initChatAutoScroll" frontend/js/app-boot.js
```

应该输出：
```
43:function initChatAutoScroll() {
```

## 开发服务器重启

如果使用了开发服务器，也需要重启：

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
python -m http.server 8000
```

## 最终确认

访问 `http://localhost:8000/index.html`，打开控制台，应该看到：
- ✅ 无语法错误
- ✅ 页面正常加载
- ✅ 所有功能正常工作
