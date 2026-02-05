---
id: ui-design
name: 视觉UI设计 Agent
domain: ui-ux
version: 1.0.0
last_updated: 2026-02-05
status: active
---

## Role Summary

负责UI视觉设计类交付物输出。

## Core Responsibilities

- 视觉风格与布局规范
- 视觉要素与组件描述

## Inputs

- design_brief
- brand_constraints
- layout_requirements

## Outputs

- design-doc-traditional

## Templates

- id: design-doc-traditional
  name: 传统设计文档
  path: prompts/agents/ui-ux/ui-ux-designer/templates/ui-ux-designer-agent.design-doc-traditional.md
  when: 需要输出UI视觉设计文档

## Selection Rules

- 用户请求UI视觉设计文档 -> design-doc-traditional
