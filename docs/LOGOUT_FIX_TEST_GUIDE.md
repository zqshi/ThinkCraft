# 登出功能修复 - 测试指南

## 修复完成情况

✅ **P0 - 核心修复**：`frontend/js/utils/app-helpers.js` - `handleLogout()` 函数
- ✅ 添加后端登出失败处理（询问用户是否强制退出）
- ✅ 清除 `window.state` 中的用户数据（调用 `clearUserData()` 或降级方案）
- ✅ 清除 `localStorage.thinkcraft_user_id`
- ✅ 关闭桌面端设置弹窗（`settingsModal`）
- ✅ 关闭移动端设置面板（`bottomSettingsSheet`）
- ✅ 恢复 body 滚动

✅ **P1 - 推荐优化**：`frontend/js/core/state-manager.js` - 添加 `clearUserData()` 方法
- ✅ 清除对话状态（currentChat, messages, userData 等）
- ✅ 清除生成状态（generation）
- ✅ 清除灵感收件箱（inspiration）
- ✅ 清除知识库（knowledge）
- ✅ 通知所有监听器

✅ **P2 - 可选优化**：`frontend/js/modules/settings/settings-manager.js` - 添加 `forceCloseAllSettings()` 方法
- ✅ 关闭所有设置弹窗
- ✅ 恢复 body 滚动
- ✅ 导出全局函数

## 测试场景

### 场景1：正常登出流程（核心场景）

**步骤**：
1. 登录系统
2. 创建一些对话（可选）
3. 打开设置弹窗（点击右上角设置图标）
4. 点击"退出登录"按钮
5. 在 confirm 弹窗中点击"确定"

**预期结果**：
- ✅ 设置弹窗立即关闭
- ✅ 跳转到登录页面（`login.html`）
- ✅ 控制台显示清理日志：
  ```
  [登出] 用户确认退出，开始清理数据
  [登出] 调用后端登出接口
  [登出] 后端登出成功
  [登出] 清除 window.state 中的用户数据
  [StateManager] 清除所有用户数据
  [StateManager] 用户数据清除完成
  [登出] 清除所有token和会话数据
  [登出] 关闭设置弹窗
  [登出] 跳转到登录页面
  ```

**验证方法**（在跳转前打开控制台执行）：
```javascript
// 检查 sessionStorage
console.log('access_token:', sessionStorage.getItem('thinkcraft_access_token')); // 应该是 null
console.log('logged_in:', sessionStorage.getItem('thinkcraft_logged_in')); // 应该是 null

// 检查 localStorage
console.log('user_id:', localStorage.getItem('thinkcraft_user_id')); // 应该是 null
console.log('refresh_token:', localStorage.getItem('thinkcraft_refresh_token')); // 应该是 null

// 检查 window.state
console.log('currentChat:', window.state.currentChat); // 应该是 null
console.log('messages:', window.state.messages); // 应该是 []
console.log('generation:', window.state.generation); // 应该是 {}
```

---

### 场景2：用户取消登出

**步骤**：
1. 登录系统
2. 打开设置弹窗
3. 点击"退出登录"按钮
4. 在 confirm 弹窗中点击"取消"

**预期结果**：
- ✅ 设置弹窗保持打开
- ✅ 不跳转页面
- ✅ 用户数据不被清除
- ✅ 控制台显示：`[登出] 用户取消退出`

---

### 场景3：后端登出失败 - 用户强制退出

**步骤**：
1. 登录系统
2. **断开网络**或**停止后端服务**
3. 打开设置弹窗
4. 点击"退出登录"按钮
5. 在第一个 confirm 弹窗中点击"确定"
6. 在"后端登出失败"弹窗中点击"确定"（强制退出）

**预期结果**：
- ✅ 显示"后端登出失败（网络错误），是否强制退出？"提示
- ✅ 用户确认后，本地数据被清除
- ✅ 设置弹窗关闭
- ✅ 跳转到登录页面
- ✅ 控制台显示：
  ```
  [登出] 调用后端接口失败: [错误信息]
  [登出] 用户确认强制退出
  [登出] 清除 window.state 中的用户数据
  ...
  ```

