# 前端开发文档模板

> 技术栈、项目结构、核心组件设计

---

## 模板元信息

**Template**: 前端开发文档模板
**Version**: v1.0
**适用场景**: 开发阶段 - 前端开发
**输出文件命名**: `前端开发文档-{产品名称}-v{YYYYMMDDHHmmss}.md`

---

## 模板结构

```markdown
# 前端开发文档

---

**Template**: 前端开发文档模板
**Version**: v{YYYYMMDDHHmmss}
**Changelog**: {时间} - {修改人} - {修改原因摘要}

---

## 1. 文档信息

### 1.1 文档属性

- **产品名称**: [产品名称]
- **文档版本**: v{YYYYMMDDHHmmss}
- **创建日期**: {YYYY-MM-DD}
- **创建人**: [创建人]
- **审核人**: [审核人]

### 1.2 依赖文档

- **战略设计文档**: [文档路径] - v{YYYYMMDDHHmmss}
- **精炼需求文档-LLM版**: [文档路径] - v{YYYYMMDDHHmmss}

---

## 2. 技术栈

### 2.1 核心技术

| 技术类别 | 技术名称 | 版本 | 用途 |
|---------|---------|------|------|
| 框架 | React/Vue/Angular | x.x.x | 前端框架 |
| 语言 | TypeScript | x.x.x | 类型安全 |
| 构建工具 | Vite/Webpack | x.x.x | 构建打包 |
| 包管理器 | pnpm/yarn/npm | x.x.x | 依赖管理 |

### 2.2 状态管理

- **方案**: [Redux/Zustand/Pinia/Vuex等]
- **版本**: x.x.x
- **选择理由**: [说明为什么选择这个方案]

### 2.3 路由管理

- **方案**: [React Router/Vue Router等]
- **版本**: x.x.x
- **路由模式**: [Hash/History]

### 2.4 UI组件库

- **组件库**: [Ant Design/Element Plus/Material-UI等]
- **版本**: x.x.x
- **定制主题**: [是否定制主题]

### 2.5 样式方案

- **方案**: [CSS Modules/Styled Components/Tailwind CSS/SCSS等]
- **选择理由**: [说明]

### 2.6 HTTP客户端

- **方案**: [Axios/Fetch等]
- **版本**: x.x.x
- **拦截器配置**: [是否配置拦截器]

### 2.7 其他关键库

| 库名称 | 版本 | 用途 |
|--------|------|------|
| dayjs | x.x.x | 日期处理 |
| lodash | x.x.x | 工具函数 |
| react-query | x.x.x | 数据获取 |

---

## 3. 项目结构

### 3.1 目录结构

```
project-root/
├── public/                 # 静态资源
│   ├── favicon.ico
│   └── index.html
├── src/
│   ├── assets/            # 资源文件
│   │   ├── images/
│   │   ├── fonts/
│   │   └── styles/
│   ├── components/        # 通用组件
│   │   ├── Button/
│   │   ├── Input/
│   │   └── Modal/
│   ├── features/          # 功能模块
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   └── dashboard/
│   ├── layouts/           # 布局组件
│   │   ├── MainLayout/
│   │   └── AuthLayout/
│   ├── pages/             # 页面组件
│   │   ├── Home/
│   │   ├── Login/
│   │   └── Dashboard/
│   ├── routes/            # 路由配置
│   │   └── index.ts
│   ├── store/             # 状态管理
│   │   ├── slices/
│   │   └── index.ts
│   ├── services/          # API服务
│   │   ├── api/
│   │   └── http.ts
│   ├── hooks/             # 自定义Hooks
│   │   └── useAuth.ts
│   ├── utils/             # 工具函数
│   │   ├── format.ts
│   │   └── validate.ts
│   ├── types/             # 类型定义
│   │   └── index.ts
│   ├── constants/         # 常量定义
│   │   └── index.ts
│   ├── config/            # 配置文件
│   │   └── index.ts
│   ├── App.tsx            # 根组件
│   └── main.tsx           # 入口文件
├── tests/                 # 测试文件
│   ├── unit/
│   └── e2e/
├── .env.development       # 开发环境变量
├── .env.production        # 生产环境变量
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 3.2 目录说明

| 目录 | 说明 | 命名规范 |
|------|------|---------|
| components/ | 通用可复用组件 | PascalCase |
| features/ | 按功能模块组织的代码 | kebab-case |
| pages/ | 页面级组件 | PascalCase |
| hooks/ | 自定义Hooks | use开头，camelCase |
| services/ | API服务层 | camelCase |
| utils/ | 工具函数 | camelCase |
| types/ | TypeScript类型定义 | PascalCase |

---

## 4. 架构设计

### 4.1 分层架构

```
┌─────────────────────────────────┐
│      展示层 (Presentation)       │
│  - Pages (页面组件)              │
│  - Components (UI组件)           │
│  - Layouts (布局组件)            │
├─────────────────────────────────┤
│      容器层 (Container)          │
│  - Feature Components            │
│  - Custom Hooks                  │
│  - State Management              │
├─────────────────────────────────┤
│      服务层 (Service)            │
│  - API Services                  │
│  - HTTP Client                   │
│  - Data Transformation           │
├─────────────────────────────────┤
│      工具层 (Utility)            │
│  - Utils                         │
│  - Constants                     │
│  - Types                         │
└─────────────────────────────────┘
```

