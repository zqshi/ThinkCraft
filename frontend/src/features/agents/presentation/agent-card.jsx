/**
 * AgentCard组件
 * 显示单个Agent的信息和操作
 */
import React, { useState } from 'react';

export function AgentCard({ agent, onStatusChange }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskForm, setTaskForm] = useState({
        type: 'code_review',
        content: '',
        priority: 'medium'
    });

    const getStatusIcon = (status) => {
        const icons = {
            running: '🟢',
            idle: '⚫',
            stopped: '⭕',
            error: '🔴',
            loading: '⏳'
        };
        return icons[status] || '⚪';
    };

    const getStatusClass = (status) => {
        return `status-${status}`;
    };

    const getTypeIcon = (type) => {
        const icons = {
            developer: '👨‍💻',
            designer: '🎨',
            analyst: '📊',
            assistant: '🤖',
            manager: '👔'
        };
        return icons[type] || '🤖';
    };

    const getStatusActions = () => {
        switch (agent.status) {
            case 'running':
                return [
                    { action: 'stop', label: '停止', icon: '⏹' },
                    { action: 'restart', label: '重启', icon: '🔄' }
                ];
            case 'stopped':
                return [
                    { action: 'start', label: '启动', icon: '▶' }
                ];
            case 'error':
                return [
                    { action: 'restart', label: '重试', icon: '🔄' }
                ];
            case 'idle':
                return [
                    { action: 'start', label: '启动', icon: '▶' }
                ];
            default:
                return [];
        }
    };

    const handleSendTask = () => {
        if (!taskForm.content.trim()) {
            alert('请输入任务内容');
            return;
        }

        // 这里应该调用agentsUseCase.sendTask
        console.log('发送任务:', taskForm);
        setIsTaskModalOpen(false);
        setTaskForm({ type: 'code_review', content: '', priority: 'medium' });

        // 显示成功提示
        alert('任务已发送给Agent');
    };

    const statusActions = getStatusActions();

    return (
        <div className={`agent-card ${getStatusClass(agent.status)} ${isExpanded ? 'expanded' : ''}`}>
            <div className="agent-card-header">
                <div className="agent-info">
                    <div className="agent-icon">
                        {getTypeIcon(agent.type)}
                    </div>
                    <div className="agent-details">
                        <h4 className="agent-name">{agent.name}</h4>
                        <p className="agent-description">{agent.description}</p>
                        <div className="agent-meta">
                            <span className={`agent-status ${getStatusClass(agent.status)}`}>
                                {getStatusIcon(agent.status)}
                                {agent.status}
                            </span>
                            <span className="agent-type">{agent.type}</span>
                        </div>
                    </div>
                </div>

                <div className="agent-actions">
                    {statusActions.map(({ action, label, icon }) => (
                        <button
                            key={action}
                            className={`action-btn action-${action}`}
                            onClick={() => onStatusChange(action)}
                            title={label}
                        >
                            {icon}
                        </button>
                    ))}
                    <button
                        className="action-btn action-task"
                        onClick={() => setIsTaskModalOpen(true)}
                        title="分配任务"
                    >
                        📋
                    </button>
                    <button
                        className="action-btn action-expand"
                        onClick={() => setIsExpanded(!isExpanded)}
                        title={isExpanded ? '收起' : '展开'}
                    >
                        {isExpanded ? '▲' : '▼'}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="agent-card-body">
                    <div className="agent-capabilities">
                        <h5>能力列表</h5>
                        <div className="capabilities-list">
                            {agent.capabilities && agent.capabilities.map((capability, index) => (
                                <span key={index} className="capability-tag">
                                    {capability}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="agent-stats">
                        <div className="stat-item">
                            <span className="stat-label">任务完成数</span>
                            <span className="stat-value">{agent.stats?.tasksCompleted || 0}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">运行时长</span>
                            <span className="stat-value">{formatDuration(agent.stats?.totalRuntime)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">成功率</span>
                            <span className="stat-value">{agent.stats?.successRate || 0}%</span>
                        </div>
                    </div>

                    <div className="agent-config">
                        <h5>配置信息</h5>
                        <div className="config-item">
                            <span className="config-label">最大并发任务数:</span>
                            <span className="config-value">{agent.config?.maxConcurrentTasks || 1}</span>
                        </div>
                        <div className="config-item">
                            <span className="config-label">超时时间:</span>
                            <span className="config-value">{agent.config?.timeout || 30000}ms</span>
                        </div>
                        <div className="config-item">
                            <span className="config-label">重试次数:</span>
                            <span className="config-value">{agent.config?.retryAttempts || 3}</span>
                        </div>
                    </div>
                </div>
            )}

            {isTaskModalOpen && (
                <div className="task-modal-overlay" onClick={() => setIsTaskModalOpen(false)}>
                    <div className="task-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>分配任务给 {agent.name}</h3>
                        <div className="task-form">
                            <div className="form-group">
                                <label>任务类型</label>
                                <select
                                    value={taskForm.type}
                                    onChange={(e) => setTaskForm({...taskForm, type: e.target.value})}
                                >
                                    <option value="code_review">代码审查</option>
                                    <option value="code_generation">代码生成</option>
                                    <option value="test">运行测试</option>
                                    <option value="analysis">数据分析</option>
                                    <option value="design">设计建议</option>
                                    <option value="documentation">文档生成</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>任务内容</label>
                                <textarea
                                    value={taskForm.content}
                                    onChange={(e) => setTaskForm({...taskForm, content: e.target.value})}
                                    placeholder="请输入任务详细描述..."
                                    rows={4}
                                />
                            </div>
                            <div className="form-group">
                                <label>优先级</label>
                                <select
                                    value={taskForm.priority}
                                    onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})}
                                >
                                    <option value="low">低</option>
                                    <option value="medium">中</option>
                                    <option value="high">高</option>
                                </select>
                            </div>
                        </div>
                        <div className="task-modal-actions">
                            <button
                                className="btn-cancel"
                                onClick={() => setIsTaskModalOpen(false)}
                            >
                                取消
                            </button>
                            <button
                                className="btn-confirm"
                                onClick={handleSendTask}
                                disabled={!taskForm.content.trim()}
                            >
                                发送任务
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatDuration(seconds) {
    if (!seconds) return '0秒';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分钟`);
    if (secs > 0 && hours === 0) parts.push(`${secs}秒`);

    return parts.join('');
}