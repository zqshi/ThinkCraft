/**
 * 认证DTO（数据传输对象）
 * 用于在应用层和接口层之间传输数据
 */

const PHONE_REGEX = /^1[3-9]\d{9}$/;

export class LoginRequestDTO {
  constructor(phone, code) {
    this.phone = phone;
    this.code = code;
  }

  validate() {
    if (!this.phone || typeof this.phone !== 'string') {
      throw new Error('手机号不能为空');
    }

    if (!PHONE_REGEX.test(this.phone)) {
      throw new Error('手机号格式不正确');
    }

    if (!this.code || typeof this.code !== 'string') {
      throw new Error('验证码不能为空');
    }

    if (!/^\d{6}$/.test(this.code)) {
      throw new Error('验证码格式不正确');
    }
  }
}

export class LoginResponseDTO {
  constructor(accessToken, refreshToken, user, isNewUser = false) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.isNewUser = isNewUser;
    this.user = {
      id: user.id.value,
      phone: user.phone?.value || null,
      status: user.status.value,
      lastLoginAt: user.lastLoginAt
    };
  }
}

export class RegisterRequestDTO {
  constructor(phone, code) {
    this.phone = phone;
    this.code = code;
  }

  validate() {
    if (!this.phone || typeof this.phone !== 'string') {
      throw new Error('手机号不能为空');
    }

    if (!PHONE_REGEX.test(this.phone)) {
      throw new Error('手机号格式不正确');
    }

    if (!this.code || typeof this.code !== 'string') {
      throw new Error('验证码不能为空');
    }

    if (!/^\d{6}$/.test(this.code)) {
      throw new Error('验证码格式不正确');
    }
  }
}

export class RegisterResponseDTO {
  constructor(accessToken, refreshToken, user) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.user = {
      id: user.id.value,
      phone: user.phone?.value || null,
      status: user.status.value,
      createdAt: user.createdAt
    };
  }
}

export class UserInfoDTO {
  constructor(user) {
    this.id = user.id.value;
    this.phone = user.phone?.value || null;
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
        phone: user.phone?.value || null
      }
      : null;
  }
}
