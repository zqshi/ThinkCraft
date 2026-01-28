/**
 * 聊天管理模块
 * 处理聊天的保存、加载、删除等管理功能
 */

import { appState, saveDebounceTimer, updateSaveDebounceTimer } from '../core/app-state.js';
import { addMessage } from './message-handler.js';
import { focusInput } from '../utils/helpers.js';
import { closeAllChatMenus, closeChatMenu } from '../utils/helpers.js';

/**
 * 开始新对话
 */
export function startNewChat() {
    if (appState.messages.length > 0 && appState.settings.saveHistory) {
        saveCurrentChat();
    }

    appState.currentChat = null;
    appState.messages = [];
    appState.conversationStep = 0;
    appState.userData = {};
    appState.analysisCompleted = false;

    document.getElementById('emptyState').style.display = 'flex';
    document.getElementById('messageList').style.display = 'none';
    document.getElementById('messageList').innerHTML = '';

    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.querySelector('.menu-toggle');

    if (sidebar && menuToggle) {
        const isOverlayMode = window.getComputedStyle(menuToggle).display !== 'none';
        if (isOverlayMode && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            }
    }

    focusInput();
    }

/**
 * 防抖保存函数
 */
export function debouncedSaveCurrentChat() {
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
    }
    const timer = setTimeout(() => {
        saveCurrentChat();
    }, 300);
    updateSaveDebounceTimer(timer);
}

/**
 * 保存当前对话
 */
export function saveCurrentChat() {
    if (!appState.settings.saveHistory || appState.messages.length === 0) return;

    let title = '新对话';
    const firstUserMsg = appState.messages.find(m => m.role === 'user');
    if (firstUserMsg) {
        title = firstUserMsg.content.substring(0, 30);
        if (firstUserMsg.content.length > 30) {
            title += '...';
        }
    }

    const now = new Date().toISOString();

    if (appState.currentChat === null) {
        const base = Date.now();
        const suffix = Math.floor(Math.random() * 1000);
        const chatId = base * 1000 + suffix;
        const chat = {
            id: chatId,
            title: title,
            messages: [...appState.messages],
            userData: {...appState.userData},
            conversationStep: appState.conversationStep,
            analysisCompleted: appState.analysisCompleted,
            createdAt: now,
            updatedAt: now
        };

        appState.currentChat = chatId;
        appState.chats.unshift(chat);
        } else {
        const index = appState.chats.findIndex(c => c.id == appState.currentChat);
        if (index !== -1) {
            appState.chats[index] = {
                ...appState.chats[index],
                title: title,
                messages: [...appState.messages],
                userData: {...appState.userData},
                conversationStep: appState.conversationStep,
                analysisCompleted: appState.analysisCompleted,
                updatedAt: now
            };
            } else {
            const chat = {
                id: appState.currentChat,
                title: title,
                messages: [...appState.messages],
                userData: {...appState.userData},
                conversationStep: appState.conversationStep,
                analysisCompleted: appState.analysisCompleted,
                createdAt: now,
                updatedAt: now
            };
            appState.chats.unshift(chat);
        }
    }

    localStorage.setItem('thinkcraft_chats', JSON.stringify(appState.chats));
    loadChats();
}

/**
 * 加载聊天列表
 */
