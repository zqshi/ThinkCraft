import 'package:get_it/get_it.dart';

import '../../core/api/api_client.dart';
import '../../domain/agent/repositories/agent_repository.dart';
import '../../domain/agent/services/agent_hire_service.dart';
import '../../application/usecases/hire_agent_usecase.dart';
import '../repositories/agent_repository_impl.dart';

final GetIt getIt = GetIt.instance;

void configureDependencies() {
  if (getIt.isRegistered<ApiClient>()) {
    return;
  }

  getIt.registerLazySingleton<ApiClient>(() => ApiClient());
  getIt.registerLazySingleton<AgentRepository>(
    () => AgentRepositoryImpl(getIt<ApiClient>()),
  );
  getIt.registerFactory<AgentHireService>(() => AgentHireService());
  getIt.registerFactory<HireAgentUseCase>(
    () => HireAgentUseCase(getIt<AgentRepository>(), getIt<AgentHireService>()),
  );
}
