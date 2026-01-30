/**
 * Jest配置验证测试
 * 确保测试框架正确配置
 */

describe('Jest配置测试', () => {
  test('基本断言应该工作', () => {
    expect(1 + 1).toBe(2);
  });

  test('字符串匹配应该工作', () => {
    expect('Hello World').toContain('World');
  });

  test('数组操作应该工作', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  test('对象比较应该工作', () => {
    const obj = { name: 'Test', value: 123 };
    expect(obj).toEqual({ name: 'Test', value: 123 });
  });

  test('异步操作应该工作', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');
  });
});

describe('DOM操作测试', () => {
  test('应该能创建DOM元素', () => {
    const div = document.createElement('div');
    div.textContent = 'Test';
    expect(div.textContent).toBe('Test');
  });

  test('应该能操作DOM属性', () => {
    const input = document.createElement('input');
    input.value = 'test value';
    input.setAttribute('data-test', 'true');

    expect(input.value).toBe('test value');
    expect(input.getAttribute('data-test')).toBe('true');
  });
});

describe('localStorage模拟测试', () => {
  test('应该能使用localStorage', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.getItem('test')).toBe('value');
  });

  test('localStorage应该在测试间清理', () => {
    // 这个测试验证afterEach清理工作正常
    expect(localStorage.getItem('test')).toBeNull();
  });
});
