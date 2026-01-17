import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/material.dart';

import '../../domain/agent/repositories/agent_repository.dart';
import '../../domain/business_plan/repositories/business_plan_repository.dart';
import '../../domain/collaboration/repositories/collaboration_repository.dart';
import '../../domain/conversation/repositories/conversation_repository.dart';
import '../../domain/demo/repositories/demo_repository.dart';
import '../../domain/pdf_export/repositories/pdf_export_repository.dart';
import '../../domain/report/repositories/report_repository.dart';
import '../../domain/share/repositories/share_repository.dart';
import '../../application/usecases/hire_agent_usecase.dart';
import '../../application/usecases/create_conversation_usecase.dart';
import '../../application/usecases/send_conversation_message_usecase.dart';
import '../../application/usecases/generate_report_usecase.dart';
import '../../application/usecases/create_share_usecase.dart';
import '../../application/usecases/create_collaboration_plan_usecase.dart';
import '../../application/usecases/analyze_collaboration_usecase.dart';
import '../../application/usecases/execute_collaboration_usecase.dart';
import '../../application/usecases/generate_collaboration_modes_usecase.dart';
import '../../application/usecases/generate_business_plan_usecase.dart';
import '../../application/usecases/generate_demo_usecase.dart';
import '../../application/usecases/export_pdf_usecase.dart';
import '../../infrastructure/di/injection.dart';
import '../../infrastructure/services/settings_service.dart';
import '../../infrastructure/services/auth_service.dart';
import 'app_state.dart';

final agentRepositoryProvider = Provider<AgentRepository>((ref) => getIt<AgentRepository>());
final conversationRepositoryProvider = Provider<ConversationRepository>((ref) => getIt<ConversationRepository>());
final reportRepositoryProvider = Provider<ReportRepository>((ref) => getIt<ReportRepository>());
final shareRepositoryProvider = Provider<ShareRepository>((ref) => getIt<ShareRepository>());
final collaborationRepositoryProvider = Provider<CollaborationRepository>((ref) => getIt<CollaborationRepository>());
final businessPlanRepositoryProvider = Provider<BusinessPlanRepository>((ref) => getIt<BusinessPlanRepository>());
final demoRepositoryProvider = Provider<DemoRepository>((ref) => getIt<DemoRepository>());
final pdfExportRepositoryProvider = Provider<PdfExportRepository>((ref) => getIt<PdfExportRepository>());

final hireAgentUseCaseProvider = Provider<HireAgentUseCase>((ref) => getIt<HireAgentUseCase>());
final createConversationUseCaseProvider = Provider<CreateConversationUseCase>((ref) => getIt<CreateConversationUseCase>());
final sendConversationMessageUseCaseProvider = Provider<SendConversationMessageUseCase>((ref) => getIt<SendConversationMessageUseCase>());
final generateReportUseCaseProvider = Provider<GenerateReportUseCase>((ref) => getIt<GenerateReportUseCase>());
final createShareUseCaseProvider = Provider<CreateShareUseCase>((ref) => getIt<CreateShareUseCase>());
final createCollaborationPlanUseCaseProvider = Provider<CreateCollaborationPlanUseCase>((ref) => getIt<CreateCollaborationPlanUseCase>());
final analyzeCollaborationUseCaseProvider = Provider<AnalyzeCollaborationUseCase>((ref) => getIt<AnalyzeCollaborationUseCase>());
final executeCollaborationUseCaseProvider = Provider<ExecuteCollaborationUseCase>((ref) => getIt<ExecuteCollaborationUseCase>());
final generateCollaborationModesUseCaseProvider = Provider<GenerateCollaborationModesUseCase>((ref) => getIt<GenerateCollaborationModesUseCase>());
final generateBusinessPlanUseCaseProvider = Provider<GenerateBusinessPlanUseCase>((ref) => getIt<GenerateBusinessPlanUseCase>());
final generateDemoUseCaseProvider = Provider<GenerateDemoUseCase>((ref) => getIt<GenerateDemoUseCase>());
final exportPdfUseCaseProvider = Provider<ExportPdfUseCase>((ref) => getIt<ExportPdfUseCase>());

// ==================== 应用状态管理 ====================

/// 服务Provider
final settingsServiceProvider = Provider<SettingsService>(
  (ref) => getIt<SettingsService>(),
);

final authServiceProvider = Provider<AuthService>(
  (ref) => getIt<AuthService>(),
);

/// 应用状态Provider
final appStateProvider = StateNotifierProvider<AppStateNotifier, AppState>(
  (ref) => AppStateNotifier(
    ref.watch(settingsServiceProvider),
    ref.watch(authServiceProvider),
  ),
);

/// 便捷访问Provider - 主题模式
final themeModeProvider = Provider<ThemeMode>((ref) {
  final darkMode = ref.watch(appStateProvider.select((s) => s.settings.darkMode));
  return darkMode ? ThemeMode.dark : ThemeMode.light;
});

/// 便捷访问Provider - 登录状态
final isLoggedInProvider = Provider<bool>((ref) {
  return ref.watch(appStateProvider.select((s) => s.auth.isLoggedIn));
});

/// 便捷访问Provider - 当前用户名
final currentUsernameProvider = Provider<String>((ref) {
  return ref.watch(appStateProvider.select((s) => s.auth.username));
});

/// 便捷访问Provider - 显示名称
final currentDisplayNameProvider = Provider<String>((ref) {
  return ref.watch(appStateProvider.select((s) => s.auth.displayName));
});

/// 便捷访问Provider - 登出遮罩显示状态
final showLogoutOverlayProvider = Provider<bool>((ref) {
  return ref.watch(appStateProvider.select((s) => s.showLogoutOverlay));
});
