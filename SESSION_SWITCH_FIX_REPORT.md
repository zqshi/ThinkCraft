# 会话切换时报告生成状态混淆问题修复报告

## 修复时间
2026-01-30

## 问题描述
用户报告：切换会话时，不同会话的报告生成状态存在混淆。一个会话在生成报告时，切换到另一个会话，另一个会话的按钮也会被错误地标记为"生成中"状态。

## 根本原因分析

### 1. chatId 类型不一致
- JavaScript 对象键会自动转换为字符串，但在不同地方的处理不一致
- `state-manager.js` 中直接使用传入的 chatId（可能是数字或字符串）
- `app-boot.js` 中有些地方使用原始类型，有些地方强制转换为字符串
- 导致状态键不匹配，无法正确隔离不同会话的状态

### 2. 内存状态未正确隔离
- 从内存恢复状态时，没有验证该状态是否属于当前 chatId
- 切换会话时，前一个会话的 `generating` 状态被错误地应用到新会话

### 3. 按钮状态验证不足
- 按钮重置逻辑只检查 `dataset.status === 'generating'`
- 没有验证该状态是否属于当前会话

## 修复方案

### 核心策略
1. **统一 chatId 类型为字符串**：在所有关键入口点标准化 chatId
2. **增强状态隔离验证**：在读取内存状态时验证 chatId 匹配
3. **会话切换时主动清理**：切换会话时清理前一个会话的内存状态
4. **按钮状态关联 chatId**：在 DOM 元素上存储 chatId，验证时检查匹配

## 实施的修改

### 1. state-manager.js 修改

#### 1.1 统一 chatId 类型处理
在以下方法中添加了 `const normalizedChatId = String(chatId);`：
- `getGenerationState(chatId)` - 行 159
- `startGeneration(chatId, type, chapters)` - 行 210
- `updateProgress(chatId, type, agentName, current, result)` - 行 243
- `completeGeneration(chatId, type, finalResults)` - 行 277
- `errorGeneration(chatId, type, error)` - 行 304
- `resetGeneration(chatId, type, keepChapters)` - 行 325
- `showChapterSelection(chatId, type)` - 行 357
- `getGenerationProgress(chatId, type)` - 行 855
- `isGenerating(chatId, type)` - 行 869

#### 1.2 新增清理方法
```javascript
/**
 * 清理指定会话的生成状态（会话切换时调用）
 * @param {String} chatId - 会话ID
 */
clearGenerationState(chatId) {
  if (!chatId) return;
  const normalizedChatId = String(chatId);

  if (this.state.generation[normalizedChatId]) {
    console.log(`[StateManager] 清理会话 ${normalizedChatId} 的生成状态`);
    delete this.state.generation[normalizedChatId];
    this.notify();
  }
}
```

### 2. app-boot.js 修改

#### 2.1 loadGenerationStatesForChat 函数增强（行 2595-2797）

**添加 chatId 类型标准化：**
```javascript
const normalizedChatId = String(chatId);
```

**添加报告验证逻辑：**
```javascript
const reports = allReports.filter(report => {
    const reportChatId = String(report.chatId);
    if (reportChatId !== normalizedChatId) {
        console.warn(`[加载状态] 过滤掉不匹配的报告:`, {
            reportChatId,
            currentChatId: normalizedChatId,
            reportType: report.type
        });
        return false;
    }
    return true;
});
```

**更新按钮时设置 chatId：**
```javascript
btn.dataset.chatId = normalizedChatId;
```

**增强按钮重置逻辑：**
```javascript
const btnChatId = btn.dataset.chatId;
if (btnChatId && String(btnChatId) !== normalizedChatId) {
    console.log(`[加载状态] ${type} 按钮属于其他会话 ${btnChatId}，重置`);
}
```

#### 2.2 handleGenerationBtnClick 函数增强（行 2212-2272）

**添加按钮 chatId 验证：**
```javascript
const btnChatId = btn ? btn.dataset.chatId : null;
const currentChatId = String(state.currentChat);

if (btnChatId && btnChatId !== currentChatId) {
    console.warn('[生成按钮点击] 按钮状态不属于当前会话，重置');
    resetGenerationButtons();
    startGenerationFlow(type);
    return;
}
```

**在报告验证时使用字符串比较：**
```javascript
if (reportEntry && String(reportEntry.chatId) === currentChatId) {
    viewGeneratedReport(type, reportEntry.data || reportEntry);
}
```

#### 2.3 loadChat 函数增强（行 1110-1203）

