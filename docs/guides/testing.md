# 测试指南（开发者）

本指南帮助开发者编写与运行测试，配合 `docs/TESTING.md` 使用。

## 快速运行

```bash
cd backend
npm test
```

## 常用命令

- `npm run test:watch`：监听模式
- `npm run test:coverage`：覆盖率报告

## 编写测试

- 单元测试：靠近模块编写 `*.test.js`
- 集成测试：`backend/test/integration/__tests__`
- E2E 测试：`backend/test/e2e/__tests__`

## 注意事项

- API 相关测试应避免依赖外部真实服务
- 需要数据库时优先使用测试库或内存实现

