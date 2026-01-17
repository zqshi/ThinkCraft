import 'package:flutter/material.dart';

import '../../../core/multimodal/multimodal_input_manager.dart';
import '../../themes/app_colors.dart';
import '../../themes/app_animations.dart';

class MultimodalInputField extends StatefulWidget {
  const MultimodalInputField({
    super.key,
    required this.controller,
    required this.onSubmit,
    this.hintText,
  });

  final TextEditingController controller;
  final ValueChanged<String> onSubmit;
  final String? hintText;

  @override
  State<MultimodalInputField> createState() => _MultimodalInputFieldState();
}

class _MultimodalInputFieldState extends State<MultimodalInputField> {
  final MultimodalInputManager _manager = MultimodalInputManager();
  bool _processing = false;

  @override
  void dispose() {
    _manager.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColorsDark.border : AppColors.border;
    final bgSecondary = isDark ? AppColorsDark.bgSecondary : AppColors.bgSecondary;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        _ToolButton(
          icon: Icons.mic_none_outlined,
          onTap: _processing
              ? null
              : () async {
                  setState(() => _processing = true);
                  try {
                    final text = await _manager.captureVoiceInput();
                    _appendText(text);
                  } finally {
                    if (mounted) {
                      setState(() => _processing = false);
                    }
                  }
                },
        ),
        const SizedBox(width: 8),
        _ToolButton(
          icon: Icons.image_outlined,
          onTap: _processing
              ? null
              : () async {
                  setState(() => _processing = true);
                  try {
                    final text = await _manager.captureImageText();
                    if (text != null && text.trim().isNotEmpty) {
                      _appendText(text);
                    }
                  } finally {
                    if (mounted) {
                      setState(() => _processing = false);
                    }
                  }
                },
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: bgSecondary,
              borderRadius: BorderRadius.circular(12),
              // 对齐Web端输入框边框 border: 1px solid var(--border)
              border: Border.all(color: borderColor, width: 1),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: TextField(
                    controller: widget.controller,
                    enabled: !_processing,
                    minLines: 1,
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText: widget.hintText ??
                          '分享你的创意想法，让我们通过深度对话来探索它的可能性...',
                      border: InputBorder.none,
                      filled: false,
                      isDense: true,
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // 发送按钮 + 点击动画（对应Web端 button:active { transform: scale(0.98); }）
                AnimatedButton(
                  onTap: _processing
                      ? null
                      : () {
                          final value = widget.controller.text.trim();
                          if (value.isEmpty) return;
                          widget.onSubmit(value);
                        },
                  child: ElevatedButton(
                    onPressed: _processing
                        ? null
                        : () {
                            final value = widget.controller.text.trim();
                            if (value.isEmpty) return;
                            widget.onSubmit(value);
                          },
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(36, 36),
                      padding: EdgeInsets.zero,
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Icon(Icons.send, size: 18),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _appendText(String text) {
    if (text.trim().isEmpty) return;
    final current = widget.controller.text;
    widget.controller.text = current.isEmpty ? text : '$current\n$text';
    widget.controller.selection = TextSelection.fromPosition(
      TextPosition(offset: widget.controller.text.length),
    );
  }
}

/// 工具按钮组件
/// 对齐Web端 .tool-btn { padding: 8px 14px; }
class _ToolButton extends StatelessWidget {
  const _ToolButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColorsDark.border : AppColors.border;
    final bgSecondary = isDark ? AppColorsDark.bgSecondary : AppColors.bgSecondary;

    return AnimatedButton(
      onTap: onTap,
      child: OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          // 对齐Web端 .tool-btn { padding: 8px 14px; }
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          backgroundColor: bgSecondary,
          foregroundColor: AppColors.textSecondary,
          // 对齐Web端 .tool-btn { border: 1px solid var(--border); }
          side: BorderSide(color: borderColor, width: 1),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        child: Icon(icon, size: 20),
      ),
    );
  }
}
