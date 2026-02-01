# ThinkCraft 报告功能全局修复方案

## 问题根源分析

### 核心问题架构图

```
用户点击按钮
    ↓
init.js: businessPlanBtn.addEventListener('click')
    ↓
直接调用: businessPlanGenerator.showChapterSelection(type)
    ↓
❌ 问题：没有检查当前状态
    ↓
总是显示章节选择弹窗（错误！）
```

**正确的流程应该是：**

```
用户点击按钮
    ↓
检查当前会话的报告状态
    ├─ 状态：idle（空闲）
    │   └─ 显示章节选择弹窗
    ├─ 状态：generating（生成中）
    │   └─ 显示进度弹窗（恢复进度）
    └─ 状态：completed（已完成）
        └─ 显示报告查看弹窗
```

## 问题清单

### 1. 按钮点击逻辑缺陷（P0 - 核心问题）
**位置**: `frontend/js/boot/init.js` 第84-120行

**问题**:
- 按钮点击直接调用 `showChapterSelection()`
- 没有状态检测逻辑
- 无论当前状态如何，都显示章节选择

**影响**:
- 生成中点击按钮 → 错误地显示章节选择（应显示进度）
- 已完成点击按钮 → 错误地显示章节选择（应显示报告）

### 2. BusinessPlanGenerator 缺少状态检测方法（P0）
**位置**: `frontend/js/modules/business-plan-generator.js`

**问题**:
- `showChapterSelection()` 方法没有前置状态检查
- 缺少 `handleButtonClick()` 统一入口方法
- 缺少从 IndexedDB 加载状态的逻辑

**需要添加的方法**:
1. `async handleButtonClick(type)` - 统一按钮点击入口
2. `async checkReportStatus(type, chatId)` - 检查报告状态
3. `showProgress(type, report)` - 显示进度弹窗
4. `showCompletedReport(type, report)` - 显示已完成报告

### 3. PDF导出逻辑错误（P1）
**位置**: `frontend/js/modules/report/report-generator.js` 第318-386行

**问题**:
- 只检查 `window.lastGeneratedReport`（内存变量）
- 不从 IndexedDB 加载已完成的报告
- 商业计划书/立项材料的导出逻辑缺失

**需要修复**:
- 添加从 IndexedDB 加载报告的逻辑
- 支持商业计划书和立项材料的PDF导出

### 4. 关闭按钮事件绑定问题（P1）
**位置**: `index.html` 第614行

**问题**:
- HTML 中使用 `onclick="closeBusinessReport()"`
- 函数已在 `ui-controller.js` 中定义并暴露
- 可能是函数加载顺序问题

**需要验证**:
- 函数是否正确暴露到全局
- 是否有其他代码覆盖了该函数

### 5. 分析报告数据格式验证（P1）
**位置**: `frontend/js/modules/report/report-generator.js`

**问题**:
- 后端返回的数据格式可能不一致
- 前端验证逻辑已添加，但可能不够完善
- 错误提示不够友好

## 修复方案

### 修复1: 重构按钮点击处理逻辑

#### 1.1 修改 `init.js` 中的按钮事件绑定

**文件**: `frontend/js/boot/init.js`

**修改位置**: 第84-120行

**修改内容**:
```javascript
// 绑定生成按钮事件
const businessPlanBtn = document.getElementById('businessPlanBtn');
if (businessPlanBtn) {
  businessPlanBtn.addEventListener('click', async () => {
    if (window.businessPlanGenerator) {
      console.log('点击商业计划书按钮');
      // ✅ 使用统一的按钮点击处理方法
      await window.businessPlanGenerator.handleButtonClick('business');
    } else {
      console.error('❌ BusinessPlanGenerator 未初始化');
      alert('系统初始化失败，请刷新页面');
    }
  });
  console.log('✅ 商业计划书按钮事件已绑定');
} else {
  console.error('❌ 找不到 businessPlanBtn 元素');
}

const proposalBtn = document.getElementById('proposalBtn');
if (proposalBtn) {
  proposalBtn.addEventListener('click', async () => {
    if (window.businessPlanGenerator) {
      console.log('点击产品立项按钮');
      // ✅ 使用统一的按钮点击处理方法
      await window.businessPlanGenerator.handleButtonClick('proposal');
    } else {
      console.error('❌ BusinessPlanGenerator 未初始化');
      alert('系统初始化失败，请刷新页面');
    }
  });
  console.log('✅ 产品立项按钮事件已绑定');
} else {
  console.error('❌ 找不到 proposalBtn 元素');
}
```

#### 1.2 在 `BusinessPlanGenerator` 中添加统一入口方法

**文件**: `frontend/js/modules/business-plan-generator.js`

**添加位置**: 在 `showChapterSelection()` 方法之前（约第86行）

