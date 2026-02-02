/**
 * AgentsDashboard组件
 * 数字员工总览和控制面板
 */
import React, { useState, useEffect } from 'react';
import { AgentCard } from './agent-card.jsx';
import { AgentCreator } from './agent-creator.jsx';
import { AgentMonitor } from './agent-monitor.jsx';
import { CollaborationPanel } from './collaboration-panel.jsx';
import { agentsUseCase } from '../application/agents.use-case.js';
import './agents-dashboard.css';

export function AgentsDashboard({ projectId, className = '' }) {
    const [agents, setAgents] = useState([]);
    const [systemStatus, setSystemStatus] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState({
        status: 'all',
        type: 'all',
        search: ''
    });

    // 加载Agent列表
    const loadAgents = async () => {
        try {
            setIsLoading(true);
            const agentList = await agentsUseCase.getAgents(projectId, filter.status === 'all' ? null : filter.status);
            setAgents(agentList);
        } catch (error) {
            console.error('加载Agent列表失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 加载系统状态
    const loadSystemStatus = async () => {
        try {
            const status = await agentsUseCase.getSystemStatus();
            setSystemStatus(status);
        } catch (error) {
            console.error('加载系统状态失败:', error);
        }
    };

    // 处理Agent状态变更
    const handleAgentStatusChange = async (agentId, action) => {
        try {
            switch (action) {
                case 'start':
                    await agentsUseCase.startAgent(agentId);
                    break;
                case 'stop':
                    await agentsUseCase.stopAgent(agentId);
                    break;
                case 'restart':
                    await agentsUseCase.restartAgent(agentId);
                    break;
                default:
                    console.warn('未知的Agent操作:', action);
            }

            // 刷新列表
            loadAgents();
        } catch (error) {
            console.error('Agent操作失败:', error);
            alert(`操作失败: ${error.message}`);
        }
    };

    // 创建新Agent
    const handleCreateAgent = async (agentData) => {
        try {
            await agentsUseCase.createAgent(agentData);
            setIsCreating(false);
            loadAgents();
        } catch (error) {
            console.error('创建Agent失败:', error);
            alert(`创建失败: ${error.message}`);
        }
    };

    // 过滤Agents
    const filteredAgents = agents.filter(agent => {
        if (filter.status !== 'all' && agent.status !== filter.status) {
            return false;
        }
        if (filter.type !== 'all' && agent.type !== filter.type) {
            return false;
        }
        if (filter.search && !agent.name.toLowerCase().includes(filter.search.toLowerCase())) {
            return false;
        }
        return true;
    });

    // 获取统计信息
    const getStats = () => {
        const total = agents.length;
        const running = agents.filter(a => a.status === 'running').length;
        const idle = agents.filter(a => a.status === 'idle').length;
        const error = agents.filter(a => a.status === 'error').length;

        return { total, running, idle, error };
    };

    // 初始化
    useEffect(() => {
        loadAgents();
        loadSystemStatus();

        // 定期刷新
        const interval = setInterval(() => {
            loadSystemStatus();
        }, 5000);

        return () => clearInterval(interval);
    }, [projectId]);

    // 监听筛选变化
    useEffect(() => {
        loadAgents();
    }, [filter.status, filter.type]);

    const stats = getStats();

    return (
        <div className={`agents-dashboard ${className}`}>
            <div className="dashboard-header">
                <div className="header-title">
                    <h2>数字员工管理</h2>
                    {systemStatus && (
                        <div className="system-status">
                            <span className={`status-indicator ${systemStatus.isHealthy ? 'healthy' : 'unhealthy'}`}>
                                ●
                            </span>
                            <span>系统{systemStatus.isHealthy ? '正常' : '异常'}</span>
                        </div>
                    )}
                </div>
                <div className="header-actions">
                    <button
                        className="btn-create-agent"
                        onClick={() => setIsCreating(true)}
                    >
                        <i className="icon-plus"></i>
                        创建Agent
                    </button>
                </div>
            </div>

            <div className="dashboard-stats">
                <div className="stat-card">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">总Agent数</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value running">{stats.running}</div>
                    <div className="stat-label">运行中</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value idle">{stats.idle}</div>
                    <div className="stat-label">空闲中</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value error">{stats.error}</div>
                    <div className="stat-label">异常数</div>
                </div>
            </div>

            <div className="dashboard-controls">
                <div className="filters">
                    <div className="filter-group">
                        <label>状态:</label>
                        <select
                            value={filter.status}
                            onChange={(e) => setFilter({...filter, status: e.target.value})}
                        >
                            <option value="all">全部</option>
                            <option value="running">运行中</option>
                            <option value="idle">空闲</option>
                            <option value="stopped">已停止</option>
                            <option value="error">异常</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>类型:</label>
                        <select
                            value={filter.type}
                            onChange={(e) => setFilter({...filter, type: e.target.value})}
                        >
                            <option value="all">全部</option>
                            <option value="developer">开发者</option>
                            <option value="designer">设计师</option>
                            <option value="analyst">分析师</option>
                            <option value="assistant">助手</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <input
                            type="text"
                            placeholder="搜索Agent..."
                            value={filter.search}
                            onChange={(e) => setFilter({...filter, search: e.target.value})}
                        />
                    </div>
                </div>
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        总览
                    </button>
                    <button
                        className={`tab ${activeTab === 'monitor' ? 'active' : ''}`}
                        onClick={() => setActiveTab('monitor')}
                    >
                        监控
                    </button>
                    <button
                        className={`tab ${activeTab === 'collaboration' ? 'active' : ''}`}
                        onClick={() => setActiveTab('collaboration')}
                    >
                        协作
                    </button>
                </div>
            </div>

            <div className="dashboard-content">
                {activeTab === 'overview' && (
                    <div className="agents-overview">
                        {isLoading ? (
                            <div className="loading-state">正在加载Agents...</div>
                        ) : filteredAgents.length === 0 ? (
                            <div className="empty-state">
                                <i className="icon-agents-empty"></i>
                                <p>暂无数字员工</p>
                                <button
                                    className="btn-create-first"
                                    onClick={() => setIsCreating(true)}
                                >
                                    创建第一个Agent
                                </button>
                            </div>
                        ) : (
                            <div className="agents-grid">
                                {filteredAgents.map(agent => (
                                    <AgentCard
                                        key={agent.id}
                                        agent={agent}
                                        onStatusChange={(action) => handleAgentStatusChange(agent.id, action)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'monitor' && (
                    <AgentMonitor
                        agents={agents}
                        systemStatus={systemStatus}
                    />
                )}

                {activeTab === 'collaboration' && (
                    <CollaborationPanel
                        agents={agents}
                        onCollaborate={(agentIds, task, type) => {
                            agentsUseCase.collaborate(agentIds, task, type)
                                .then(results => {
                                    console.log('协作完成:', results);
                                })
                                .catch(error => {
                                    alert(`协作失败: ${error.message}`);
                                });
                        }}
                    />
                )}
            </div>

            {isCreating && (
                <AgentCreator
                    projectId={projectId}
                    onCreate={handleCreateAgent}
                    onCancel={() => setIsCreating(false)}
                />
            )}
        </div>
    );
}