export function loadChats() {
    const saved = localStorage.getItem('thinkcraft_chats');

    if (!saved || saved === '[]') {
        appState.chats = [];
    } else {
        appState.chats = JSON.parse(saved);
    }

    appState.chats.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const aId = Number(a.id) || 0;
        const bId = Number(b.id) || 0;
        if (aId !== bId) return bId - aId;
        const aRequestId = Number(a.requestId ?? a.requestID ?? 0) || 0;
        const bRequestId = Number(b.requestId ?? b.requestID ?? 0) || 0;
        return bRequestId - aRequestId;
    });

    const historyDiv = document.getElementById('chatHistory');
    historyDiv.innerHTML = '';

    if (appState.chats.length === 0) {
        historyDiv.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-tertiary); font-size: 13px;">暂无历史记录</div>';
        return;
    }

    appState.chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'chat-item' + (chat.isPinned ? ' pinned' : '') + (appState.currentChat == chat.id ? ' active' : '');
        item.dataset.chatId = chat.id;

        const tagsHTML = '';

        item.innerHTML = `
            <svg class="chat-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
            </svg>
            <div style="flex: 1; min-width: 0; overflow: hidden;">
                ${tagsHTML}
                <span class="chat-item-content">${chat.title}</span>
            </div>
            <div class="chat-item-actions">
                <button class="chat-item-more" onclick="window.toggleChatMenu(event, '${chat.id}')">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                    </svg>
                </button>
                <div class="chat-item-menu" id="menu-${chat.id}">
                    <div class="chat-item-menu-item" onclick="window.manageTagsForChat(event, '${chat.id}')">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                        </svg>
                        管理标签
                    </div>
                    <div class="chat-item-menu-item" onclick="window.renameChat(event, '${chat.id}')">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                        重命名
                    </div>
                    <div class="chat-item-menu-item" onclick="window.togglePinChat(event, '${chat.id}')" data-action="pin">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                        </svg>
                        <span class="chat-item-menu-label" data-role="pin-label">${chat.isPinned ? '取消置顶' : '置顶'}</span>
                    </div>
                    <div class="chat-item-menu-item danger" onclick="window.deleteChat(event, '${chat.id}')">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                        删除
                    </div>
                </div>
            </div>
        `;
        item.addEventListener('click', () => {
            window.loadChat(chat.id);
        });
        historyDiv.appendChild(item);
    });
}

/**
 * 加载指定对话
 */
