# ThinkCraft Flutter前端完全对齐方案

## 项目信息

**对齐目标**: main分支原始Web版本
**技术栈**: Flutter + DDD设计范式
**文件来源**:
- Web CSS变量: `css/variables.css` (172行)
- Web主样式: `css/main.css` (4377行)
- Web HTML: `index.html` (7553行)

---

## 一、基础样式系统对齐 ✅ 已完成95%

### 1.1 CSS变量 → Flutter主题系统

| Web端CSS变量 | Flutter对应 | 状态 |
|-------------|-----------|------|
| `--spacing-xs: 4px` | `AppSpacing.xs = 4.0` | ✅ |
| `--spacing-sm: 8px` | `AppSpacing.sm = 8.0` | ✅ |
| `--spacing-md: 16px` | `AppSpacing.md = 16.0` | ✅ |
| `--spacing-lg: 24px` | `AppSpacing.lg = 24.0` | ✅ |
| `--spacing-xl: 32px` | `AppSpacing.xl = 32.0` | ✅ |
| `--spacing-2xl: 48px` | `AppSpacing.xl2 = 48.0` | ✅ |
| `--font-size-xs: 12px` | `labelSmall: 12px` | ✅ |
| `--font-size-sm: 14px` | `bodyMedium: 14px` | ✅ |
| `--font-size-md: 16px` | `titleMedium: 16px` | ✅ |
| `--font-size-lg: 18px` | `titleLarge: 18px` | ⚠️ Web端18px，Flutter用20px |
| `--font-size-xl: 24px` | `titleLarge: 24px` | ✅ |
| `--border-radius-sm: 8px` | `AppRadius.sm = 8.0` | ✅ |
| `--border-radius-md: 12px` | `AppRadius.md = 12.0` | ✅ |
| `--border-radius-lg: 16px` | `AppRadius.lg = 16.0` | ✅ |
| `--border-radius-xl: 20px` | `AppRadius.xl = 20.0` | ✅ |
| `--primary: #6366f1` | `AppColors.primary` | ✅ |
| `--primary-dark: #4f46e5` | `AppColors.primaryDark` | ✅ |
| `--bg-primary: #ffffff` | `AppColors.bgPrimary` | ✅ |
| `--bg-secondary: #f9fafb` | `AppColors.bgSecondary` | ✅ |
| `--bg-tertiary: #f3f4f6` | `AppColors.bgSidebar` | ✅ |
| `--text-primary: #111827` | `AppColors.textPrimary` | ✅ |
| `--text-secondary: #6b7280` | `AppColors.textSecondary` | ✅ |
| `--text-tertiary: #9ca3af` | `AppColors.textTertiary` | ✅ |
| `--border: #e5e7eb` | `AppColors.border` | ✅ |

### 1.2 需要修复的基础样式

❌ **问题1: titleLarge字体大小**
- Web: `--font-size-lg: 18px`
- Flutter: `titleLarge: 20px`
- **修复**: 改为18px

---

## 二、布局结构对齐

### 2.1 AppShell结构

**Web端结构**:
```html
<div class="app-container">
  <aside class="sidebar">...</aside>
  <main class="main-content">
    <header class="main-header">...</header>
    <div class="chat-container">...</div>
    <div class="input-container">...</div>
  </main>
</div>
```

**Flutter当前结构**:
```dart
Scaffold(
  drawer: Drawer(...),  // 移动端
  body: Row([
    SizedBox(width: 280, child: sidebar),  // 桌面端
    Expanded(
      child: Column([
        Container(...),  // Header
        Expanded(body),
        bottomBar,
      ]),
    ),
  ]),
)
```

**对齐状态**: ✅ 基本对齐

### 2.2 侧边栏 (Sidebar)

**Web端样式**:
```css
.sidebar {
  width: 280px;
  background: var(--bg-sidebar);  /* #f3f4f6 */
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}
```

**Flutter实现**:
```dart
Container(
  color: bgColor,  // ✅ 已使用bgSidebar
  child: Column([...]),
)
```

**对齐状态**: ✅ 已对齐

### 2.3 主Header

**Web端样式**:
```css
.main-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
}
```

**Flutter实现**:
```dart
Container(
  padding: EdgeInsets.symmetric(
    horizontal: AppSpacing.lg,  // 24px ✅
    vertical: AppSpacing.md,    // 16px ✅
  ),
  decoration: BoxDecoration(
    border: Border(bottom: BorderSide(color: borderColor)),  // ✅
  ),
)
```

**对齐状态**: ✅ 已对齐

### 2.4 输入框容器

**Web端样式**:
```css
.input-container {
  padding: 20px 24px;
  border-top: 1px solid var(--border);
  background: var(--bg-primary);
}
.input-wrapper {
  max-width: 800px;
  margin: 0 auto;
}
```

**Flutter实现**:
```dart
Container(
  padding: EdgeInsets.symmetric(
    horizontal: AppSpacing.lg,      // 24px ✅
    vertical: AppSpacing.lg - 4,    // 20px ✅
  ),
  decoration: BoxDecoration(
    border: Border(top: BorderSide(...)),  // ✅
  ),
  child: Center(
    child: ConstrainedBox(
      constraints: BoxConstraints(maxWidth: 800),  // ✅
      child: MultimodalInputField(...),
    ),
  ),
)
```

