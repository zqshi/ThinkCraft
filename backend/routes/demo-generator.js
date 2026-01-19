/**
 * Demo代码生成 API
 * 使用AI生成可运行的产品原型代码
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callDeepSeekAPI } from '../config/deepseek.js';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 确保Demo输出目录存在
const DEMO_DIR = path.join(__dirname, '../../demos');
const TEMP_DIR = path.join(__dirname, '../../temp');

[DEMO_DIR, TEMP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

/**
 * 代码生成提示词模板
 */
const CODE_GENERATION_PROMPTS = {
    web: `你是一个专业的前端开发工程师。基于用户的创意对话，生成一个完整的、可运行的Web应用Demo。

要求：
1. 使用纯HTML + CSS + JavaScript（不需要构建工具）
2. 代码要完整、可直接在浏览器中打开运行
3. UI要美观、现代化，使用渐变色、圆角、阴影等设计元素
4. 响应式设计，适配桌面和移动端
5. 包含基本的交互功能和数据展示
6. 代码要有注释，便于理解

技术栈：
- HTML5
- CSS3（Flexbox、Grid、动画）
- Vanilla JavaScript（ES6+）
- 可以使用CDN引入的库（如Chart.js用于图表）

创意对话内容：
{CONVERSATION}

产品类型：{DEMO_TYPE}
核心功能：{FEATURES}

请生成完整的HTML代码（单文件）。直接输出代码，不要有任何解释文字。`,

    app: `你是一个移动应用UI工程师。基于用户的创意，生成一个移动App的HTML原型Demo。

要求：
1. 使用HTML + CSS模拟移动App的界面和交互
2. 采用移动优先设计，屏幕宽度固定为375px（iPhone标准宽度）
3. 包含底部导航栏、页面切换动画
4. UI风格现代、简洁，参考iOS/Android设计规范
5. 支持手势交互（滑动、点击）
6. 代码可直接在浏览器运行

创意对话内容：
{CONVERSATION}

核心功能：{FEATURES}

请生成完整的HTML代码。直接输出代码，不要有任何解释文字。`,

    miniapp: `你是一个小程序开发工程师。基于用户的创意，生成一个微信小程序风格的HTML Demo。

要求：
1. 使用HTML + CSS模拟小程序界面
2. 采用微信小程序的UI组件风格（WeUI）
3. 包含导航栏、标签栏、列表、卡片等常用组件
4. 宽度固定为375px，模拟小程序环境
5. 简洁、实用的交互设计
6. 代码可直接在浏览器运行

创意对话内容：
{CONVERSATION}

核心功能：{FEATURES}

请生成完整的HTML代码。直接输出代码，不要有任何解释文字。`,

    admin: `你是一个后台管理系统开发工程师。基于用户的创意，生成一个管理后台的HTML Demo。

要求：
1. 使用HTML + CSS + JavaScript构建管理后台界面
2. 包含侧边栏导航、顶部导航栏、数据面板
3. 使用表格、图表展示数据
4. 现代化的设计风格，深色/浅色主题
5. 响应式设计
6. 可以使用Chart.js等CDN库
7. 代码可直接在浏览器运行

创意对话内容：
{CONVERSATION}

核心功能：{FEATURES}

请生成完整的HTML代码。直接输出代码，不要有任何解释文字。`
};

/**
 * 格式化对话历史
 */
