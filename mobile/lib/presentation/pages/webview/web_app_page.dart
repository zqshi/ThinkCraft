import 'package:flutter/material.dart';
import 'dart:js' as js;

/// 重定向到Web端页面
class WebAppPage extends StatefulWidget {
  const WebAppPage({super.key});

  @override
  State<WebAppPage> createState() => _WebAppPageState();
}

class _WebAppPageState extends State<WebAppPage> {
  @override
  void initState() {
    super.initState();
    // 直接重定向到8082端口
    Future.delayed(const Duration(milliseconds: 500), () {
      js.context.callMethod('open', ['http://localhost:8082/index.html', '_self']);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 24),
            const Text(
              '正在跳转到Web端...',
              style: TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () {
                js.context.callMethod('open', ['http://localhost:8082/index.html', '_self']);
              },
              child: const Text('如果没有自动跳转，请点击这里'),
            ),
          ],
        ),
      ),
    );
  }
}
