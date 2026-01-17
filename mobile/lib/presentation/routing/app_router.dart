import 'package:go_router/go_router.dart';

import '../pages/webview/web_app_page.dart';
import '../pages/home/home_page.dart';
import '../pages/agents/agent_page.dart';
import '../pages/business_plan/business_plan_page.dart';
import '../pages/business_plan/business_plan_detail_page.dart';
import '../pages/business_plan/business_plan_export_page.dart';
import '../pages/collaboration/collaboration_page.dart';
import '../pages/conversations/conversation_page.dart';
import '../pages/conversations/conversation_detail_page.dart';
import '../pages/demo/demo_page.dart';
import '../pages/demo/demo_detail_page.dart';
import '../pages/pdf_export/pdf_export_page.dart';
import '../pages/pdf_export/pdf_export_detail_page.dart';
import '../pages/reports/report_page.dart';
import '../pages/reports/report_detail_page.dart';
import '../pages/share/share_page.dart';
import '../pages/share/share_detail_page.dart';

class AppRouter {
  static final GoRouter router = GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const WebAppPage(),
      ),
      GoRoute(
        path: '/flutter-home',
        builder: (context, state) => const HomePage(),
      ),
      GoRoute(
        path: '/agents',
        builder: (context, state) => const AgentPage(),
      ),
      GoRoute(
        path: '/conversations',
        builder: (context, state) => const ConversationPage(),
      ),
      GoRoute(
        path: '/conversations/:id',
        builder: (context, state) =>
            ConversationDetailPage(conversationId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/reports',
        builder: (context, state) => const ReportPage(),
      ),
      GoRoute(
        path: '/reports/:id',
        builder: (context, state) =>
            ReportDetailPage(reportId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/collaboration',
        builder: (context, state) => const CollaborationPage(),
      ),
      GoRoute(
        path: '/business-plan',
        builder: (context, state) => const BusinessPlanPage(),
      ),
      GoRoute(
        path: '/business-plan/detail',
        builder: (context, state) => const BusinessPlanDetailPage(),
      ),
      GoRoute(
        path: '/business-plan/export',
        builder: (context, state) => const BusinessPlanExportPage(),
      ),
      GoRoute(
        path: '/demo',
        builder: (context, state) => const DemoPage(),
      ),
      GoRoute(
        path: '/demo/detail',
        builder: (context, state) => const DemoDetailPage(),
      ),
      GoRoute(
        path: '/share',
        builder: (context, state) => const SharePage(),
      ),
      GoRoute(
        path: '/share/:id',
        builder: (context, state) =>
            ShareDetailPage(shareId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/pdf-export',
        builder: (context, state) => const PdfExportPage(),
      ),
      GoRoute(
        path: '/pdf-export/detail',
        builder: (context, state) => const PdfExportDetailPage(),
      ),
    ],
  );
}
