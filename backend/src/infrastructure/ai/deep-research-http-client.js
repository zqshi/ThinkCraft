/**
 * DeepResearch HTTP客户端
 *
 * 调用Python微服务进行深度研究生成，带重试机制
 */
import axios from 'axios';

const DEEPRESEARCH_SERVICE_URL = process.env.DEEPRESEARCH_SERVICE_URL || 'http://localhost:5001';
const REQUEST_TIMEOUT = 600000; // 10分钟超时，避免误判
const MAX_RETRIES = 5; // 最大重试次数

/**
 * 调用DeepResearch Python微服务（带重试机制）
 *
 * @param {String} chapterId - 章节ID
 * @param {Array} conversationHistory - 对话历史
 * @param {String} type - 文档类型（business/proposal）
 * @param {String} researchDepth - 研究深度（shallow/medium/deep）
 * @returns {Promise<Object>} 生成结果
 */
export async function callDeepResearchService(
  chapterId,
  conversationHistory,
  type = 'business',
  researchDepth = 'medium'
) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[DeepResearch] 第${attempt}次尝试调用服务...`);

      const response = await axios.post(
        `${DEEPRESEARCH_SERVICE_URL}/research/business-plan-chapter`,
        {
          chapterId,
          conversationHistory,
          type,
          researchDepth
        },
        {
          timeout: REQUEST_TIMEOUT,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`[DeepResearch] 第${attempt}次调用成功`);
      return response.data;
    } catch (error) {
      lastError = error;
      console.error(`[DeepResearch] 第${attempt}次调用失败:`, error.message);

      // 判断是否为服务异常（需要重试）
      const isServiceError =
        error.code === 'ECONNREFUSED' || // 连接被拒绝
        error.code === 'ETIMEDOUT' || // 连接超时
        error.code === 'ENOTFOUND' || // 域名解析失败
        (error.response && error.response.status >= 500); // 服务器错误

      // 如果是超时错误（ECONNABORTED），不重试，直接抛出
      if (error.code === 'ECONNABORTED') {
        throw new Error('DeepResearch生成超时（10分钟），请检查服务状态或稍后重试');
      }

      // 如果不是服务异常，直接抛出错误
      if (!isServiceError) {
        if (error.response) {
          throw new Error(`DeepResearch服务错误: ${error.response.data.error || error.message}`);
        } else {
          throw new Error(`DeepResearch调用失败: ${error.message}`);
        }
      }

      // 如果是最后一次重试，抛出错误
      if (attempt === MAX_RETRIES) {
        throw new Error(`DeepResearch服务异常，已重试${MAX_RETRIES}次仍失败: ${lastError.message}`);
      }

      // 等待后重试（指数退避）
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // 最多等待10秒
      console.log(`[DeepResearch] 等待${delay}ms后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // 理论上不会到这里，但为了类型安全
  throw new Error(`DeepResearch服务异常，已重试${MAX_RETRIES}次仍失败`);
}

/**
 * 健康检查
 *
 * @returns {Promise<Boolean>} 服务是否健康
 */
export async function checkDeepResearchHealth() {
  try {
    const response = await axios.get(`${DEEPRESEARCH_SERVICE_URL}/health`, {
      timeout: 5000
    });
    return response.data.status === 'ok';
  } catch (error) {
    console.error('[DeepResearch] 健康检查失败:', error.message);
    return false;
  }
}
