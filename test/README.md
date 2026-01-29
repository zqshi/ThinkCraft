# 自动化测试说明

本目录用于集中管理跨层级自动化测试（单元、集成、端到端、性能与安全基线）。

## 目录规划

- `unit/`：领域模型、用例、服务的单元测试
- `integration/`：路由 + 仓储 + Redis/MongoDB 的集成测试
- `e2e/`：用户关键路径（登录/注册/对话/报告/导出）
- `security/`：鉴权、限流、输入校验
- `performance/`：关键接口基准（不等同于压测）

## 覆盖率要求

- 总体覆盖率 >= 90%
- 关键路径（认证、对话、报告、导出）必须 >= 95%

## 测试矩阵

详见 `test/TEST_MATRIX.md`。

## 执行

后端单测/集成/E2E/安全/性能基线均使用同一套 Jest 执行：

```bash
cd backend
npm test
```

覆盖率报告：

```bash
cd backend
npm run test:coverage
```
