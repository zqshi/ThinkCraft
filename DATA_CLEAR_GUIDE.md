# ThinkCraft 数据清理指南

## 概述

本指南提供了三种清理 ThinkCraft 所有数据的方法，包括对话、报告、项目、灵感、知识库等所有本地数据。

⚠️ **警告**：清理操作不可逆，所有数据将被永久删除，无法恢复！

## 清理内容

清理操作将删除以下数据：

- ✅ **对话数据**：所有对话历史、消息记录
- ✅ **报告数据**：商业计划书、立项材料、分析报告
- ✅ **项目数据**：所有项目信息、工作流、阶段数据
- ✅ **灵感数据**：灵感收件箱中的所有条目
- ✅ **知识库数据**：所有知识条目、文档
- ✅ **本地存储**：设置、缓存、临时数据
- ✅ **浏览器缓存**：Service Worker 缓存、HTTP 缓存

## 方法1：使用可视化清理工具（推荐）

### 步骤

1. **打开清理工具**
   ```
   在浏览器中打开：file:///path/to/ThinkCraft/clear-data.html
   ```
   或者双击 `clear-data.html` 文件

2. **查看统计信息**
   - 页面会自动加载当前数据统计
   - 显示对话数量、报告数量、项目数量、存储大小

3. **选择清理项**
   - 默认全选所有数据类型
   - 可以取消勾选不想清理的项

4. **开始清理**
   - 点击"开始清理"按钮
   - 等待清理完成（通常 < 5 秒）
   - 查看清理日志

5. **验证结果**
   - 页面会自动刷新
   - 检查应用是否恢复到初始状态

### 优点

- ✅ 可视化界面，操作简单
- ✅ 实时显示清理进度
- ✅ 详细的清理日志
- ✅ 自动验证清理结果
- ✅ 可选择性清理

### 截图

```
┌─────────────────────────────────────┐
│  🗑️ 数据清理工具                    │
│  清理 ThinkCraft 的所有本地数据      │
├─────────────────────────────────────┤
│  ⚠️ 警告：此操作不可逆！             │
│  清理后，所有选中的数据将被永久删除  │
├─────────────────────────────────────┤
│  📊 选择要清理的数据                 │
│  ☑ 对话数据                          │
│  ☑ 报告数据                          │
│  ☑ 项目数据                          │
│  ☑ 灵感数据                          │
│  ☑ 知识库数据                        │
│  ☑ 本地存储                          │
│  ☑ 浏览器缓存                        │
├─────────────────────────────────────┤
│  [取消]  [开始清理]                  │
└─────────────────────────────────────┘
```

## 方法2：使用浏览器控制台脚本

### 步骤

1. **打开 ThinkCraft 应用**
   ```
   在浏览器中打开应用
   ```

2. **打开开发者工具**
   ```
   按 F12（Windows/Linux）
   或 Cmd+Option+I（Mac）
   ```

3. **切换到 Console 标签**

4. **复制并执行脚本**
   - 打开 `clear-data-console.js` 文件
   - 复制全部内容
   - 粘贴到控制台
   - 按 Enter 执行

5. **确认清理**
   - 在弹出的确认对话框中点击"确定"
   - 等待清理完成

6. **查看结果**
   - 控制台会显示详细的清理日志
   - 显示成功和失败的项数
   - 自动验证清理结果

### 优点

- ✅ 无需额外文件
- ✅ 详细的控制台日志
- ✅ 自动验证清理结果
- ✅ 适合开发者使用

### 控制台输出示例

```
========================================
  ThinkCraft 数据清理工具
========================================

⚠️  警告：此操作不可逆！
清理后，所有数据将被永久删除，无法恢复。

开始清理数据...

[1/7] 清理 IndexedDB...
  ✓ IndexedDB 已清理
[2/7] 清理 localStorage...
  ✓ localStorage 已清理 (5 项)
[3/7] 清理 sessionStorage...
  ✓ sessionStorage 已清理 (2 项)
[4/7] 清理 Cache Storage...
  ✓ Cache Storage 已清理 (3 个缓存)
[5/7] 注销 Service Worker...
  ✓ Service Worker 已注销 (1 个)
[6/7] 清理 Cookies...
  ✓ Cookies 已清理 (0 个)
[7/7] 清理全局状态...
  ✓ 全局状态已清理

========================================
  清理完成
========================================

成功: 7 项

验证清理结果:
  ✓ IndexedDB 已完全删除
  ✓ localStorage 已清空
  ✓ Cache Storage 已清空

建议操作:
1. 刷新页面（Ctrl+Shift+R）
2. 检查应用是否恢复到初始状态
3. 如有问题，请清除浏览器缓存（Ctrl+Shift+Delete）
```

## 方法3：手动清理

### 步骤

#### 1. 清理 IndexedDB

```
F12 → Application → Storage → IndexedDB
→ 右键点击 ThinkCraftDB → Delete database
```