**会话切换时添加清理逻辑：**
```javascript
if (state.currentChat && state.currentChat != targetId) {
    console.log('[会话切换] 从会话', state.currentChat, '切换到', targetId);

    // 清理前一个会话的内存状态（如果不是 generating 状态）
    const prevChatId = String(state.currentChat);
    if (window.stateManager?.getGenerationState) {
        const prevGenState = window.stateManager.getGenerationState(prevChatId);
        if (prevGenState) {
            let hasGenerating = false;
            ['business', 'proposal', 'analysis'].forEach(type => {
                if (prevGenState[type]?.status === 'generating') {
                    hasGenerating = true;
                    console.log(`[会话切换] 保留会话 ${prevChatId} 的 ${type} generating 状态`);
                }
            });

            if (!hasGenerating && window.stateManager.clearGenerationState) {
                window.stateManager.clearGenerationState(prevChatId);
            }
        }
    }

    // 清理 generatedReports 中不属于新会话的数据
    Object.keys(generatedReports).forEach(type => {
        const report = generatedReports[type];
        if (report && String(report.chatId) !== String(targetId)) {
            console.log(`[会话切换] 清理 ${type} 报告数据（属于会话 ${report.chatId}）`);
            generatedReports[type] = null;
        }
    });

    // 关闭进度弹窗
    if (window.agentProgressManager) {
        window.agentProgressManager.close();
    }
}
```

**调用 loadGenerationStatesForChat 时传递字符串类型：**
```javascript
loadGenerationStatesForChat(String(state.currentChat));
```

#### 2.4 resetGenerationButtons 函数增强（行 2612-2632）

**添加 excludeChatId 参数支持：**
```javascript
function resetGenerationButtons(excludeChatId = null) {
    const btnMap = {
        'business': 'businessPlanBtn',
        'proposal': 'proposalBtn',
        'analysis': 'analysisReportBtn'
    };
    Object.keys(btnMap).forEach(type => {
        const btn = document.getElementById(btnMap[type]);
        if (!btn) return;

        // 如果指定了 excludeChatId，跳过该会话的按钮
        if (excludeChatId) {
            const btnChatId = btn.dataset.chatId;
            if (btnChatId && String(btnChatId) === String(excludeChatId)) {
                console.log(`[重置按钮] 跳过会话 ${excludeChatId} 的 ${type} 按钮`);
                return;
            }
        }

        btn.classList.remove('btn-generating', 'btn-completed', 'btn-error');
        btn.classList.add('btn-idle');
        btn.dataset.status = 'idle';
        delete btn.dataset.chatId;  // 清空 chatId
        btn.disabled = false;
        const iconSpan = btn.querySelector('.btn-icon');
        const textSpan = btn.querySelector('.btn-text');
        updateButtonContent(type, iconSpan, textSpan, 'idle');
    });
    generatedReports.business = null;
    generatedReports.proposal = null;
    generatedReports.analysis = null;
}
```

## 修改的文件
1. `frontend/js/core/state-manager.js` - 核心状态管理器
2. `frontend/js/app-boot.js` - 主应用逻辑

## 关键改进点

### 1. 类型转换一致性
- 所有 chatId 相关的比较都使用 `String()` 转换
- 在方法入口处统一标准化，避免后续处理中的类型不一致

### 2. 状态隔离验证
- 从 IndexedDB 加载报告时，验证 `reportChatId === normalizedChatId`
- 从内存恢复状态时，添加 `chatId` 标识
- 按钮状态验证时，检查 `btnChatId === currentChatId`

### 3. 会话切换清理
- 切换会话时，清理前一个会话的内存状态（保留 generating 状态）
- 清理 `generatedReports` 中不属于新会话的数据
- 关闭进度弹窗

### 4. DOM 属性同步
- 在按钮上设置 `dataset.chatId`
- 重置按钮时清空 `dataset.chatId`
- 验证时检查 `dataset.chatId` 是否匹配

## 测试建议

### 测试场景 1：跨会话状态隔离
1. 在会话 A 中开始生成商业计划书
2. 切换到会话 B
3. **验证**：会话 B 的按钮应该是 idle 状态

### 测试场景 2：会话切换后返回
1. 在会话 A 中生成完成商业计划书
2. 切换到会话 B
3. 再切换回会话 A
4. **验证**：会话 A 的按钮应该显示 completed 状态

### 测试场景 3：并发生成
1. 在会话 A 中开始生成商业计划书
2. 切换到会话 B
3. 在会话 B 中开始生成产品立项材料
4. **验证**：两个会话的生成任务应该独立进行

### 测试场景 4：页面刷新恢复
1. 在会话 A 中生成完成商业计划书
2. 刷新页面
3. 切换到会话 A
4. **验证**：按钮应该显示 completed 状态

### 测试场景 5：错误状态恢复
1. 在会话 A 中生成报告失败
2. 切换到会话 B
3. 再切换回会话 A
4. **验证**：按钮应该显示重试状态

## 注意事项

1. **向后兼容**：保留对数字类型 chatId 的支持，但内部统一转换为字符串
2. **日志完整性**：在关键点添加详细日志，便于调试
3. **状态清理时机**：只在确认不影响后台任务的情况下清理状态
4. **DOM 属性同步**：确保 `dataset.chatId` 与内存状态保持一致

## 修复状态
✅ 已完成所有计划中的修改
✅ 代码已通过语法检查
⏳ 等待用户测试验证

## 下一步
建议用户按照测试场景进行验证，确认修复效果。
