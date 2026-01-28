/**
 * 输入处理模块
 * 处理用户输入、快捷键、语音等
 */

import {
  appState,
  spaceHoldTimer,
  spaceHoldTriggered,
  isComposing,
  updateSpaceHoldTimer,
  updateSpaceHoldTriggered,
  updateIsComposing
} from '../core/app-state.js';
import { autoResize, vibrate } from '../utils/helpers.js';
import { sendMessage } from './message-handler.js';
import { QUICK_START_PROMPTS } from '../app-config.js';

/**
 * 处理键盘按下事件
 */
export function handleKeyDown(e) {
  // 如果正在输入法组合中（比如拼音输入），不处理 Enter 键
  if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
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
  alert('语音输入功能开发中');
}

/**
 * 处理输入法组合开始事件
 */
export function handleCompositionStart(e) {
  updateIsComposing(true);
}

/**
 * 处理输入法组合结束事件
 */
export function handleCompositionEnd(e) {
  updateIsComposing(false);
}