#### 2. 清理 localStorage 和 sessionStorage

在控制台执行：
```javascript
localStorage.clear();
sessionStorage.clear();
```

#### 3. 清理 Cache Storage

在控制台执行：
```javascript
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

#### 4. 注销 Service Worker

在控制台执行：
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
});
```

#### 5. 清理浏览器缓存

```
Ctrl+Shift+Delete（Windows/Linux）
或 Cmd+Shift+Delete（Mac）

选择：
☑ 浏览历史记录
☑ Cookie 和其他网站数据
☑ 缓存的图片和文件

时间范围：全部时间

点击"清除数据"
```

### 优点

- ✅ 完全控制清理过程
- ✅ 可以选择性清理
- ✅ 适合调试和测试

### 缺点

- ❌ 步骤较多
- ❌ 容易遗漏某些数据
- ❌ 需要手动验证

## 验证清理结果

清理完成后，请按以下步骤验证：

### 1. 刷新页面

```
Ctrl+Shift+R（Windows/Linux）
或 Cmd+Shift+R（Mac）
```

### 2. 检查 IndexedDB

```
F12 → Application → IndexedDB
```

**预期结果**：
- ✅ ThinkCraftDB 不存在
- ✅ 或者 ThinkCraftDB 为空（无数据）

### 3. 检查 localStorage

在控制台执行：
```javascript
console.log(Object.keys(localStorage));
```

**预期结果**：
- ✅ 输出 `[]`（空数组）

### 4. 检查应用状态

- ✅ 对话列表为空
- ✅ 项目列表为空
- ✅ 需要重新登录（如果有登录功能）
- ✅ 所有设置恢复默认值

### 5. 检查存储大小

```
F12 → Application → Storage
```

**预期结果**：
- ✅ 使用量接近 0 KB

## 常见问题

### Q1: 清理后数据能恢复吗？

**A**: 不能。清理操作是永久性的，无法恢复。建议在清理前备份重要数据。

### Q2: 清理时提示"Database blocked"怎么办？

**A**: 这表示有其他标签页正在使用数据库。请：
1. 关闭所有 ThinkCraft 标签页
2. 只保留一个标签页
3. 重新执行清理操作

### Q3: 清理后页面还显示旧数据？

**A**: 可能是浏览器缓存问题。请：
1. 硬刷新页面（Ctrl+Shift+R）
2. 清除浏览器缓存（Ctrl+Shift+Delete）
3. 重启浏览器

### Q4: 能只清理某些数据吗？

**A**: 可以。使用方法1（可视化工具）可以选择性清理。

### Q5: 清理会影响其他网站吗？

**A**: 不会。清理操作只针对 ThinkCraft 的数据，不会影响其他网站。

### Q6: 清理需要多长时间？

**A**: 通常 < 5 秒。具体时间取决于数据量。

### Q7: 清理失败怎么办？

**A**: 请尝试：
1. 关闭其他标签页
2. 重启浏览器
3. 使用方法3（手动清理）
4. 检查浏览器控制台的错误信息

## 文件清单

本清理工具包含以下文件：

1. **clear-data.html** - 可视化清理工具（推荐）
2. **clear-data-console.js** - 控制台脚本
3. **clear-all-data.sh** - 命令行指南脚本
4. **DATA_CLEAR_GUIDE.md** - 本文档

## 技术细节

### 清理的数据存储位置

1. **IndexedDB**
   - 数据库名：`ThinkCraftDB`
   - 存储：chats, reports, projects, inspirations, knowledge

2. **localStorage**
   - 键前缀：`thinkcraft_*`
   - 存储：settings, cache, temp data

3. **sessionStorage**
   - 键前缀：`thinkcraft_*`
   - 存储：session data

4. **Cache Storage**
   - 缓存名：`thinkcraft-*`
   - 存储：static assets, API responses

5. **Service Worker**
   - 脚本：`/service-worker.js`
   - 缓存：runtime cache

### 清理顺序

1. IndexedDB（最重要）
2. localStorage
3. sessionStorage
4. Cache Storage
5. Service Worker
6. Cookies
7. 全局状态

### 错误处理

- 每个清理步骤都有独立的错误处理
- 某个步骤失败不会影响其他步骤
- 所有错误都会记录到日志

## 安全性

- ✅ 所有操作在本地执行
- ✅ 不会发送任何数据到服务器
- ✅ 不会影响其他网站
- ✅ 不会删除浏览器设置

## 支持的浏览器

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

## 更新日志

### v1.0.0 (2026-02-01)
- 初始版本
- 支持三种清理方法
- 完整的验证机制
- 详细的日志记录

---

**需要帮助？**

如果遇到问题，请：
1. 查看浏览器控制台的错误信息
2. 尝试不同的清理方法
3. 联系技术支持

**免责声明**：
使用本工具清理数据后，所有数据将被永久删除，无法恢复。请在清理前确保已备份重要数据。
