/**
 * 用户Mongoose模型
 * 定义用户集合的Schema和索引
 */
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    // 用户ID（业务ID）
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    // 用户名
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    // 邮箱
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    // 密码哈希
    passwordHash: {
      type: String,
      required: true
    },

    // 用户状态
    status: {
      type: String,
      required: true,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true
    },

    // 最后登录时间
    lastLoginAt: {
      type: Date,
      default: null
    },

    // 登录失败次数
    loginAttempts: {
      type: Number,
      default: 0
    },

    // 账户锁定截止时间
    lockedUntil: {
      type: Date,
      default: null
    },

    // 邮箱验证状态
    emailVerified: {
      type: Boolean,
      default: false
    },

    // 邮箱验证Token
    emailVerificationToken: {
      type: String,
      default: null
    },

    // 邮箱验证Token过期时间
    emailVerificationExpires: {
      type: Date,
      default: null
    },

    // 密码重置Token
    passwordResetToken: {
      type: String,
      default: null
    },

    // 密码重置Token过期时间
    passwordResetExpires: {
      type: Date,
      default: null
    },

    // 登录历史
    loginHistory: [
      {
        timestamp: Date,
        ip: String,
        userAgent: String,
        success: Boolean
      }
    ],

    // 用户偏好设置
    preferences: {
      language: {
        type: String,
        default: 'zh-CN'
      },
      theme: {
        type: String,
        default: 'light'
      },
      notifications: {
        email: {
          type: Boolean,
          default: true
        },
        push: {
          type: Boolean,
          default: true
        }
      }
    },

    // 软删除标记
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    // 自动添加createdAt和updatedAt
    timestamps: true,
    // 集合名称
    collection: 'users'
  }
);

// 复合索引
userSchema.index({ username: 1, email: 1 });
userSchema.index({ status: 1, deletedAt: 1 });
userSchema.index({ createdAt: -1 });

// 虚拟字段：是否被锁定
userSchema.virtual('isLocked').get(function () {
  return this.lockedUntil && this.lockedUntil > new Date();
});

// 实例方法：检查密码
userSchema.methods.verifyPassword = function (plainPassword) {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(plainPassword).digest('hex');
  return this.passwordHash === hash;
};

// 实例方法：锁定账户
userSchema.methods.lockAccount = function (minutes) {
  this.lockedUntil = new Date(Date.now() + minutes * 60 * 1000);
  this.loginAttempts = 0;
};

// 实例方法：解锁账户
userSchema.methods.unlockAccount = function () {
  this.lockedUntil = null;
  this.loginAttempts = 0;
};

// 静态方法：查找活跃用户
userSchema.statics.findActive = function () {
  return this.find({ status: 'active', deletedAt: null });
};

// 查询中间件：默认排除已删除用户
userSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// 保存前中间件：确保邮箱和用户名小写
userSchema.pre('save', function (next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase().trim();
  }
  if (this.isModified('username')) {
    this.username = this.username.toLowerCase().trim();
  }
  next();
});

// 创建模型
export const UserModel = mongoose.model('User', userSchema);
