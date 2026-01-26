/**
 * 领域层异常基类
 */
export class DomainException extends Error {
  constructor(message, code = 'DOMAIN_ERROR') {
    super(message);
    this.name = 'DomainException';
    this.code = code;
    this.timestamp = new Date();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp
    };
  }
}

/**
 * 业务规则异常
 */
export class BusinessRuleException extends DomainException {
  constructor(message, ruleName = null) {
    super(message, 'BUSINESS_RULE_VIOLATION');
    this.name = 'BusinessRuleException';
    this.ruleName = ruleName;
  }
}

/**
 * 实体未找到异常
 */
export class EntityNotFoundException extends DomainException {
  constructor(entityName, entityId) {
    super(`${entityName} ID为 ${entityId} 的实体未找到`, 'ENTITY_NOT_FOUND');
    this.name = 'EntityNotFoundException';
    this.entityName = entityName;
    this.entityId = entityId;
  }
}

/**
 * 实体验证异常
 */
export class EntityValidationException extends DomainException {
  constructor(entityName, errors) {
    super(`${entityName} 验证失败`, 'ENTITY_VALIDATION_ERROR');
    this.name = 'EntityValidationException';
    this.entityName = entityName;
    this.errors = errors;
  }
}

/**
 * 值对象验证异常
 */
export class ValueObjectValidationException extends DomainException {
  constructor(valueObjectName, errors) {
    super(`${valueObjectName} 验证失败`, 'VALUE_OBJECT_VALIDATION_ERROR');
    this.name = 'ValueObjectValidationException';
    this.valueObjectName = valueObjectName;
    this.errors = errors;
  }
}

/**
 * 领域服务异常
 */
export class DomainServiceException extends DomainException {
  constructor(serviceName, message) {
    super(`领域服务 ${serviceName} 执行失败: ${message}`, 'DOMAIN_SERVICE_ERROR');
    this.name = 'DomainServiceException';
    this.serviceName = serviceName;
  }
}