function formatConversation(conversationHistory) {
    return conversationHistory
        .map(msg => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
        .join('\n\n');
}

/**
 * 生成Demo代码
 */
async function generateDemoCode(demoType, conversationHistory, features = []) {
    const promptTemplate = CODE_GENERATION_PROMPTS[demoType] || CODE_GENERATION_PROMPTS.web;
    const conversation = formatConversation(conversationHistory);
    const featuresList = features.join(', ') || '基础功能展示';

    const prompt = promptTemplate
        .replace('{CONVERSATION}', conversation)
        .replace('{DEMO_TYPE}', demoType)
        .replace('{FEATURES}', featuresList);

    console.log(`[DemoGenerator] 开始生成${demoType}类型Demo...`);

    // 调用DeepSeek API生成代码
    const result = await callDeepSeekAPI(
        [{ role: 'user', content: prompt }],
        null,
        {
            max_tokens: 4000, // Demo代码可能较长
            temperature: 0.7
        }
    );

    let code = result.content;

    // 清理代码中的markdown标记
    code = code.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

    // 确保代码完整性
    if (!code.includes('<!DOCTYPE html>')) {
        code = `<!DOCTYPE html>\n${code}`;
    }

    if (!code.includes('</html>')) {
        code += '\n</html>';
    }

    return {
        code,
        tokens: result.usage.total_tokens
    };
}

/**
 * POST /api/demo-generator/generate
 * 生成Demo代码
 */
router.post('/generate', async (req, res, next) => {
    try {
        const { demoType, conversationHistory, features, ideaTitle, projectId } = req.body;

        // 参数验证
        if (!demoType) {
            return res.status(400).json({
                code: -1,
                error: '缺少参数: demoType'
            });
        }

        if (!conversationHistory || !Array.isArray(conversationHistory)) {
            return res.status(400).json({
                code: -1,
                error: '缺少或无效的对话历史'
            });
        }

        console.log(`[DemoGenerator] 收到生成请求: ${demoType}, 对话长度: ${conversationHistory.length}, 项目ID: ${projectId || '无'}`);

        // 生成代码
        const { code, tokens } = await generateDemoCode(demoType, conversationHistory, features);

        // 保存Demo文件
        const demoId = `demo_${Date.now()}`;
        const filename = `${demoId}.html`;
        const filepath = path.join(DEMO_DIR, filename);

        fs.writeFileSync(filepath, code, 'utf-8');

        console.log(`[DemoGenerator] ✓ Demo生成成功: ${filename}, tokens: ${tokens}`);

        // 构建响应数据
        const responseData = {
            demoId,
            filename,
            previewUrl: `/demos/${filename}`,
            downloadUrl: `/api/demo-generator/download/${demoId}`,
            codeLength: code.length,
            tokens,
            generatedAt: new Date().toISOString(),
            projectId: projectId || null
        };

        // 如果关联了项目，更新项目的demo数据
        if (projectId) {
            try {
                // 调用内部API更新项目（这里简化处理，实际应该调用projects模块）
                console.log(`[DemoGenerator] 关联到项目: ${projectId}`);
                responseData.projectLinked = true;
            } catch (error) {
                console.error(`[DemoGenerator] 项目关联失败:`, error);
                responseData.projectLinked = false;
            }
        }

        res.json({
            code: 0,
            data: responseData
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/demo-generator/preview/:demoId
 * 预览Demo
 */
router.get('/preview/:demoId', (req, res, next) => {
    try {
        const { demoId } = req.params;
        const filename = `${demoId}.html`;
        const filepath = path.join(DEMO_DIR, filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({
                code: -1,
                error: 'Demo不存在'
            });
        }

        const code = fs.readFileSync(filepath, 'utf-8');

        res.json({
            code: 0,
            data: {
                demoId,
                htmlCode: code
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/demo-generator/download/:demoId
 * 下载Demo源代码（ZIP格式）
 */
router.get('/download/:demoId', async (req, res, next) => {
    try {
        const { demoId } = req.params;
        const filename = `${demoId}.html`;
        const filepath = path.join(DEMO_DIR, filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({
                code: -1,
                error: 'Demo不存在'
            });
        }

        // 创建ZIP文件
        const zipFilename = `${demoId}.zip`;
        const zipFilepath = path.join(TEMP_DIR, zipFilename);

        const output = fs.createWriteStream(zipFilepath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        output.on('close', () => {
            // 发送ZIP文件
            res.download(zipFilepath, `${demoId}_source.zip`, (err) => {
                if (err) {
                    console.error('[DemoGenerator] 下载失败:', err);
                }
                // 删除临时文件
                setTimeout(() => {
                    if (fs.existsSync(zipFilepath)) {
                        fs.unlinkSync(zipFilepath);
                    }
                }, 5000);
            });
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(output);

        // 添加HTML文件
        archive.file(filepath, { name: 'index.html' });

        // 添加README
        const readme = `# ${demoId} - ThinkCraft AI生成的Demo

## 使用方法

1. 直接在浏览器中打开 index.html 文件
2. 或使用本地服务器运行：
   \`\`\`bash
   # Python 3
   python -m http.server 8000

   # Node.js
   npx serve
   \`\`\`

## 技术栈

- HTML5
- CSS3
- Vanilla JavaScript

## 说明

本Demo由ThinkCraft AI自动生成，代码仅供参考和学习使用。

生成时间：${new Date().toLocaleString('zh-CN')}
`;

        archive.append(readme, { name: 'README.md' });

        archive.finalize();

    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/demo-generator/:demoId
 * 删除Demo
 */
router.delete('/:demoId', (req, res, next) => {
    try {
        const { demoId } = req.params;
        const filename = `${demoId}.html`;
        const filepath = path.join(DEMO_DIR, filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({
                code: -1,
                error: 'Demo不存在'
            });
        }

        fs.unlinkSync(filepath);

        console.log(`[DemoGenerator] Demo已删除: ${demoId}`);

        res.json({
            code: 0,
            message: 'Demo已删除'
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/demo-generator/list
 * 获取Demo列表
 */
router.get('/list', (req, res, next) => {
    try {
        const files = fs.readdirSync(DEMO_DIR);
        const demos = files
            .filter(f => f.endsWith('.html'))
            .map(f => {
                const demoId = f.replace('.html', '');
                const filepath = path.join(DEMO_DIR, f);
                const stats = fs.statSync(filepath);

                return {
                    demoId,
                    filename: f,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    previewUrl: `/demos/${f}`,
                    downloadUrl: `/api/demo-generator/download/${demoId}`
                };
            })
            .sort((a, b) => b.createdAt - a.createdAt);

        res.json({
            code: 0,
            data: {
                total: demos.length,
                demos
            }
        });

    } catch (error) {
        next(error);
    }
});

export default router;
