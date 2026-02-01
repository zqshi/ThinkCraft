/**
 * 对话管理器模块
 * 负责对话的保存、加载和菜单交互
 *
 * @module ChatManager
 * @description 处理对话的持久化、菜单显示和交互逻辑
 *
 * @requires state - 全局状态管理器
 * @requires generateChatId - ID生成函数
 * @requires loadChats - 对话列表加载函数
 */

/* eslint-disable no-unused-vars, no-undef */

class ChatManager {
    constructor() {
        this.state = window.state;
    }

    /**
     * 保存当前对话
     *
     * @description
     * 将当前对话保存到localStorage。
     * 如果是新对话（currentChat为null），创建新记录并分配ID。
     * 如果是现有对话，更新记录。
     * 自动从第一条用户消息提取标题（如果未手动编辑）。
     */
    saveCurrentChat() {
        if (!this.state.settings.saveHistory || this.state.messages.length === 0) return;

        // 从第一条用户消息提取标题
        let title = '新对话';
        const existingChat = this.state.currentChat !== null
            ? this.state.chats.find(c => c.id == this.state.currentChat)
            : null;
        const titleEdited = Boolean(existingChat?.titleEdited);
        if (titleEdited && existingChat?.title) {
            title = existingChat.title;
        } else {
            const firstUserMsg = this.state.messages.find(m => m.role === 'user');
            if (firstUserMsg) {
                title = firstUserMsg.content.substring(0, 30);
                if (firstUserMsg.content.length > 30) {
                    title += '...';
                }
            }
        }

        const now = new Date().toISOString();

        // 核心逻辑：区分创建新对话和更新现有对话
        if (this.state.currentChat === null) {
            // 场景1：创建新对话
            const chatId = generateChatId();
            const chat = {
                id: chatId,
                title: title,
                titleEdited: false,
                messages: [...this.state.messages],
                userData: {...this.state.userData},
                conversationStep: this.state.conversationStep,
                analysisCompleted: this.state.analysisCompleted,
                createdAt: now,
                updatedAt: now
            };

            this.state.currentChat = chatId;  // 设置当前对话ID
            this.state.chats.unshift(chat);
        } else {
            // 场景2：更新现有对话
            const index = this.state.chats.findIndex(c => c.id == this.state.currentChat);
            if (index !== -1) {
                this.state.chats[index] = {
                    ...this.state.chats[index],
                    title: title,
                    titleEdited: this.state.chats[index].titleEdited || false,
                    messages: [...this.state.messages],
                    userData: {...this.state.userData},
                    conversationStep: this.state.conversationStep,
                    analysisCompleted: this.state.analysisCompleted,
                    updatedAt: now
                };
            } else {
                // 降级处理：当前对话ID不存在，使用现有ID创建新对话
                const chat = {
                    id: this.state.currentChat,
                    title: title,
                    titleEdited: titleEdited || false,
                    messages: [...this.state.messages],
                    userData: {...this.state.userData},
                    conversationStep: this.state.conversationStep,
                    analysisCompleted: this.state.analysisCompleted,
                    createdAt: now,
                    updatedAt: now
                };
                this.state.chats.unshift(chat);
            }
        }

        localStorage.setItem('thinkcraft_chats', JSON.stringify(this.state.chats));
        if (typeof loadChats === 'function') {
            loadChats();
        }
    }

