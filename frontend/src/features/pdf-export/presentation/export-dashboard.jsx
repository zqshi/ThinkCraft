/**
 * PDF导出仪表板组件
 */
import React, { useState, useEffect } from 'react';
import { PdfExportUseCase } from '../application/pdf-export.use-case.js';
import { ExportFormat } from '../domain/value-objects/export-format.vo.js';
import { ExportOptions } from '../domain/value-objects/export-options.vo.js';
import './export-dashboard.css';

export function ExportDashboard({ projectId }) {
    const [exports, setExports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [selectedExport, setSelectedExport] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [downloading, setDownloading] = useState({});

    const exportUseCase = new PdfExportUseCase();

    // 表单状态
    const [formData, setFormData] = useState({
        title: '',
        format: 'PDF',
        content: '',
        options: new ExportOptions()
    });

    // 加载导出列表
    const loadExports = async () => {
        setLoading(true);
        try {
            const result = await exportUseCase.getExportsByProject(projectId);
            if (result.success) {
                setExports(result.data.items);
            } else {
                console.error('加载导出列表失败:', result.error);
            }
        } catch (error) {
            console.error('加载导出列表失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 创建导出
    const handleCreateExport = async () => {
        if (!formData.title.trim()) {
            alert('请输入标题');
            return;
        }

        setCreating(true);
        try {
            const result = await exportUseCase.createExport({
                projectId,
                title: formData.title,
                content: formData.content,
                format: formData.format,
                options: formData.options
            });

            if (result.success) {
                setExports([result.data, ...exports]);
                setShowCreateForm(false);
                setFormData({
                    title: '',
                    format: 'PDF',
                    content: '',
                    options: new ExportOptions()
                });
            } else {
                alert('创建导出失败: ' + result.error);
            }
        } catch (error) {
            console.error('创建导出失败:', error);
            alert('创建导出失败');
        } finally {
            setCreating(false);
        }
    };

    // 开始处理
    const handleProcessExport = async (exportId) => {
        try {
            const result = await exportUseCase.startProcessing(exportId);
            if (result.success) {
                // 更新状态
                setExports(exports.map(exp =>
                    exp.id === exportId ? result.data : exp
                ));
            } else {
                alert('开始处理失败: ' + result.error);
            }
        } catch (error) {
            console.error('开始处理失败:', error);
            alert('开始处理失败');
        }
    };

    // 下载文件
    const handleDownload = async (exportItem) => {
        if (!exportItem.isCompleted) {
            alert('导出尚未完成');
            return;
        }

        setDownloading({ ...downloading, [exportItem.id]: true });
        try {
            const result = await exportUseCase.downloadExport(exportItem.id);
            if (result.success) {
                // 创建下载链接
                const link = document.createElement('a');
                link.href = result.data.downloadUrl;
                link.download = result.data.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert('下载失败: ' + result.error);
            }
        } catch (error) {
            console.error('下载失败:', error);
            alert('下载失败');
        } finally {
            setDownloading({ ...downloading, [exportItem.id]: false });
        }
    };

    // 删除导出
    const handleDelete = async (exportId) => {
        if (!confirm('确定要删除这个导出任务吗？')) {
            return;
        }

        try {
            const result = await exportUseCase.deleteExport(exportId);
            if (result.success) {
                setExports(exports.filter(exp => exp.id !== exportId));
            } else {
                alert('删除失败: ' + result.error);
            }
        } catch (error) {
            console.error('删除失败:', error);
            alert('删除失败');
        }
    };

    // 检查状态
    const checkStatus = async (exportItem) => {
        if (exportItem.isCompleted || exportItem.isFailed) {
            return;
        }

        try {
            const result = await exportUseCase.checkExportStatus(exportItem.id);
            if (result.success) {
                // 更新状态
                setExports(exports.map(exp =>
                    exp.id === exportItem.id ? { ...exp, ...result.data } : exp
                ));
            }
        } catch (error) {
            console.error('检查状态失败:', error);
        }
    };

    // 定期更新状态
    useEffect(() => {
        loadExports();

        // 每5秒检查一次状态
        const interval = setInterval(() => {
            exports.forEach(exportItem => {
                if (exportItem.isProcessing || exportItem.isPending) {
                    checkStatus(exportItem);
                }
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [projectId]);

    // 获取状态样式
    const getStatusStyle = (status) => {
        const colors = {
            PENDING: '#faad14',
            PROCESSING: '#1890ff',
            COMPLETED: '#52c41a',
            FAILED: '#f5222d'
        };
        return { color: colors[status] || '#666' };
    };

    // 格式化文件大小
    const formatFileSize = (bytes) => {
        if (!bytes) return '-';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    // 格式化日期
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('zh-CN');
    };

    return (
        <div className="export-dashboard">
            <div className="export-header">
                <h2>PDF导出管理</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateForm(true)}
                >
                    新建导出
                </button>
            </div>

            {loading ? (
                <div className="loading">加载中...</div>
            ) : (
                <div className="export-list">
                    {exports.length === 0 ? (
                        <div className="empty-state">
                            <p>暂无导出记录</p>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowCreateForm(true)}
                            >
                                创建第一个导出
                            </button>
                        </div>
                    ) : (
                        exports.map(exportItem => (
                            <div key={exportItem.id} className="export-item">
                                <div className="export-info">
                                    <h3>{exportItem.title}</h3>
                                    <div className="export-meta">
                                        <span className="format">{exportItem.formatDisplayName}</span>
                                        <span
                                            className="status"
                                            style={getStatusStyle(exportItem.status)}
                                        >
                                            {exportItem.statusDisplayText}
                                        </span>
                                        {exportItem.fileSize > 0 && (
                                            <span className="file-size">{formatFileSize(exportItem.fileSize)}</span>
                                        )}
                                    </div>
                                    <div className="export-times">
                                        <span>创建: {formatDate(exportItem.createdAt)}</span>
                                        {exportItem.completedAt && (
                                            <span>完成: {formatDate(exportItem.completedAt)}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="export-actions">
                                    {exportItem.canProcess && (
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => handleProcessExport(exportItem.id)}
                                        >
                                            开始处理
                                        </button>
                                    )}

                                    {exportItem.isCompleted && (
                                        <button
                                            className="btn btn-sm btn-success"
                                            onClick={() => handleDownload(exportItem)}
                                            disabled={downloading[exportItem.id]}
                                        >
                                            {downloading[exportItem.id] ? '下载中...' : '下载'}
                                        </button>
                                    )}

                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => setSelectedExport(exportItem)}
                                    >
                                        详情
                                    </button>

                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => handleDelete(exportItem.id)}
                                    >
                                        删除
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* 创建表单模态框 */}
            {showCreateForm && (
                <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>创建PDF导出</h3>
                        <div className="form-group">
                            <label>标题 *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                placeholder="请输入导出标题"
                            />
                        </div>

                        <div className="form-group">
                            <label>格式</label>
                            <select
                                value={formData.format}
                                onChange={e => setFormData({...formData, format: e.target.value})}
                            >
                                {ExportFormat.getValidFormats().map(format => (
                                    <option key={format} value={format}>{format}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>内容</label>
                            <textarea
                                value={formData.content}
                                onChange={e => setFormData({...formData, content: e.target.value})}
                                placeholder="请输入要导出的内容"
                                rows={5}
                            />
                        </div>

                        <div className="form-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowOptionsModal(true)}
                            >
                                高级选项
                            </button>
                            <div className="action-buttons">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowCreateForm(false)}
                                >
                                    取消
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleCreateExport}
                                    disabled={creating || !formData.title.trim()}
                                >
                                    {creating ? '创建中...' : '创建'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 详情模态框 */}
            {selectedExport && (
                <div className="modal-overlay" onClick={() => setSelectedExport(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>导出详情</h3>
                        <div className="export-details">
                            <p><strong>标题:</strong> {selectedExport.title}</p>
                            <p><strong>格式:</strong> {selectedExport.formatDisplayName}</p>
                            <p><strong>状态:</strong> <span style={getStatusStyle(selectedExport.status)}>{selectedExport.statusDisplayText}</span></p>
                            <p><strong>创建时间:</strong> {formatDate(selectedExport.createdAt)}</p>
                            {selectedExport.completedAt && (
                                <p><strong>完成时间:</strong> {formatDate(selectedExport.completedAt)}</p>
                            )}
                            {selectedExport.fileSize > 0 && (
                                <p><strong>文件大小:</strong> {formatFileSize(selectedExport.fileSize)}</p>
                            )}
                            {selectedExport.error && (
                                <p><strong>错误信息:</strong> <span className="error-text">{selectedExport.error}</span></p>
                            )}
                        </div>
                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setSelectedExport(null)}
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ExportDashboard;