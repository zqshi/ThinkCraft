/**
 * 分享链接系统 API
 * 支持创意报告分享和访问
 */
import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// 内存存储（生产环境应使用Redis或数据库）
const shareStorage = new Map();

// 分享链接过期时间（7天）
const EXPIRE_TIME = 7 * 24 * 60 * 60 * 1000;

/**
 * 生成短链ID
 * @returns {String} 8位短链ID
 */
function generateShortId() {
    return crypto.randomBytes(4).toString('hex');
}

/**
 * 清理过期分享
 */
function cleanExpiredShares() {
    const now = Date.now();
    for (const [id, data] of shareStorage.entries()) {
        if (now > data.expiresAt) {
            shareStorage.delete(id);
        }
    }
}

// 定期清理过期数据（每小时）
setInterval(cleanExpiredShares, 60 * 60 * 1000);

/**
 * POST /api/share/create
 * 创建分享链接
 */
router.post('/create', async (req, res, next) => {
    try {
        const { type, data, title } = req.body;

        if (!type || !data) {
            return res.status(400).json({
                code: -1,
                error: '缺少必要参数: type 和 data'
            });
        }

        // 生成短链ID
        const shareId = generateShortId();
        const now = Date.now();
        const expiresAt = now + EXPIRE_TIME;

        // 存储分享数据
        shareStorage.set(shareId, {
            type,
            data,
            title: title || '创意分享',
            createdAt: now,
            expiresAt,
            views: 0
        });

        // 生成分享URL
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const shareUrl = `${baseUrl}/share/${shareId}`;

        console.log(`[Share] 创建分享: ${shareId}, 类型: ${type}`);

        res.json({
            code: 0,
            data: {
                shareId,
                shareUrl,
                expiresAt: new Date(expiresAt).toISOString(),
                qrCodeUrl: `/api/share/qrcode/${shareId}`
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/share/:shareId
 * 获取分享内容
 */
router.get('/:shareId', async (req, res, next) => {
    try {
        const { shareId } = req.params;

        if (!shareStorage.has(shareId)) {
            return res.status(404).json({
                code: -1,
                error: '分享链接不存在或已过期'
            });
        }

        const shareData = shareStorage.get(shareId);

        // 检查是否过期
        if (Date.now() > shareData.expiresAt) {
            shareStorage.delete(shareId);
            return res.status(404).json({
                code: -1,
                error: '分享链接已过期'
            });
        }

        // 增加浏览次数
        shareData.views++;

        console.log(`[Share] 访问分享: ${shareId}, 浏览: ${shareData.views}次`);

        res.json({
            code: 0,
            data: {
                type: shareData.type,
                title: shareData.title,
                content: shareData.data,
                createdAt: new Date(shareData.createdAt).toISOString(),
                views: shareData.views
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/share/qrcode/:shareId
 * 生成分享二维码
 */
router.get('/qrcode/:shareId', async (req, res, next) => {
    try {
        const { shareId } = req.params;

        if (!shareStorage.has(shareId)) {
            return res.status(404).json({
                code: -1,
                error: '分享链接不存在'
            });
        }

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const shareUrl = `${baseUrl}/share/${shareId}`;

        // 使用第三方二维码API（或者自己实现）
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;

        // 重定向到二维码图片
        res.redirect(qrApiUrl);

    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/share/:shareId
 * 删除分享（可选功能，需要认证）
 */
router.delete('/:shareId', async (req, res, next) => {
    try {
        const { shareId } = req.params;

        if (!shareStorage.has(shareId)) {
            return res.status(404).json({
                code: -1,
                error: '分享链接不存在'
            });
        }

        shareStorage.delete(shareId);

        console.log(`[Share] 删除分享: ${shareId}`);

        res.json({
            code: 0,
            message: '分享已删除'
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/share/stats/summary
 * 获取分享统计（可选功能）
 */
router.get('/stats/summary', (req, res) => {
    const stats = {
        totalShares: shareStorage.size,
        totalViews: Array.from(shareStorage.values()).reduce((sum, item) => sum + item.views, 0),
        sharesByType: {}
    };

    for (const data of shareStorage.values()) {
        stats.sharesByType[data.type] = (stats.sharesByType[data.type] || 0) + 1;
    }

    res.json({
        code: 0,
        data: stats
    });
});

export default router;
