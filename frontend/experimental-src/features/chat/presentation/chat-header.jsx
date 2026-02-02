/**
 * ChatHeader组件
 * 显示聊天标题和操作按钮
 */
import React from 'react';

export function ChatHeader({ chat, onClear, onExport, onSettings }) {
    return (
        <div className="chat-header">
            <div className="chat-header-info">
                <h3 className="chat-title">{chat?.title || '未命名聊天'}</h3>
                {chat?.status && (
                    <span className={`chat-status status-${chat.status}`}>
                        {getStatusText(chat.status)}
                    </span>
                )}
            </div>
            <div className="chat-header-actions">
                {onClear && (
                    <button
                        className="chat-action-btn"
                        onClick={onClear}
                        title="清空消息"
                    >
                        <i className="icon-clear"></i>
                    </button>
                )}
                {onExport && (
                    <button
                        className="chat-action-btn"
                        onClick={onExport}
                        title="导出聊天"
                    >
                        <i className="icon-export"></i>
                    </button>
                )}
                {onSettings && (
                    <button
                        className="chat-action-btn"
                        onClick={onSettings}
                        title="设置"
                    >
                        <i className="icon-settings"></i>
                    </button>
                )}
            </div>
        </div>
    );
}

function getStatusText(status) {
    const statusMap = {
        active: '活跃',
        inactive: '非活跃',
        archived: '已归档',
        deleted: '已删除'
    };
    return statusMap[status] || status;
}