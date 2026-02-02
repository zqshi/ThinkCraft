/**
 * ChatMessages组件
 * 显示消息列表
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { MessageItem } from './message-item.jsx';

export function ChatMessages({ messages, isLoading, currentUserId, className = '' }) {
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const shouldAutoScrollRef = useRef(true);
    const lastMessageCountRef = useRef(0);

    const isNearBottom = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return true;
        const threshold = 80;
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        return distanceFromBottom <= threshold;
    }, []);

    // 滚动到底部
    const scrollToBottom = (behavior = 'auto') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    // 监听滚动，只有在接近底部时才自动滚动
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return undefined;

        const handleScroll = () => {
            const nearBottom = isNearBottom();
            shouldAutoScrollRef.current = nearBottom;
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, [isNearBottom]);

    // 监听新消息
    useEffect(() => {
        const messageCount = messages.length;
        const hasNewMessage = messageCount !== lastMessageCountRef.current;
        lastMessageCountRef.current = messageCount;

        if (!hasNewMessage) return;

        if (shouldAutoScrollRef.current) {
            scrollToBottom('auto');
        }
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
