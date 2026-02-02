/**
 * 测试战略设计阶段API调用
 * 用于诊断执行卡住的问题
 */

const API_URL = 'http://localhost:3000';
const PROJECT_ID = 'test-project-' + Date.now();

async function testStrategyStage() {
    console.log('========== 开始测试战略设计阶段 ==========');
    console.log('项目ID:', PROJECT_ID);
    console.log('API地址:', API_URL);
    console.log('');

    const testContext = {
        CONVERSATION: `
用户: 我想做一个在线教育平台
助手: 这是一个很好的想法！可以详细说说吗？
用户: 主要面向K12学生，提供在线课程、作业辅导、学习进度跟踪等功能
助手: 明白了，这是一个K12在线教育平台
        `.trim()
    };

    try {
        console.log('[1/3] 发送API请求...');
        console.log('请求URL:', `${API_URL}/api/workflow/${PROJECT_ID}/execute-stage`);
        console.log('请求体:', JSON.stringify({
            stageId: 'strategy',
            context: testContext
        }, null, 2));
        console.log('');

        const startTime = Date.now();

        const response = await fetch(`${API_URL}/api/workflow/${PROJECT_ID}/execute-stage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                stageId: 'strategy',
                context: testContext
            })
        });

        const elapsed = Date.now() - startTime;
        console.log(`[2/3] 收到响应 (耗时: ${elapsed}ms)`);
        console.log('状态码:', response.status);
        console.log('状态文本:', response.statusText);
        console.log('');

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[错误] API返回错误:');
            console.error('响应内容:', errorText);
            throw new Error(`API错误: ${response.status} ${response.statusText}`);
        }

        console.log('[3/3] 解析响应数据...');
        const result = await response.json();

        console.log('');
        console.log('========== 执行成功 ==========');
        console.log('响应代码:', result.code);
        console.log('阶段ID:', result.data?.stageId);
        console.log('交付物数量:', result.data?.artifacts?.length || 0);
        console.log('总Token数:', result.data?.totalTokens || 0);
        console.log('');

        if (result.data?.artifacts?.length > 0) {
            const artifact = result.data.artifacts[0];
            console.log('========== 交付物详情 ==========');
            console.log('交付物ID:', artifact.id);
            console.log('交付物名称:', artifact.name);
            console.log('交付物类型:', artifact.type);
            console.log('生成时间:', new Date(artifact.createdAt).toLocaleString('zh-CN'));
            console.log('Token使用:', artifact.tokens);
            console.log('');
            console.log('========== 内容预览 ==========');
            console.log(artifact.content.substring(0, 500) + '...');
            console.log('');
            console.log('完整内容长度:', artifact.content.length, '字符');
        }

        console.log('');
        console.log('✅ 测试通过！战略设计阶段执行正常。');

    } catch (error) {
        console.error('');
        console.error('========== 执行失败 ==========');
        console.error('错误类型:', error.name);
        console.error('错误信息:', error.message);

        if (error.cause) {
            console.error('错误原因:', error.cause);
        }

        if (error.stack) {
            console.error('');
            console.error('错误堆栈:');
            console.error(error.stack);
        }

        console.error('');
        console.error('❌ 测试失败！请检查：');
        console.error('1. 后端服务是否正常运行（http://localhost:3000）');
        console.error('2. .env 文件中的 DEEPSEEK_API_KEY 是否配置正确');
        console.error('3. 网络连接是否正常');
        console.error('4. DeepSeek API 是否可访问');

        process.exit(1);
    }
}

// 运行测试
testStrategyStage();