**添加内容**:
```javascript
/**
 * 统一的按钮点击处理入口
 * 根据当前状态决定显示章节选择、进度弹窗还是报告查看
 * @param {String} type - 'business' | 'proposal'
 */
async handleButtonClick(type) {
  console.log('[按钮点击] 处理按钮点击', { type });

  // 获取当前会话ID
  const chatId = window.state?.currentChat;
  if (!chatId) {
    console.warn('[按钮点击] 没有当前会话，显示章节选择');
    this.showChapterSelection(type);
    return;
  }

  // 检查报告状态
  const report = await this.checkReportStatus(type, chatId);
  console.log('[按钮点击] 报告状态', { type, chatId, status: report?.status });

  if (!report || report.status === 'idle' || report.status === 'error') {
    // 状态：空闲或错误 → 显示章节选择
    console.log('[按钮点击] 显示章节选择弹窗');
    this.showChapterSelection(type);
  } else if (report.status === 'generating') {
    // 状态：生成中 → 显示进度弹窗
    console.log('[按钮点击] 显示进度弹窗');
    this.showProgress(type, report);
  } else if (report.status === 'completed') {
    // 状态：已完成 → 显示报告查看
    console.log('[按钮点击] 显示报告查看弹窗');
    this.showCompletedReport(type, report);
  }
}

/**
 * 检查报告状态
 * @param {String} type - 'business' | 'proposal'
 * @param {String|Number} chatId - 会话ID
 * @returns {Promise<Object|null>} 报告对象或null
 */
async checkReportStatus(type, chatId) {
  try {
    // 1. 先从内存状态检查（StateManager）
    if (window.stateManager?.getGenerationState) {
      const genState = window.stateManager.getGenerationState(chatId);
      if (genState && genState[type]) {
        console.log('[状态检查] 从内存获取状态', genState[type]);
        return genState[type];
      }
    }

    // 2. 从IndexedDB加载
    if (window.storageManager?.getReportsByChatId) {
      const normalizedChatId = String(chatId).trim();
      const reports = await window.storageManager.getReportsByChatId(normalizedChatId);
      const report = reports?.find(r => r.type === type && String(r.chatId).trim() === normalizedChatId);

      if (report) {
        console.log('[状态检查] 从IndexedDB获取状态', {
          type: report.type,
          status: report.status,
          hasData: !!report.data
        });
        return report;
      }
    }

    console.log('[状态检查] 未找到报告状态');
    return null;
  } catch (error) {
    console.error('[状态检查] 检查失败', error);
    return null;
  }
}

/**
 * 显示进度弹窗（恢复生成进度）
 * @param {String} type - 'business' | 'proposal'
 * @param {Object} report - 报告对象
 */
showProgress(type, report) {
  console.log('[显示进度] 恢复生成进度', { type, progress: report.progress });

  // 获取章节配置
  const config = this.chapterConfig[type];
  const selectedChapters = report.selectedChapters || config.core.map(ch => ch.id);

  // 打开进度弹窗
  if (this.progressManager) {
    this.progressManager.open();

    // 恢复进度显示
    const progress = report.progress || { current: 0, total: selectedChapters.length, percentage: 0 };
    this.progressManager.updateOverallProgress(progress.percentage,
      `正在生成第 ${progress.current}/${progress.total} 个章节...`);

    // 恢复章节状态
    selectedChapters.forEach((chapterId, index) => {
      const chapterInfo = [...config.core, ...config.optional].find(ch => ch.id === chapterId);
      if (chapterInfo) {
        const status = index < progress.current ? 'completed' :
                      index === progress.current ? 'working' : 'pending';
        this.progressManager.updateProgress(chapterId, status, chapterInfo.title);
      }
    });
  }
}

/**
 * 显示已完成的报告
 * @param {String} type - 'business' | 'proposal'
 * @param {Object} report - 报告对象
 */
showCompletedReport(type, report) {
  console.log('[显示报告] 显示已完成报告', { type, hasData: !!report.data });

  if (!report.data || !report.data.document) {
    console.error('[显示报告] 报告数据不完整');
    alert('报告数据不完整，请重新生成');
    return;
  }

  // 使用 report-viewer 显示报告
  if (window.reportViewer) {
    const typeTitle = type === 'business' ? '商业计划书' : '产品立项材料';
    window.reportViewer.renderBusinessReport(report.data, typeTitle);
  } else {
    console.error('[显示报告] reportViewer 未初始化');
    alert('报告查看器未初始化，请刷新页面');
  }
}
```

### 修复2: 修复PDF导出逻辑

**文件**: `frontend/js/modules/business-plan-generator.js`

**添加位置**: 类的末尾，在构造函数之后

