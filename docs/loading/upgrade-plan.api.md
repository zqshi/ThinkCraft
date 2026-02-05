# 升级方案 API 设计（草案）

## 1. 创建任务
POST `/api/workflow/:projectId/execute-stage`

Request
```json
{
  "stageId": "testing",
  "context": {
    "CONVERSATION": "..."
  },
  "selectedArtifactTypes": ["test-report", "bug-list"]
}
```

Response
```json
{
  "code": 0,
  "data": {
    "taskId": "job_123",
    "status": "queued"
  }
}
```

## 2. 查询任务状态
GET `/api/workflow/tasks/:taskId`

Response
```json
{
  "code": 0,
  "data": {
    "taskId": "job_123",
    "status": "running",
    "progress": 45,
    "logs": ["..."]
  }
}
```

## 3. 获取任务日志
GET `/api/workflow/tasks/:taskId/logs`

Response
```json
{
  "code": 0,
  "data": {
    "logs": ["..."]
  }
}
```

## 4. 取消任务
POST `/api/workflow/tasks/:taskId/cancel`

Response
```json
{
  "code": 0,
  "data": {
    "taskId": "job_123",
    "status": "cancelled"
  }
}
```

## 5. 部署产物访问
GET `/api/workflow/:projectId/deploy-url`

Response
```json
{
  "code": 0,
  "data": {
    "url": "https://preview.example.com/project_123"
  }
}
```
