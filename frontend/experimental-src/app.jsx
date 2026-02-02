import React, { useEffect, useMemo, useState } from 'react';
import { ChatContainer } from './features/chat/presentation/chat-container.jsx';
import { ReportDashboard } from './features/report/presentation/report-dashboard.jsx';
import { BusinessPlanDashboard } from './features/business-plan/presentation/business-plan-dashboard.jsx';
import { ShareDashboard } from './features/share/presentation/share-dashboard.jsx';
import { AgentsDashboard } from './features/agents/presentation/agents-dashboard.jsx';
import { VisionDashboard } from './features/vision/presentation/vision-dashboard.jsx';
import { ExportDashboard } from './features/pdf-export/presentation/export-dashboard.jsx';

function getRouteFromHash() {
  const hash = window.location.hash || '#/chat';
  const [route, queryString] = hash.replace('#', '').split('?');
  const params = new URLSearchParams(queryString || '');
  return { route, params };
}

function useHashRoute() {
  const [state, setState] = useState(getRouteFromHash());

  useEffect(() => {
    const onChange = () => setState(getRouteFromHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return state;
}

export function ExperimentalApp() {
  const { route, params } = useHashRoute();
  const projectId = params.get('projectId') || 'default-project';

  const routes = useMemo(
    () => ({
      '/chat': {
        label: '聊天',
        element: <ChatContainer projectId={projectId} />
      },
      '/reports': {
        label: '报告',
        element: <ReportDashboard projectId={projectId} />
      },
      '/business-plan': {
        label: '商业计划书',
        element: <BusinessPlanDashboard projectId={projectId} />
      },
      '/share': {
        label: '分享',
        element: <ShareDashboard projectId={projectId} />
      },
      '/agents': {
        label: 'Agents',
        element: <AgentsDashboard projectId={projectId} />
      },
      '/vision': {
        label: '视觉分析',
        element: <VisionDashboard projectId={projectId} />
      },
      '/pdf-export': {
        label: '导出',
        element: <ExportDashboard projectId={projectId} />
      },
      '/workflow': {
        label: '工作流',
        element: (
          <div className="experimental-placeholder">
            <h2>工作流</h2>
            <p>工作流 UI 暂未接入，领域与接口已就绪。</p>
          </div>
        )
      }
    }),
    [projectId]
  );

  const activeRoute = routes[route] ? route : '/chat';

  return (
    <div className="experimental-app">
      <aside className="experimental-sidebar">
        <div className="experimental-logo">ThinkCraft Experimental</div>
        <nav className="experimental-nav">
          {Object.entries(routes).map(([path, meta]) => (
            <a
              key={path}
              className={`experimental-link ${activeRoute === path ? 'active' : ''}`}
              href={`#${path}`}
            >
              {meta.label}
            </a>
          ))}
        </nav>
        <div className="experimental-hint">
          <div>projectId: {projectId}</div>
          <div>通过 #/route?projectId=xxx 切换</div>
        </div>
      </aside>
      <main className="experimental-main">{routes[activeRoute].element}</main>
    </div>
  );
}
