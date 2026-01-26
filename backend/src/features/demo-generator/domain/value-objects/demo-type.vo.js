/**
 * Demo类型 值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class DemoType extends ValueObject {
  static WEB = 'web';
  static MOBILE = 'mobile';
  static DESKTOP = 'desktop';
  static API = 'api';

  constructor(value) {
    super({ value });
  }

  get value() {
    return this.props.value;
  }

  validate() {
    const validTypes = [DemoType.WEB, DemoType.MOBILE, DemoType.DESKTOP, DemoType.API];
    if (!validTypes.includes(this.props.value)) {
      throw new Error(
        `Invalid demo type: ${this.props.value}. Must be one of: ${validTypes.join(', ')}`
      );
    }
  }

  isWeb() {
    return this.props.value === DemoType.WEB;
  }

  isMobile() {
    return this.props.value === DemoType.MOBILE;
  }

  isDesktop() {
    return this.props.value === DemoType.DESKTOP;
  }

  isApi() {
    return this.props.value === DemoType.API;
  }
}
