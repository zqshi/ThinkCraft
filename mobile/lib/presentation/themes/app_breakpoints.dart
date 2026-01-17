/// ThinkCraft 响应式断点系统
/// 从Web端CSS变量迁移：--breakpoint-sm → --breakpoint-3xl
class AppBreakpoints {
  // 断点定义（对应Web端CSS变量）
  static const double sm = 480; // --breakpoint-sm: 小屏手机
  static const double md = 640; // --breakpoint-md: 标准手机
  static const double lg = 896; // --breakpoint-lg: 平板
  static const double xl = 1024; // --breakpoint-xl: 小平板/大手机横屏
  static const double xl2 = 1366; // --breakpoint-2xl: 小笔记本
  static const double xl3 = 1920; // --breakpoint-3xl: 标准桌面

  // 特殊断点
  static const double tablet = 640; // 平板分界线（对应Web端640px断点）

  /// 判断是否为小屏手机 (< 480px)
  static bool isSmallPhone(double width) => width < sm;

  /// 判断是否为标准手机 (481px - 640px)
  static bool isMobile(double width) => width >= sm && width < md;

  /// 判断是否为平板 (641px - 1024px)
  static bool isTablet(double width) => width >= md && width < xl;

  /// 判断是否为小笔记本 (1025px - 1366px)
  static bool isLaptop(double width) => width >= xl && width < xl2;

  /// 判断是否为标准桌面 (1367px - 1920px)
  static bool isDesktop(double width) => width >= xl2 && width < xl3;

  /// 判断是否为超大屏/4K (> 1920px)
  static bool isLargeScreen(double width) => width >= xl3;

  /// 判断是否为桌面端（对应AppShell的逻辑）
  static bool isDesktopMode(double width) => width >= tablet;

  /// 判断是否为移动端
  static bool isMobileMode(double width) => width < tablet;

  /// 获取当前设备类型
  static DeviceType getDeviceType(double width) {
    if (width < sm) return DeviceType.smallPhone;
    if (width < md) return DeviceType.mobile;
    if (width < xl) return DeviceType.tablet;
    if (width < xl2) return DeviceType.laptop;
    if (width < xl3) return DeviceType.desktop;
    return DeviceType.largeScreen;
  }
}

/// 设备类型枚举
enum DeviceType {
  smallPhone, // < 480px
  mobile, // 481px - 640px
  tablet, // 641px - 1024px
  laptop, // 1025px - 1366px
  desktop, // 1367px - 1920px
  largeScreen, // > 1920px
}
