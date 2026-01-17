import 'package:flutter/material.dart';
import '../../themes/app_colors.dart';
import '../../themes/app_radius.dart';

/// 长按菜单组件
/// 对齐Web端 .chat-item-menu 样式和行为
class LongPressMenu extends StatelessWidget {
  const LongPressMenu({
    super.key,
    required this.items,
    this.onSelected,
  });

  final List<LongPressMenuItem> items;
  final Function(LongPressMenuItem)? onSelected;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? AppColorsDark.bgSecondary : AppColors.bgSecondary;
    final borderColor = isDark ? AppColorsDark.border : AppColors.border;

    return Container(
      decoration: BoxDecoration(
        color: bgColor,
        border: Border.all(color: borderColor, width: 1),
        borderRadius: BorderRadius.circular(AppRadius.sm), // 8px
        boxShadow: const [
          BoxShadow(
            color: Color(0x26000000), // rgba(0, 0, 0, 0.15)
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: items.map((item) {
          final index = items.indexOf(item);
          return _MenuItem(
            item: item,
            isFirst: index == 0,
            isLast: index == items.length - 1,
            onTap: () {
              Navigator.of(context).pop();
              onSelected?.call(item);
            },
          );
        }).toList(),
      ),
    );
  }
}

class LongPressMenuItem {
  const LongPressMenuItem({
    required this.label,
    required this.icon,
    this.onTap,
    this.isDangerous = false,
  });

  final String label;
  final IconData icon;
  final VoidCallback? onTap;
  final bool isDangerous;
}

class _MenuItem extends StatelessWidget {
  const _MenuItem({
    required this.item,
    required this.isFirst,
    required this.isLast,
    required this.onTap,
  });

  final LongPressMenuItem item;
  final bool isFirst;
  final bool isLast;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColorsDark.textSecondary : AppColors.textSecondary;
    final hoverBgColor = isDark ? AppColorsDark.bgSecondary : AppColors.bgSecondary;
    final dangerColor = const Color(0xFFEF4444); // Web端危险色

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10), // 对齐Web端
        decoration: BoxDecoration(
          borderRadius: BorderRadius.vertical(
            top: isFirst ? const Radius.circular(8) : Radius.zero,
            bottom: isLast ? const Radius.circular(8) : Radius.zero,
          ),
        ),
        child: Row(
          children: [
            Icon(
              item.icon,
              size: 16,
              color: item.isDangerous ? dangerColor : textColor,
            ),
            const SizedBox(width: 8),
            Text(
              item.label,
              style: TextStyle(
                fontSize: 13, // 对齐Web端
                color: item.isDangerous ? dangerColor : textColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 显示长按菜单的辅助函数
Future<void> showLongPressMenu({
  required BuildContext context,
  required Offset position,
  required List<LongPressMenuItem> items,
  Function(LongPressMenuItem)? onSelected,
}) async {
  final RenderBox? overlay = Navigator.of(context).overlay?.context.findRenderObject() as RenderBox?;
  if (overlay == null) return;

  final RelativeRect positionRect = RelativeRect.fromRect(
    Rect.fromPoints(position, position),
    Offset.zero & overlay.size,
  );

  final selectedItem = await showDialog<LongPressMenuItem>(
    context: context,
    barrierColor: Colors.transparent,
    builder: (context) {
      return Stack(
        children: [
          // 点击空白处关闭菜单
          Positioned.fill(
            child: GestureDetector(
              onTap: () => Navigator.of(context).pop(),
              child: Container(color: Colors.transparent),
            ),
          ),
          // 菜单内容
          Positioned(
            left: positionRect.left,
            top: positionRect.top + 20, // 稍微偏移避免遮挡
            child: LongPressMenu(
              items: items,
              onSelected: (item) {
                Navigator.of(context).pop(item);
              },
            ),
          ),
        ],
      );
    },
  );

  if (selectedItem != null) {
    onSelected?.call(selectedItem);
  }
}