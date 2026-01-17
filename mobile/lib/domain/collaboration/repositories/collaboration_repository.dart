import '../models/collaboration_plan.dart';
import '../models/collaboration_analysis.dart';
import '../models/collaboration_execution.dart';
import '../models/collaboration_modes.dart';

abstract class CollaborationRepository {
  Future<CollaborationPlan> createPlan(String userId, String goal);
  Future<CollaborationPlan?> getPlan(String planId);
  Future<List<CollaborationPlan>> getUserPlans(String userId);
  Future<CollaborationAnalysis> analyzeCapability(String planId);
  Future<CollaborationModes> generateModes(String planId);
  Future<CollaborationExecutionResult> executePlan(String planId, String mode);
}