**层级职责**:

- **展示层**: 负责UI渲染和用户交互
- **容器层**: 负责业务逻辑和状态管理
- **服务层**: 负责数据获取和API调用
- **工具层**: 提供通用工具和类型定义

### 4.2 数据流

```
[用户操作] → [组件事件] → [Action/Hook] → [API Service]
                                    ↓
                              [State Update]
                                    ↓
                              [组件重渲染]
```

---

## 5. 核心模块设计

### 5.1 认证模块 (Auth)

#### 功能概述

负责用户登录、注册、登出、权限验证等功能。

#### 目录结构

```
features/auth/
├── components/
│   ├── LoginForm.tsx
│   └── RegisterForm.tsx
├── hooks/
│   ├── useAuth.ts
│   └── usePermission.ts
├── services/
│   └── authService.ts
├── types/
│   └── index.ts
└── index.ts
```

#### 核心组件

**LoginForm**:
- 职责: 登录表单UI
- Props: onSubmit, loading
- State: formData, errors

**RegisterForm**:
- 职责: 注册表单UI
- Props: onSubmit, loading
- State: formData, errors

#### 核心Hooks

**useAuth**:
```typescript
interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
}

function useAuth(): UseAuthReturn;
```

**usePermission**:
```typescript
interface UsePermissionReturn {
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

function usePermission(): UsePermissionReturn;
```

#### API服务

```typescript
class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse>;
  async logout(): Promise<void>;
  async register(data: RegisterData): Promise<AuthResponse>;
  async refreshToken(): Promise<TokenResponse>;
  async getCurrentUser(): Promise<User>;
}
```

#### 状态管理

```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}
```

### 5.2 路由模块 (Routes)

#### 路由配置

```typescript
const routes: RouteConfig[] = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { path: '', element: <Home /> },
      { path: 'dashboard', element: <Dashboard />, auth: true },
      { path: 'profile', element: <Profile />, auth: true },
    ]
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
    ]
  },
  {
    path: '*',
    element: <NotFound />
  }
];
```

#### 路由守卫

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" />;
  }

  return <>{children}</>;
}
```

#### 路由懒加载

```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
```

### 5.3 HTTP客户端模块

#### 配置

```typescript
const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

#### 请求拦截器

```typescript
httpClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```

#### 响应拦截器

```typescript
httpClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // 处理未授权
      handleUnauthorized();
    }
    return Promise.reject(error);
  }
);
```

---

## 6. 组件设计规范

### 6.1 组件分类

**展示组件 (Presentational Components)**:
- 只负责UI渲染
- 通过props接收数据
- 无状态或只有UI状态
- 可复用性高

**容器组件 (Container Components)**:
- 负责业务逻辑
- 管理状态
- 调用API
- 可复用性低

### 6.2 组件模板

```typescript
import React from 'react';
import styles from './Button.module.css';

interface ButtonProps {
  /** 按钮文本 */
  children: React.ReactNode;
  /** 按钮类型 */
  type?: 'primary' | 'secondary' | 'danger';
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 点击事件 */
  onClick?: () => void;
}

/**
 * 按钮组件
 * @example
 * <Button type="primary" onClick={handleClick}>提交</Button>
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  type = 'primary',
  disabled = false,
  loading = false,
  onClick,
}) => {
  return (
    <button
      className={`${styles.button} ${styles[type]}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};
