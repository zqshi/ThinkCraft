/**
 * ChatSidebar组件
 * 聊天列表侧边栏
 */
import React, { useState } from 'react';

export function ChatSidebar({
    chats,
    activeChat,
    onSelectChat,
    onCreateChat,
    isOpen,
    onToggle
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [showNewChatForm, setShowNewChatForm] = useState(false);
    const [newChatTitle, setNewChatTitle] = useState('');

    // 过滤聊天列表
    const filteredChats = chats.filter(chat =>
        chat.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 创建新聊天
    const handleCreateChat = () => {
        if (newChatTitle.trim()) {
            onCreateChat(newChatTitle.trim());
            setNewChatTitle('');
            setShowNewChatForm(false);
        }
    };

    // 处理键盘事件
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCreateChat();
        } else if (e.key === 'Escape') {
            setShowNewChatForm(false);
            setNewChatTitle('');
        }
    };

    // 获取聊天状态图标
    const getStatusIcon = (status) => {
        const iconMap = {
            active: 'icon-status-active',
            inactive: 'icon-status-inactive',
            archived: 'icon-status-archived'
        };
        return iconMap[status] || 'icon-status-default';
    };

    // 格式化最后消息时间
    const formatLastTime = (timestamp) => {
        if (!timestamp) return '';

        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // 小于1分钟
        if (diff < 60000) {
            return '刚刚';
        }

        // 小于1小时
        if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}分钟前`;
        }

        // 小于24小时
        if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}小时前`;
        }

        // 显示日期
        return date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className={`chat-sidebar ${isOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-header">
                <button className="sidebar-toggle" onClick={onToggle}>
                    <i className={isOpen ? 'icon-arrow-left' : 'icon-arrow-right'}></i>
                </button>

                {isOpen && (
                    <>
                        <h3 className="sidebar-title">聊天列表</h3>
                        <button
                            className="new-chat-btn"
                            onClick={() => setShowNewChatForm(true)}
                            title="新建聊天"
                        >
                            <i className="icon-plus"></i>
                        </button>
                    </>
                )}
            </div>

            {isOpen && (
                <>
                    <div className="sidebar-search">
                        <div className="search-input-wrapper">
                            <i className="icon-search"></i>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="搜索聊天..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {showNewChatForm && (
                        <div className="new-chat-form">
                            <input
                                type="text"
                                className="new-chat-input"
                                placeholder="输入聊天标题..."
                                value={newChatTitle}
                                onChange={(e) => setNewChatTitle(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                            />
                            <div className="new-chat-actions">
                                <button
                                    className="btn-confirm"
                                    onClick={handleCreateChat}
                                    disabled={!newChatTitle.trim()}
                                >
                                    创建
                                </button>
                                <button
                                    className="btn-cancel"
                                    onClick={() => {
                                        setShowNewChatForm(false);
                                        setNewChatTitle('');
                                    }}
                                >
                                    取消
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="chat-list">
                        {filteredChats.length === 0 ? (
                            <div className="empty-state">
                                {searchTerm ? (
                                    <p>没有找到匹配的聊天</p>
                                ) : (
                                    <p>还没有聊天，创建一个吧！</p>
                                )}
                            </div>
                        ) : (
                            filteredChats.map((chat) => (
                                <div
                                    key={chat.id}
                                    className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
                                    onClick={() => onSelectChat(chat)}
                                >
                                    <div className="chat-item-header">
                                        <h4 className="chat-item-title">{chat.title}</h4>
                                        <span className={`chat-item-status ${getStatusIcon(chat.status)}`}></span>
                                    </div>

                                    {chat.lastMessage && (
                                        <div className="chat-item-preview">
                                            <p>{chat.lastMessage.content}</p>
                                        </div>
                                    )}

                                    <div className="chat-item-footer">
                                        <span className="chat-item-time">
                                            {formatLastTime(chat.updatedAt)}
                                        </span>
                                        {chat.unreadCount > 0 && (
                                            <span className="chat-item-badge">{chat.unreadCount}</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}