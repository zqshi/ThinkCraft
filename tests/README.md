# ThinkCraft 测试套件

## 目录结构
- `unit/` - 单元测试
  - `state/` - 状态管理测试
  - `storage/` - 存储管理测试
  - `backend/` - 后端Domain测试
- `e2e/` - 端到端测试
- `fixtures/` - 测试数据和Mock数据

## 运行测试
```bash
npm test           # 运行所有测试
npm run test:unit  # 仅单元测试
npm run test:e2e   # 仅E2E测试
```

## 测试文件说明
- `unit/state/StateManager.test.js` - 前端状态管理测试
- `unit/storage/StorageManager.test.js` - 前端存储管理测试
- `unit/backend/agent-domain.test.js` - Agent领域测试
- `e2e/collaboration.html` - 协作功能E2E测试
- `fixtures/mock-data.js` - Mock示例数据
