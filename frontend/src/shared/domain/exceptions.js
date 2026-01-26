/**
 * 领域异常基类
 */
export class DomainException extends Error {
  constructor(message, code = 'DOMAIN_ERROR', details = null) {
    super(message);
    this.name = 'DomainException';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * 实体验证异常
 */
export class EntityValidationException extends DomainException {
  constructor(entityName, errors) {
    super(`${entityName}验证失败`, 'ENTITY_VALIDATION_ERROR', errors);
    this.name = 'EntityValidationException';
    this.entityName = entityName;
    this.errors = errors;
  }
}

/**
 * 值对象验证异常
 */
export class ValueObjectValidationException extends DomainException {
  constructor(valueObjectName, value, reason) {
    super(`${valueObjectName}值无效: ${reason}`, 'VALUE_OBJECT_VALIDATION_ERROR', {
      value,
      reason
    });
    this.name = 'ValueObjectValidationException';
    this.valueObjectName = valueObjectName;
    this.value = value;
    this.reason = reason;
  }
}

/**
 * 业务规则异常
 */
export class BusinessRuleException extends DomainException {
  constructor(ruleName, message, details = null) {
    super(message, 'BUSINESS_RULE_VIOLATION', { ruleName, ...details });
    this.name = 'BusinessRuleException';
    this.ruleName = ruleName;
  }
}

/**
 * 聚合不变性异常
 */
export class AggregateInvariantException extends DomainException {
  constructor(aggregateName, invariantName, message) {
    super(message, 'AGGREGATE_INVARIANT_VIOLATION', { aggregateName, invariantName });
    this.name = 'AggregateInvariantException';
    this.aggregateName = aggregateName;
    this.invariantName = invariantName;
  }
}

/**
 * 领域服务异常
 */
export class DomainServiceException extends DomainException {
  constructor(serviceName, operation, message, details = null) {
    super(message, 'DOMAIN_SERVICE_ERROR', { serviceName, operation, ...details });
    this.name = 'DomainServiceException';
    this.serviceName = serviceName;
    this.operation = operation;
  }
}

/**
 * 基础设施异常
 */
export class InfrastructureException extends DomainException {
  constructor(layer, operation, message, details = null) {
    super(message, 'INFRASTRUCTURE_ERROR', { layer, operation, ...details });
    this.name = 'InfrastructureException';
    this.layer = layer;
    this.operation = operation;
  }
}

/**
 * 应用服务异常
 */
export class ApplicationServiceException extends DomainException {
  constructor(useCase, message, details = null) {
    super(message, 'APPLICATION_SERVICE_ERROR', { useCase, ...details });
    this.name = 'ApplicationServiceException';
    this.useCase = useCase;
  }
}

/**
 * 资源未找到异常
 */
export class ResourceNotFoundException extends DomainException {
  constructor(resourceType, resourceId) {
    super(`${resourceType}未找到: ${resourceId}`, 'RESOURCE_NOT_FOUND', {
      resourceType,
      resourceId
    });
    this.name = 'ResourceNotFoundException';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * 权限异常
 */
export class AuthorizationException extends DomainException {
  constructor(operation, resource, userId) {
    super(`用户 ${userId} 没有权限执行 ${operation} 操作`, 'AUTHORIZATION_ERROR', {
      operation,
      resource,
      userId
    });
    this.name = 'AuthorizationException';
    this.operation = operation;
    this.resource = resource;
    this.userId = userId;
  }
}

/**
 * 并发冲突异常
 */
export class ConcurrencyException extends DomainException {
  constructor(resourceType, resourceId, expectedVersion, actualVersion) {
    super(`并发冲突: ${resourceType} ${resourceId}`, 'CONCURRENCY_CONFLICT', {
      resourceType,
      resourceId,
      expectedVersion,
      actualVersion
    });
    this.name = 'ConcurrencyException';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}

/**
 * 外部服务异常
 */
export class ExternalServiceException extends DomainException {
  constructor(serviceName, operation, statusCode, response) {
    super(`${serviceName}服务调用失败: ${operation}`, 'EXTERNAL_SERVICE_ERROR', {
      serviceName,
      operation,
      statusCode,
      response
    });
    this.name = 'ExternalServiceException';
    this.serviceName = serviceName;
    this.operation = operation;
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * 异常处理器
 */
export class ExceptionHandler {
  static handle(error, context = {}) {
    console.error('Exception caught:', error);

    // 如果是领域异常，直接返回
    if (error instanceof DomainException) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          timestamp: error.timestamp
        }
      };
    }

    // 处理其他类型的错误
    if (error instanceof TypeError) {
      return {
        success: false,
        error: {
          code: 'TYPE_ERROR',
          message: '类型错误: ' + error.message,
          details: { stack: error.stack },
          timestamp: new Date()
        }
      };
    }

    if (error instanceof ReferenceError) {
      return {
        success: false,
        error: {
          code: 'REFERENCE_ERROR',
          message: '引用错误: ' + error.message,
          details: { stack: error.stack },
          timestamp: new Date()
        }
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error.message || '发生未知错误',
          details: {
            stack: error.stack,
            context: context
          },
          timestamp: new Date()
        }
      };
    }

    // 处理非Error对象
    return {
      success: false,
      error: {
        code: 'UNKNOWN_EXCEPTION',
        message: '发生未知异常',
        details: {
          error: String(error),
          context: context
        },
        timestamp: new Date()
      }
    };
  }

  static throwIfError(result) {
    if (!result.success) {
      const error = result.error;

      // 尝试重建异常对象
      switch (error.code) {
      case 'ENTITY_VALIDATION_ERROR':
        throw new EntityValidationException(error.details.entityName, error.details.errors);
      case 'VALUE_OBJECT_VALIDATION_ERROR':
        throw new ValueObjectValidationException(
          error.details.valueObjectName,
          error.details.value,
          error.details.reason
        );
      case 'BUSINESS_RULE_VIOLATION':
        throw new BusinessRuleException(error.details.ruleName, error.message, error.details);
      case 'RESOURCE_NOT_FOUND':
        throw new ResourceNotFoundException(error.details.resourceType, error.details.resourceId);
      case 'AUTHORIZATION_ERROR':
        throw new AuthorizationException(
          error.details.operation,
          error.details.resource,
          error.details.userId
        );
      case 'CONCURRENCY_CONFLICT':
        throw new ConcurrencyException(
          error.details.resourceType,
          error.details.resourceId,
          error.details.expectedVersion,
          error.details.actualVersion
        );
      default:
        throw new DomainException(error.message, error.code, error.details);
      }
    }

    return result.data;
  }
}

/**
 * 异常监控器
 */
export class ExceptionMonitor {
  constructor() {
    this.handlers = new Map();
  }

  on(exceptionType, handler) {
    if (!this.handlers.has(exceptionType)) {
      this.handlers.set(exceptionType, []);
    }
    this.handlers.get(exceptionType).push(handler);
  }

  emit(exception) {
    const handlers = this.handlers.get(exception.constructor) || [];
    handlers.forEach(handler => {
      try {
        handler(exception);
      } catch (handlerError) {
        console.error('Exception handler error:', handlerError);
      }
    });

    // 记录到日志系统
    this.logException(exception);
  }

  logException(exception) {
    const logEntry = {
      timestamp: new Date(),
      type: exception.constructor.name,
      message: exception.message,
      code: exception.code,
      details: exception.details,
      stack: exception.stack
    };

    // 这里可以发送到日志服务
    console.error('Exception logged:', logEntry);
  }
}

// 创建全局异常监控器实例
export const exceptionMonitor = new ExceptionMonitor();

// 监听未处理的异常
if (typeof window !== 'undefined') {
  window.addEventListener('error', event => {
    const error = event.error || new Error(event.message);
    exceptionMonitor.emit(error);
  });

  window.addEventListener('unhandledrejection', event => {
    const error = event.reason instanceof Error ? event.reason : new Error(event.reason);
    exceptionMonitor.emit(error);
  });
}
