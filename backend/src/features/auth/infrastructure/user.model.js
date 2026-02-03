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

    // 手机号
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
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

    // 手机验证状态
    phoneVerified: {
      type: Boolean,
      default: false
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
        sms: {
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
userSchema.index({ status: 1, deletedAt: 1 });
userSchema.index({ createdAt: -1 });

// 虚拟字段：是否被锁定
userSchema.virtual('isLocked').get(function () {
  return this.lockedUntil && this.lockedUntil > new Date();
});

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
userSchema.pre(/^find/, function () {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// 保存前中间件
userSchema.pre('save', function () {
  // 保存前的逻辑（如果需要）
});

// 创建模型
export const UserModel = mongoose.model('User', userSchema);