**添加内容**:
```javascript
/**
 * 导出商业计划书/立项材料为PDF
 * @param {String} type - 'business' | 'proposal'
 */
async exportBusinessPlanPDF(type) {
  try {
    console.log('[PDF导出] 开始导出', { type });

    // 获取当前会话ID
    const chatId = window.state?.currentChat;
    if (!chatId) {
      alert('❌ 没有当前会话');
      return;
    }

    // 检查报告状态
    const report = await this.checkReportStatus(type, chatId);

    if (!report) {
      alert('❌ 未找到报告，请先生成报告');
      return;
    }

    if (report.status === 'generating') {
      alert('⚠️ 报告正在生成中，请等待生成完成后再导出');
      return;
    }

    if (report.status !== 'completed' || !report.data || !report.data.document) {
      alert('❌ 报告数据不完整，请重新生成');
      return;
    }

    // 显示加载提示
    alert('📄 正在生成PDF，请稍候...');

    // 调用后端API生成PDF
    const typeTitle = type === 'business' ? '商业计划书' : '产品立项材料';
    const response = await fetch(`${window.state.settings.apiUrl}/api/pdf-export/business-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reportData: report.data,
        reportType: type,
        title: typeTitle
      })
    });

    if (!response.ok) {
      throw new Error('PDF生成失败');
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'PDF生成失败');
    }

    // 下载PDF文件
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `ThinkCraft_${typeTitle}_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    alert('✅ PDF导出成功！');
  } catch (error) {
    console.error('[PDF导出] 失败:', error);
    alert(`❌ PDF导出失败：${error.message}`);
  }
}
```

**同时需要暴露到全局**:

在文件末尾添加：
```javascript
// 暴露PDF导出函数到全局
window.exportBusinessReport = async function() {
  const modal = document.getElementById('businessReportModal');
  const type = modal?.dataset?.reportType || 'business';
  if (window.businessPlanGenerator) {
    await window.businessPlanGenerator.exportBusinessPlanPDF(type);
  }
};
```

### 修复3: 验证并修复关闭按钮

**文件**: `frontend/js/utils/global-bridges.js`

**添加位置**: 文件末尾

**添加内容**:
```javascript
// ✅ 确保关闭函数正确暴露
if (!window.closeBusinessReport) {
  window.closeBusinessReport = function() {
    console.log('[global-bridges] 调用 closeBusinessReport');
    if (window.uiController) {
      window.uiController.closeBusinessReport();
    } else {
      // 降级处理
      const modal = document.getElementById('businessReportModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }
  };
  console.log('[global-bridges] closeBusinessReport 已暴露');
}
```

### 修复4: 增强分析报告错误处理

**文件**: `frontend/js/modules/report/report-generator.js`

**修改位置**: `generateDetailedReport()` 方法的错误处理部分（约第250-264行）

**修改内容**:
```javascript
} catch (error) {
  console.error('[生成报告] 失败:', error);

  // 更友好的错误提示
  let errorMessage = error.message;
  if (error.message.includes('数据格式')) {
    errorMessage = '后端返回的数据格式不正确，请检查后端服务是否正常运行';
  } else if (error.message.includes('API错误')) {
    errorMessage = '后端服务连接失败，请确认后端服务已启动';
  }

  reportContent.innerHTML = `
    <div style="text-align: center; padding: 60px 20px;">
      <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
      <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
        报告生成失败
      </div>
      <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
        ${errorMessage}
      </div>
      <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; padding: 12px; background: #f3f4f6; border-radius: 8px; text-align: left; max-width: 500px; margin: 0 auto 20px;">
        <strong>调试信息：</strong><br>
        ${error.stack ? error.stack.split('\n').slice(0, 3).join('<br>') : error.message}
      </div>
      <button class="btn-primary" onclick="regenerateInsightsReport()">重试</button>
    </div>
  `;
}
```

## 修复优先级

### P0（立即修复 - 核心功能）
1. ✅ 修复1.1：修改 `init.js` 按钮事件绑定
2. ✅ 修复1.2：添加 `handleButtonClick()` 等方法

### P1（重要修复 - 用户体验）
3. ✅ 修复2：修复PDF导出逻辑
4. ✅ 修复3：验证关闭按钮
5. ✅ 修复4：增强错误处理

## 测试计划

### 测试1：按钮状态切换
1. 创建新对话
2. 点击"生成商业计划书" → 应显示章节选择
3. 选择章节，开始生成
4. 生成过程中点击按钮 → 应显示进度弹窗（不是章节选择）
5. 生成完成后点击按钮 → 应显示报告查看（不是章节选择）

### 测试2：PDF导出
1. 生成完成商业计划书
2. 点击"导出PDF" → 应成功下载PDF文件
3. 生成中点击"导出PDF" → 应提示等待生成完成

### 测试3：关闭按钮
1. 查看已完成的报告
2. 点击右上角【×】 → 应关闭弹窗
3. 查看控制台 → 应有日志输出

### 测试4：错误处理
1. 停止后端服务
2. 尝试生成分析报告
3. 应显示友好的错误提示和调试信息

## 实施步骤

1. 备份当前代码
2. 按优先级顺序实施修复
3. 每完成一个修复，立即测试
4. 记录测试结果
5. 如有问题，回滚并重新分析

## 预期效果

修复完成后：
- ✅ 按钮点击根据状态智能响应
- ✅ 生成中点击显示进度，不重复生成
- ✅ 已完成点击直接查看报告
- ✅ PDF导出功能正常工作
- ✅ 所有关闭按钮正常响应
- ✅ 错误提示清晰友好
