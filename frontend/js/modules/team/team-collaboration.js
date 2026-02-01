/**
 * 团队协作模块
 * 负责团队管理、成员招聘、协作等功能
 */

// 创建日志实例
var logger = window.createLogger ? window.createLogger('TeamCollaboration') : console;


class TeamCollaboration {
    constructor() {
        // 初始化团队协作模块
    }

    // renderMyTeam (原行号: 394-480)
    renderMyTeam(container) {
                if (myAgents.length === 0) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 60px 20px;">
                            <div style="font-size: 64px; margin-bottom: 20px;">👥</div>
                            <h3 style="color: var(--text-primary); margin-bottom: 12px;">还没有雇佣员工</h3>
                            <p style="color: var(--text-secondary); margin-bottom: 24px;">
                                前往招聘大厅，开始组建你的AI团队
                            </p>
                            <button class="hire-btn" onclick="switchAgentTab('hire')">
                                去招聘 →
                            </button>
                        </div>
                    `;
                    return;
                }
    
                const totalCost = myAgents.reduce((sum, a) => sum + a.salary, 0);
    
                let html = `
                    <div style="margin-bottom: 24px;">
                        <h3 style="margin-bottom: 8px;">团队概况</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px;">
                                <div style="font-size: 12px; opacity: 0.9;">团队规模</div>
                                <div style="font-size: 32px; font-weight: bold; margin-top: 8px;">${myAgents.length}</div>
                                <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">名员工</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 12px;">
                                <div style="font-size: 12px; opacity: 0.9;">月度成本</div>
                                <div style="font-size: 32px; font-weight: bold; margin-top: 8px;">¥${(totalCost/1000).toFixed(1)}k</div>
                                <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">虚拟货币</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 12px;">
                                <div style="font-size: 12px; opacity: 0.9;">完成任务</div>
                                <div style="font-size: 32px; font-weight: bold; margin-top: 8px;">${myAgents.reduce((sum, a) => sum + a.tasksCompleted, 0)}</div>
                                <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">个任务</div>
                            </div>
                        </div>
                    </div>
    
                    <h3 style="margin-bottom: 16px;">员工列表</h3>
                `;
    
                myAgents.forEach(agent => {
                    const statusColor = agent.status === 'working' ? '#fbbf24' : '#10b981';
                    const statusText = agent.status === 'working' ? '工作中' : '空闲';
    
                    html += `
                        <div class="agent-card">
                            <div style="display: flex; align-items: start; gap: 16px;">
                                <div class="agent-avatar-large">${getAgentIconSvg(agent.emoji || agent.name, 36, 'agent-avatar-icon')}</div>
                                <div style="flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                        <h4 style="margin: 0; font-size: 18px;">${agent.nickname}</h4>
                                        <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                                            ${statusText}
                                        </span>
                                        <span style="background: #e5e7eb; color: #6b7280; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                                            ${agent.level === 'expert' ? '专家' : agent.level === 'senior' ? '资深' : agent.level === 'mid' ? '中级' : '初级'}
                                        </span>
                                    </div>
                                    <p style="color: var(--text-secondary); font-size: 14px; margin: 0 0 12px 0;">${agent.desc}</p>
                                    <div style="margin-bottom: 12px;">
                                        ${agent.skills.map(skill => `<span class="agent-skill-tag">${skill}</span>`).join('')}
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 16px; font-size: 13px; color: var(--text-secondary);">
                                        <span>💰 月薪: ¥${agent.salary}</span>
                                        <span>✅ 完成任务: ${agent.tasksCompleted}</span>
                                        <span>📊 绩效: ${agent.performance}分</span>
                                    </div>
                                </div>
                                <div>
                                    <button class="assign-task-btn" onclick="assignTaskToAgent('${agent.id}')">
                                        分配任务
                                    </button>
                                    <button class="fire-btn" onclick="fireAgent('${agent.id}')">
                                        解雇
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });
    
                container.innerHTML = html;
            }

    // renderHireHall (原行号: 483-546)
    renderHireHall(container) {
                let html = `
                    <div style="margin-bottom: 24px;">
                        <h3 style="margin-bottom: 8px;">招聘大厅</h3>
                        <p style="color: var(--text-secondary); font-size: 14px;">
                            选择适合的AI员工加入你的团队
                        </p>
                    </div>
                `;
    
                // 按类别分组
                const categories = {
                    '产品与设计': ['product-manager', 'designer'],
                    '技术开发': ['frontend-dev', 'backend-dev'],
                    '运营与营销': ['marketing', 'operations'],
                    '商务与销售': ['sales', 'customer-service'],
                    '财务与法务': ['accountant', 'legal'],
                    '战略与分析': ['consultant', 'data-analyst']
                };
    
                Object.entries(categories).forEach(([category, types]) => {
                    html += `<h4 style="margin: 24px 0 16px 0; color: var(--text-primary);">${category}</h4>`;
    
                    types.forEach(typeId => {
                        const agent = availableAgentTypes.find(a => a.id === typeId);
                        if (!agent) return;
    
                        // 检查是否已雇佣
                        const isHired = myAgents.some(a => a.type === agent.id);
    
                        html += `
                            <div class="agent-card" style="${isHired ? 'opacity: 0.6;' : ''}">
                                <div style="display: flex; align-items: start; gap: 16px;">
                                    <div class="agent-avatar-large">${getAgentIconSvg(agent.emoji || agent.name, 36, 'agent-avatar-icon')}</div>
                                    <div style="flex: 1;">
                                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                            <h4 style="margin: 0; font-size: 18px;">${agent.name}</h4>
                                            ${isHired ? '<span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">已雇佣</span>' : ''}
                                        </div>
                                        <p style="color: var(--text-secondary); font-size: 14px; margin: 0 0 12px 0;">${agent.desc}</p>
                                        <div style="margin-bottom: 12px;">
                                            ${agent.skills.map(skill => `<span class="agent-skill-tag">${skill}</span>`).join('')}
                                        </div>
                                        <div style="font-size: 14px;">
                                            <span style="color: var(--text-primary); font-weight: 600;">💰 月薪: ¥${agent.salary}</span>
                                            <span style="color: var(--text-secondary); margin-left: 16px;">
                                                级别: ${agent.level === 'expert' ? '专家' : agent.level === 'senior' ? '资深' : agent.level === 'mid' ? '中级' : '初级'}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        ${isHired
                                            ? '<button class="hire-btn" style="opacity: 0.5; cursor: not-allowed;" disabled>已雇佣</button>'
                                            : `<button class="hire-btn" onclick="hireAgent('${agent.id}', '${agent.name}')">雇佣</button>`
                                        }
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                });
    
                container.innerHTML = html;
            }

    // renderTasks (原行号: 549-559)
    renderTasks(container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px;">
                        <div style="font-size: 64px; margin-bottom: 20px;">📋</div>
                        <h3 style="color: var(--text-primary); margin-bottom: 12px;">任务管理</h3>
                        <p style="color: var(--text-secondary);">
                            在"我的团队"中为员工分配具体任务
                        </p>
                    </div>
                `;
            }

    // renderCollaboration (原行号: 562-608)
    renderCollaboration(container) {
                if (myAgents.length < 2) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 60px 20px;">
                            <div style="font-size: 64px; margin-bottom: 20px;">🤝</div>
                            <h3 style="color: var(--text-primary); margin-bottom: 12px;">团队协同</h3>
                            <p style="color: var(--text-secondary);">
                                至少需要2名员工才能进行团队协同工作
                            </p>
                        </div>
                    `;
                    return;
                }
    
                container.innerHTML = `
                    <div style="margin-bottom: 24px;">
                        <h3 style="margin-bottom: 8px;">团队协同工作</h3>
                        <p style="color: var(--text-secondary); font-size: 14px;">
                            让多位员工共同完成复杂任务
                        </p>
                    </div>
    
                    <div class="agent-card">
                        <h4 style="margin-bottom: 16px;">选择参与人员</h4>
                        <div id="teamMemberSelection" style="margin-bottom: 20px;">
                            ${myAgents.map(agent => `
                                <label style="display: flex; align-items: center; padding: 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; cursor: pointer;">
                                    <input type="checkbox" value="${agent.id}" style="margin-right: 12px;">
                                    <span class="agent-inline-icon">${getAgentIconSvg(agent.emoji || agent.name, 20, 'agent-inline-icon')}</span>
                                    <span style="flex: 1;">${agent.nickname} (${agent.name})</span>
                                </label>
                            `).join('')}
                        </div>
    
                        <h4 style="margin-bottom: 12px;">协同任务描述</h4>
                        <textarea id="teamTask"
                                  style="width: 100%; height: 120px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical;"
                                  placeholder="描述需要团队协作完成的任务，例如：设计一个完整的用户增长方案"></textarea>
    
                        <button class="hire-btn" style="margin-top: 16px; width: 100%;" onclick="startTeamCollaboration()">
                            🚀 开始协同工作
                        </button>
                    </div>
    
                    <div id="collaborationResult" style="margin-top: 24px;"></div>
                `;
            }

    // showTaskResult (原行号: 617-660)
    showTaskResult(taskResult) {
                const modalHTML = `
                    <div class="modal active" id="taskResultModal">
                        <div class="modal-content" style="max-width: 700px;">
                            <div class="modal-header">
                                <h2>📋 任务完成报告</h2>
                                <button class="close-btn" onclick="closeTaskResult()">×</button>
                            </div>
                            <div class="modal-body">
                                <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                        <span style="font-size: 32px;">${myAgents.find(a => a.id === taskResult.agentId)?.emoji}</span>
                                        <div>
                                            <div style="font-weight: 600;">${taskResult.agentName}</div>
                                            <div style="font-size: 12px; color: var(--text-secondary);">
                                                完成时间: ${new Date(taskResult.completedAt).toLocaleString('zh-CN')}
                                            </div>
                                        </div>
                                    </div>
                                    <div style="font-size: 14px; color: var(--text-secondary);">
                                        <strong>任务：</strong>${taskResult.task}
                                    </div>
                                </div>
    
                                <div style="background: white; padding: 20px; border: 1px solid var(--border); border-radius: 8px; line-height: 1.8; white-space: pre-wrap; max-height: 400px; overflow-y: auto;">
                                    ${taskResult.result}
                                </div>
    
                                <div style="margin-top: 16px; text-align: right;">
                                    <button class="hire-btn" onclick="copyToClipboard(\`${taskResult.result.replace(/`/g, '\\`')}\`)">
                                        📋 复制结果
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
    
                // 移除旧的模态框
                const oldModal = document.getElementById('taskResultModal');
                if (oldModal) oldModal.remove();
    
                document.body.insertAdjacentHTML('beforeend', modalHTML);
            }

    // closeTaskResult (原行号: 663-669)
    closeTaskResult() {
                const modal = document.getElementById('taskResultModal');
                if (modal) {
                    modal.classList.remove('active');
                    setTimeout(() => modal.remove(), 300);
                }
            }

    // startTeamCollaboration (原行号: 672-745)
    async startTeamCollaboration() {
                const selectedCheckboxes = document.querySelectorAll('#teamMemberSelection input[type="checkbox"]:checked');
                const task = document.getElementById('teamTask').value.trim();
    
                if (selectedCheckboxes.length < 2) {
                    alert('❌ 请至少选择2名员工');
                    return;
                }
    
                if (!task) {
                    alert('❌ 请输入任务描述');
                    return;
                }
    
                const agentIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    
                try {
                    alert('🤝 团队开始协同工作，请稍候...');
    
                    const response = await fetch(`${state.settings.apiUrl}/api/agents/team-collaboration`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userId: USER_ID,
                            agentIds: agentIds,
                            task: task,
                            context: state.userData.idea || ''
                        })
                    });
    
                    if (!response.ok) {
                        throw new Error('团队协同失败');
                    }
    
                    const result = await response.json();
    
                    if (result.code !== 0) {
                        throw new Error(result.error || '团队协同失败');
                    }
    
                    // 显示协同结果
                    const collabResult = result.data;
                    const resultDiv = document.getElementById('collaborationResult');
    
                    resultDiv.innerHTML = `
                        <div class="agent-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            <h3 style="margin-bottom: 16px;">✅ 团队协同完成</h3>
                            <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                                <div style="font-size: 13px; margin-bottom: 8px;">
                                    参与成员: ${collabResult.teamMembers.map(m => m.name).join('、')}
                                </div>
                                <div style="font-size: 13px;">
                                    完成时间: ${new Date(collabResult.completedAt).toLocaleString('zh-CN')}
                                </div>
                            </div>
                            <div style="background: white; color: var(--text-primary); padding: 20px; border-radius: 8px; line-height: 1.8; white-space: pre-wrap; max-height: 400px; overflow-y: auto;">
                                ${collabResult.result}
                            </div>
                            <button class="hire-btn" style="background: white; color: var(--primary); margin-top: 16px;"
                                    onclick="copyToClipboard(\`${collabResult.result.replace(/`/g, '\\`')}\`)">
                                📋 复制结果
                            </button>
                        </div>
                    `;
    
                    // 重新加载团队数据
                    await loadMyAgents();
    
                } catch (error) {
                    alert(`❌ 团队协同失败: ${error.message}`);
                }
            }

    // loadTeamSpace (原行号: 786-801)
    loadTeamSpace() {
                const teamView = document.getElementById('teamView');
                
                // 检查projectManager是否已初始化
                if (!window.projectManager) {
                    teamView.innerHTML = `
                        <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                            <p>项目管理器加载中...</p>
                        </div>
                    `;
                    return;
                }
    
                // 渲染项目列表
                window.projectManager.renderProjectList('projectListContainer');
            }

    // initTeamSpace (原行号: 806-818)
    initTeamSpace() {
                const saved = localStorage.getItem('thinkcraft_teamspace');
                if (saved) {
                    state.teamSpace = JSON.parse(saved);
                } else {
                    state.teamSpace = {
                        projects: [],
                        agents: [],
                        knowledge: []
                    };
                    saveTeamSpace();
                }
            }

    // saveTeamSpace (原行号: 821-823)
    saveTeamSpace() {
                localStorage.setItem('thinkcraft_teamspace', JSON.stringify(state.teamSpace));
            }

    // startProjectTeamCollaboration (原行号: 865-1000)
    async startProjectTeamCollaboration(projectId) {
                const project = state.teamSpace.projects.find(p => p.id === projectId);
                if (!project) return;
    
                if (project.assignedAgents.length === 0) {
                    alert('请先添加团队成员');
                    return;
                }
    
                if (project.linkedIdeas.length === 0) {
                    alert('请先引入创意');
                    return;
                }
    
                // 获取项目成员信息
                const agentMarket = getAgentMarket();
                const projectMembers = project.assignedAgents.map(agentId => {
                    const agent = agentMarket.find(a => a.id === agentId);
                    return agent ? {
                        name: agent.name,
                        role: agent.role,
                        skills: agent.skills
                    } : null;
                }).filter(m => m !== null);
    
                // 获取创意信息
                const linkedChat = state.chats.find(chat => chat.id === project.linkedIdeas[0]);
                const ideaContent = linkedChat ? linkedChat.title : '未知创意';
                const ideaMessages = linkedChat && linkedChat.messages ? linkedChat.messages.slice(0, 5) : [];
    
                try {
                    // 显示加载提示
                    const loadingModal = document.createElement('div');
                    loadingModal.className = 'modal';
                    loadingModal.style.display = 'flex';
                    loadingModal.innerHTML = `
                        <div class="modal-content" style="max-width: 400px; text-align: center; padding: 40px;">
                            <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
                            <div style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">AI评估中...</div>
                            <div style="color: var(--text-secondary); font-size: 14px;">正在分析项目成员与创意的匹配度</div>
                        </div>
                    `;
                    document.body.appendChild(loadingModal);
    
                    // 调用AI评估API
                    const response = await fetch(`${state.settings.apiUrl}/api/chat`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            messages: [
                                {
                                    role: 'system',
                                    content: '你是一个专业的项目评估专家，擅长分析团队成员与项目需求的匹配度。请根据项目成员和创意需求，评估团队是否具备完成该项目的能力，并给出专业建议。'
                                },
                                {
                                    role: 'user',
                                    content: `请评估以下项目团队配置：
    
    项目名称：${project.name}
    创意内容：${ideaContent}
    ${ideaMessages.length > 0 ? `\n创意详情：\n${ideaMessages.map(m => m.content).join('\n')}` : ''}
    
    当前团队成员：
    ${projectMembers.map(m => `- ${m.name}（${m.role}）：${m.skills.join('、')}`).join('\n')}
    
    请从以下几个方面进行评估：
    1. 分析当前团队成员的角色和技能是否能够覆盖该创意所需的核心能力
    2. 指出可能存在的角色缺失或技能短板
    3. 如果存在不足，给出具体的雇佣建议（需要什么角色的成员）
    4. 如果团队配置合理，建议一个高效的协同模式（如何分工协作）
    5. 给出项目成功完成的概率评估（0-100%）
    
    请用清晰、专业的语言回答，分点阐述。`
                                }
                            ]
                        })
                    });
    
                    loadingModal.remove();
    
                    if (!response.ok) {
                        throw new Error('评估请求失败');
                    }
    
                    const result = await response.json();
    
                    if (result.code !== 0) {
                        throw new Error(result.error || '评估失败');
                    }
    
                    // 显示评估结果
                    const evaluationResult = result.data.reply;
    
                    const resultModal = document.createElement('div');
                    resultModal.className = 'modal';
                    resultModal.style.display = 'flex';
                    resultModal.innerHTML = `
                        <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
                            <div class="modal-header">
                                <div class="modal-title">🎯 团队协同评估报告</div>
                                <button class="close-btn" onclick="this.closest('.modal').remove()">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                            <div class="modal-body" style="padding: 24px;">
                                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                                    <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">项目：${project.name}</div>
                                    <div style="font-size: 14px; color: var(--text-secondary);">创意：${ideaContent}</div>
                                </div>
                                <div style="white-space: pre-wrap; line-height: 1.8; color: var(--text-primary);">
                                    ${evaluationResult}
                                </div>
                                <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;">
                                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">关闭</button>
                                    <button class="btn-primary" onclick="this.closest('.modal').remove(); showAddMember()">添加成员</button>
                                </div>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(resultModal);
    
                    // 点击背景关闭
                    resultModal.addEventListener('click', function(e) {
                        if (e.target === resultModal) {
                            resultModal.remove();
                        }
                    });
    
                } catch (error) {
                    alert(`评估失败: ${error.message}\n\n请检查后端服务是否正常运行。`);
                }
            }

    // showAddMember (原行号: 1106-1113)
    showAddMember() {
                // 显示添加成员Modal
                const modal = document.getElementById('addMemberModal');
                modal.style.display = 'flex';
    
                // 默认显示雇佣市场Tab
                switchAddMemberTab('market');
            }

    // closeAddMember (原行号: 1115-1117)
    closeAddMember() {
                document.getElementById('addMemberModal').style.display = 'none';
            }

    // switchAddMemberTab (原行号: 1120-1140)
    switchAddMemberTab(tab) {
                // 更新Tab按钮状态
                const tabs = document.querySelectorAll('#addMemberModal .report-tab');
                tabs.forEach(t => t.classList.remove('active'));
    
                if (tab === 'market') {
                    tabs[0].classList.add('active');
                    document.getElementById('addMemberMarketTab').style.display = 'block';
                    document.getElementById('addMemberHiredTab').style.display = 'none';
    
                    // 渲染可雇佣的数字员工列表
                    renderAvailableAgents();
                } else {
                    tabs[1].classList.add('active');
                    document.getElementById('addMemberMarketTab').style.display = 'none';
                    document.getElementById('addMemberHiredTab').style.display = 'block';
    
                    // 渲染已雇佣的数字员工列表
                    renderProjectHiredAgents();
                }
            }

    // fireProjectAgent (原行号: 1147-1169)
    fireProjectAgent(agentId) {
                if (!confirm('确定要将该数字员工从项目中移除吗？')) {
                    return;
                }
    
                const project = window.currentProject;
                const index = project.assignedAgents.indexOf(agentId);
                if (index > -1) {
                    project.assignedAgents.splice(index, 1);
                    // 保存到 localStorage
                    saveTeamSpace();
    
                    // 重新渲染
                    renderProjectMembers(project);
                    window.projectManager.renderProjectList('projectListContainer'); // 刷新项目列表，确保回显
    
                    // 刷新主内容区的项目详情页面（关键修复）
                    renderProjectDetail(project);
                    renderProjectHiredAgents(); // 刷新已雇佣Tab
    
                    document.getElementById('projectMemberCount').textContent = (project.members?.length || 0) + (project.assignedAgents?.length || 0);
                }
            }

}

// 导出为全局单例
window.teamCollaboration = new TeamCollaboration();

// 全局函数桥接（保持向后兼容）
window.initTeamSpace = () => window.teamCollaboration?.initTeamSpace();
window.saveTeamSpace = () => window.teamCollaboration?.saveTeamSpace();
window.updateTeamTabVisibility = () => window.settingsManager?.updateTeamTabVisibility();

// ✅ 新增：暴露关闭和显示函数
window.closeAddMember = () => {
    logger.debug('调用 closeAddMember');
    window.teamCollaboration?.closeAddMember();
};
window.showAddMember = () => {
    logger.debug('调用 showAddMember');
    window.teamCollaboration?.showAddMember();
};
window.switchAddMemberTab = (tab) => {
    logger.debug('调用 switchAddMemberTab', tab);
    window.teamCollaboration?.switchAddMemberTab(tab);
};