**对齐状态**: ✅ 已对齐

---

## 三、组件级样式对齐

### 3.1 新建对话按钮

**Web端样式**:
```css
.new-chat-btn {
  width: 100%;
  padding: 12px 16px;
  background: var(--primary);  /* #6366f1 */
  color: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
}
.new-chat-btn:hover {
  background: var(--primary-dark);  /* #4f46e5 */
}
.new-chat-btn:active {
  transform: scale(0.98);
}
```

**Flutter当前实现**:
```dart
ElevatedButton.icon(
  onPressed: onNewChat,
  icon: Icon(Icons.add, size: 18),
  label: Text('新建对话'),
  // 使用主题系统，已包含primary颜色
)
```

**对齐问题**:
- ✅ padding: 12px 16px (通过主题配置)
- ✅ background: primary
- ✅ border-radius: 8px
- ❌ hover效果缺失
- ❌ active缩放动画缺失

**修复方案**:
```dart
AnimatedButton(  // 使用新创建的动画组件
  onTap: onNewChat,
  child: ElevatedButton.icon(...),
)
```

### 3.2 侧边栏Tab

**Web端样式**:
```css
.sidebar-tab {
  padding: 10px 12px;
  border-radius: 8px 8px 0 0;
  font-size: 14px;
  color: var(--text-secondary);
}
.sidebar-tab.active {
  background: var(--bg-primary);  /* #ffffff */
  color: var(--primary);
  font-weight: 600;
}
.sidebar-tab.active::after {
  bottom: -2px;
  height: 2px;
  background: var(--primary);
}
```

**Flutter当前实现**:
```dart
Container(
  padding: EdgeInsets.symmetric(vertical: 10),
  decoration: BoxDecoration(
    color: isActive
      ? (isDark ? AppColorsDark.bgPrimary : AppColors.bgPrimary)  // ✅ 已修复
      : Colors.transparent,
  ),
)
```

**对齐状态**: ✅ 已修复（之前修改过）

### 3.3 输入框工具按钮

**Web端样式**:
```css
.tool-btn {
  padding: 8px 14px;
  background: var(--bg-secondary);  /* #f9fafb */
  border: 1px solid var(--border);  /* #e5e7eb */
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}
```

**Flutter当前实现**:
```dart
OutlinedButton(
  style: OutlinedButton.styleFrom(
    backgroundColor: bgSecondary,  // ✅
    side: BorderSide(color: borderColor, width: 1),  // ✅ 已修复
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(8),  // ✅
    ),
  ),
  child: Icon(icon, size: 18),
)
```

**对齐状态**: ✅ 已修复（之前修改过）

### 3.4 输入框主容器

**Web端样式**:
```css
.main-input {
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 2px solid var(--border);
  border-radius: 12px;
}
```

**Flutter当前实现**:
```dart
Container(
  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),  // ✅
  decoration: BoxDecoration(
    color: bgSecondary,  // ✅
    borderRadius: BorderRadius.circular(12),  // ✅
    border: Border.all(color: borderColor, width: 1),  // ⚠️ Web是2px
  ),
)
```

**对齐问题**:
- ❌ **边框宽度**: Web端是`2px`，Flutter是`1px`

**修复方案**:
```dart
border: Border.all(color: borderColor, width: 2),  // 改为2px
```

### 3.5 聊天对话项

**Web端样式**:
```css
.chat-item {
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
}
.chat-item:hover {
  background: rgba(99, 102, 241, 0.05);
}
.chat-item.active {
  background: rgba(99, 102, 241, 0.1);
}
```

**Flutter当前实现**:
```dart
InkWell(
  borderRadius: AppRadius.smRadius,  // 8px ✅
  child: Container(
    padding: EdgeInsets.all(12),  // ✅
    margin: EdgeInsets.only(bottom: 4),  // ✅
  ),
)
```

**对齐问题**:
- ❌ hover效果不明显
- ❌ active状态背景色缺失

**修复方案**:
需要实现active状态和hover效果

---

## 四、响应式布局对齐

### 4.1 移动端断点 (< 640px)

**Web端样式**:
```css
@media (max-width: 640px) {
  .sidebar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 1000;
    transform: translateX(-100%);
  }
  .sidebar.active {
    transform: translateX(0);
  }
  .main-header {
    padding: 12px 16px;
  }
  .input-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  }
}
```

**Flutter当前实现**:
```dart
// 移动端使用Drawer
drawer: (!isDesktop && sidebar != null) ? Drawer(child: sidebar!) : null

// Header padding响应式 - ❌ 未实现

// 输入框fixed定位 - ❌ 未实现
```

**对齐问题**:
1. ❌ Header padding没有响应式调整
2. ❌ 输入框在移动端未使用fixed定位
3. ❌ 输入框未添加上阴影

### 4.2 平板断点 (641px - 1024px)

