/**
 * 统一错误处理中间件
 * 捕获所有路由中的错误，统一返回格式
 */
export default function errorHandler(err, req, res, next) {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // 记录错误日志
    console.error(`[Error ${status}] ${message}`);
    console.error('Stack:', err.stack);

    // 返回统一的错误响应格式
    res.status(status).json({
        code: -1,
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            details: err.details || null
        })
    });
}
