import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/api/api_client.dart';
import '../../domain/agent/repositories/agent_repository.dart';
import '../../domain/agent/services/agent_hire_service.dart';
import '../../domain/business_plan/repositories/business_plan_repository.dart';
import '../../domain/collaboration/repositories/collaboration_repository.dart';
import '../../domain/collaboration/services/collaboration_service.dart';
import '../../domain/conversation/repositories/conversation_repository.dart';
import '../../domain/conversation/services/conversation_service.dart';
import '../../domain/demo/repositories/demo_repository.dart';
import '../../domain/demo/services/demo_service.dart';
import '../../domain/pdf_export/repositories/pdf_export_repository.dart';
import '../../domain/report/repositories/report_repository.dart';
import '../../domain/report/services/report_service.dart';
import '../../domain/share/repositories/share_repository.dart';
import '../../domain/share/services/share_service.dart';
import '../../application/usecases/hire_agent_usecase.dart';
import '../../application/usecases/create_conversation_usecase.dart';
import '../../application/usecases/send_conversation_message_usecase.dart';
import '../../application/usecases/create_share_usecase.dart';
import '../../application/usecases/create_collaboration_plan_usecase.dart';
import '../../application/usecases/analyze_collaboration_usecase.dart';
import '../../application/usecases/execute_collaboration_usecase.dart';
import '../../application/usecases/generate_collaboration_modes_usecase.dart';
import '../../application/usecases/generate_business_plan_usecase.dart';
import '../../application/usecases/generate_demo_usecase.dart';
import '../../application/usecases/generate_report_usecase.dart';
import '../../application/usecases/export_pdf_usecase.dart';
import '../repositories/agent_repository_impl.dart';
import '../repositories/business_plan_repository_impl.dart';
import '../repositories/collaboration_repository_impl.dart';
import '../repositories/conversation_repository_impl.dart';
import '../repositories/demo_repository_impl.dart';
import '../repositories/pdf_export_repository_impl.dart';
import '../repositories/report_repository_impl.dart';
import '../repositories/share_repository_impl.dart';
import '../services/settings_service.dart';
import '../services/auth_service.dart';

final GetIt getIt = GetIt.instance;

Future<void> configureDependencies() async {
  if (getIt.isRegistered<ApiClient>()) {
    return;
  }

  // 初始化SharedPreferences（对齐Web端localStorage）
  final prefs = await SharedPreferences.getInstance();
  getIt.registerSingleton<SharedPreferences>(prefs);

  // 注册服务层（设置和认证）
  getIt.registerSingleton<SettingsService>(
    SettingsService(getIt<SharedPreferences>()),
  );
  getIt.registerSingleton<AuthService>(
    AuthService(getIt<SharedPreferences>()),
  );

  getIt.registerLazySingleton<ApiClient>(() => ApiClient());
  getIt.registerLazySingleton<AgentRepository>(
    () => AgentRepositoryImpl(getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<ConversationRepository>(
    () => ConversationRepositoryImpl(getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<ReportRepository>(
    () => ReportRepositoryImpl(getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<ShareRepository>(
    () => ShareRepositoryImpl(getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<CollaborationRepository>(
    () => CollaborationRepositoryImpl(getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<BusinessPlanRepository>(
    () => BusinessPlanRepositoryImpl(getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<DemoRepository>(
    () => DemoRepositoryImpl(getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<PdfExportRepository>(
    () => PdfExportRepositoryImpl(getIt<ApiClient>()),
  );

  getIt.registerFactory<AgentHireService>(() => AgentHireService());
  getIt.registerFactory<ConversationService>(() => ConversationService());
  getIt.registerFactory<ReportService>(() => ReportService());
  getIt.registerFactory<ShareService>(() => ShareService());
  getIt.registerFactory<CollaborationService>(() => CollaborationService());
  getIt.registerFactory<DemoService>(() => DemoService());

  getIt.registerFactory<HireAgentUseCase>(
    () => HireAgentUseCase(getIt<AgentRepository>(), getIt<AgentHireService>()),
  );
  getIt.registerFactory<CreateConversationUseCase>(
    () => CreateConversationUseCase(
      getIt<ConversationRepository>(),
      getIt<ConversationService>(),
    ),
  );
  getIt.registerFactory<SendConversationMessageUseCase>(
    () => SendConversationMessageUseCase(getIt<ConversationRepository>()),
  );
  getIt.registerFactory<GenerateReportUseCase>(
    () => GenerateReportUseCase(
      getIt<ReportRepository>(),
      getIt<ReportService>(),
    ),
  );
  getIt.registerFactory<CreateShareUseCase>(
    () => CreateShareUseCase(
      getIt<ShareRepository>(),
      getIt<ShareService>(),
    ),
  );
  getIt.registerFactory<CreateCollaborationPlanUseCase>(
    () => CreateCollaborationPlanUseCase(
      getIt<CollaborationRepository>(),
      getIt<CollaborationService>(),
    ),
  );
  getIt.registerFactory<AnalyzeCollaborationUseCase>(
    () => AnalyzeCollaborationUseCase(getIt<CollaborationRepository>()),
  );
  getIt.registerFactory<ExecuteCollaborationUseCase>(
    () => ExecuteCollaborationUseCase(getIt<CollaborationRepository>()),
  );
  getIt.registerFactory<GenerateCollaborationModesUseCase>(
    () => GenerateCollaborationModesUseCase(getIt<CollaborationRepository>()),
  );
  getIt.registerFactory<GenerateBusinessPlanUseCase>(
    () => GenerateBusinessPlanUseCase(getIt<BusinessPlanRepository>()),
  );
  getIt.registerFactory<GenerateDemoUseCase>(
    () => GenerateDemoUseCase(
      getIt<DemoRepository>(),
      getIt<DemoService>(),
    ),
  );
  getIt.registerFactory<ExportPdfUseCase>(
    () => ExportPdfUseCase(getIt<PdfExportRepository>()),
  );
}