**Web端样式**:
```css
@media (min-width: 641px) and (max-width: 1024px) {
  .main-header {
    padding: 14px 20px;
  }
}
```

**Flutter实现**: ❌ 未实现

---

## 五、动画和交互效果对齐

### 5.1 按钮动画

**Web端**:
```css
button:active {
  transform: scale(0.98);
  transition: transform 0.15s;
}
button:hover {
  background: var(--primary-dark);
  transition: all 0.2s;
}
```

**Flutter当前状态**: ⚠️ 已创建`AnimatedButton`组件，但未应用到所有按钮

### 5.2 卡片动画

**Web端**:
```css
.card:hover {
  transform: translateY(-2px);
  transition: all 0.2s;
}
```

**Flutter当前状态**: ⚠️ 已创建`AnimatedCard`组件，但未应用

### 5.3 侧边栏动画

**Web端**:
```css
.sidebar {
  transition: transform 0.3s ease;
}
```

**Flutter实现**: ✅ Drawer自带动画

---

## 六、待修复问题清单

### P0 - 严重问题（必须立即修复）

1. ❌ **输入框主容器边框宽度**: 1px → 2px
2. ❌ **titleLarge字体大小**: 20px → 18px
3. ❌ **移动端输入框未fixed定位**

### P1 - 重要问题（应该修复）

4. ❌ **Header padding响应式**: 移动端12px/16px，平板14px/20px
5. ❌ **聊天对话项active状态**: 缺少背景色 `rgba(99, 102, 241, 0.1)`
6. ❌ **新建对话按钮hover/active**: 未应用AnimatedButton
7. ❌ **移动端输入框阴影**: 缺少 `0 -4px 12px rgba(0, 0, 0, 0.1)`

### P2 - 优化项（建议修复）

8. ⚠️ **所有按钮应用动画**: 统一使用AnimatedButton
9. ⚠️ **卡片hover效果**: 应用AnimatedCard
10. ⚠️ **桌面端hover状态**: MouseRegion实现

---

## 七、修复实施计划

### 阶段1: 修复P0问题（1小时）

```dart
// 1. 修复输入框边框
border: Border.all(color: borderColor, width: 2)  // 1px → 2px

// 2. 修复titleLarge字体
titleLarge: baseTheme.textTheme.titleLarge?.copyWith(
  fontSize: 18,  // 20 → 18
  fontWeight: FontWeight.w700,
)

// 3. 实现移动端输入框fixed定位
// 需要在HomePage中判断isDesktop，移动端使用Stack + Positioned
```

### 阶段2: 修复P1问题（2小时）

```dart
// 4. Header响应式padding
// 在AppShell中根据屏幕宽度调整

// 5. 聊天对话项active状态
// 在HomePage的_ChatSidebarItem中添加

// 6-7. 应用动画和阴影
// 使用AnimatedButton包装按钮
```

### 阶段3: P2优化（1小时）

```dart
// 8-10. 全面应用动画和hover效果
```

---

## 八、DDD设计范式应用

### 8.1 领域层 (Domain Layer)

**不变**: 领域模型和业务逻辑不受样式影响

### 8.2 表现层 (Presentation Layer)

**修改文件**:
1. `lib/presentation/themes/app_theme.dart` - 字体大小
2. `lib/presentation/widgets/input/multimodal_input_field.dart` - 边框宽度
3. `lib/presentation/widgets/layout/app_shell.dart` - 响应式padding
4. `lib/presentation/pages/home/home_page.dart` - 移动端布局、聊天项样式

### 8.3 基础设施层 (Infrastructure Layer)

**不变**: 样式修改不影响基础设施

---

## 九、验收标准

### 9.1 视觉对齐

- [ ] 侧边栏宽度280px，背景色#f3f4f6
- [ ] Header padding桌面16/24，移动12/16
- [ ] 输入框边框2px，圆角12px
- [ ] 所有按钮圆角8px
- [ ] 主色调#6366f1

### 9.2 响应式对齐

- [ ] 移动端 (< 640px) 输入框fixed定位
- [ ] 移动端Header padding调整
- [ ] 平板端 (641-1024px) 样式正确
- [ ] 桌面端 (> 1024px) 样式正确

### 9.3 交互对齐

- [ ] 按钮点击缩放0.98
- [ ] 按钮hover背景色变深
- [ ] 聊天项hover半透明蓝色
- [ ] 聊天项active更深蓝色

### 9.4 暗黑模式

- [ ] 所有组件支持暗黑模式
- [ ] 颜色切换平滑

---

## 十、预计工作量

| 阶段 | 任务 | 预计时间 |
|-----|------|---------|
| 阶段1 | P0问题修复 | 1小时 |
| 阶段2 | P1问题修复 | 2小时 |
| 阶段3 | P2优化 | 1小时 |
| 测试验证 | 全面测试 | 1小时 |
| **总计** | | **5小时** |

---

**创建时间**: 2026-01-17
**对齐基准**: main分支 (commit 6b4e8e5)
**当前状态**: 方案已制定，待执行
