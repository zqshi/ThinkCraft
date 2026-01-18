/**
 * 认证路由
 * 提供登录、注册、JWT 验证等功能
 */

import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../infrastructure/database/models/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /api/auth/register
 * 用户注册
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({
        code: -1,
        error: '用户名、邮箱和密码为必填项'
      });
    }

    // 验证用户名和邮箱是否已存在
    const existingUser = await User.findOne({
      where: {
        [User.sequelize.Sequelize.Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        code: -1,
        error: existingUser.username === username ? '用户名已存在' : '邮箱已被注册'
      });
    }

    // 密码加密
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await User.create({
      id: uuidv4(),
      username,
      email,
      passwordHash,
      displayName: displayName || username
    });

    // 生成 JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      code: 0,
      message: '注册成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName
        }
      }
    });
  } catch (error) {
    console.error('[Auth] 注册失败:', error);
    return res.status(500).json({
      code: -1,
      error: '注册失败: ' + error.message
    });
  }
});

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({
        code: -1,
        error: '用户名和密码为必填项'
      });
    }

    // 查找用户（支持用户名或邮箱登录）
    const user = await User.findOne({
      where: {
        [User.sequelize.Sequelize.Op.or]: [
          { username },
          { email: username }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({
        code: -1,
        error: '用户名或密码错误'
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        code: -1,
        error: '用户名或密码错误'
      });
    }

    // 更新最后登录时间
    await user.update({ lastLoginAt: new Date() });

    // 生成 JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    return res.json({
      code: 0,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          lastLoginAt: user.lastLoginAt
        }
      }
    });
  } catch (error) {
    console.error('[Auth] 登录失败:', error);
    return res.status(500).json({
      code: -1,
      error: '登录失败: ' + error.message
    });
  }
});

/**
 * GET /api/auth/me
 * 获取当前登录用户信息（需要认证）
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        code: -1,
        error: '未提供认证令牌'
      });
    }

    // 验证 JWT
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['passwordHash'] }
    });

    if (!user) {
      return res.status(404).json({
        code: -1,
        error: '用户不存在'
      });
    }

    return res.json({
      code: 0,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          lastLoginAt: user.lastLoginAt
        }
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        code: -1,
        error: '无效的认证令牌'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: -1,
        error: '认证令牌已过期'
      });
    }

    console.error('[Auth] 获取用户信息失败:', error);
    return res.status(500).json({
      code: -1,
      error: '获取用户信息失败: ' + error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * 用户登出（客户端删除 token，此处仅做日志记录）
 */
router.post('/logout', (req, res) => {
  // JWT 是无状态的，登出操作由客户端完成（删除 token）
  // 服务器端可以记录登出日志或将 token 加入黑名单（可选）
  return res.json({
    code: 0,
    message: '登出成功'
  });
});

export default router;
