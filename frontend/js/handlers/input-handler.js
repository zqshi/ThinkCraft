/**
 * 输入处理模块
 * 处理用户输入、快捷键、语音等
 */

import { appState, spaceHoldTimer, spaceHoldTriggered, updateSpaceHoldTimer, updateSpaceHoldTriggered } from '../core/app-state.js';
import { autoResize, vibrate } from '../utils/helpers.js';
import { sendMessage } from './message-handler.js';
import { QUICK_START_PROMPTS } from '../app-config.js';

/**
 * 处理键盘按下事件
 */
export function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
        return;
    }

    if (e.code === 'Space' && !e.repeat && e.target.id === 'mainInput') {
        updateSpaceHoldTriggered(false);
        const timer = setTimeout(() => {
            updateSpaceHoldTriggered(true);
            e.preventDefault();
            handleVoice && handleVoice();
            vibrate(50);
            console.log('[长按空格] 触发语音输入');
        }, 300);
        updateSpaceHoldTimer(timer);
    }
}

/**
 * 处理键盘释放事件
 */
export function handleKeyUp(e) {
    if (e.code === 'Space') {
        clearTimeout(spaceHoldTimer);
        if (spaceHoldTriggered) {
            e.preventDefault();
            updateSpaceHoldTriggered(false);
        }
    }
}

/**
 * 快速开始
 */
export function quickStart(type) {
    const prompt = QUICK_START_PROMPTS[type];
    if (prompt) {
        const input = document.getElementById('mainInput');
        if (input) {
            input.value = prompt;
            sendMessage();
        }
    }
}

/**
 * 语音输入处理（占位符）
 */
export function handleVoice() {
    console.log('[语音] 语音输入功能待实现');
    alert('语音输入功能开发中');
}
