/**
 * 用户领域服务
 * 处理跨聚合根的业务逻辑
 */
export class UserService {
  constructor(userRepository, tokenService) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
  }

  /**
   * 用户登录
   */
  async login(username, password) {
    // 查找用户
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 执行登录
    try {
      user.login(password);
    } catch (error) {
      // 保存登录失败状态
      await this.userRepository.save(user);
      throw error;
    }

    // 保存登录成功状态
    await this.userRepository.save(user);

    // 生成访问令牌
    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id.value,
      username: user.username.value,
      email: user.email.value
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
   * 用户注册
   */
  async register(username, email, password) {
    // 检查用户名是否已存在
    const usernameExists = await this.userRepository.existsByUsername(username);
    if (usernameExists) {
      throw new Error('用户名已存在');
    }

    // 检查邮箱是否已存在
    const emailExists = await this.userRepository.existsByEmail(email);
    if (emailExists) {
      throw new Error('邮箱已被使用');
    }

    // 创建新用户
    const user = User.create(username, email, password);

    // 保存用户
    await this.userRepository.save(user);

    // 生成访问令牌
    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id.value,
      username: user.username.value,
      email: user.email.value
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
      username: user.username.value,
      email: user.email.value
    });

    return {
      accessToken: newAccessToken,
      user
    };
  }

  /**
   * 修改密码
   */
  async changePassword(userId, oldPassword, newPassword) {
    // 查找用户
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 修改密码
    user.changePassword(oldPassword, newPassword);

    // 保存用户
    await this.userRepository.save(user);

    return user;
  }

  /**
   * 重置密码
   */
  async resetPassword(userId, newPassword) {
    // 查找用户
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 直接设置新密码（跳过旧密码验证）
    user._password = Password.create(newPassword);

    // 解锁账户
    user.unlockAccount();

    // 保存用户
    await this.userRepository.save(user);

    return user;
  }

  /**
   * 锁定用户
   */
  async lockUser(userId, minutes = 30) {
    // 查找用户
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 锁定账户
    user.lockAccount(minutes);

    // 保存用户
    await this.userRepository.save(user);

    return user;
  }

  /**
   * 解锁用户
   */
  async unlockUser(userId) {
    // 查找用户
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 解锁账户
    user.unlockAccount();

    // 保存用户
    await this.userRepository.save(user);

    return user;
  }
}
