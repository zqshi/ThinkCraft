import React, { useState, useEffect } from 'react';
import { BusinessPlanUseCase } from '../application/business-plan.use-case.js';
import { BusinessPlanStatus } from '../domain/value-objects/business-plan-status.vo.js';
import { ChapterType } from '../domain/value-objects/chapter-type.vo.js';

export function BusinessPlanDashboard({ projectId }) {
    const [businessPlan, setBusinessPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generatingChapter, setGeneratingChapter] = useState(null);

    const businessPlanUseCase = new BusinessPlanUseCase();

    useEffect(() => {
        loadBusinessPlan();
    }, [projectId]);

    const loadBusinessPlan = async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await businessPlanUseCase.getBusinessPlanByProject(projectId);

            if (result.isSuccess) {
                setBusinessPlan(result.value);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBusinessPlan = async () => {
        try {
            const result = await businessPlanUseCase.createBusinessPlan({
                title: '新项目商业计划书',
                projectId: projectId,
                generatedBy: 'current-user' // 应该从认证上下文中获取
            });

            if (result.isSuccess) {
                setBusinessPlan(result.value);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleGenerateChapter = async (chapterType) => {
        try {
            setGeneratingChapter(chapterType);
            setError(null);

            const chapterTypeObj = ChapterType[chapterType];
            const result = await businessPlanUseCase.generateChapter(
                businessPlan.id,
                chapterType,
                chapterTypeObj.getDisplayName(),
                '', // 内容将由后端生成
                0   // tokens将由后端计算
            );

            if (result.isSuccess) {
                setBusinessPlan(result.value);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setGeneratingChapter(null);
        }
    };

    const handleCompleteBusinessPlan = async () => {
        try {
            setError(null);
            const result = await businessPlanUseCase.completeBusinessPlan(businessPlan.id);

            if (result.isSuccess) {
                setBusinessPlan(result.value);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) {
        return (
            <div className="business-plan-loading">
                <div className="spinner"></div>
                <p>加载商业计划书中...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="business-plan-error">
                <div className="error-message">
                    <i className="icon-error"></i>
                    <span>{error}</span>
                </div>
                <button onClick={loadBusinessPlan} className="btn-retry">
                    重试
                </button>
            </div>
        );
    }

    if (!businessPlan) {
        return (
            <div className="business-plan-empty">
                <div className="empty-state">
                    <i className="icon-business-plan"></i>
                    <h3>尚未创建商业计划书</h3>
                    <p>点击下方按钮开始创建您的商业计划书</p>
                    <button onClick={handleCreateBusinessPlan} className="btn-primary">
                        创建商业计划书
                    </button>
                </div>
            </div>
        );
    }

    const completedChapters = Object.keys(businessPlan.chapters || {}).length;
    const totalChapters = ChapterType.getValidTypes().length;
    const progress = (completedChapters / totalChapters) * 100;

    return (
        <div className="business-plan-dashboard">
            <div className="business-plan-header">
                <h2>{businessPlan.title}</h2>
                <div className="business-plan-meta">
                    <span className={`status status-${businessPlan.status.toLowerCase()}`}>
                        {businessPlan.statusDisplay}
                    </span>
                    <span className="cost">总成本: {businessPlan.costDisplay}</span>
                    <span className="tokens">总Tokens: {businessPlan.totalTokens.toLocaleString()}</span>
                </div>
            </div>

            <div className="business-plan-progress">
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <p className="progress-text">
                    已完成 {completedChapters} / {totalChapters} 章节
                </p>
            </div>

            <div className="chapters-grid">
                {ChapterType.getValidTypes().map(chapterType => {
                    const chapter = businessPlan.chapters[chapterType];
                    const isGenerating = generatingChapter === chapterType;

                    return (
                        <div key={chapterType} className="chapter-card">
                            <div className="chapter-header">
                                <h4>{ChapterType.fromString(chapterType).getDisplayName()}</h4>
                                {chapter && (
                                    <span className="chapter-status completed">
                                        <i className="icon-check"></i>
                                    </span>
                                )}
                            </div>

                            <div className="chapter-content">
                                {chapter ? (
                                    <>
                                        <p className="chapter-summary">{chapter.summary}</p>
                                        <div className="chapter-meta">
                                            <span>字数: {chapter.wordCount}</span>
                                            <span>Tokens: {chapter.tokens.toLocaleString()}</span>
                                        </div>
                                    </>
                                ) : (
                                    <p className="chapter-empty">尚未生成</p>
                                )}
                            </div>

                            <div className="chapter-actions">
                                {chapter ? (
                                    <button className="btn-secondary">
                                        查看详情
                                    </button>
                                ) : (
                                    <button
                                        className="btn-primary"
                                        onClick={() => handleGenerateChapter(chapterType)}
                                        disabled={!businessPlan.canGenerate || isGenerating}
                                    >
                                        {isGenerating ? (
                                            <>
                                                <div className="spinner-small"></div>
                                                生成中...
                                            </>
                                        ) : (
                                            '生成章节'
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {businessPlan.canGenerate && completedChapters > 0 && (
                <div className="business-plan-actions">
                    <button
                        className="btn-success btn-large"
                        onClick={handleCompleteBusinessPlan}
                        disabled={businessPlan.isCompleted}
                    >
                        {businessPlan.isCompleted ? '已完成' : '完成商业计划书'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default BusinessPlanDashboard;