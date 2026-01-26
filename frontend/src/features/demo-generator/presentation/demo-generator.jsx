import React, { useState, useEffect } from 'react';
import { DemoUseCase } from '../application/demo.use-case.js';
import { DemoType } from '../domain/demo.aggregate.js';
import { DemoStatus } from '../domain/demo.aggregate.js';

export function DemoGenerator({ projectId }) {
    const [demo, setDemo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState('info');
    const [formData, setFormData] = useState({
        title: '',
        type: 'WEB_APP',
        description: '',
        requirements: ''
    });

    const demoUseCase = new DemoUseCase();

    useEffect(() => {
        loadDemo();
    }, [projectId]);

    const loadDemo = async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await demoUseCase.getDemoByProject(projectId);

            if (result.isSuccess) {
                setDemo(result.value);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDemo = async () => {
        try {
            setError(null);

            if (!formData.title || !formData.type) {
                setError('标题和类型不能为空');
                return;
            }

            const result = await demoUseCase.createDemo({
                title: formData.title,
                projectId: projectId,
                type: formData.type,
                description: formData.description,
                requirements: formData.requirements,
                createdBy: 'current-user' // 应该从认证上下文中获取
            });

            if (result.isSuccess) {
                setDemo(result.value);
                setFormData({
                    title: '',
                    type: 'WEB_APP',
                    description: '',
                    requirements: ''
                });
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleStartGeneration = async () => {
        try {
            setGenerating(true);
            setError(null);

            const result = await demoUseCase.startGeneration(demo.id);

            if (result.isSuccess) {
                setDemo(result.value);
                // 模拟生成过程
                simulateGeneration();
            } else {
                setError(result.error);
                setGenerating(false);
            }
        } catch (err) {
            setError(err.message);
            setGenerating(false);
        }
    };

    const simulateGeneration = async () => {
        // 模拟生成过程，3秒后完成
        setTimeout(async () => {
            try {
                const mockCodeFiles = [
                    {
                        path: 'index.html',
                        content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>Demo App</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>',
                        language: 'html',
                        size: 120
                    },
                    {
                        path: 'styles.css',
                        content: 'body {\n  font-family: Arial, sans-serif;\n  margin: 0;\n  padding: 20px;\n}',
                        language: 'css',
                        size: 80
                    },
                    {
                        path: 'script.js',
                        content: 'console.log("Hello from demo!");',
                        language: 'javascript',
                        size: 35
                    }
                ];

                const result = await demoUseCase.completeGeneration(demo.id, mockCodeFiles);

                if (result.isSuccess) {
                    setDemo(result.value);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setGenerating(false);
            }
        }, 3000);
    };

    const handleDownload = async () => {
        try {
            const result = await demoUseCase.downloadDemo(demo.id);

            if (result.isSuccess) {
                // 创建下载链接
                const link = document.createElement('a');
                link.href = result.value.downloadUrl;
                link.download = result.value.filename;
                link.click();
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

    if (loading) {
        return (
            <div className="demo-generator-loading">
                <div className="spinner"></div>
                <p>加载演示项目中...</p>
            </div>
        );
    }

    if (!demo) {
        return (
            <div className="demo-generator-create">
                <h3>创建演示项目</h3>
                <div className="create-form">
                    <div className="form-group">
                        <label>标题</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => handleFormChange('title', e.target.value)}
                            placeholder="输入演示项目标题"
                        />
                    </div>

                    <div className="form-group">
                        <label>类型</label>
                        <select
                            value={formData.type}
                            onChange={(e) => handleFormChange('type', e.target.value)}
                        >
                            <option value="WEB_APP">Web应用</option>
                            <option value="MOBILE_APP">移动应用</option>
                            <option value="DESKTOP_APP">桌面应用</option>
                            <option value="API_SERVICE">API服务</option>
                            <option value="LIBRARY">代码库</option>
                            <option value="CLI_TOOL">命令行工具</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>描述</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleFormChange('description', e.target.value)}
                            placeholder="描述您的演示项目"
                            rows={3}
                        />
                    </div>

                    <div className="form-group">
                        <label>需求</label>
                        <textarea
                            value={formData.requirements}
                            onChange={(e) => handleFormChange('requirements', e.target.value)}
                            placeholder="详细说明功能需求"
                            rows={5}
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            <i className="icon-error"></i>
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        className="btn-primary btn-large"
                        onClick={handleCreateDemo}
                        disabled={!formData.title}
                    >
                        创建演示项目
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="demo-generator">
            <div className="demo-header">
                <h3>{demo.title}</h3>
                <div className="demo-meta">
                    <span className={`status status-${demo.status.toLowerCase()}`}>
                        {demo.statusDisplay}
                    </span>
                    <span className="type">{demo.typeDisplay}</span>
                    <span className="file-count">{demo.fileCount} 个文件</span>
                </div>
            </div>

            <div className="demo-tabs">
                <button
                    className={`tab ${activeTab === 'info' ? 'active' : ''}`}
                    onClick={() => setActiveTab('info')}
                >
                    项目信息
                </button>
                <button
                    className={`tab ${activeTab === 'code' ? 'active' : ''}`}
                    onClick={() => setActiveTab('code')}
                >
                    代码文件
                </button>
                <button
                    className={`tab ${activeTab === 'preview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('preview')}
                >
                    预览
                </button>
            </div>

            <div className="demo-content">
                {activeTab === 'info' && (
                    <div className="demo-info">
                        <div className="info-section">
                            <h4>描述</h4>
                            <p>{demo.description || '暂无描述'}</p>
                        </div>

                        <div className="info-section">
                            <h4>需求</h4>
                            <p>{demo.requirements || '暂无需求说明'}</p>
                        </div>

                        <div className="info-section">
                            <h4>生成信息</h4>
                            <p>创建时间: {new Date(demo.createdAt).toLocaleString()}</p>
                            {demo.generatedAt && (
                                <p>生成时间: {new Date(demo.generatedAt).toLocaleString()}</p>
                            )}
                        </div>

                        {demo.canGenerate && (
                            <div className="actions">
                                <button
                                    className="btn-primary btn-large"
                                    onClick={handleStartGeneration}
                                    disabled={generating}
                                >
                                    {generating ? (
                                        <>
                                            <div className="spinner-small"></div>
                                            生成中...
                                        </>
                                    ) : (
                                        '开始生成'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'code' && (
                    <div className="demo-code">
                        {demo.isCompleted ? (
                            <div className="code-files">
                                {Object.entries(demo.codeFiles).map(([path, file]) => (
                                    <div key={path} className="code-file">
                                        <div className="file-header">
                                            <span className="file-path">{path}</span>
                                            <span className="file-meta">
                                                {file.language} • {file.linesCount} 行 • {file.size} 字符
                                            </span>
                                        </div>
                                        <div className="file-content">
                                            <pre><code>{file.content}</code></pre>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <i className="icon-code"></i>
                                <p>代码将在生成后显示</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'preview' && (
                    <div className="demo-preview">
                        {demo.isCompleted ? (
                            <div className="preview-container">
                                <iframe
                                    srcDoc={demo.codeFiles['index.html']?.content || '<h1>Preview not available</h1>'}
                                    className="preview-iframe"
                                    title="Demo Preview"
                                />
                            </div>
                        ) : (
                            <div className="empty-state">
                                <i className="icon-preview"></i>
                                <p>预览将在生成后可用</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {demo.isCompleted && (
                <div className="demo-actions">
                    <button
                        className="btn-success btn-large"
                        onClick={handleDownload}
                    >
                        <i className="icon-download"></i>
                        下载代码
                    </button>
                </div>
            )}

            {error && (
                <div className="error-message">
                    <i className="icon-error"></i>
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}

export default DemoGenerator;