    /**
     * 根据ID加载对话
     *
     * @param {number|string} chatId - 对话ID
     * @returns {Promise<void>}
     *
     * @description
     * 加载指定ID的对话，包括消息、用户数据和对话状态。
     * 自动保存当前对话（如果有变更）。
     * 更新UI显示。
     */
    async loadChat(chatId) {
        const chat = this.state.chats.find(c => c.id == chatId);
        if (!chat) return;

        // 🔧 保存当前会话的报告生成状态到 IndexedDB
        if (this.state.currentChat && this.state.currentChat !== chatId) {
            if (typeof window.reportButtonManager?.saveCurrentSessionState === 'function') {
                await window.reportButtonManager.saveCurrentSessionState(this.state.currentChat);
            }
        }

        // 保存当前对话
        if (this.state.currentChat && this.state.currentChat !== chatId && this.state.messages.length > 0 && this.state.settings.saveHistory) {
            this.saveCurrentChat();
        }

        // 加载选中的对话
        this.state.currentChat = chat.id;
        this.state.messages = Array.isArray(chat.messages) ? [...chat.messages] : [];
        this.state.userData = chat.userData || {};
        this.state.conversationStep = chat.conversationStep || 0;
        this.state.analysisCompleted = chat.analysisCompleted || false;

        // 清空并重新渲染消息列表
        const messageList = document.getElementById('messageList');
        messageList.innerHTML = '';
        document.getElementById('emptyState').style.display = 'none';
        messageList.style.display = 'block';

        // 渲染所有消息
        this.state.messages.forEach(msg => {
            if (window.messageHandler) {
                window.messageHandler.addMessage(msg.role, msg.content, null, false, true, true);
            }
        });

        // 智能检测：如果侧边栏处于覆盖模式（移动端），自动关闭并显示对话窗口
        const sidebar = document.getElementById('sidebar');
        const isOverlayMode = window.getComputedStyle(sidebar).position === 'fixed';
        if (isOverlayMode && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }

        // 刷新对话列表（更新active状态）
        if (typeof loadChats === 'function') {
            loadChats();
        }

        // 🔧 加载新会话的报告生成状态
        if (typeof window.reportGenerator?.loadGenerationStatesForChat === 'function') {
            await window.reportGenerator.loadGenerationStatesForChat(chatId);
        }

        // 滚动到底部
        if (typeof scrollToBottom === 'function') {
            scrollToBottom(true);
        }

        // 聚焦输入框
        if (typeof focusInput === 'function') {
            focusInput();
        }
    }

    /**
     * 切换对话菜单显示状态
     *
     * @param {Event} e - 事件对象
     * @param {number|string} chatId - 对话ID
     *
     * @description
     * 显示或隐藏对话项的操作菜单。
     * 自动关闭其他已打开的菜单。
     * 使用portal模式将菜单移到body下，避免被父容器裁剪。
     */
    toggleChatMenu(e, chatId) {
        e.stopPropagation();
        const menu = document.getElementById(`menu-${chatId}`);
        const button = e.currentTarget;
        const chatItem = button.closest('.chat-item');

        // 关闭所有其他菜单，并移除 menu-open 类
        document.querySelectorAll('.chat-item-menu').forEach(m => {
            if (m.id !== `menu-${chatId}`) {
                m.classList.remove('active');
                this.restoreChatMenu(m);
            }
        });
        document.querySelectorAll('.chat-item.menu-open').forEach(item => {
            item.classList.remove('menu-open');
        });

        // 切换当前菜单
        if (menu.classList.contains('active')) {
            menu.classList.remove('active');
            this.restoreChatMenu(menu);
            chatItem.classList.remove('menu-open');
        } else {
            this.portalChatMenu(menu, chatId);
            this.syncPinMenuLabel(menu, chatId);

            // 计算菜单位置
            const rect = button.getBoundingClientRect();
            menu.style.position = 'fixed';
            menu.style.top = `${rect.bottom + 4}px`;
            menu.style.left = `${rect.left - 120}px`;
            menu.style.zIndex = '1000';

            menu.classList.add('active');
            chatItem.classList.add('menu-open');
        }
    }

    /**
     * 将菜单移到body下（portal模式）
     *
     * @param {HTMLElement} menu - 菜单元素
     * @param {number|string} chatId - 对话ID
     *
     * @description
     * 将菜单元素移到document.body下，避免被父容器的overflow裁剪。
     * 保存chatId到dataset，用于后续恢复。
     */
    portalChatMenu(menu, chatId) {
        menu.dataset.chatId = chatId;
        if (menu.parentElement !== document.body) {
            document.body.appendChild(menu);
        }
    }

