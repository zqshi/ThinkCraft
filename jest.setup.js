/**
 * Jest设置文件
 * 在每个测试文件运行前执行
 */

import '@testing-library/jest-dom';

// 模拟全局对象
global.window = global.window || {};
global.document = global.document || {};
global.navigator = global.navigator || {};

// 模拟localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: key => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: key => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();
global.localStorage = localStorageMock;

// 模拟sessionStorage
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: key => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: key => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();
global.sessionStorage = sessionStorageMock;

// 每个测试后清理
afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
