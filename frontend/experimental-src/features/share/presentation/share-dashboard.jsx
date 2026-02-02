/**
 * 分享仪表板组件
 * 提供分享管理和访问控制功能
 */
import React, { useState, useEffect } from 'react';
import { ShareUseCase } from '../application/share.use-case.js';
import { SharePermission } from '../domain/value-objects/share-permission.vo.js';
import { ShareStatus } from '../domain/value-objects/share-status.vo.js';
import { ShareType } from '../domain/value-objects/share-type.vo.js';

export function ShareDashboard({ resourceId, resourceType, resourceTitle }) {
    const [shares, setShares] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [creating, setCreating] = useState(false);

    // 表单状态
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        permission: 'READ',
        expiresIn: '7',
        password: '',
        requirePassword: false
    });

    // 分享访问状态
    const [accessDialog, setAccessDialog] = useState({
        open: false,
        share: null,
        password: '',
        error: null
    });

    const shareUseCase = new ShareUseCase();

    useEffect(() => {
        loadShares();
    }, [resourceId, resourceType]);

    const loadShares = async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await shareUseCase.getSharesByResource(resourceId, resourceType);

            if (result.isSuccess) {
                setShares(result.value.items);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateShare = async () => {
        try {
            setCreating(true);
            setError(null);

            // 计算过期时间
            let expiresAt = null;
            if (formData.expiresIn !== 'never') {
                const days = parseInt(formData.expiresIn);
                expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
            }

            const result = await shareUseCase.createShare({
                resourceId,
                resourceType,
                title: formData.title || `${resourceTitle}的分享`,
                description: formData.description,
                permission: formData.permission,
                expiresAt,
                password: formData.requirePassword ? formData.password : null,
                createdBy: 'current-user'
            });

            if (result.isSuccess) {
                setShares(prev => [result.value, ...prev]);
                setShowCreateForm(false);
                resetForm();
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleRevokeShare = async (shareId) => {
        if (!window.confirm('确定要撤销这个分享吗？撤销后链接将失效。')) {
            return;
        }

        try {
            const result = await shareUseCase.revokeShare(shareId);

            if (result.isSuccess) {
                setShares(prev => prev.map(share =>
                    share.id === shareId ? result.value : share
                ));
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteShare = async (shareId) => {
        if (!window.confirm('确定要删除这个分享吗？')) {
            return;
        }

        try {
            const result = await shareUseCase.deleteShare(shareId);

            if (result.isSuccess) {
                setShares(prev => prev.filter(share => share.id !== shareId));
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAccessShare = async (share) => {
        if (share.status === 'PASSWORD_PROTECTED') {
            setAccessDialog({
                open: true,
                share,
                password: '',
                error: null
            });
        } else {
            // 直接访问
            try {
                const result = await shareUseCase.accessShare(share.shareLink);
                if (result.isSuccess) {
                    // 更新访问计数
                    setShares(prev => prev.map(s =>
                        s.id === share.id
                            ? { ...s, accessCount: s.accessCount + 1, lastAccessedAt: new Date() }
                            : s
                    ));
                    // 打开分享链接
                    window.open(`/share/${share.shareLink}`, '_blank');
                } else {
                    setError(result.error);
                }
            } catch (err) {
                setError(err.message);
            }
        }
    };

    const handleAccessWithPassword = async () => {
        try {
            const { share, password } = accessDialog;
            const result = await shareUseCase.accessShare(share.shareLink, password);

            if (result.isSuccess) {
                // 更新访问计数
                setShares(prev => prev.map(s =>
                    s.id === share.id
                        ? { ...s, accessCount: s.accessCount + 1, lastAccessedAt: new Date() }
                        : s
                ));
                // 关闭对话框并打开链接
                setAccessDialog({ open: false, share: null, password: '', error: null });
                window.open(`/share/${share.shareLink}`, '_blank');
            } else {
                setAccessDialog(prev => ({ ...prev, error: result.error }));
            }
        } catch (err) {
            setAccessDialog(prev => ({ ...prev, error: err.message }));
        }
    };

    const copyShareLink = (shareLink) => {
        const fullLink = `${window.location.origin}/share/${shareLink}`;
        navigator.clipboard.writeText(fullLink).then(() => {
            alert('分享链接已复制到剪贴板');
        }).catch(err => {
            console.error('复制链接失败:', err);
        });
    };

    const getStatusDisplay = (status) => {
        const displays = {
            'ACTIVE': { text: '活跃', class: 'status-active', icon: '✅' },
            'PASSWORD_PROTECTED': { text: '密码保护', class: 'status-protected', icon: '🔒' },
            'EXPIRED': { text: '已过期', class: 'status-expired', icon: '⏰' },
            'REVOKED': { text: '已撤销', class: 'status-revoked', icon: '🚫' }
        };
        return displays[status] || { text: status, class: '', icon: '' };
    };

    const getPermissionDisplay = (permission) => {
        const displays = {
            'READ': { text: '只读', icon: '👁️' },
            'WRITE': { text: '可编辑', icon: '✏️' },
            'COMMENT': { text: '可评论', icon: '💬' },
            'ADMIN': { text: '管理员', icon: '👑' }
        };
        return displays[permission] || { text: permission, icon: '' };
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            permission: 'READ',
            expiresIn: '7',
            password: '',
            requirePassword: false
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '从未';
        return new Date(dateString).toLocaleString();
    };

    const isExpired = (share) => {
        return share.status === 'EXPIRED' ||
               (share.expiresAt && new Date(share.expiresAt) < new Date());
    };

    if (loading) {
        return (
            <div className="share-loading">
                <div className="spinner"></div>
                <p>加载分享中...</p>
            </div>
        );
    }

    return (
        <div className="share-dashboard">
            <div className="dashboard-header">
                <h3>分享管理</h3>
                <button
                    className="btn-primary"
                    onClick={() => setShowCreateForm(true)}
                >
                    创建新分享
                </button>
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
                        <h4>创建分享</h4>

                        <div className="form-group">
                            <label>分享标题</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    title: e.target.value
                                }))}
                                placeholder={`${resourceTitle}的分享`}
                            />
                        </div>

                        <div className="form-group">
                            <label>描述（可选）</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    description: e.target.value
                                }))}
                                placeholder="添加分享描述..."
                                rows={2}
                            />
                        </div>

                        <div className="form-group">
                            <label>权限设置</label>
                            <select
                                value={formData.permission}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    permission: e.target.value
                                }))}
                            >
                                <option value="READ">只读</option>
                                <option value="WRITE">可编辑</option>
                                <option value="COMMENT">可评论</option>
                                <option value="ADMIN">管理员</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>有效期</label>
                            <select
                                value={formData.expiresIn}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    expiresIn: e.target.value
                                }))}
                            >
                                <option value="1">1天</option>
                                <option value="7">7天</option>
                                <option value="30">30天</option>
                                <option value="90">90天</option>
                                <option value="never">永久</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={formData.requirePassword}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        requirePassword: e.target.checked
                                    }))}
                                />
                                需要密码访问
                            </label>
                            {formData.requirePassword && (
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        password: e.target.value
                                    }))}
                                    placeholder="输入访问密码"
                                />
                            )}
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
                                onClick={handleCreateShare}
                                disabled={creating || (formData.requirePassword && !formData.password)}
                            >
                                {creating ? '创建中...' : '创建'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {accessDialog.open && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h4>输入访问密码</h4>
                        <p>此分享需要密码才能访问</p>

                        <div className="form-group">
                            <input
                                type="password"
                                value={accessDialog.password}
                                onChange={(e) => setAccessDialog(prev => ({
                                    ...prev,
                                    password: e.target.value
                                }))}
                                placeholder="输入密码"
                                autoFocus
                            />
                        </div>

                        {accessDialog.error && (
                            <div className="error-message">
                                {accessDialog.error}
                            </div>
                        )}

                        <div className="form-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setAccessDialog({
                                    open: false,
                                    share: null,
                                    password: '',
                                    error: null
                                })}
                            >
                                取消
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleAccessWithPassword}
                            >
                                访问
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="shares-list">
                {shares.length === 0 ? (
                    <div className="empty-state">
                        <i className="icon-share"></i>
                        <p>暂无分享</p>
                        <small>点击“创建新分享”开始分享</small>
                    </div>
                ) : (
                    <div className="shares-grid">
                        {shares.map(share => {
                            const statusDisplay = getStatusDisplay(share.status);
                            const permissionDisplay = getPermissionDisplay(share.permission);
                            const expired = isExpired(share);

                            return (
                                <div key={share.id} className={`share-card ${expired ? 'expired' : ''}`}>
                                    <div className="share-card-header">
                                        <div className="share-card-title">
                                            <h4>{share.title}</h4>
                                            <span className={`status ${statusDisplay.class}`}>
                                                {statusDisplay.icon} {statusDisplay.text}
                                            </span>
                                        </div>
                                        <div className="share-card-actions">
                                            <button
                                                className="btn-icon"
                                                onClick={() => copyShareLink(share.shareLink)}
                                                title="复制链接"
                                            >
                                                <i className="icon-copy"></i>
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleAccessShare(share)}
                                                title="访问分享"
                                            >
                                                <i className="icon-external-link"></i>
                                            </button>
                                        </div>
                                    </div>

                                    {share.description && (
                                        <p className="share-description">
                                            {share.description}
                                        </p>
                                    )}

                                    <div className="share-meta">
                                        <div className="meta-item">
                                            <span className="meta-label">权限</span>
                                            <span className="meta-value">
                                                {permissionDisplay.icon} {permissionDisplay.text}
                                            </span>
                                        </div>
                                        <div className="meta-item">
                                            <span className="meta-label">访问</span>
                                            <span className="meta-value">{share.accessCount || 0} 次</span>
                                        </div>
                                        <div className="meta-item">
                                            <span className="meta-label">创建</span>
                                            <span className="meta-value">{formatDate(share.createdAt)}</span>
                                        </div>
                                        <div className="meta-item">
                                            <span className="meta-label">过期</span>
                                            <span className="meta-value">
                                                {share.expiresAt ? formatDate(share.expiresAt) : '永久'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="share-footer">
                                        <div className="share-link">
                                            <code>{share.fullShareLink || `${window.location.origin}/share/${share.shareLink}`}</code>
                                        </div>
                                        <div className="share-actions">
                                            {(share.status === 'ACTIVE' || share.status === 'PASSWORD_PROTECTED') && (
                                                <button
                                                    className="btn-secondary"
                                                    onClick={() => handleRevokeShare(share.id)}
                                                >
                                                    撤销
                                                </button>
                                            )}
                                            <button
                                                className="btn-danger"
                                                onClick={() => handleDeleteShare(share.id)}
                                            >
                                                删除
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