```

### 6.3 组件文件结构

```
Button/
├── Button.tsx           # 组件实现
├── Button.module.css    # 组件样式
├── Button.test.tsx      # 组件测试
├── Button.stories.tsx   # Storybook故事
└── index.ts             # 导出文件
```

---

## 7. 状态管理

### 7.1 状态分类

**本地状态 (Local State)**:
- 使用useState/useReducer
- 仅在单个组件内使用
- 例如: 表单输入、UI状态

**共享状态 (Shared State)**:
- 使用状态管理库
- 多个组件共享
- 例如: 用户信息、主题设置

**服务端状态 (Server State)**:
- 使用React Query/SWR
- 来自API的数据
- 例如: 列表数据、详情数据

### 7.2 状态管理方案

**Redux Toolkit示例**:

```typescript
// store/slices/userSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  currentUser: null,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
    },
    clearUser: (state) => {
      state.currentUser = null;
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
```

**Zustand示例**:

```typescript
// store/userStore.ts
import create from 'zustand';

interface UserStore {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
```

---

## 8. 性能优化

### 8.1 代码分割

**路由级别分割**:
```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

**组件级别分割**:
```typescript
const HeavyComponent = lazy(() => import('./components/HeavyComponent'));
```

### 8.2 组件优化

**React.memo**:
```typescript
export const ExpensiveComponent = React.memo(({ data }) => {
  // 组件实现
});
```

**useMemo**:
```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

**useCallback**:
```typescript
const handleClick = useCallback(() => {
  // 处理逻辑
}, [dependency]);
```

### 8.3 资源优化

**图片优化**:
- 使用WebP格式
- 图片懒加载
- 响应式图片

**代码优化**:
- Tree Shaking
- 代码压缩
- Gzip压缩

**缓存策略**:
- HTTP缓存
- Service Worker
- 本地存储

---

## 9. 样式规范

### 9.1 CSS Modules规范

**命名规范**:
```css
/* Button.module.css */
.button {
  /* 基础样式 */
}

.button--primary {
  /* 主要按钮样式 */
}

.button--disabled {
  /* 禁用状态样式 */
}
```

**使用方式**:
```typescript
import styles from './Button.module.css';

<button className={styles.button}>按钮</button>
```

### 9.2 Tailwind CSS规范

**配置**:
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1890ff',
        secondary: '#52c41a',
      },
    },
  },
};
```

**使用方式**:
```typescript
<button className="bg-primary text-white px-4 py-2 rounded">
  按钮
</button>
```

### 9.3 样式组织

```
styles/
├── variables.css      # CSS变量
├── reset.css          # 样式重置
├── global.css         # 全局样式
└── themes/            # 主题样式
    ├── light.css
    └── dark.css
```

---

## 10. 类型定义

### 10.1 API类型

```typescript
// types/api.ts
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

### 10.2 业务类型

```typescript
// types/user.ts
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  role: UserRole;
  createdAt: string;
}

export enum UserRole {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest',
}
```

### 10.3 组件类型

```typescript
// types/components.ts
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
```

---

## 11. 错误处理

### 11.1 错误边界

```typescript
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

### 11.2 API错误处理

```typescript
async function fetchData<T>(url: string): Promise<T> {
  try {
    const response = await httpClient.get<ApiResponse<T>>(url);
    if (response.code !== 0) {
      throw new ApiError(response.message, response.code);
    }
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      // 处理API错误
      showErrorMessage(error.message);
    } else {
      // 处理网络错误
      showErrorMessage('网络错误，请稍后重试');
    }
    throw error;
  }
}
```

---

## 12. 测试策略

### 12.1 单元测试

**组件测试**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

**Hooks测试**:
```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('increments counter', () => {
    const { result } = renderHook(() => useCounter());
    act(() => {
      result.current.increment();
    });
    expect(result.current.count).toBe(1);
  });
});
```

### 12.2 集成测试

使用Cypress或Playwright进行E2E测试。

### 12.3 测试覆盖率

- 单元测试覆盖率目标: >80%
- 核心业务逻辑覆盖率: >90%

---

## 13. 构建配置

### 13.1 环境变量

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_TITLE=开发环境

# .env.production
VITE_API_BASE_URL=https://api.example.com
VITE_APP_TITLE=生产环境
```

### 13.2 构建优化

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['antd'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
```

---

## 14. 开发规范

### 14.1 命名规范

- **组件**: PascalCase (例如: UserProfile)
- **函数**: camelCase (例如: getUserInfo)
- **常量**: UPPER_SNAKE_CASE (例如: API_BASE_URL)
- **类型**: PascalCase (例如: UserInfo)
- **文件**: kebab-case (例如: user-profile.tsx)

### 14.2 代码注释

```typescript
/**
 * 获取用户信息
 * @param userId - 用户ID
 * @returns 用户信息对象
 * @throws {ApiError} 当用户不存在时抛出错误
 */
async function getUserInfo(userId: string): Promise<User> {
  // 实现
}
```

### 14.3 Git提交规范

```
feat: 添加用户登录功能
fix: 修复登录表单验证问题
docs: 更新README文档
style: 格式化代码
refactor: 重构用户模块
test: 添加登录功能测试
chore: 更新依赖版本
```

---

## 合规自检

- [ ] 技术栈选型合理
- [ ] 项目结构清晰
- [ ] 架构设计完整
- [ ] 核心模块设计详细
- [ ] 组件设计规范明确
- [ ] 状态管理方案清晰
- [ ] 性能优化策略完善
- [ ] 样式规范明确
- [ ] 类型定义完整
- [ ] 错误处理机制完善
- [ ] 测试策略明确
- [ ] 开发规范清晰
- [ ] 包含必要的元信息

---

**文档生成完成，版本号：v{YYYYMMDDHHmmss}**
```

---

## 使用说明

### 何时使用？

- 前端开发开始前
- 需要统一前端技术栈和规范时
- 新成员加入需要了解项目结构时

### 填写要点

1. **技术栈明确**: 列出所有关键技术及版本
2. **结构清晰**: 项目目录结构要清晰易懂
3. **规范统一**: 代码规范、命名规范要统一
4. **可落地**: 设计要可落地，避免过度设计

### 后续流程

1. 基于本文档进行前端开发
2. 定期review和更新文档
3. 新功能开发前参考本文档

---

## 相关模板

- **上一步**: [战略设计文档模板](../strategy-design/strategy-doc.md)
- **下一步**: [测试计划模板](./test-plan.md)
- **参考**: [精炼需求文档-LLM版模板](../demand-design/design-doc-llm.md)
