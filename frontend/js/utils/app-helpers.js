/**
 * 应用工具函数模块
 * 提供需要访问全局state的辅助函数
 */

/* global state, loadChats, focusInput, autoResize, addMessage */

/**
 * 规范化聊天ID（确保为字符串类型）
 * @param {string|number} chatId - 聊天ID
 * @returns {string} 规范化后的聊天ID（空字符串表示无效）
 */
function normalizeChatId(chatId) {
  if (chatId === null || chatId === undefined) {
    return '';
  }
  return String(chatId).trim();
}

/**
 * 复制到剪贴板辅助函数
 * @param {string} text - 要复制的文本
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('✅ 链接已复制到剪贴板！');
    }).catch(err => {
        alert('❌ 复制失败，请手动复制');
    });
}

/**
 * 检查对话是否已同步到云端
 * @returns {boolean} 是否已同步到云端
 */
function isCloudSynced() {
    // 检查是否已登录（有token）
    const accessToken = sessionStorage.getItem('thinkcraft_access_token');
    if (!accessToken) {
        return false;
    }

    // 检查是否有对话数据
    try {
        const savedChats = JSON.parse(localStorage.getItem('thinkcraft_chats') || '[]');
        const hasChats = Array.isArray(savedChats) && savedChats.length > 0;

        // 已登录且有对话数据，说明已同步到云端
        return hasChats;
    } catch (e) {
        return false;
    }
}

/**
 * 处理登出
 */
async function handleLogout() {
    const cloudSynced = isCloudSynced();
    const message = buildLogoutMessage(cloudSynced);

    // 二次确认
    const confirmed = confirm(message);
    if (!confirmed) {
        console.log('[登出] 用户取消退出');
        return;
    }

    console.log('[登出] 用户确认退出，开始清理前端数据');

    try {

        // ✅ 清除 window.state 中的用户数据
        console.log('[登出] 清除 window.state 中的用户数据');
        if (window.stateManager && typeof window.stateManager.clearUserData === 'function') {
            window.stateManager.clearUserData();
        } else if (window.state) {
            // 降级方案：直接清除 window.state
            window.state.currentChat = null;
            window.state.messages = [];
            window.state.userData = {};
            window.state.conversationStep = 0;
            window.state.analysisCompleted = false;
            window.state.generation = {};
            if (window.state.inspiration) {
                window.state.inspiration.items = [];
                window.state.inspiration.currentEdit = null;
                window.state.inspiration.totalCount = 0;
                window.state.inspiration.lastSync = null;
                window.state.inspiration.stats = {
                    unprocessed: 0,
                    processing: 0,
                    completed: 0
                };
            }
            if (window.state.knowledge) {
                window.state.knowledge.items = [];
                window.state.knowledge.currentProjectId = null;
                window.state.knowledge.selectedTags = [];
                window.state.knowledge.searchKeyword = '';
                window.state.knowledge.filter = {
                    type: null,
                    projectId: null,
                    tags: []
                };
                window.state.knowledge.stats = {
                    total: 0,
                    byProject: {},
                    byType: {},
                    byTag: {}
                };
            }
        }

        // ✅ 清除所有token和会话数据
        console.log('[登出] 清除所有token和会话数据');
        sessionStorage.removeItem('thinkcraft_access_token');
        localStorage.removeItem('thinkcraft_refresh_token');

        // ✅ 清除登录会话数据
        sessionStorage.removeItem('thinkcraft_logged_in');
        sessionStorage.removeItem('thinkcraft_user');
        sessionStorage.removeItem('thinkcraft_quick_mode');
        sessionStorage.removeItem('thinkcraft_login_codes');

        // ✅ 清除登录页记住信息
        localStorage.removeItem('thinkcraft_remember');
        localStorage.removeItem('thinkcraft_login_phone');

        // ✅ 清除用户ID缓存
        localStorage.removeItem('thinkcraft_user_id');

        // ✅ 清除本地对话数据（对话已同步到云端，本地缓存可以清除）
        console.log('[登出] 清除本地对话数据');
        localStorage.removeItem('thinkcraft_chats');
        localStorage.removeItem('thinkcraft_teamspace');

        // ✅ 关闭设置弹窗（桌面端和移动端）
        console.log('[登出] 关闭设置弹窗');

        // 关闭桌面端设置弹窗
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.classList.remove('active');
            settingsModal.style.display = 'none';
        }

        // 关闭移动端底部设置面板
        const bottomSheet = document.getElementById('bottomSettingsSheet');
        if (bottomSheet) {
            bottomSheet.classList.remove('active');
            document.body.style.overflow = ''; // 恢复滚动
        }

        // ✅ 跳转到登录页面
        console.log('[登出] 跳转到登录页面');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('[登出] 失败:', error);
        alert('登出失败，请重试');
    }
}

/**
 * 构建登出消息
 * @param {boolean} cloudSynced - 对话是否已同步到云端
 * @returns {string} 登出确认消息
 */
function buildLogoutMessage(cloudSynced) {
    if (cloudSynced) {
        return '确定要退出登录吗？\n\n✅ 对话数据已同步到云端，下次登录可恢复。';
    }
    return '确定要退出登录吗？\n\n⚠️ 当前对话未同步，退出后将丢失本地数据。';
}

/**
 * 智能检测最佳输入方式
 * @returns {Object} 输入模式配置
 */