export function loadChat(id) {
    const targetId = typeof id === 'string' && !isNaN(id) ? Number(id) : id;
    const chat = appState.chats.find(c => c.id == targetId);

    if (!chat) {
        `));
        return;
    }

    if (appState.currentChat && appState.currentChat != targetId && appState.messages.length > 0) {
        saveCurrentChat();
    }

    const chatContainer = document.getElementById('chatContainer');
    const knowledgePanel = document.getElementById('knowledgePanel');
    const inputContainer = document.getElementById('inputContainer');

    if (chatContainer) chatContainer.style.display = 'flex';
    if (knowledgePanel) knowledgePanel.style.display = 'none';
    if (inputContainer) inputContainer.style.display = 'block';

    const chatMessages = Array.isArray(chat.messages) ? chat.messages : [];
    appState.currentChat = chat.id;
    appState.messages = [...chatMessages];
    appState.userData = chat.userData ? {...chat.userData} : {};
    appState.conversationStep = chat.conversationStep || chatMessages.length;
    appState.analysisCompleted = chat.analysisCompleted || false;

    document.getElementById('emptyState').style.display = 'none';
    const messageList = document.getElementById('messageList');
    messageList.style.display = 'block';
    messageList.innerHTML = '';

    chatMessages.forEach((msg, index) => {
        const isLastMessage = index === chatMessages.length - 1;
        const shouldShowButton = isLastMessage && msg.role === 'assistant' && chat.analysisCompleted;

        let content = msg.content;
        if (content.includes('[ANALYSIS_COMPLETE]')) {
            content = content.replace(/\n?\[ANALYSIS_COMPLETE\]\n?/g, '').trim();
        }

        if (shouldShowButton) {
            addMessage(msg.role, content, null, true, true, true);
        } else {
            addMessage(msg.role, content, null, false, true, true);
        }
    });

    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.querySelector('.menu-toggle');

    if (sidebar && menuToggle) {
        const isOverlayMode = window.getComputedStyle(menuToggle).display !== 'none';
        if (isOverlayMode && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            }
    }

    loadChats();
    }

/**
 * 删除对话
 */
export function deleteChat(e, chatId) {
    e.stopPropagation();

    if (!confirm('确定要删除这个对话吗？此操作不可恢复。')) {
        return;
    }

    // 关闭所有浮窗
    closeAllChatMenus();

    appState.chats = appState.chats.filter(c => c.id != chatId);
    localStorage.setItem('thinkcraft_chats', JSON.stringify(appState.chats));

    if (appState.currentChat == chatId) {
        appState.currentChat = null;
        appState.messages = [];
        appState.conversationStep = 0;
        appState.userData = {};
        document.getElementById('emptyState').style.display = 'flex';
        document.getElementById('messageList').style.display = 'none';
        document.getElementById('messageList').innerHTML = '';
    }

    loadChats();
}

/**
 * 重命名对话
 */
export function renameChat(e, chatId) {
    e.stopPropagation();
    const chat = appState.chats.find(c => c.id == chatId);
    if (!chat) return;

    const newTitle = prompt('修改对话标题', chat.title);
    if (newTitle && newTitle.trim()) {
        chat.title = newTitle.trim();
        localStorage.setItem('thinkcraft_chats', JSON.stringify(appState.chats));
        loadChats();
        reopenChatMenu(chatId);
    }
}

/**
 * 置顶对话
 */
export function togglePinChat(e, chatId) {
    e.stopPropagation();
    const chat = appState.chats.find(c => c.id == chatId);
    if (!chat) return;

    chat.isPinned = !chat.isPinned;
    localStorage.setItem('thinkcraft_chats', JSON.stringify(appState.chats));
    loadChats();
    reopenChatMenu(chatId);
}

/**
 * 管理标签
 */
export function manageTagsForChat(e, chatId) {
    e.stopPropagation();
    const chat = appState.chats.find(c => c.id == chatId);
    if (!chat) return;

    if (!chat.tags) {
        chat.tags = { auto: [], user: [] };
    }

    const currentUserTags = chat.tags.user || [];
    const tagsStr = currentUserTags.join(', ');

    const newTagsStr = prompt(
        '管理用户标签（多个标签用逗号分隔）\n\n' +
        'AI自动标签：' + (chat.tags.auto || []).join(', ') + '\n' +
        '当前用户标签：' + tagsStr,
        tagsStr
    );

    if (newTagsStr !== null) {
        const newTags = newTagsStr
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0 && t.length <= 10);

        chat.tags.user = newTags;
        localStorage.setItem('thinkcraft_chats', JSON.stringify(appState.chats));
        loadChats();
        reopenChatMenu(chatId);
    }
}

/**
 * 切换聊天菜单
 */
function portalChatMenu(menu, chatId) {
    menu.dataset.chatId = chatId;
    if (menu.parentElement !== document.body) {
        document.body.appendChild(menu);
    }
}

function syncPinMenuLabel(menu, chatId) {
    const chat = appState.chats.find(c => c.id == chatId);
    if (!chat) return;
    const label = menu.querySelector('[data-role="pin-label"]');
    if (label) {
        label.textContent = chat.isPinned ? '取消置顶' : '置顶';
    }
}

export function toggleChatMenu(e, chatId) {
    e.stopPropagation();
    const menu = document.getElementById(`menu-${chatId}`);
    const button = e.currentTarget;
    const chatItem = button.closest('.chat-item');

    closeAllChatMenus();

    const isOpen = menu.classList.contains('active');
    menu.classList.toggle('active');

    if (!isOpen) {
        chatItem.classList.add('menu-open');
        portalChatMenu(menu, chatId);
        syncPinMenuLabel(menu, chatId);
        menu.style.position = 'fixed';

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const buttonRect = button.getBoundingClientRect();
                const menuWidth = menu.offsetWidth || 140;

                const top = buttonRect.bottom + 6;
                let left = buttonRect.right - menuWidth;
                const minLeft = 8;
                const maxLeft = window.innerWidth - menuWidth - 8;
                left = Math.min(Math.max(left, minLeft), maxLeft);

                menu.style.left = `${left}px`;
                menu.style.top = `${top}px`;
            });
        });
    } else {
        closeChatMenu(chatId);
    }
}

function reopenChatMenu(chatId) {
    requestAnimationFrame(() => {
        const button = document.querySelector(`.chat-item[data-chat-id="${chatId}"] .chat-item-more`);
        if (!button) return;
        toggleChatMenu({ stopPropagation() {}, currentTarget: button }, chatId);
    });
}
