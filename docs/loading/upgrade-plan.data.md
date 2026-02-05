# 升级方案数据结构（草案）

## Job 任务模型
```json
{
  "id": "job_123",
  "projectId": "project_...",
  "stageId": "testing",
  "status": "queued | running | success | failed | cancelled",
  "createdAt": "2026-02-05T10:00:00Z",
  "updatedAt": "2026-02-05T10:10:00Z",
  "progress": 0,
  "logs": ["..."]
}
```

## Artifact 扩展字段
```json
{
  "id": "artifact_...",
  "type": "test-report",
  "content": "...",
  "source": "execution",
  "createdAt": "...",
  "meta": {
    "taskId": "job_123",
    "durationMs": 120000,
    "exitCode": 0
  }
}
```

## Deploy 元数据
```json
{
  "projectId": "project_...",
  "url": "https://preview.example.com/project_123",
  "status": "ready",
  "logs": ["..."]
}
```
