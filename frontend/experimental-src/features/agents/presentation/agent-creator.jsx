/**
 * AgentCreator组件
 * 创建新Agent的表单界面
 */
import React, { useState, useEffect } from 'react';
import { agentsUseCase } from '../application/agents.use-case.js';

const TEMPLATES = [
    {
        id: 'developer',
        name: '开发助手',
        description: '协助代码开发、审查和技术决策',
        type: 'developer',
        capabilities: ['代码生成', '代码审查', '技术选型', 'Bug修复'],
        config: {
            maxConcurrentTasks: 3,
            timeout: 60000,
            retryAttempts: 2
        }
    },
    {
        id: 'designer',
        name: '设计师',
        description: '提供UI/UX设计建议和设计稿生成',
        type: 'designer',
        capabilities: ['UI设计', 'UX优化', '色彩搭配', '原型制作'],
        config: {
            maxConcurrentTasks: 2,
            timeout: 300000,
            retryAttempts: 3
        }
    },
    {
        id: 'analyst',
        name: '数据分析师',
        description: '分析数据、生成报告和洞察',
        type: 'analyst',
        capabilities: ['数据分析', '报告生成', '可视化', '趋势预测'],
        config: {
            maxConcurrentTasks: 5,
            timeout: 120000,
            retryAttempts: 3
        }
    },
    {
        id: 'assistant',
        name: '通用助手',
        description: '提供通用的协助和建议',
        type: 'assistant',
        capabilities: ['信息查询', '文档整理', '日程管理', '提醒功能'],
        config: {
            maxConcurrentTasks: 10,
            timeout: 30000,
            retryAttempts: 1
        }
    }
];

const CAPABILITIES = {
    developer: [
        '代码生成', '代码审查', '技术选型', 'Bug修复', '性能优化',
        '单元测试', 'API设计', '架构建议', '代码重构'
    ],
    designer: [
        'UI设计', 'UX优化', '色彩搭配', '原型制作', '图标设计',
        '布局规划', '交互设计', '品牌设计', '设计规范'
    ],
    analyst: [
        '数据分析', '报告生成', '可视化', '趋势预测', '统计分析',
        '数据清洗', '模型训练', '结果解读', '业务洞察'
    ],
    assistant: [
        '信息查询', '文档整理', '日程管理', '提醒功能', '翻译服务',
        '邮件处理', '会议记录', '任务跟踪', '知识管理'
    ]
};

