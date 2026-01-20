/**
 * 认证路由
 * 提供登录/登出/用户信息的最小实现
 */
import express from 'express';

const router = express.Router();

/**
 * POST /api/auth/login
 * 请求体:
 * { username: '...', password: '...' }
 */
router.post('/login', (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({
            code: -1,
            error: 'username 和 password 为必填项'
        });
    }

    res.json({
        code: 0,
        data: {
            token: 'mock-token',
            user: {
                id: 'user-1',
                username,
                name: username
            }
        }
    });
});

/**
 * GET /api/auth/me
 * 返回当前用户信息
 */
router.get('/me', (req, res) => {
    res.json({
        code: 0,
        data: {
            user: {
                id: 'user-1',
                username: 'demo',
                name: 'Demo User'
            }
        }
    });
});

/**
 * POST /api/auth/logout
 * 模拟退出
 */
router.post('/logout', (req, res) => {
    res.json({
        code: 0,
        data: {
            success: true
        }
    });
});

export default router;
