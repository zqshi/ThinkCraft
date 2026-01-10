import dotenv from 'dotenv';

dotenv.config();

console.log('=== 环境变量测试 ===');
console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY);
console.log('KEY长度:', process.env.DEEPSEEK_API_KEY?.length);
console.log('KEY前10个字符:', process.env.DEEPSEEK_API_KEY?.substring(0, 10));
console.log('==================');