function getSmartInputMode() {
    const hour = new Date().getHours();
    const device = window.deviceDetector;

    // 1. 深夜/清晨时段（22:00 - 7:00）→ 文本模式
    if (hour >= 22 || hour <= 7) {
        return {
            mode: 'text',
            reason: '深夜时段，建议使用文字输入',
            icon: '🌙'
        };
    }

    // 2. 弱网或省流量模式 → 文本模式
    if (navigator.connection) {
        const effectiveType = navigator.connection.effectiveType;
        const saveData = navigator.connection.saveData;

        if (effectiveType === 'slow-2g' || effectiveType === '2g' || saveData) {
            return {
                mode: 'text',
                reason: '网络较慢，建议使用文字输入',
                icon: '📶'
            };
        }
    }

    // 3. 桌面端 → 文本模式（键盘更高效）
    if (device && device.deviceType && device.deviceType.isDesktop) {
        return {
            mode: 'text',
            reason: '桌面端，键盘输入更高效',
            icon: '⌨️'
        };
    }

    // 4. 移动端 + 白天 + 良好网络 → 语音模式
    if (device && device.deviceType && device.deviceType.isMobile) {
        // 检查是否支持语音识别
        const supportsSpeech = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);

        if (supportsSpeech) {
            return {
                mode: 'voice',
                reason: '点击左上角话筒，快速语音记录',
                icon: '🎤'
            };
        }
    }

    // 5. 默认：文本模式
    return {
        mode: 'text',
        reason: '开始输入你的创意想法',
        icon: '✍️'
    };
}

/**
 * 应用智能输入提示
 */
function applySmartInputHint() {
    const inputMode = getSmartInputMode();
    const mainInput = document.getElementById('mainInput');
    const quickVoiceBtn = document.querySelector('.quick-voice-btn');

    if (!mainInput) return;

    // 更新输入框提示文字
    if (inputMode.mode === 'voice') {
        mainInput.placeholder = `${inputMode.icon} ${inputMode.reason}`;

        // 移动端语音模式：添加脉冲动画提示
        if (quickVoiceBtn && window.deviceDetector?.deviceType?.isMobile) {
            quickVoiceBtn.style.animation = 'pulse 2s ease-in-out 3';

            // 3次脉冲后移除动画
            setTimeout(() => {
                quickVoiceBtn.style.animation = '';
            }, 6000);
        }
    } else {
        mainInput.placeholder = `${inputMode.icon} ${inputMode.reason}`;
        // 文本模式：自动聚焦输入框
        if (!state.currentChat) {
            setTimeout(() => {
                mainInput.focus();
            }, 300);
        }
    }
}

/**
 * 重置语音输入状态
 */
function resetVoiceInput() {
    isRecording = false;

    // 重置桌面端语音按钮状态
    const desktopVoiceBtn = document.getElementById('desktopVoiceBtn');
    const desktopVoiceText = document.getElementById('desktopVoiceText');
    if (desktopVoiceBtn) {
        desktopVoiceBtn.classList.remove('recording');
    }
    if (desktopVoiceText) {
        desktopVoiceText.textContent = '点击语音输入';
    }

    // 重置桌面端文本输入框状态
    const input = document.getElementById('mainInput');
    if (input) {
        input.placeholder = '分享你的创意想法，让我们通过深度对话来探索它的可能性...';
        input.style.borderColor = '';
    }
}

/**
 * 处理图片文件
 * @param {File} file - 图片文件
 */
async function processImageFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('❌ 请选择图片文件');
        return;
    }

    // 显示加载状态
    const loadingMsg = addMessage('assistant', '🖼️ 正在分析图片...');

    try {
        // 将图片转换为 Base64
        const base64Image = await fileToBase64(file);

        // 调用后端API进行图片识别
        const response = await fetch(`${state.settings.apiUrl}/api/vision/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: base64Image,
                prompt: '请描述这张图片的内容，如果图片中有文字，请提取出来。'
            })
        });

        if (!response.ok) {
            throw new Error(`API错误: ${response.status}`);
        }

        const data = await response.json();

        if (data.code !== 0) {
            throw new Error(data.error || '图片识别失败');
        }

        // 将识别结果填入输入框
        const input = document.getElementById('mainInput');
        const description = data.data.description;
        input.value = `[图片内容]: ${description}`;
        autoResize(input);

        // 移除加载消息
        if (loadingMsg && loadingMsg.parentNode) {
            loadingMsg.parentNode.removeChild(loadingMsg);
        }

    } catch (error) {
        // 移除加载消息
        if (loadingMsg && loadingMsg.parentNode) {
            loadingMsg.parentNode.removeChild(loadingMsg);
        }

        // 降级方案：仅显示图片预览
        const reader = new FileReader();
        reader.onload = (e) => {
            const input = document.getElementById('mainInput');
            input.value = `[已上传图片: ${file.name}]\n\n请描述你想探讨的内容：`;
            autoResize(input);

            // 显示图片预览（可选）
            alert(`📷 图片已接收：${file.name}\n\n⚠️ 图片识别功能需要后端支持\n当前仅显示图片名称，请手动描述图片内容。`);
        };
        reader.readAsDataURL(file);
    }
}

/**
 * 文件转Base64
 * @param {File} file - 文件对象
 * @returns {Promise<string>} Base64字符串
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 暴露到window对象
window.copyToClipboard = copyToClipboard;
window.handleLogout = handleLogout;
window.getSmartInputMode = getSmartInputMode;
window.fileToBase64 = fileToBase64;
window.applySmartInputHint = applySmartInputHint;
window.normalizeChatId = normalizeChatId;
