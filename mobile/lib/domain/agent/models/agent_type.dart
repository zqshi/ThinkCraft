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

  factory AgentType.fromJson(Map<String, dynamic> json) {
    return AgentType(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      emoji: json['emoji']?.toString() ?? '🤖',
      desc: json['desc']?.toString() ?? '',
      skills: (json['skills'] as List<dynamic>? ?? [])
          .map((item) => item.toString())
          .toList(),
      salary: (json['salary'] is num) ? (json['salary'] as num).toDouble() : 0,
      level: _parseLevel(json['level']),
      category: _parseCategory(json['category']),
    );
  }

  static AgentLevel _parseLevel(dynamic value) {
    switch (value) {
      case 'junior':
        return AgentLevel.junior;
      case 'mid':
        return AgentLevel.mid;
      case 'senior':
        return AgentLevel.senior;
      case 'expert':
        return AgentLevel.expert;
      default:
        return AgentLevel.mid;
    }
  }

  static AgentCategory _parseCategory(dynamic value) {
    switch (value) {
      case 'product':
        return AgentCategory.product;
      case 'design':
        return AgentCategory.design;
      case 'engineering':
        return AgentCategory.engineering;
      case 'business':
        return AgentCategory.business;
      case 'marketing':
        return AgentCategory.marketing;
      case 'finance':
        return AgentCategory.finance;
      default:
        return AgentCategory.business;
    }
  }
}
