export { buildTitlePrompt };

const buildTitlePrompt = messages => {
  const roleMap = {
    user: '用户',
    assistant: '助手',
    system: '系统'
  };
  const transcript = messages
    .map(msg => `${roleMap[msg.role] || '用户'}：${msg.content}`)
    .join('\n');
  return `你是对话标题生成助手。\n\n任务：根据对话内容生成一个简洁、准确的中文标题。\n\n要求：\n1. 不超过20个汉字\n2. 不要使用引号\n3. 不要添加编号或前缀\n4. 避免过度概括，突出关键主题\n\n对话内容：\n${transcript}\n\n请只输出标题本身：`;
};
