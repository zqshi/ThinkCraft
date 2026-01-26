/**
 * MessageItem组件
 * 显示单条消息
 */
import React, { useState } from 'react';

export function MessageItem({ message, isOwn }) {
    const [showTimestamp, setShowTimestamp] = useState(false);

    const handleClick = () => {
        setShowTimestamp(!showTimestamp);
    };

    const getMessageClass = () => {
        const classes = ['message-item'];

        if (isOwn) {
            classes.push('message-own');
        } else {
            classes.push('message-other');
        }

        if (message.status === 'sending') {
            classes.push('message-sending');
        } else if (message.status === 'failed') {
            classes.push('message-failed');
        }

        if (message.type === 'notification') {
            classes.push('message-notification');
        }

        return classes.join(' ');
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderContent = () => {
        switch (message.type) {
            case 'text':
                return <div className="message-text">{message.content}</div>;

            case 'image':
                return (
                    <div className="message-image">
                        <img src={message.content} alt="图片消息" />
                    </div>
                );

            case 'file':
                return (
                    <div className="message-file">
                        <a href={message.content.url} download={message.content.name}>
                            <i className="icon-file"></i>
                            <span>{message.content.name}</span>
                        </a>
                    </div>
                );

            case 'code':
                return (
                    <div className="message-code">
                        <pre><code>{message.content}</code></pre>
                    </div>
                );

            case 'notification':
                return (
                    <div className="message-notification-content">
                        <i className="icon-info"></i>
                        <span>{message.content}</span>
                    </div>
                );

            default:
                return <div className="message-text">{message.content}</div>;
        }
    };

    return (
        <div className={getMessageClass()} onClick={handleClick}>
            {!isOwn && message.sender && (
                <div className="message-sender">
                    <span className="sender-name">{message.sender}</span>
                </div>
            )}

            <div className="message-content">
                {renderContent()}

                {message.status === 'sending' && (
                    <div className="message-status sending">
                        <i className="icon-loading"></i>
                    </div>
                )}

                {message.status === 'failed' && (
                    <div className="message-status failed">
                        <i className="icon-error"></i>
                        <span>发送失败</span>
                    </div>
                )}
            </div>

            {showTimestamp && (
                <div className="message-timestamp">
                    {formatTime(message.createdAt)}
                </div>
            )}
        </div>
    );
}