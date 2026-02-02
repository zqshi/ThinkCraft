/**
 * 视觉识别仪表板组件
 * 提供图片上传和视觉分析功能
 */
import React, { useState, useEffect, useCallback } from 'react';
import { VisionUseCase } from '../application/vision.use-case.js';
import { VisionTaskType } from '../domain/value-objects/vision-task-type.vo.js';
import { VisionTaskStatus } from '../domain/value-objects/vision-task-status.vo.js';
import { VisionImage } from '../domain/value-objects/vision-image.vo.js';

export function VisionDashboard() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);

    // 图片上传状态
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [imageData, setImageData] = useState(null);

    // 任务创建表单
    const [taskForm, setTaskForm] = useState({
        taskType: 'IMAGE_ANALYSIS',
        prompt: '',
        autoProcess: true
    });

    // 结果显示
    const [selectedTask, setSelectedTask] = useState(null);
    const [showResult, setShowResult] = useState(false);

    const visionUseCase = new VisionUseCase();

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await visionUseCase.getVisionTasksByUser('current-user', {
                limit: 20,
                sortBy: 'createdAt',
                sortOrder: 'desc'
            });

            if (result.isSuccess) {
                setTasks(result.value.items);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            setError(null);

            // 验证文件类型
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                throw new Error('请选择有效的图片文件（JPEG, PNG, GIF, WebP）');
            }

            // 创建预览URL
            const preview = URL.createObjectURL(file);
            setPreviewUrl(preview);
            setSelectedFile(file);

            // 转换为Base64
            const image = await VisionImage.fromFile(file);
            setImageData(image.getDataUrl());

            // 自动调整图片大小
            const compressed = await image.compress(1024, 768, 0.8);
            setImageData(compressed.getDataUrl());

        } catch (err) {
            setError(err.message);
            resetFile();
        } finally {
            setUploading(false);
        }
    };

    const handleCreateTask = async () => {
        if (!imageData) {
            setError('请先选择图片');
            return;
        }

        try {
            setError(null);

            const result = await visionUseCase.createVisionTask({
                taskType: taskForm.taskType,
                imageData: imageData,
                prompt: taskForm.prompt || null,
                createdBy: 'current-user'
            });

            if (result.isSuccess) {
                // 添加到列表
                setTasks(prev => [result.value, ...prev]);

                // 自动开始处理
                if (taskForm.autoProcess) {
                    handleProcessTask(result.value.id);
                }

                // 重置表单
                resetFile();
                setTaskForm(prev => ({ ...prev, prompt: '' }));

            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleProcessTask = async (taskId) => {
        try {
            const result = await visionUseCase.processVisionTask(taskId);

            if (result.isSuccess) {
                // 更新任务状态
                setTasks(prev => prev.map(task =>
                    task.id === taskId ? result.value : task
                ));
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleCancelTask = async (taskId) => {
        try {
            const result = await visionUseCase.cancelVisionTask(taskId);

            if (result.isSuccess) {
                setTasks(prev => prev.map(task =>
                    task.id === taskId ? result.value : task
                ));
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('确定要删除这个视觉识别任务吗？')) {
            return;
        }

        try {
            const result = await visionUseCase.deleteVisionTask(taskId);

            if (result.isSuccess) {
                setTasks(prev => prev.filter(task => task.id !== taskId));
                if (selectedTask?.id === taskId) {
                    setSelectedTask(null);
                    setShowResult(false);
                }
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const showTaskResult = (task) => {
        setSelectedTask(task);
        setShowResult(true);
    };

    const resetFile = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
        setImageData(null);
    };

    const getStatusDisplay = (status) => {
        const statusObj = VisionTaskStatus.fromString(status);
        return {
            text: statusObj.getDisplayName(),
            color: statusObj.getColor(),
            icon: status === 'PROCESSING' ? '⏳' : status === 'COMPLETED' ? '✅' : status === 'FAILED' ? '❌' : '📋'
        };
    };

    const formatResult = (result) => {
        if (!result) return null;

        if (typeof result === 'string') {
            return result;
        }

        if (result.type === 'text') {
            return result.data;
        }

        if (result.type === 'objects' && Array.isArray(result.data)) {
            return (
                <div className="objects-result">
                    {result.data.map((obj, index) => (
                        <div key={index} className="object-item">
                            <div className="object-label">{obj.label} ({Math.round(obj.score * 100)}%)</div>
                        </div>
                    ))}
                </div>
            );
        }

        return JSON.stringify(result, null, 2);
    };

    const formatProcessingTime = (ms) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    if (loading) {
        return (
            <div className="vision-loading">
                <div className="spinner"></div>
                <p>加载视觉识别任务中...</p>
            </div>
        );
    }

    return (
        <div className="vision-dashboard">
            <div className="dashboard-header">
                <h2>视觉识别</h2>
                <p className="subtitle">上传图片进行AI分析和文字识别</p>
            </div>

            {error && (
                <div className="error-message">
                    <i className="icon-error"></i>
                    <span>{error}</span>
                </div>
            )}

            {/* 图片上传区域 */}
            <div className="upload-section">
                <div className="upload-area">
                    {!previewUrl ? (
                        <div className="upload-placeholder">
                            <i className="icon-upload"></i>
                            <p>点击或拖拽上传图片</p>
                            <small>支持 JPEG, PNG, GIF, WebP 格式，最大 10MB</small>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="file-input"
                                disabled={uploading}
                            />
                        </div>
                    ) : (
                        <div className="image-preview">
                            <img src={previewUrl} alt="预览" />
                            {uploading && (
                                <div className="upload-overlay">
                                    <div className="spinner-small"></div>
                                    <span>处理中...</span>
                                </div>
                            )}
                            <button
                                className="remove-image"
                                onClick={resetFile}
                                disabled={uploading}
                            >
                                ×
                            </button>
                        </div>
                    )}
                </div>

                {/* 任务配置 */}
                {imageData && (
                    <div className="task-config">
                        <div className="config-item">
                            <label>任务类型</label>
                            <select
                                value={taskForm.taskType}
                                onChange={(e) => setTaskForm(prev => ({
                                    ...prev,
                                    taskType: e.target.value
                                }))}
                            >
                                <option value="IMAGE_ANALYSIS">图片分析</option>
                                <option value="OCR">文字识别</option>
                                <option value="OBJECT_DETECTION">物体检测</option>
                                <option value="FACE_DETECTION">人脸检测</option>
                                <option value="TEXT_DETECTION">文本检测</option>
                                <option value="SCENE_DETECTION">场景检测</option>
                                <option value="COLOR_ANALYSIS">色彩分析</option>
                            </select>
                        </div>

                        <div className="config-item">
                            <label>提示词（可选）</label>
                            <textarea
                                value={taskForm.prompt}
                                onChange={(e) => setTaskForm(prev => ({
                                    ...prev,
                                    prompt: e.target.value
                                }))}
                                placeholder="描述您希望AI关注的内容..."
                                rows={2}
                            />
                        </div>

                        <div className="config-item">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={taskForm.autoProcess}
                                    onChange={(e) => setTaskForm(prev => ({
                                        ...prev,
                                        autoProcess: e.target.checked
                                    }))}
                                />
                                自动开始处理
                            </label>
                        </div>

                        <button
                            className="btn-primary"
                            onClick={handleCreateTask}
                            disabled={uploading}
                        >
                            创建识别任务
                        </button>
                    </div>
                )}
            </div>

            {/* 任务列表 */}
            <div className="tasks-section">
                <h3>识别任务列表</h3>

                {tasks.length === 0 ? (
                    <div className="empty-state">
                        <i className="icon-vision"></i>
                        <p>暂无视觉识别任务</p>
                        <small>上传图片创建您的第一个任务</small>
                    </div>
                ) : (
                    <div className="tasks-list">
                        {tasks.map(task => {
                            const status = getStatusDisplay(task.status);
                            const typeObj = VisionTaskType.fromString(task.taskType);

                            return (
                                <div key={task.id} className={`task-item ${task.status.toLowerCase()}`}>
                                    <div className="task-header">
                                        <div className="task-type">
                                            <span className="type-icon">{typeObj.getIcon()}</span>
                                            <span>{typeObj.getDisplayName()}</span>
                                        </div>
                                        <div className="task-status" style={{ color: status.color }}>
                                            <span>{status.icon}</span>
                                            <span>{status.text}</span>
                                        </div>
                                    </div>

                                    <div className="task-info">
                                        <div className="task-image">
                                            <img src={task.image.data} alt="任务图片" />
                                        </div>

                                        <div className="task-details">
                                            <div className="image-info">
                                                {task.image.format} • {task.image.size.kb} KB
                                            </div>

                                            {task.prompt && (
                                                <div className="task-prompt">
                                                    <small>提示: {task.prompt}</small>
                                                </div>
                                            )}

                                            {task.isProcessing && (
                                                <div className="progress-bar">
                                                    <div className="progress-fill"></div>
                                                </div>
                                            )}

                                            {task.isCompleted && task.result && (
                                                <div className="task-result-preview">
                                                    <small>置信度: {task.confidenceDisplay}</small>
                                                    <span> • </span>
                                                    <small>耗时: {task.processingTimeDisplay}</small>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="task-actions">
                                        {task.status === 'PENDING' && (
                                            <button
                                                className="btn-primary btn-small"
                                                onClick={() => handleProcessTask(task.id)}
                                            >
                                                开始处理
                                            </button>
                                        )}

                                        {task.isProcessing && (
                                            <button
                                                className="btn-secondary btn-small"
                                                onClick={() => handleCancelTask(task.id)}
                                            >
                                                取消
                                            </button>
                                        )}

                                        {task.isCompleted && task.result && (
                                            <button
                                                className="btn-success btn-small"
                                                onClick={() => showTaskResult(task)}
                                            >
                                                查看结果
                                            </button>
                                        )}

                                        <button
                                            className="btn-danger btn-small"
                                            onClick={() => handleDeleteTask(task.id)}
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

            {/* 结果显示对话框 */}
            {showResult && selectedTask && (
                <div className="modal-overlay" onClick={() => setShowResult(false)}>
                    <div className="modal-content result-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{VisionTaskType.fromString(selectedTask.taskType).getDisplayName()} 结果</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowResult(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="result-content">
                            <div className="result-image">
                                <img src={selectedTask.image.data} alt="分析图片" />
                            </div>

                            <div className="result-details">
                                <div className="result-info">
                                    <span>处理时间: {selectedTask.processingTimeDisplay}</span>
                                    <span>置信度: {selectedTask.confidenceDisplay}</span>
                                    <span>状态: {getStatusDisplay(selectedTask.status).text}</span>
                                </div>

                                <div className="result-data">
                                    <h4>识别结果:</h4>
                                    <pre className="result-text">
                                        {formatResult(selectedTask.result)}
                                    </pre>
                                </div>

                                {selectedTask.result && (
                                    <button
                                        className="btn-secondary"
                                        onClick={() => {
                                            const result = selectedTask.result;
                                            const text = result.type === 'text' ? result.data : JSON.stringify(result, null, 2);
                                            navigator.clipboard.writeText(text);
                                            alert('结果已复制到剪贴板');
                                        }}
                                    >
                                        复制结果
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VisionDashboard;