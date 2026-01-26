/**
 * ChatMessages组件
 * 显示消息列表
 */
import React, { useEffect, useRef } from 'react';
import { MessageItem } from './message-item.jsx';

export function ChatMessages({ messages, isLoading, currentUserId, className = '' }) {
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    // 滚动到底部
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 监听新消息
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 按时间分组消息
    const groupedMessages = groupMessagesByDate(messages);

    if (isLoading && messages.length === 0) {
        return (
            <div className={`chat-messages ${className} loading`}>
                <div className="chat-loading">正在加载消息...</div>
            </div>
        );
    }

    if (!messages || messages.length === 0) {
        return (
            <div className={`chat-messages ${className} empty`}>
                <div className="empty-messages">
                    <i className="icon-chat-empty"></i>
                    <p>还没有消息，开始对话吧！</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`chat-messages ${className}`} ref={messagesContainerRef}>
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date} className="message-group">
                    <div className="message-date-divider">
                        <span>{formatDate(date)}</span>
                    </div>
                    {dateMessages.map((message) => (
                        <MessageItem
                            key={message.id}
                            message={message}
                            isOwn={message.sender === currentUserId}
                        />
                    ))}
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
}

/**
 * 按日期分组消息
 */
function groupMessagesByDate(messages) {
    const groups = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    messages.forEach((message) => {
        const messageDate = new Date(message.createdAt).toDateString();
        let dateKey = messageDate;

        if (messageDate === today) {
            dateKey = 'today';
        } else if (messageDate === yesterday) {
            dateKey = 'yesterday';
        }

        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(message);
    });

    return groups;
}

/**
 * 格式化日期显示
 */
function formatDate(dateKey) {
    const dateMap = {
        today: '今天',
        yesterday: '昨天'
    };
    return dateMap[dateKey] || dateKey;
}