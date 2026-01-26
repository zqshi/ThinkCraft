/**
 * 认证DTO（数据传输对象）
 * 用于在应用层和接口层之间传输数据
 */

export class LoginRequestDTO {
  constructor(username, password) {
    this.username = username;
    this.password = password;
  }

  validate() {
    if (!this.username || typeof this.username !== 'string') {
      throw new Error('用户名不能为空');
    }

    if (!this.password || typeof this.password !== 'string') {
      throw new Error('密码不能为空');
    }

    if (this.username.length < 3 || this.username.length > 20) {
      throw new Error('用户名长度必须在3-20个字符之间');
    }

    if (this.password.length < 6) {
      throw new Error('密码长度至少为6位');
    }
  }
}

export class LoginResponseDTO {
  constructor(accessToken, refreshToken, user) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.user = {
      id: user.id.value,
      username: user.username.value,
      email: user.email.value,
      status: user.status.value,
      lastLoginAt: user.lastLoginAt
    };
  }
}

export class RegisterRequestDTO {
  constructor(username, email, password) {
    this.username = username;
    this.email = email;
    this.password = password;
  }

  validate() {
    if (!this.username || typeof this.username !== 'string') {
      throw new Error('用户名不能为空');
    }

    if (!this.email || typeof this.email !== 'string') {
      throw new Error('邮箱不能为空');
    }

    if (!this.password || typeof this.password !== 'string') {
      throw new Error('密码不能为空');
    }

    if (this.username.length < 3 || this.username.length > 20) {
      throw new Error('用户名长度必须在3-20个字符之间');
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      throw new Error('邮箱格式不正确');
    }

    if (this.email.length > 100) {
      throw new Error('邮箱长度不能超过100个字符');
    }

    // 密码强度验证
    if (this.password.length < 6) {
      throw new Error('密码长度至少为6位');
    }

    if (this.password.length > 50) {
      throw new Error('密码长度不能超过50位');
    }

    // 检查复杂度
    let strength = 0;
    if (/[a-z]/.test(this.password)) {
      strength++;
    }
    if (/[A-Z]/.test(this.password)) {
      strength++;
    }
    if (/[0-9]/.test(this.password)) {
      strength++;
    }
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.password)) {
      strength++;
    }

    if (strength < 2) {
      throw new Error('密码强度不够，请包含大小写字母、数字或特殊字符中的至少两种');
    }
  }
}

export class RegisterResponseDTO {
  constructor(accessToken, refreshToken, user) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.user = {
      id: user.id.value,
      username: user.username.value,
      email: user.email.value,
      status: user.status.value,
      createdAt: user.createdAt
    };
  }
}

export class UserInfoDTO {
  constructor(user) {
    this.id = user.id.value;
    this.username = user.username.value;
    this.email = user.email.value;
    this.status = user.status.value;
    this.lastLoginAt = user.lastLoginAt;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}

export class RefreshTokenRequestDTO {
  constructor(refreshToken) {
    this.refreshToken = refreshToken;
  }

  validate() {
    if (!this.refreshToken || typeof this.refreshToken !== 'string') {
      throw new Error('刷新令牌不能为空');
    }
  }
}

export class RefreshTokenResponseDTO {
  constructor(accessToken, user) {
    this.accessToken = accessToken;
    this.user = user
      ? {
        id: user.id.value,
        username: user.username.value,
        email: user.email.value
      }
      : null;
  }
}

export class ChangePasswordRequestDTO {
  constructor(oldPassword, newPassword) {
    this.oldPassword = oldPassword;
    this.newPassword = newPassword;
  }

  validate() {
    if (!this.oldPassword || typeof this.oldPassword !== 'string') {
      throw new Error('旧密码不能为空');
    }

    if (!this.newPassword || typeof this.newPassword !== 'string') {
      throw new Error('新密码不能为空');
    }

    if (this.oldPassword === this.newPassword) {
      throw new Error('新密码不能与旧密码相同');
    }

    // 新密码强度验证
    if (this.newPassword.length < 6) {
      throw new Error('新密码长度至少为6位');
    }

    if (this.newPassword.length > 50) {
      throw new Error('新密码长度不能超过50位');
    }

    // 检查复杂度
    let strength = 0;
    if (/[a-z]/.test(this.newPassword)) {
      strength++;
    }
    if (/[A-Z]/.test(this.newPassword)) {
      strength++;
    }
    if (/[0-9]/.test(this.newPassword)) {
      strength++;
    }
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.newPassword)) {
      strength++;
    }

    if (strength < 2) {
      throw new Error('新密码强度不够，请包含大小写字母、数字或特殊字符中的至少两种');
    }
  }
}
