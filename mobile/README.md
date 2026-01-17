# ThinkCraft Mobile

ThinkCraft移动端应用，支持生产模式和演示模式。

## 项目结构

```
mobile/
├── lib/
│   ├── config/           # 配置相关
│   │   └── app_config.dart
│   ├── presentation/     # 表示层
│   │   ├── themes/       # 主题系统
│   │   └── pages/        # 页面
│   ├── main.dart         # 生产模式入口
│   └── main_demo.dart    # 演示模式入口
├── pubspec.yaml          # 生产依赖
└── pubspec_demo.yaml     # 演示依赖
```

## 快速开始

### 开发模式

```bash
# 正常开发（生产模式）
cd mobile
flutter run

# 演示模式
cd mobile
flutter run -t lib/main_demo.dart
```

### 构建发布

```bash
# Android APK
flutter build apk --release

# Android App Bundle
flutter build appbundle --release

# iOS（需要macOS和Xcode）
flutter build ios --release
```

## 主题系统

完全对齐Web端CSS变量的主题系统：

- 支持亮色/暗黑模式
- 统一的颜色、间距、圆角、阴影系统
- 响应式设计支持

使用示例：

```dart
// 使用主题颜色
Container(
  color: Theme.of(context).colorScheme.primary,
)

// 使用间距系统
SizedBox(height: AppSpacing.md)

// 使用圆角系统
Container(
  decoration: BoxDecoration(
    borderRadius: AppRadius.mdRadius,
  ),
)
```

## 演示模式

演示模式特点：
- 简化的依赖配置
- 禁用多模态功能
- 使用模拟数据
- 适合快速演示和原型验证

## 功能开关

通过`AppConfig`控制功能：

```dart
// 检查功能是否启用
if (AppConfig.isFeatureEnabled('multimodal')) {
  // 启用多模态功能
}
```

## 开发指南

1. **始终使用主题系统**：避免硬编码样式值
2. **处理主题切换**：根据当前主题模式选择合适的颜色
3. **使用工具方法**：利用AppTheme提供的工具方法
4. **遵循设计规范**：严格按照主题系统的设计规范开发

## 更新日志

### v2.0.0
- 合并frontend和flutter_app项目
- 添加演示模式支持
- 统一主题系统
- 优化项目结构
