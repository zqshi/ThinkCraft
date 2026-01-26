/**
 * ChatInput组件
 * 消息输入框，支持文本、文件、代码等类型
 */
import React, { useState, useRef, useCallback } from 'react';
import { chatEventHandler } from '../infrastructure/chat-event.handler.js';

export function ChatInput({ onSendMessage, disabled = false }) {
    const [message, setMessage] = useState('');
    const [isComposing, setIsComposing] = useState(false);
    const [showTypeSelector, setShowTypeSelector] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    const messageTypes = [
        { type: 'text', icon: 'icon-text', label: '文本' },
        { type: 'code', icon: 'icon-code', label: '代码' },
        { type: 'file', icon: 'icon-file', label: '文件' }
    ];

    const [selectedType, setSelectedType] = useState(messageTypes[0]);

    // 发送消息
    const handleSend = useCallback(() => {
        if (!message.trim() || disabled) return;

        onSendMessage(message, selectedType.type);
        setMessage('');

        // 重置输入框高度
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    }, [message, selectedType.type, onSendMessage, disabled]);

    // 处理键盘事件
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
            e.preventDefault();
            handleSend();
        }
    };

    // 处理输入变化
    const handleInputChange = (e) => {
        setMessage(e.target.value);

        // 自动调整高度
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    };

    // 处理文件选择
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 验证文件大小（10MB限制）
        if (file.size > 10 * 1024 * 1024) {
            alert('文件大小不能超过10MB');
            return;
        }

        // 读取文件内容
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = {
                name: file.name,
                size: file.size,
                type: file.type,
                data: event.target.result
            };

            onSendMessage(JSON.stringify(content), 'file');
        };

        reader.readAsDataURL(file);

        // 清空文件输入
        e.target.value = '';
    };

    // 处理拖放
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const file = files[0];
            const mockEvent = { target: { files: [file] } };
            handleFileSelect(mockEvent);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // 插入代码模板
    const insertCodeTemplate = () => {
        const template = '```javascript\n// 在这里输入代码\n```';
        setMessage(template);
        textareaRef.current?.focus();
    };

    // 快速回复
    const quickReplies = [
        '明白了',
        '请继续',
        '我需要更多信息',
        '这很有帮助',
        '谢谢'
    ];

    const handleQuickReply = (reply) => {
        onSendMessage(reply, 'text');
    };

    return (
        <div className="chat-input-container">
            <div className="chat-input-toolbar">
                <div className="toolbar-left">
                    <button
                        className={`toolbar-btn type-selector ${showTypeSelector ? 'active' : ''}`}
                        onClick={() => setShowTypeSelector(!showTypeSelector)}
                        title="选择消息类型"
                    >
                        <i className={selectedType.icon}></i>
                        <span>{selectedType.label}</span>
                        <i className="icon-arrow-down"></i>
                    </button>

                    {selectedType.type === 'file' && (
                        <button
                            className="toolbar-btn"
                            onClick={() => fileInputRef.current?.click()}
                            title="选择文件"
                        >
                            <i className="icon-upload"></i>
                        </button>
                    )}

                    {selectedType.type === 'code' && (
                        <button
                            className="toolbar-btn"
                            onClick={insertCodeTemplate}
                            title="插入代码模板"
                        >
                            <i className="icon-template"></i>
                        </button>
                    )}
                </div>

                <div className="toolbar-right">
                    <button
                        className="toolbar-btn"
                        onClick={() => chatEventHandler.emit('chat:toggleTimestamp')}
                        title="显示/隐藏时间戳"
                    >
                        <i className="icon-time"></i>
                    </button>
                </div>
            </div>

            {showTypeSelector && (
                <div className="type-selector-dropdown">
                    {messageTypes.map((type) => (
                        <button
                            key={type.type}
                            className={`type-option ${selectedType.type === type.type ? 'active' : ''}`}
                            onClick={() => {
                                setSelectedType(type);
                                setShowTypeSelector(false);
                            }}
                        >
                            <i className={type.icon}></i>
                            <span>{type.label}</span>
                        </button>
                    ))}
                </div>
            )}

            <div
                className="chat-input-wrapper"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                <textarea
                    ref={textareaRef}
                    className="chat-textarea"
                    value={message}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    placeholder={getPlaceholder(selectedType.type)}
                    disabled={disabled}
                    rows={1}
                />

                <button
                    className="send-btn"
                    onClick={handleSend}
                    disabled={!message.trim() || disabled}
                    title="发送消息 (Enter)"
                >
                    <i className="icon-send"></i>
                </button
            </div>

            <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                accept="*/*"
            />

            {message.length > 0 && (
                <div className="chat-input-info">
                    <span className="char-count">
                        {message.length} / 2000
                    </span>
                    <span className="input-hint">
                        Shift+Enter 换行
                    </span>
                </div>
            )}

            <div className="quick-replies">
                {quickReplies.map((reply) => (
                    <button
                        key={reply}
                        className="quick-reply-btn"
                        onClick={() => handleQuickReply(reply)}
                        disabled={disabled}
                    >
                        {reply}
                    </button>
                ))}
            </div>
        </div>
    );
}

function getPlaceholder(type) {
    const placeholders = {
        text: '输入消息...',
        code: '输入代码或描述...',
        file: '拖放文件到此处或点击上传按钮'
    };
    return placeholders[type] || '输入消息...';
}