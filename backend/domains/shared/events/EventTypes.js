/**
 * Domain event type registry.
 */
export const EVENT_TYPES = {
  AGENT_HIRED: 'agent.hired',
  AGENT_FIRED: 'agent.fired',
  AGENT_TASK_ASSIGNED: 'agent.task_assigned',
  TEAM_COLLABORATION_COMPLETED: 'agent.team_collaboration_completed',
  CONVERSATION_CREATED: 'conversation.created',
  REPORT_GENERATED: 'report.generated',
  REPORT_REGENERATED: 'report.regenerated',
  SHARE_CREATED: 'share.created',
  BUSINESS_PLAN_GENERATED: 'business_plan.generated',
  DEMO_GENERATED: 'demo.generated',
  PDF_EXPORTED: 'pdf_exported',
  VISION_ANALYZED: 'vision.analyzed',
  CHAT_COMPLETED: 'chat.completed',
  COLLABORATION_CREATED: 'collaboration.created',
  COLLABORATION_EXECUTED: 'collaboration.executed'
};

export default EVENT_TYPES;
