/**
 * Legacy compatibility layer for old project-space UI hooks.
 * Keeps old global calls working while main ProjectManager evolves.
 */
(function () {
  const compat = {
    createNewProject(pm) {
      const projectName = prompt('请输入项目名称：');
      if (!projectName || !projectName.trim()) return;

      const project = {
        id: 'proj_' + Date.now(),
        name: projectName.trim(),
        icon: '📁',
        description: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [],
        assignedAgents: [],
        linkedIdeas: [],
        ideas: [],
        tasks: [],
        files: [],
        status: 'active'
      };

      if (window.state?.teamSpace) {
        window.state.teamSpace.projects.unshift(project);
        if (typeof window.saveTeamSpace === 'function') {
          window.saveTeamSpace();
        }
      }

      pm.renderProjectList('projectListContainer');
      this.openProjectLegacy(pm, project.id);
    },

    openProjectLegacy(pm, projectId) {
      const project = window.state?.teamSpace?.projects.find(p => p.id === projectId);
      if (!project) return;
      if (window.state) {
        window.state.currentProject = projectId;
      }
      window.currentProject = project;
      pm.renderProjectList('projectListContainer');
      this.renderProjectDetail(pm, project);
    },

    renderProjectDetail(pm, project) {
      const chatContainer = document.getElementById('chatContainer');
      const knowledgePanel = document.getElementById('knowledgePanel');
      const inputContainer = document.getElementById('inputContainer');

      if (chatContainer) chatContainer.style.display = 'flex';
      if (knowledgePanel) knowledgePanel.style.display = 'none';
      if (inputContainer) inputContainer.style.display = 'none';

      const memberCount = project.assignedAgents?.length || 0;
      const ideaCount = project.linkedIdeas?.length || 0;
      const agentMarket =
        typeof window.getAgentMarket === 'function' ? window.getAgentMarket() : [];

      let membersHTML = '';
      if (memberCount === 0) {
        membersHTML = '<div style="color: var(--text-tertiary); font-size: 13px;">尚未分配员工</div>';
      } else {
        membersHTML = (project.assignedAgents || [])
          .map(agentId => {
            const agent = agentMarket.find(a => a.id === agentId);
            if (!agent) return '';
            const iconSvg =
              typeof window.getAgentIconSvg === 'function'
                ? window.getAgentIconSvg(
                    agent.avatar || agent.role || agent.name,
                    28,
                    'member-avatar-icon'
                  )
                : '👤';
            return `
          <div class="project-member-card">
            <div class="member-avatar">${iconSvg}</div>
            <div class="member-info">
              <div class="member-name">${agent.name}</div>
              <div class="member-role">${agent.role}</div>
            </div>
            <button class="icon-btn" onclick="window.projectManager.removeAgentFromProject('${project.id}', '${agent.id}')" title="移除">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        `;
          })
          .join('');
      }

      let ideasHTML = '';
      if (ideaCount === 0) {
        ideasHTML = '<div style="color: var(--text-tertiary); font-size: 13px;">尚未引入创意</div>';
      } else {
        ideasHTML = (project.linkedIdeas || [])
          .map(ideaId => {
            const chat = window.state?.chats?.find(c => c.id === ideaId);
            if (!chat) return '';
            return `
          <div class="project-idea-card" onclick="window.projectManager.loadChatFromProject('${chat.id}')">
            <div class="idea-icon">💡</div>
            <div class="idea-info">
              <div class="idea-title">${chat.title}</div>
              <div class="idea-date">${new Date(chat.createdAt).toLocaleDateString('zh-CN')}</div>
            </div>
          </div>
        `;
          })
          .join('');
      }

      let mainHeader = document.querySelector('.main-header');
      if (!mainHeader) {
        mainHeader = document.createElement('div');
        mainHeader.className = 'main-header';
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
          mainContent.insertBefore(mainHeader, mainContent.firstChild);
        }
      }

      mainHeader.innerHTML = `
      <button class="menu-toggle" onclick="window.toggleSidebar && window.toggleSidebar()">
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
      <div class="main-title">📁 ${project.name}</div>
      <div class="header-actions">
        <button class="icon-btn" onclick="window.showKnowledgeBase && window.showKnowledgeBase('project', '${project.id}')" title="项目知识库">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
        </button>
        <button class="icon-btn" onclick="window.projectManager.editProjectInfo('${project.id}')" title="编辑项目">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <button class="icon-btn" onclick="window.projectManager.deleteProjectLegacy('${project.id}')" title="删除项目" style="color: #ef4444;">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    `;

      if (chatContainer) {
        chatContainer.innerHTML = `
        <div class="project-detail-wrapper">
          <div class="project-overview">
            <div class="overview-card">
              <div class="overview-label">团队成员</div>
              <div class="overview-value">${memberCount}</div>
            </div>
            <div class="overview-card">
              <div class="overview-label">关联创意</div>
              <div class="overview-value">${ideaCount}</div>
            </div>
            <div class="overview-card">
              <div class="overview-label">任务</div>
              <div class="overview-value">${project.tasks?.length || 0}</div>
            </div>
          </div>

          <div class="project-section">
            <div class="project-section-header">
              <h3>👥 团队成员</h3>
              <button class="btn-secondary" onclick="window.currentProjectId='${project.id}'; window.currentProject=window.state.teamSpace.projects.find(p=>p.id==='${project.id}'); window.showAddMember && window.showAddMember()">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                添加成员
              </button>
            </div>
            <div class="project-members-grid">
              ${membersHTML}
            </div>
          </div>

          <div class="project-section">
            <div class="project-section-header">
              <h3>💡 关联创意</h3>
              <button class="btn-secondary" onclick="window.projectManager.linkIdeaToProject('${project.id}')">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                引入创意
              </button>
            </div>
            <div class="project-ideas-grid">
              ${ideasHTML}
            </div>
          </div>
        </div>
      `;
      }
    },

    removeAgentFromProject(pm, projectId, agentId) {
      const project = window.state?.teamSpace?.projects.find(p => p.id === projectId);
      if (!project) return;
      const index = (project.assignedAgents || []).indexOf(agentId);
      if (index > -1) {
        project.assignedAgents.splice(index, 1);
        if (typeof window.saveTeamSpace === 'function') {
          window.saveTeamSpace();
        }
        this.renderProjectDetail(pm, project);
      }
    },

    linkIdeaToProject(pm, projectId) {
      const project = window.state?.teamSpace?.projects.find(p => p.id === projectId);
      if (!project) return;
      const chats = window.state?.chats || [];
      if (chats.length === 0) {
        alert('暂无可关联的创意');
        return;
      }

      const options = chats.map((chat, index) => `${index + 1}. ${chat.title}`).join('\n');
      const input = prompt(`请选择要关联的创意（输入序号）：\n\n${options}`);
      if (!input) return;

      const index = parseInt(input, 10) - 1;
      if (index < 0 || index >= chats.length) {
        alert('无效的序号');
        return;
      }

      const chat = chats[index];
      if (!project.linkedIdeas) {
        project.linkedIdeas = [];
      }
      if (project.linkedIdeas.includes(chat.id)) {
        alert('该创意已经关联到此项目');
        return;
      }

      project.linkedIdeas.push(chat.id);
      if (typeof window.saveTeamSpace === 'function') {
        window.saveTeamSpace();
      }
      this.renderProjectDetail(pm, project);
    },

    editProjectInfo(pm, projectId) {
      const project = window.state?.teamSpace?.projects.find(p => p.id === projectId);
      if (!project) return;

      const newName = prompt('请输入新的项目名称：', project.name);
      if (newName && newName.trim() && newName.trim() !== project.name) {
        project.name = newName.trim();
        project.updatedAt = new Date().toISOString();
        if (typeof window.saveTeamSpace === 'function') {
          window.saveTeamSpace();
        }
        pm.renderProjectList('projectListContainer');
        this.renderProjectDetail(pm, project);
      }
    },

    deleteProjectLegacy(pm, projectId) {
      const project = window.state?.teamSpace?.projects.find(p => p.id === projectId);
      if (!project) return;
      if (!confirm(`确定要删除项目"${project.name}"吗？`)) return;

      const index = window.state.teamSpace.projects.findIndex(p => p.id === projectId);
      if (index > -1) {
        window.state.teamSpace.projects.splice(index, 1);
        if (typeof window.saveTeamSpace === 'function') {
          window.saveTeamSpace();
        }
        pm.renderProjectList('projectListContainer');

        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) {
          chatContainer.innerHTML =
            '<div style="padding: 40px; text-align: center; color: var(--text-tertiary);">请选择一个项目</div>';
        }
      }
    }
  };

  window.projectManagerLegacyCompat = compat;
  window.renderProjectDetail = function (project) {
    return window.projectManagerLegacyCompat?.renderProjectDetail?.(window.projectManager, project);
  };
})();

