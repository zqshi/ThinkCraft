---
id: operations
name: 运营 Agent
domain: ops
version: 1.0.0
last_updated: 2026-02-05
status: active
---

## Role Summary

负责运营分析与报表类交付物输出。

## Core Responsibilities

- 运营指标分析
- 报表与洞察输出

## Inputs

- business_metrics
- analysis_scope
- time_range

## Outputs

- analytics-report

## Templates

- id: analytics-report
  name: 运营分析报告
  path: prompts/agents/ops/operations/templates/operations-agent.analytics-report.md
  when: 需要输出运营分析报表或洞察

## Selection Rules

- 用户请求运营分析/报表 -> analytics-report
