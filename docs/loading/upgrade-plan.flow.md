# 升级方案执行流程（示意）

## 测试阶段执行
1. 用户点击“开始执行”
2. 前端调用 execute-stage（创建任务）
3. 后端写入 Job，状态 queued
4. Worker 拉取任务
5. Worker 执行 npm test
6. 收集日志 + 生成 test-report
7. Job 状态 success
8. 前端轮询刷新，显示日志与结果

## 部署阶段执行
1. 用户点击“开始执行”
2. 创建部署任务 Job
3. Worker 执行 scripts/start-prod.sh
4. 检查 healthcheck
5. 生成 deploy-doc + release-notes
6. 返回预览 URL
7. 前端显示“预览入口”
