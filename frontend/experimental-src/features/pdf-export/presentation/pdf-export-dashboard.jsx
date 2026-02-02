import React, { useState, useEffect } from 'react';
import { PdfExportUseCase } from '../application/pdf-export.use-case.js';
import { ExportFormat } from '../domain/value-objects/export-format.vo.js';
import { ExportStatus } from '../domain/value-objects/export-status.vo.js';
import { ExportOptions } from '../domain/value-objects/export-options.vo.js';

export function PdfExportDashboard({ projectId }) {
    const [exports, setExports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [creating, setCreating] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState({});

    // 创建表单状态
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        format: 'PDF',
        content: '',
        options: {
            pageSize: 'A4',
            orientation: 'portrait',
            includeTableOfContents: false,
            includePageNumbers: true,
            fontSize: 12,
            fontFamily: 'Arial',
            lineSpacing: 1.5
        }
    });

    const pdfExportUseCase = new PdfExportUseCase();

    useEffect(() => {
        loadExports();
    }, [projectId]);

    const loadExports = async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await pdfExportUseCase.getExportsByProject(projectId);

            if (result.isSuccess) {
                setExports(result.value.items);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateExport = async () => {
        try {
            setCreating(true);
            setError(null);

            // 这里应该从当前项目中获取内容
            const projectContent = formData.content || getDefaultProjectContent();

            const result = await pdfExportUseCase.createExport({
                title: formData.title,
                projectId: projectId,
                format: formData.format,
                content: projectContent,
                options: formData.options,
                requestedBy: 'current-user' // 应该从认证上下文中获取
            });

            if (result.isSuccess) {
                // 添加新导出到列表开头
                setExports(prev => [result.value, ...prev]);
                setShowCreateForm(false);

                // 重置表单
                setFormData({
                    title: '',
                    format: 'PDF',
                    content: '',
                    options: {
                        pageSize: 'A4',
                        orientation: 'portrait',
                        includeTableOfContents: false,
                        includePageNumbers: true,
                        fontSize: 12,
                        fontFamily: 'Arial',
                        lineSpacing: 1.5
                    }
                });

                // 自动开始处理
                handleProcessExport(result.value.id);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleProcessExport = async (exportId) => {
        try {
            const result = await pdfExportUseCase.startProcessing(exportId);

            if (result.isSuccess) {
                // 更新状态
                setExports(prev => prev.map(exp =>
                    exp.id === exportId ? result.value : exp
                ));

                // 模拟处理过程
                simulateProcessing(exportId);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const simulateProcessing = async (exportId) => {
        // 模拟处理过程，5秒后完成
        setTimeout(async () => {
            try {
                const fileUrl = `/api/pdf-exports/${exportId}/download`;
                const fileSize = Math.floor(Math.random() * 1000000) + 100000; // 100KB - 1MB
                const pageCount = Math.floor(Math.random() * 50) + 1; // 1-50页

                const result = await pdfExportUseCase.completeExport(
                    exportId,
                    fileUrl,
                    fileSize,
                    pageCount
                );

                if (result.isSuccess) {
                    setExports(prev => prev.map(exp =>
                        exp.id === exportId ? result.value : exp
                    ));
                }
            } catch (err) {
                // 标记为失败
                await pdfExportUseCase.failExport(exportId, err.message);
            }
        }, 5000);
    };

    const handleDownload = async (exportId) => {
        try {
            setDownloadProgress(prev => ({ ...prev, [exportId]: 0 }));

            const result = await pdfExportUseCase.downloadExport(exportId);

            if (result.isSuccess) {
                const { downloadUrl, filename } = result.value;

                // 模拟下载进度
                const interval = setInterval(() => {
                    setDownloadProgress(prev => {
                        const progress = prev[exportId] || 0;
                        if (progress >= 100) {
                            clearInterval(interval);
                            return { ...prev, [exportId]: null };
                        }
                        return { ...prev, [exportId]: Math.min(progress + 10, 100) };
                    });
                }, 200);

                // 创建下载链接
                setTimeout(() => {
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = filename;
                    link.click();
                    clearInterval(interval);
                }, 1000);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (exportId) => {
        if (!window.confirm('确定要删除这个导出任务吗？')) {
            return;
        }

        try {
            const result = await pdfExportUseCase.deleteExport(exportId);

            if (result.isSuccess) {
                setExports(prev => prev.filter(exp => exp.id !== exportId));
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleFormChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleOptionsChange = (option, value) => {
        setFormData(prev => ({
            ...prev,
            options: {
                ...prev.options,
                [option]: value
            }
        }));
    };

    const getDefaultProjectContent = () => {
        return `# 项目报告

## 概述
这是一个自动生成的项目报告。

## 项目详情
- 项目名称: 示例项目
- 项目ID: ${projectId}
- 生成时间: ${new Date().toLocaleString()}

## 内容
这里是项目的详细内容...`;
    };

    if (loading) {
        return (
            <div className="pdf-export-loading">
                <div className="spinner"></div>
                <p>加载导出任务中...</p>
            </div>
        );
    }

    return (
        <div className="pdf-export-dashboard">
            <div className="export-header">
                <h2>PDF 导出管理</h2>
                <button
                    className="btn-primary"
                    onClick={() => setShowCreateForm(true)}
                >
                    新建导出任务
                </button>
            </div>

            {error && (
                <div className="error-message">
                    <i className="icon-error"></i>
                    <span>{error}</span>
                </div>
            )}

            {showCreateForm && (
                <div className="create-export-modal">
                    <div className="modal-content">
                        <h3>创建导出任务</h3>

                        <div className="form-group">
                            <label>标题</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => handleFormChange('title', e.target.value)}
                                placeholder="输入导出文件标题"
                            />
                        </div>

                        <div className="form-group">
                            <label>格式</label>
                            <select
                                value={formData.format}
                                onChange={(e) => handleFormChange('format', e.target.value)}
                            >
                                <option value="PDF">PDF文档</option>
                                <option value="WORD">Word文档</option>
                                <option value="HTML">HTML网页</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>页面大小</label>
                            <select
                                value={formData.options.pageSize}
                                onChange={(e) => handleOptionsChange('pageSize', e.target.value)}
                            >
                                <option value="A4">A4</option>
                                <option value="A3">A3</option>
                                <option value="Letter">Letter</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>方向</label>
                            <select
                                value={formData.options.orientation}
                                onChange={(e) => handleOptionsChange('orientation', e.target.value)}
                            >
                                <option value="portrait">纵向</option>
                                <option value="landscape">横向</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>内容</label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => handleFormChange('content', e.target.value)}
                                placeholder="输入要导出的内容"
                                rows={8}
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
                                onClick={handleCreateExport}
                                disabled={creating || !formData.title}
                            >
                                {creating ? (
                                    <>
                                        <div className="spinner-small"></div>
                                        创建中...
                                    </>
                                ) : (
                                    '创建'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {exports.length === 0 ? (
                <div className="empty-exports">
                    <i className="icon-document"></i>
                    <h3>暂无导出任务</h3>
                    <p>点击"新建导出任务"开始导出您的内容</p>
                </div>
            ) : (
                <div className="exports-list">
                    {exports.map(exportItem => (
                        <div key={exportItem.id} className="export-item">
                            <div className="export-info">
                                <div className="export-title">
                                    <h4>{exportItem.title}</h4>
                                    <span className={`status status-${exportItem.status.toLowerCase()}`}>
                                        {exportItem.statusDisplay}
                                    </span>
                                </div>

                                <div className="export-details">
                                    <span className="format">{exportItem.formatDisplay}</span>
                                    <span className="pages">{exportItem.pageCount} 页</span>
                                    <span className="size">{exportItem.fileSizeDisplay}</span>
                                    <span className="date">
                                        {new Date(exportItem.createdAt).toLocaleString()}
                                    </span>
                                </div>

                                {exportItem.isProcessing && (
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: '60%' }}
                                        ></div>
                                    </div>
                                )}
                            </div>

                            <div className="export-actions">
                                {exportItem.isPending && (
                                    <button
                                        className="btn-primary btn-small"
                                        onClick={() => handleProcessExport(exportItem.id)}
                                    >
                                        开始处理
                                    </button>
                                )}

                                {exportItem.isCompleted && (
                                    <button
                                        className="btn-success btn-small"
                                        onClick={() => handleDownload(exportItem.id)}
                                    >
                                        {downloadProgress[exportItem.id] !== null ? (
                                            <>
                                                <div className="spinner-small"></div>
                                                {downloadProgress[exportItem.id]}%
                                            </>
                                        ) : (
                                            '下载'
                                        )}
                                    </button>
                                )}

                                {exportItem.isFailed && (
                                    <button
                                        className="btn-warning btn-small"
                                        onClick={() => handleProcessExport(exportItem.id)}
                                    >
                                        重试
                                    </button>
                                )}

                                <button
                                    className="btn-danger btn-small"
                                    onClick={() => handleDelete(exportItem.id)}
                                >
                                    删除
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default PdfExportDashboard;