export function AgentCreator({ projectId, onCreate, onCancel }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'developer',
        capabilities: [],
        config: {
            maxConcurrentTasks: 3,
            timeout: 60000,
            retryAttempts: 3
        }
    });
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // 应用模板
    const applyTemplate = (templateId) => {
        const template = TEMPLATES.find(t => t.id === templateId);
        if (template) {
            setFormData({
                name: template.name,
                description: template.description,
                type: template.type,
                capabilities: [...template.capabilities],
                config: { ...template.config }
            });
            setSelectedTemplate(templateId);
        }
    };

    // 处理输入变化
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        // 清除对应字段的错误
        setErrors(prev => ({
            ...prev,
            [field]: ''
        }));
    };

    // 处理配置变化
    const handleConfigChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            config: {
                ...prev.config,
                [key]: value
            }
        }));
    };

    // 处理能力选择
    const handleCapabilityToggle = (capability) => {
        setFormData(prev => ({
            ...prev,
            capabilities: prev.capabilities.includes(capability)
                ? prev.capabilities.filter(c => c !== capability)
                : [...prev.capabilities, capability]
        }));
    };

    // 验证表单
    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Agent名称不能为空';
        } else if (formData.name.length > 50) {
            newErrors.name = 'Agent名称不能超过50个字符';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Agent描述不能为空';
        } else if (formData.description.length > 200) {
            newErrors.description = 'Agent描述不能超过200个字符';
        }

        if (formData.capabilities.length === 0) {
            newErrors.capabilities = '至少选择一个能力';
        }

        if (formData.config.maxConcurrentTasks < 1 || formData.config.maxConcurrentTasks > 10) {
            newErrors.maxConcurrentTasks = '最大并发任务数必须在1-10之间';
        }

        if (formData.config.timeout < 1000 || formData.config.timeout > 600000) {
            newErrors.timeout = '超时时间必须在1秒-10分钟之间';
        }

        if (formData.config.retryAttempts < 0 || formData.config.retryAttempts > 5) {
            newErrors.retryAttempts = '重试次数必须在0-5之间';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 提交表单
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const agentData = {
                ...formData,
                projectId
            };

            await onCreate(agentData);
        } catch (error) {
            console.error('创建Agent失败:', error);
            alert(`创建失败: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // 获取当前类型的能力列表
    const availableCapabilities = CAPABILITIES[formData.type] || [];

    return (
        <div className="agent-creator-overlay" onClick={onCancel}>
            <div className="agent-creator" onClick={(e) => e.stopPropagation()}>
                <h2>创建新的数字员工</h2>

                <form onSubmit={handleSubmit} className="agent-form">
                    <!-- 模板选择 -->
                    <div className="form-section">
                        <h3>选择模板</h3>
                        <div className="template-selector">
                            {TEMPLATES.map(template => (
                                <div
                                    key={template.id}
                                    className={`template-option ${selectedTemplate === template.id ? 'selected' : ''}`}
                                    onClick={() => applyTemplate(template.id)}
                                >
                                    <h4>{template.name}</h4>
                                    <p>{template.description}</p>
                                    <div className="template-capabilities"
                                        {template.capabilities.slice(0, 3).join(' • ')}
                                        {template.capabilities.length > 3 && ' • ...'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <!-- 基本信息 -->
                    <div className="form-section">
                        <h3>基本信息</h3>
                        <div className="form-group">
                            <label htmlFor="agent-name">Agent名称 *</label>
                            <input
                                id="agent-name"
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                placeholder="例如：前端开发助手"
                                maxLength={50}
                            />
                            {errors.name && <span className="error">{errors.name}</span>}
                            <div className="char-count">{formData.name.length}/50</div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="agent-description">Agent描述 *</label>
                            <textarea
                                id="agent-description"
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="描述Agent的主要职责和功能..."
                                rows={3}
                                maxLength={200}
                            />
                            {errors.description && <span className="error">{errors.description}</span>}
                            <div className="char-count">{formData.description.length}/200</div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="agent-type">Agent类型</label>
                            <select
                                id="agent-type"
                                value={formData.type}
                                onChange={(e) => handleInputChange('type', e.target.value)}
                            >
                                <option value="developer">开发者</option>
                                <option value="designer">设计师</option>
                                <option value="analyst">分析师</option>
                                <option value="assistant">通用助手</option>
                            </select>
                        </div>
                    </div>

                    <!-- 能力选择 -->
                    <div className="form-section">
                        <h3>能力配置</h3>
                        <p className="section-description">选择此Agent具备的能力（可多选）</p>
                        <div className="capabilities-grid">
                            {availableCapabilities.map(capability => (
                                <button
                                    key={capability}
                                    type="button"
                                    className={`capability-btn ${formData.capabilities.includes(capability) ? 'selected' : ''}`}
                                    onClick={() => handleCapabilityToggle(capability)}
                                >
                                    {capability}
                                </button>
                            ))}
                        </div>
                        {errors.capabilities && <span className="error">{errors.capabilities}</span>}
                    </div>

                    <!-- 高级配置 -->
                    <div className="form-section">
                        <h3>高级配置</h3>
                        <div className="config-grid">
                            <div className="config-group">
                                <label>最大并发任务数</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={formData.config.maxConcurrentTasks}
                                    onChange={(e) => handleConfigChange('maxConcurrentTasks', parseInt(e.target.value))}
                                />
                                {errors.maxConcurrentTasks && <span className="error">{errors.maxConcurrentTasks}</span>}
                            </div>
                            <div className="config-group">
                                <label>任务超时时间（毫秒）</label>
                                <input
                                    type="number"
                                    min="1000"
                                    max="600000"
                                    step="1000"
                                    value={formData.config.timeout}
                                    onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                                />
                                {errors.timeout && <span className="error">{errors.timeout}</span>}
                            </div>
                            <div className="config-group">
                                <label>失败重试次数</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="5"
                                    value={formData.config.retryAttempts}
                                    onChange={(e) => handleConfigChange('retryAttempts', parseInt(e.target.value))}
                                />
                                {errors.retryAttempts && <span className="error">{errors.retryAttempts}</span>}
                            </div>
                        </div>
                    </div>

                    <!-- 表单操作 -->
                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? '创建中...' : '创建Agent'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}