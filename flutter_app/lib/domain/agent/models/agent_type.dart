enum AgentLevel { junior, mid, senior, expert }
enum AgentCategory { product, design, engineering, business, marketing, finance }

class AgentType {
  const AgentType({
    required this.id,
    required this.name,
    required this.emoji,
    required this.desc,
    required this.skills,
    required this.salary,
    required this.level,
    required this.category,
  });

  final String id;
  final String name;
  final String emoji;
  final String desc;
  final List<String> skills;
  final double salary;
  final AgentLevel level;
  final AgentCategory category;
}