---

### 场景4：后端登出失败 - 用户取消强制退出

**步骤**：
1. 登录系统
2. **断开网络**或**停止后端服务**
3. 打开设置弹窗
4. 点击"退出登录"按钮
5. 在第一个 confirm 弹窗中点击"确定"
6. 在"后端登出失败"弹窗中点击"取消"

**预期结果**：
- ✅ 设置弹窗保持打开
- ✅ 不跳转页面
- ✅ 用户数据不被清除
- ✅ 控制台显示：`[登出] 用户取消强制退出`

---

### 场景5：第二次登录后状态正常（最关键的场景）

**步骤**：
1. 完成场景1（正常登出）
2. 重新登录（使用相同或不同账号）
3. 创建新对话
4. 再次打开设置并退出登录

**预期结果**：
- ✅ 没有旧的对话数据
- ✅ `window.state` 是全新的
- ✅ 用户ID正确
- ✅ 第二次退出登录时，**弹窗正常关闭并成功退出**
- ✅ **不会出现"弹窗消失但没有真实退出"的问题**

**验证方法**（第二次登录后，在控制台执行）：
```javascript
// 检查是否有旧数据残留
console.log('currentChat:', window.state.currentChat); // 应该是 null（如果没有创建新对话）
console.log('messages:', window.state.messages); // 应该是 [] 或只有新对话的消息
console.log('generation:', window.state.generation); // 应该是 {} 或只有新会话的状态
console.log('user_id:', localStorage.getItem('thinkcraft_user_id')); // 应该是新用户的ID
```

---

### 场景6：移动端登出

**步骤**：
1. 在移动端浏览器登录（或使用浏览器的移动端模拟器）
2. 点击底部导航栏的"设置"图标
3. 在底部设置面板中点击"退出登录"
4. 确认退出

**预期结果**：
- ✅ 底部设置面板关闭
- ✅ body 滚动恢复（`document.body.style.overflow = ''`）
- ✅ 跳转到登录页面

---

## 快速验证命令

在浏览器控制台执行以下命令，快速验证登出后的状态：

```javascript
// 一键验证脚本
(function() {
    console.log('========== 登出状态验证 ==========');

    // 1. 检查 sessionStorage
    const checks = {
        'sessionStorage.access_token': sessionStorage.getItem('thinkcraft_access_token'),
        'sessionStorage.logged_in': sessionStorage.getItem('thinkcraft_logged_in'),
        'sessionStorage.user': sessionStorage.getItem('thinkcraft_user'),

        // 2. 检查 localStorage
        'localStorage.user_id': localStorage.getItem('thinkcraft_user_id'),
        'localStorage.refresh_token': localStorage.getItem('thinkcraft_refresh_token'),

        // 3. 检查 window.state
        'state.currentChat': window.state?.currentChat,
        'state.messages.length': window.state?.messages?.length,
        'state.userData': Object.keys(window.state?.userData || {}).length,
        'state.generation': Object.keys(window.state?.generation || {}).length,

        // 4. 检查设置弹窗
        'settingsModal.active': document.getElementById('settingsModal')?.classList.contains('active'),
        'bottomSheet.active': document.getElementById('bottomSettingsSheet')?.classList.contains('active')
    };

    let allClear = true;
    for (const [key, value] of Object.entries(checks)) {
        const expected = (key.includes('length') || key.includes('userData') || key.includes('generation')) ? 0 : (key.includes('active') ? false : null);
        const pass = value === expected;
        console.log(`${pass ? '✅' : '❌'} ${key}: ${value} (期望: ${expected})`);
        if (!pass) allClear = false;
    }

    console.log('===================================');
    console.log(allClear ? '🎉 所有检查通过！' : '⚠️  有检查项未通过');
})();
```

---

## 常见问题排查

### 问题1：设置弹窗没有关闭