    /**
     * 同步置顶菜单项的文本
     *
     * @param {HTMLElement} menu - 菜单元素
     * @param {number|string} chatId - 对话ID
     *
     * @description
     * 根据对话的置顶状态，更新菜单中"置顶/取消置顶"项的文本。
     */
    syncPinMenuLabel(menu, chatId) {
        const chat = this.state.chats.find(c => c.id == chatId);
        if (!chat) return;
        const label = menu.querySelector('[data-action="pin"]');
        if (label) {
            // 清除所有文本节点，避免重复
            Array.from(label.childNodes).forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    node.remove();
                }
            });
            // 添加新的文本节点
            const newText = document.createTextNode(chat.isPinned ? '取消置顶' : '置顶');
            label.appendChild(newText);
        }
    }

    /**
     * 恢复菜单到原始位置
     *
     * @param {HTMLElement} menu - 菜单元素
     *
     * @description
     * 将菜单从body移回到对应的chat-item-actions容器中。
     * 如果找不到原始容器，则从DOM中移除菜单。
     */
    restoreChatMenu(menu) {
        const menuId = menu.id || '';
        const menuChatId = menu.dataset.chatId || (menuId.startsWith('menu-') ? menuId.slice(5) : '');
        if (!menuChatId) return;
        const chatItem = document.querySelector(`.chat-item[data-chat-id="${menuChatId}"]`);
        const actions = chatItem ? chatItem.querySelector('.chat-item-actions') : null;
        if (actions && menu.parentElement !== actions) {
            actions.appendChild(menu);
        } else if (!actions && menu.parentElement === document.body) {
            menu.remove();
        }
    }

    /**
     * 重新打开对话菜单
     *
     * @param {number|string} chatId - 对话ID
     *
     * @description
     * 在下一帧重新打开指定对话的菜单。
     * 用于在重命名、置顶等操作后保持菜单打开状态。
     */
    reopenChatMenu(chatId) {
        requestAnimationFrame(() => {
            const button = document.querySelector(`.chat-item[data-chat-id="${chatId}"] .chat-item-more`);
            if (!button) return;
            this.toggleChatMenu({ stopPropagation() {}, currentTarget: button }, chatId);
        });
    }

    /**
     * 关闭指定对话的菜单
     *
     * @param {number|string} chatId - 对话ID
     *
     * @description
     * 关闭指定对话的菜单并恢复到原始位置。
     * 移除所有menu-open类。
     */
    closeChatMenu(chatId) {
        const menu = document.getElementById(`menu-${chatId}`);
        if (menu) {
            menu.classList.remove('active');
            this.restoreChatMenu(menu);
        }
        // 移除所有 menu-open 类
        document.querySelectorAll('.chat-item.menu-open').forEach(item => {
            item.classList.remove('menu-open');
        });
    }
}

// 创建全局实例
window.chatManager = new ChatManager();

// 暴露全局函数（向后兼容）
function saveCurrentChat() {
    window.chatManager.saveCurrentChat();
}

function loadChat(chatId) {
    return window.chatManager.loadChat(chatId);
}

function toggleChatMenu(e, chatId) {
    window.chatManager.toggleChatMenu(e, chatId);
}

function portalChatMenu(menu, chatId) {
    window.chatManager.portalChatMenu(menu, chatId);
}

function syncPinMenuLabel(menu, chatId) {
    window.chatManager.syncPinMenuLabel(menu, chatId);
}

function restoreChatMenu(menu) {
    window.chatManager.restoreChatMenu(menu);
}

function reopenChatMenu(chatId) {
    window.chatManager.reopenChatMenu(chatId);
}

function closeChatMenu(chatId) {
    window.chatManager.closeChatMenu(chatId);
}
