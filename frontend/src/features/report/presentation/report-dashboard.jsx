/**
 * 报告仪表板组件
 * 提供报告管理和编辑功能
 */
import React, { useState, useEffect } from 'react';
import { ReportUseCase } from '../application/report.use-case.js';
import { ReportType } from '../domain/value-objects/report-type.vo.js';
import { ReportStatus } from '../domain/value-objects/report-status.vo.js';

export function ReportDashboard({ projectId }) {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedReport, setSelectedReport] = useState(null);
    const [editingSection, setEditingSection] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);

    // 表单状态
    const [formData, setFormData] = useState({
        title: '',
        type: 'PROJECT_SUMMARY',
        description: ''
    });

    // 章节编辑状态
    const [sectionForm, setSectionForm] = useState({
        title: '',
        content: ''
    });

    const reportUseCase = new ReportUseCase();

    useEffect(() => {
        loadReports();
    }, [projectId]);

    const loadReports = async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await reportUseCase.getReportsByProject(projectId);

            if (result.isSuccess) {
                setReports(result.value.items);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateReport = async () => {
        try {
            setError(null);

            const result = await reportUseCase.createReport({
                projectId: projectId,
                title: formData.title,
                type: formData.type,
                description: formData.description,
                generatedBy: 'current-user'
            });

            if (result.isSuccess) {
                setReports(prev => [result.value, ...prev]);
                setShowCreateForm(false);
                setFormData({ title: '', type: 'PROJECT_SUMMARY', description: '' });
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleCreateFromTemplate = async (templateType) => {
        try {
            setError(null);

            const result = await reportUseCase.createReportFromTemplate(
                projectId,
                templateType,
                'current-user'
            );

            if (result.isSuccess) {
                setReports(prev => [result.value, ...prev]);
                setShowTemplateDialog(false);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleGenerateReport = async (reportId) => {
        try {
            setError(null);

            const result = await reportUseCase.generateReport(reportId, 'current-user');

            if (result.isSuccess) {
                setReports(prev => prev.map(r =>
                    r.id === reportId ? result.value : r
                ));
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAddSection = async (reportId) => {
        try {
            setError(null);

            const result = await reportUseCase.addSection(reportId, {
                title: sectionForm.title || '新章节',
                content: sectionForm.content || '',
                orderIndex: selectedReport.sections.length,
                sectionType: 'content'
            });

            if (result.isSuccess) {
                const updatedReport = {
                    ...selectedReport,
                    sections: [...selectedReport.sections, result.value],
                    sectionCount: selectedReport.sections.length + 1
                };
                setSelectedReport(updatedReport);
                setSectionForm({ title: '', content: '' });
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteReport = async (reportId) => {
        if (!window.confirm('确定要删除这个报告吗？')) {
            return;
        }

        try {
            const result = await reportUseCase.deleteReport(reportId);

            if (result.isSuccess) {
                setReports(prev => prev.filter(r => r.id !== reportId));
                if (selectedReport?.id === reportId) {
                    setSelectedReport(null);
                }
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDuplicateReport = async (report) => {
        try {
            const result = await reportUseCase.duplicateReport(
                report.id,
                `${report.title}_副本`
            );

            if (result.isSuccess) {
                setReports(prev => [result.value, ...prev]);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const getStatusDisplay = (status) => {
        const displays = {
            'DRAFT': { text: '草稿', class: 'status-draft' },
            'IN_PROGRESS': { text: '进行中', class: 'status-progress' },
            'GENERATED': { text: '已生成', class: 'status-generated' },
            'ARCHIVED': { text: '已归档', class: 'status-archived' }
        };
        return displays[status] || { text: status, class: '' };
    };

    const getTypeDisplay = (type) => {
        const displays = {
            'PROJECT_SUMMARY': '项目总结',
            'PROGRESS_REPORT': '进度报告',
            'ANALYSIS_REPORT': '分析报告',
            'FINANCIAL_REPORT': '财务报告',
            'TECHNICAL_REPORT': '技术报告',
            'MARKETING_REPORT': '营销报告',
            'CUSTOM_REPORT': '自定义报告'
        };
        return displays[type] || type;
    };

    if (loading) {
        return (
            <div className="report-loading">
                <div className="spinner"></div>
                <p>加载报告中...</p>
            </div>
        );
    }

    return (
        <div className="report-dashboard">
            <div className="dashboard-header">
                <h2>报告管理</h2>
                <div className="header-actions">
                    <button
                        className="btn-secondary"
                        onClick={() => setShowTemplateDialog(true)}
                    >
                        使用模板
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => setShowCreateForm(true)}
                    >
                        新建报告
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <i className="icon-error"></i>
                    <span>{error}</span>
                </div>
            )}

            {showCreateForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>创建新报告</h3>

                        <div className="form-group">
                            <label>报告标题</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    title: e.target.value
                                }))}
                                placeholder="输入报告标题"
                            />
                        </div>

                        <div className="form-group">
                            <label>报告类型</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    type: e.target.value
                                }))}
                            >
                                <option value="PROJECT_SUMMARY">项目总结报告</option>
                                <option value="PROGRESS_REPORT">进度报告</option>
                                <option value="ANALYSIS_REPORT">分析报告</option>
                                <option value="FINANCIAL_REPORT">财务报告</option>
                                <option value="TECHNICAL_REPORT">技术报告</option>
                                <option value="MARKETING_REPORT">营销报告</option>
                                <option value="CUSTOM_REPORT">自定义报告</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>报告描述</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    description: e.target.value
                                }))}
                                placeholder="输入报告描述（可选）"
                                rows={3}
                            />
                        </div>

                        <div className="form-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowCreateForm(false)}
                            >
                                取消
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleCreateReport}
                                disabled={!formData.title}
                            >
                                创建
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTemplateDialog && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>选择报告模板</h3>

                        <div className="template-list">
                            {Object.entries({
                                'PROJECT_SUMMARY': '项目总结报告',
                                'PROGRESS_REPORT': '进度报告',
                                'ANALYSIS_REPORT': '分析报告'
                            }).map(([type, name]) => (
                                <div
                                    key={type}
                                    className="template-item"
                                    onClick={() => handleCreateFromTemplate(type)}
                                >
                                    <h4>{name}</h4>
                                    <p>使用{name}模板快速创建</p>
                                </div>
                            ))}
                        </div>

                        <div className="form-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowTemplateDialog(false)}
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedReport && (
                <div className="report-editor">
                    <div className="editor-header">
                        <h3>{selectedReport.title}</h3>
                        <button
                            className="btn-secondary"
                            onClick={() => setSelectedReport(null)}
                        >
                            返回列表
                        </button>
                    </div>

                    <div className="editor-content">
                        <div className="sections-list">
                            <h4>章节列表 ({selectedReport.sections.length})</h4>

                            {selectedReport.sections.map((section, index) => (
                                <div key={section.id} className="section-item">
                                    <div className="section-header">
                                        <h5>{section.title}</h5>
                                        <span className="word-count">
                                            {section.wordCount} 字
                                        </span>
                                    </div>
                                    <div className="section-content">
                                        {section.summary}
                                    </div>
                                </div>
                            ))}

                            {selectedReport.status.canEdit() && (
                                <div className="add-section">
                                    <input
                                        type="text"
                                        placeholder="新章节标题"
                                        value={sectionForm.title}
                                        onChange={(e) => setSectionForm(prev => ({
                                            ...prev,
                                            title: e.target.value
                                        }))}
                                    />
                                    <textarea
                                        placeholder="章节内容"
                                        value={sectionForm.content}
                                        onChange={(e) => setSectionForm(prev => ({
                                            ...prev,
                                            content: e.target.value
                                        }))}
                                        rows={3}
                                    />
                                    <button
                                        className="btn-primary btn-small"
                                        onClick={() => handleAddSection(selectedReport.id)}
                                    >
                                        添加章节
                                    </button>
                                </div>
                            )}
                        </div>

                        {selectedReport.status.canGenerate() && (
                            <div className="generate-actions">
                                <button
                                    className="btn-success"
                                    onClick={() => handleGenerateReport(selectedReport.id)}
                                    disabled={selectedReport.sections.length === 0}
                                >
                                    生成报告
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!selectedReport && (
                <div className="reports-list">
                    {reports.length === 0 ? (
                        <div className="empty-state">
                            <i className="icon-document"></i>
                            <h3>暂无报告</h3>
                            <p>点击"新建报告"或"使用模板"开始创建</p>
                        </div>
                    ) : (
                        <div className="report-grid">
                            {reports.map(report => {
                                const statusDisplay = getStatusDisplay(report.status);
                                return (
                                    <div key={report.id} className="report-card">
                                        <div className="card-header">
                                            <h4>{report.title}</h4>
                                            <span className={`status ${statusDisplay.class}`}>
                                                {statusDisplay.text}
                                            </span>
                                        </div>

                                        <div className="card-content">
                                            <div className="report-type">
                                                {getTypeDisplay(report.type)}
                                            </div>

                                            {report.description && (
                                                <p className="report-description">
                                                    {report.description}
                                                </p>
                                            )}

                                            <div className="report-stats">
                                                <span>{report.sectionCount} 章节</span>
                                                <span>{report.wordCount} 字</span>
                                                {report.totalPages > 0 && (
                                                    <span>{report.totalPages} 页</span>
                                                )}
                                            </div>

                                            <div className="report-date">
                                                创建于 {new Date(report.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className="card-actions">
                                            <button
                                                className="btn-primary btn-small"
                                                onClick={() => setSelectedReport(report)}
                                            >
                                                编辑
                                            </button>

                                            {report.status === 'DRAFT' && (
                                                <button
                                                    className="btn-success btn-small"
                                                    onClick={() => handleGenerateReport(report.id)}
                                                    disabled={report.sectionCount === 0}
                                                >
                                                    生成
                                                </button>
                                            )}

                                            <button
                                                className="btn-secondary btn-small"
                                                onClick={() => handleDuplicateReport(report)}
                                            >
                                                复制
                                            </button>

                                            <button
                                                className="btn-danger btn-small"
                                                onClick={() => handleDeleteReport(report.id)}
                                            >
                                                删除
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ReportDashboard;