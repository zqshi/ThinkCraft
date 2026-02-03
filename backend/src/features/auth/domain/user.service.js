/**
 * 用户领域服务
 * 处理跨聚合根的业务逻辑
 */
import { User } from './user.aggregate.js';
import { PhoneVerificationUseCase } from '../application/phone-verification.use-case.js';

export class UserService {
  constructor(userRepository, tokenService, phoneVerificationUseCase = null) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
    this.phoneVerificationUseCase = phoneVerificationUseCase || new PhoneVerificationUseCase(userRepository);
  }

  /**
   * 用户登录（手机号+验证码）
   */
  async loginWithPhone(phone, code) {
    // 验证验证码
    await this.phoneVerificationUseCase.verifyCode(phone, code, 'login');

    // 查找用户
    let user = await this.userRepository.findByPhone(phone);
    let isNewUser = false;
    if (!user) {
      user = User.createWithPhone(phone);
      user.verifyPhone();
      isNewUser = true;
    }

    // 执行登录
    user.loginWithPhone();

    // 保存登录成功状态
    await this.userRepository.save(user);

    // 生成访问令牌
    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id.value,
      phone: user.phone?.value || null
    });

    // 生成刷新令牌
    const refreshToken = this.tokenService.generateRefreshToken({
      userId: user.id.value
    });

    return {
      user,
      accessToken,
      refreshToken,
      isNewUser
    };
  }

  /**
   * 用户注册（手机号+验证码）
   */
  async registerWithPhone(phone, code) {
    // 验证验证码
    await this.phoneVerificationUseCase.verifyCode(phone, code, 'register');

    // 检查手机号是否已存在
    const existingUser = await this.userRepository.findByPhone(phone);
    if (existingUser) {
      throw new Error('该手机号已注册');
    }

    // 创建新用户
    const user = User.createWithPhone(phone);
    user.verifyPhone();

    // 保存用户
    await this.userRepository.save(user);

    // 生成访问令牌
    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id.value,
      phone: user.phone?.value || null
    });

    // 生成刷新令牌
    const refreshToken = this.tokenService.generateRefreshToken({
      userId: user.id.value
    });

    return {
      user,
      accessToken,
      refreshToken
    };
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshToken) {
    // 验证刷新令牌
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error('无效的刷新令牌');
    }

    // 查找用户
    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 生成新的访问令牌
    const newAccessToken = this.tokenService.generateAccessToken({
      userId: user.id.value,
      phone: user.phone?.value || null
    });

    // 生成新的刷新令牌（用于延长会话活跃期）
    const newRefreshToken = this.tokenService.generateRefreshToken({
      userId: user.id.value
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user
    };
  }

  // 后续如需账户风控与解锁逻辑，可在此补充
}
