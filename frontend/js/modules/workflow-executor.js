/**
 * 工作流执行器（前端）
 * 负责执行工作流阶段任务、管理交付物、处理工作流UI
 */

class WorkflowExecutor {
    constructor() {
        this.apiUrl = window.appState?.settings?.apiUrl || 'http://localhost:3000';
        this.storageManager = window.storageManager;
        this.projectManager = window.projectManager;

        // 当前执行状态
        this.currentExecution = null;
        this.isExecuting = false;

        console.log('[WorkflowExecutor] 工作流执行器已初始化');
    }

    /**
     * 执行单个阶段任务
     * @param {String} projectId - 项目ID
     * @param {String} stageId - 阶段ID
     * @param {Object} context - 上下文数据（可选）
     * @returns {Promise<Object>} 执行结果
     */
    async executeStage(projectId, stageId, context = {}) {
        if (this.isExecuting) {
            throw new Error('当前正在执行任务，请稍后再试');
        }

        try {
            this.isExecuting = true;
            console.log(`[WorkflowExecutor] 开始执行阶段: ${stageId}`);

            // 调用后端API
            const response = await fetch(`${this.apiUrl}/api/workflow/${projectId}/execute-stage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stageId, context })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '阶段执行失败');
            }

            const result = await response.json();
            console.log(`[WorkflowExecutor] ✓ 阶段 ${stageId} 执行完成`);

            // 更新项目状态
            await this.updateProjectStageStatus(projectId, stageId, 'completed');

            return result.data;

        } catch (error) {
            console.error(`[WorkflowExecutor] 阶段 ${stageId} 执行失败:`, error);
            throw error;
        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * 批量执行阶段任务
     * @param {String} projectId - 项目ID
     * @param {Array<String>} stageIds - 阶段ID数组
     * @param {String} conversation - 创意对话内容
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<Object>} 执行结果
     */
    async executeBatch(projectId, stageIds, conversation, onProgress = null) {
        if (this.isExecuting) {
            throw new Error('当前正在执行任务，请稍后再试');
        }

        try {
            this.isExecuting = true;
            this.currentExecution = {
                projectId,
                stageIds,
                currentStageIndex: 0,
                startTime: Date.now()
            };

            console.log(`[WorkflowExecutor] 开始批量执行 ${stageIds.length} 个阶段`);

            // 调用后端API
            const response = await fetch(`${this.apiUrl}/api/workflow/${projectId}/execute-batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stageIds, conversation })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '批量执行失败');
            }

            const result = await response.json();
            console.log(`[WorkflowExecutor] ✓ 批量执行完成，消耗 ${result.data.totalTokens} tokens`);

            // 更新所有阶段状态为已完成
            for (const stageId of stageIds) {
                await this.updateProjectStageStatus(projectId, stageId, 'completed');
            }

            return result.data;

        } catch (error) {
            console.error('[WorkflowExecutor] 批量执行失败:', error);
            throw error;
        } finally {
            this.isExecuting = false;
            this.currentExecution = null;
        }
    }

    /**
     * 获取阶段交付物
     * @param {String} projectId - 项目ID
     * @param {String} stageId - 阶段ID
     * @returns {Promise<Array>} 交付物数组
     */
    async getStageArtifacts(projectId, stageId) {
        try {
            const response = await fetch(
                `${this.apiUrl}/api/workflow/${projectId}/stages/${stageId}/artifacts`
            );

            if (!response.ok) {
                throw new Error('获取交付物失败');
            }

            const result = await response.json();
            return result.data.artifacts || [];

        } catch (error) {
            console.error('[WorkflowExecutor] 获取交付物失败:', error);
            return [];
        }
    }

    /**
     * 获取项目所有交付物
     * @param {String} projectId - 项目ID
     * @returns {Promise<Array>} 交付物数组
     */
    async getAllArtifacts(projectId) {
        try {
            const response = await fetch(`${this.apiUrl}/api/workflow/${projectId}/artifacts`);

            if (!response.ok) {
                throw new Error('获取交付物失败');
            }

            const result = await response.json();
            return result.data.artifacts || [];

        } catch (error) {
            console.error('[WorkflowExecutor] 获取所有交付物失败:', error);
            return [];
        }
    }

    /**
     * 删除交付物
     * @param {String} projectId - 项目ID
     * @param {String} artifactId - 交付物ID
     */
    async deleteArtifact(projectId, artifactId) {
        try {
            const response = await fetch(
                `${this.apiUrl}/api/workflow/${projectId}/artifacts/${artifactId}`,
                { method: 'DELETE' }
            );

            if (!response.ok) {
                throw new Error('删除交付物失败');
            }

            console.log(`[WorkflowExecutor] 交付物已删除: ${artifactId}`);

        } catch (error) {
            console.error('[WorkflowExecutor] 删除交付物失败:', error);
            throw error;
        }
    }

    /**
     * 更新项目的阶段状态
     * @param {String} projectId - 项目ID
     * @param {String} stageId - 阶段ID
     * @param {String} status - 状态（pending|active|completed）
     */
    async updateProjectStageStatus(projectId, stageId, status) {
        try {
            const project = await this.storageManager.getProject(projectId);
            if (!project || !project.workflow || !project.workflow.stages) {
                console.warn('[WorkflowExecutor] 项目工作流数据不存在');
                return;
            }

            // 更新阶段状态
            const stage = project.workflow.stages.find(s => s.id === stageId);
            if (stage) {
                stage.status = status;

                if (status === 'active' && !stage.startedAt) {
                    stage.startedAt = Date.now();
                } else if (status === 'completed' && !stage.completedAt) {
                    stage.completedAt = Date.now();
                }

                // 保存到本地存储
                await this.storageManager.saveProject(project);

                // 更新全局状态
                if (window.updateProject) {
                    window.updateProject(projectId, { workflow: project.workflow });
                }

                console.log(`[WorkflowExecutor] 阶段状态已更新: ${stageId} -> ${status}`);
            }

        } catch (error) {
            console.error('[WorkflowExecutor] 更新阶段状态失败:', error);
        }
    }

    /**
     * 获取阶段定义
     * @param {String} stageId - 阶段ID
     * @returns {Object|null} 阶段配置
     */
    getStageDefinition(stageId) {
        const stageDefinitions = {
            'requirement': {
                id: 'requirement',
                name: '需求分析',
                description: '产品定位、用户分析、功能规划',
                icon: '📋',
                color: '#667eea'
            },
            'design': {
                id: 'design',
                name: '产品设计',
                description: 'UI/UX设计、交互原型、视觉规范',
                icon: '🎨',
                color: '#764ba2'
            },
            'architecture': {
                id: 'architecture',
                name: '架构设计',
                description: '系统架构、技术选型、API规范',
                icon: '🏗️',
                color: '#f093fb'
            },
            'development': {
                id: 'development',
                name: '开发实现',
                description: '前后端开发、功能实现、代码编写',
                icon: '💻',
                color: '#4facfe'
            },
            'testing': {
                id: 'testing',
                name: '测试验证',
                description: '功能测试、性能测试、bug修复',
                icon: '🧪',
                color: '#43e97b'
            },
            'deployment': {
                id: 'deployment',
                name: '部署上线',
                description: '环境配置、服务器部署、上线发布',
                icon: '🚀',
                color: '#fa709a'
            },
            'operation': {
                id: 'operation',
                name: '运营推广',
                description: '市场推广、用户运营、数据分析',
                icon: '📈',
                color: '#fee140'
            }
        };

        return stageDefinitions[stageId] || null;
    }

    /**
     * 渲染工作流阶段卡片列表
     * @param {String} containerId - 容器元素ID
     * @param {Object} project - 项目对象
     */
    renderWorkflowStages(containerId, project) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`[WorkflowExecutor] 容器不存在: ${containerId}`);
            return;
        }

        if (!project || !project.workflow || !project.workflow.stages) {
            container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                    工作流数据不存在
                </div>
            `;
            return;
        }

        const stagesHTML = project.workflow.stages.map(stage =>
            this.renderStageCard(project.id, stage)
        ).join('');

        container.innerHTML = `
            <div style="padding: 20px;">
                <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600;">工作流阶段</h2>
                <div style="display: grid; gap: 16px;">
                    ${stagesHTML}
                </div>
            </div>
        `;
    }

    /**
     * 渲染单个阶段卡片
     * @param {String} projectId - 项目ID
     * @param {Object} stage - 阶段对象
     * @returns {String} HTML字符串
     */
    renderStageCard(projectId, stage) {
        const definition = this.getStageDefinition(stage.id);
        const statusText = {
            'pending': '未开始',
            'active': '进行中',
            'completed': '已完成'
        }[stage.status] || stage.status;

        const statusColor = {
            'pending': '#9ca3af',
            'active': '#3b82f6',
            'completed': '#10b981'
        }[stage.status] || '#9ca3af';

        const artifactCount = stage.artifacts ? stage.artifacts.length : 0;

        let actionHTML = '';
        if (stage.status === 'pending') {
            actionHTML = `
                <button class="btn-primary" onclick="workflowExecutor.startStage('${projectId}', '${stage.id}')">
                    开始执行
                </button>
            `;
        } else if (stage.status === 'completed') {
            actionHTML = `
                <button class="btn-secondary" onclick="workflowExecutor.viewArtifacts('${projectId}', '${stage.id}')">
                    查看交付物 (${artifactCount})
                </button>
            `;
        } else {
            actionHTML = `
                <button class="btn-secondary" disabled>
                    执行中...
                </button>
            `;
        }

        return `
            <div class="stage-card" style="border: 1px solid var(--border); border-radius: 12px; padding: 20px; background: white; border-left: 4px solid ${definition?.color || '#667eea'};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 32px;">${definition?.icon || '📋'}</span>
                        <div>
                            <h3 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 600;">${definition?.name || stage.name}</h3>
                            <p style="margin: 0; font-size: 14px; color: var(--text-secondary);">${definition?.description || ''}</p>
                        </div>
                    </div>
                    <div style="padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500; color: white; background: ${statusColor};">
                        ${statusText}
                    </div>
                </div>
                <div style="margin-top: 16px;">
                    ${actionHTML}
                </div>
            </div>
        `;
    }

    /**
     * 开始执行阶段
     * @param {String} projectId - 项目ID
     * @param {String} stageId - 阶段ID
     */
    async startStage(projectId, stageId) {
        try {
            if (this.isExecuting) {
                if (window.modalManager) {
                    window.modalManager.alert('当前正在执行任务，请稍后再试', 'warning');
                } else {
                    alert('当前正在执行任务，请稍后再试');
                }
                return;
            }

            // 显示执行提示
            if (window.modalManager) {
                window.modalManager.alert('正在执行阶段任务，请稍候...', 'info');
            }

            // 获取创意对话内容作为上下文
            const project = await this.storageManager.getProject(projectId);
            const chat = await this.storageManager.getChat(project.ideaId);
            const conversation = chat ? chat.messages.map(m => `${m.role}: ${m.content}`).join('\n\n') : '';

            // 更新阶段状态为进行中
            await this.updateProjectStageStatus(projectId, stageId, 'active');

            // 执行阶段
            const result = await this.executeStage(projectId, stageId, { CONVERSATION: conversation });

            // 显示成功提示
            if (window.modalManager) {
                window.modalManager.close();
                window.modalManager.alert(
                    `阶段执行完成！<br><br>生成了 ${result.artifacts.length} 个交付物<br>消耗 ${result.totalTokens} tokens`,
                    'success'
                );
            } else {
                alert('阶段执行完成！');
            }

            // 刷新UI（如果有渲染函数）
            if (this.onStageCompleted) {
                this.onStageCompleted(projectId, stageId);
            }

        } catch (error) {
            console.error('[WorkflowExecutor] 执行阶段失败:', error);

            if (window.modalManager) {
                window.modalManager.close();
                window.modalManager.alert('执行失败: ' + error.message, 'error');
            } else {
                alert('执行失败: ' + error.message);
            }

            // 恢复阶段状态为pending
            await this.updateProjectStageStatus(projectId, stageId, 'pending');
        }
    }

    /**
     * 查看阶段交付物
     * @param {String} projectId - 项目ID
     * @param {String} stageId - 阶段ID
     */
    async viewArtifacts(projectId, stageId) {
        try {
            const artifacts = await this.getStageArtifacts(projectId, stageId);

            if (artifacts.length === 0) {
                if (window.modalManager) {
                    window.modalManager.alert('该阶段暂无交付物', 'info');
                } else {
                    alert('该阶段暂无交付物');
                }
                return;
            }

            // 渲染交付物列表
            const artifactsHTML = artifacts.map(artifact => {
                // 生成预览内容（使用Markdown渲染器）
                const previewContent = artifact.content.substring(0, 300);
                const renderedPreview = window.markdownRenderer
                    ? window.markdownRenderer.render(previewContent)
                    : this.escapeHtml(previewContent);

                return `
                <div style="margin-bottom: 16px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: #f9fafb;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <div>
                            <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">${this.escapeHtml(artifact.name)}</h4>
                            <div style="font-size: 13px; color: var(--text-secondary);">
                                由 ${this.escapeHtml(artifact.agentName)} 生成 · ${new Date(artifact.createdAt).toLocaleString()}
                            </div>
                        </div>
                        <button class="btn-secondary" onclick="workflowExecutor.showArtifactDetail('${artifact.id}', '${this.escapeHtml(artifact.name)}', \`${this.escapeForJS(artifact.content)}\`)" title="查看完整内容">
                            查看详情
                        </button>
                    </div>
                    <div class="markdown-content" style="max-height: 200px; overflow-y: auto; background: white; padding: 12px; border-radius: 6px; font-size: 13px;">
                        ${renderedPreview}${artifact.content.length > 300 ? '...' : ''}
                    </div>
                </div>
            `;
            }).join('');

            const dialogHTML = `
                <div style="max-height: 60vh; overflow-y: auto;">
                    ${artifactsHTML}
                </div>
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
                    <button class="btn-secondary" onclick="window.modalManager.close('artifactsDialog')" style="width: 100%;">关闭</button>
                </div>
            `;

            if (window.modalManager) {
                const stageDef = this.getStageDefinition(stageId);
                window.modalManager.showCustomModal(
                    `${stageDef?.icon || ''} ${stageDef?.name || '阶段'} - 交付物`,
                    dialogHTML,
                    'artifactsDialog'
                );
            }

        } catch (error) {
            console.error('[WorkflowExecutor] 查看交付物失败:', error);
            if (window.modalManager) {
                window.modalManager.alert('加载交付物失败: ' + error.message, 'error');
            } else {
                alert('加载交付物失败');
            }
        }
    }

    /**
     * 查看交付物详细内容
     * @param {String} artifactId - 交付物ID
     */
    async viewArtifactContent(artifactId) {
        try {
            // 从当前打开的交付物列表中查找
            // TODO: 实现更好的交付物查找机制（通过storage-manager）
            console.log('[WorkflowExecutor] 查看交付物详情:', artifactId);

            // 显示提示（暂时使用alert，后续可以用模态框）
            if (window.modalManager) {
                window.modalManager.alert('正在加载交付物详情...', 'info');

                // 模拟加载（实际应该从storage-manager或API获取）
                setTimeout(() => {
                    window.modalManager.close();
                    window.modalManager.alert('交付物详情功能开发中...', 'warning');
                }, 500);
            } else {
                alert('交付物详情查看功能开发中...');
            }
        } catch (error) {
            console.error('[WorkflowExecutor] 查看交付物失败:', error);
        }
    }

    /**
     * HTML转义
     * @param {String} text - 文本
     * @returns {String} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * JavaScript字符串转义（用于内联JS）
     * @param {String} text - 文本
     * @returns {String} 转义后的文本
     */
    escapeForJS(text) {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$/g, '\\$')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');
    }

    /**
     * 显示交付物详情（使用Markdown渲染）
     * @param {String} artifactId - 交付物ID
     * @param {String} name - 交付物名称
     * @param {String} content - 交付物内容
     */
    showArtifactDetail(artifactId, name, content) {
        if (!window.modalManager) {
            console.error('[WorkflowExecutor] modalManager不可用');
            return;
        }

        // 使用Markdown渲染器渲染内容
        const renderedContent = window.markdownRenderer
            ? window.markdownRenderer.render(content)
            : this.escapeHtml(content);

        const contentHTML = `
            <div style="max-height: 70vh; overflow-y: auto; padding: 4px;">
                <div class="markdown-content" style="padding: 16px; background: white; border-radius: 8px;">
                    ${renderedContent}
                </div>
            </div>
            <div style="display: flex; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
                <button class="btn-secondary" onclick="window.modalManager.close('artifactDetail')" style="flex: 1;">
                    关闭
                </button>
                <button class="btn-primary" onclick="workflowExecutor.downloadArtifact('${artifactId}', '${this.escapeForJS(name)}', \`${this.escapeForJS(content)}\`)" style="flex: 1;">
                    下载文档
                </button>
            </div>
        `;

        window.modalManager.showCustomModal(
            `📄 ${name}`,
            contentHTML,
            'artifactDetail'
        );
    }

    /**
     * 下载交付物为文件
     * @param {String} artifactId - 交付物ID
     * @param {String} name - 交付物名称
     * @param {String} content - 交付物内容
     */
    downloadArtifact(artifactId, name, content) {
        try {
            // 创建Blob对象
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });

            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${name}.md`;

            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // 释放URL对象
            URL.revokeObjectURL(url);

            console.log(`[WorkflowExecutor] 下载交付物: ${name}`);

            if (window.modalManager) {
                window.modalManager.alert('文档已下载！', 'success');
            }

        } catch (error) {
            console.error('[WorkflowExecutor] 下载失败:', error);
            if (window.modalManager) {
                window.modalManager.alert('下载失败: ' + error.message, 'error');
            }
        }
    }
}

// 导出（浏览器环境）
if (typeof window !== 'undefined') {
    window.WorkflowExecutor = WorkflowExecutor;
    window.workflowExecutor = new WorkflowExecutor();

    console.log('[WorkflowExecutor] 工作流执行器已加载');
}