**可能原因**：
- DOM 元素 ID 不匹配
- 弹窗使用了其他关闭机制（如 modalManager）

**排查方法**：
```javascript
// 检查设置弹窗元素
console.log('settingsModal:', document.getElementById('settingsModal'));
console.log('bottomSettingsSheet:', document.getElementById('bottomSettingsSheet'));

// 检查是否有 modalManager
console.log('modalManager:', window.modalManager);
```

### 问题2：window.state 没有被清除

**可能原因**：
- `window.stateManager` 未初始化
- `clearUserData()` 方法未被调用

**排查方法**：
```javascript
// 检查 stateManager
console.log('stateManager:', window.stateManager);
console.log('clearUserData:', typeof window.stateManager?.clearUserData);

// 手动调用清除
window.stateManager?.clearUserData();
```

### 问题3：第二次登录后仍有旧数据

**可能原因**：
- `localStorage.thinkcraft_user_id` 未被清除
- 某些数据在登录时未被重置

**排查方法**：
```javascript
// 检查所有 localStorage 键
Object.keys(localStorage).filter(k => k.startsWith('thinkcraft_')).forEach(k => {
    console.log(k, localStorage.getItem(k));
});
```

---

## 修复前后对比

### 修复前的问题

1. **设置弹窗未关闭**：用户点击"退出登录"后，confirm 弹窗消失但设置页面仍然打开
2. **window.state 未清除**：第二次登录后，旧的状态数据残留
3. **后端登出失败被忽略**：前后端状态不一致
4. **用户ID未清除**：下次登录可能使用旧的用户ID

### 修复后的改进

1. ✅ **设置弹窗正确关闭**：桌面端和移动端的设置弹窗都会被关闭
2. ✅ **window.state 完全清除**：通过 `clearUserData()` 方法统一清除所有用户数据
3. ✅ **后端登出失败处理**：询问用户是否强制退出，避免前后端状态不一致
4. ✅ **用户ID正确清除**：确保下次登录使用新的用户ID

---

## 下一步

1. **启动应用**：`npm start` 或打开 `index.html`
2. **按照测试场景逐一验证**：特别关注场景5（第二次登录后状态正常）
3. **检查控制台日志**：确认所有清理步骤都被执行
4. **测试移动端**：使用浏览器的移动端模拟器测试场景6

---

## 技术细节

### 修改的文件

1. **frontend/js/utils/app-helpers.js** (第61-202行)
   - 添加后端登出失败处理
   - 调用 `stateManager.clearUserData()` 清除状态
   - 清除 `localStorage.thinkcraft_user_id`
   - 关闭设置弹窗

2. **frontend/js/core/state-manager.js** (第912-964行)
   - 新增 `clearUserData()` 方法
   - 统一清除所有用户相关状态

3. **frontend/js/modules/settings/settings-manager.js** (第117-138行, 第219行)
   - 新增 `forceCloseAllSettings()` 方法
   - 导出全局函数 `window.forceCloseAllSettings`

### 关键代码片段

**后端登出失败处理**：
```javascript
if (!response.ok) {
    const forceLogout = confirm('后端登出失败，是否强制退出？\n\n点击"确定"将清除本地数据并退出\n点击"取消"将保持登录状态');
    if (!forceLogout) {
        return; // 用户取消，不执行任何清理操作
    }
}
```

**清除 window.state**：
```javascript
if (window.stateManager && typeof window.stateManager.clearUserData === 'function') {
    window.stateManager.clearUserData();
} else {
    // 降级方案：直接清除 window.state
    window.state.currentChat = null;
    window.state.messages = [];
    // ...
}
```

**关闭设置弹窗**：
```javascript
const settingsModal = document.getElementById('settingsModal');
if (settingsModal) {
    settingsModal.classList.remove('active');
    settingsModal.style.display = 'none';
}

const bottomSheet = document.getElementById('bottomSettingsSheet');
if (bottomSheet) {
    bottomSheet.classList.remove('active');
    document.body.style.overflow = '';
}
```
