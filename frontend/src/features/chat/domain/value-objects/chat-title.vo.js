/**
 * 聊天标题值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ChatTitle extends ValueObject {
    constructor(value) {
        super();
        this._value = value.trim();
        this.validate();
    }

    /**
     * 验证聊天标题格式
     */
    validate() {
        if (!this._value || typeof this._value !== 'string') {
            throw new Error('聊天标题不能为空');
        }

        if (this._value.length < 1 || this._value.length > 200) {
            throw new Error('聊天标题长度必须在1-200个字符之间');
        }

        // 不允许包含特殊字符
        if (/[<>'"&]/.test(this._value)) {
            throw new Error('聊天标题不能包含特殊字符: <>'"&');
        }
    }

    get value() {
        return this._value;
    }

    equals(other) {
        if (!(other instanceof ChatTitle)) {
            return false;
        }
        return this._value === other._value;
    }

    toString() {
        return this._value;
    }

    toJSON() {
        return this._value;
    }
}