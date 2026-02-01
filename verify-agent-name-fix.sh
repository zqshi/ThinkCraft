#!/bin/bash

# Agent名称不匹配问题修复验证脚本

echo "=========================================="
echo "Agent名称不匹配问题修复验证"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

check_no_underscore() {
    local file=$1
    local pattern=$2
    local desc=$3

    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${RED}✗${NC} $desc: 仍使用下划线"
        ((FAIL++))
        return 1
    else
        echo -e "${GREEN}✓${NC} $desc: 已改为连字符"
        ((PASS++))
        return 0
    fi
}

check_has_hyphen() {
    local file=$1
    local pattern=$2
    local desc=$3

    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $desc: 使用连字符"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} $desc: 未找到连字符版本"
        ((FAIL++))
        return 1
    fi
}

echo "1. 检查前端章节配置（business-plan-generator.js）"
echo "----------------------------------------"
check_no_underscore "frontend/js/modules/business-plan-generator.js" "id: 'executive_summary'" "商业计划书-执行摘要"
check_no_underscore "frontend/js/modules/business-plan-generator.js" "id: 'market_analysis'" "商业计划书-市场分析"
check_no_underscore "frontend/js/modules/business-plan-generator.js" "id: 'business_model'" "商业计划书-商业模式"
check_no_underscore "frontend/js/modules/business-plan-generator.js" "id: 'project_summary'" "产品立项-项目摘要"
check_no_underscore "frontend/js/modules/business-plan-generator.js" "id: 'problem_insight'" "产品立项-问题洞察"

check_has_hyphen "frontend/js/modules/business-plan-generator.js" "id: 'executive-summary'" "商业计划书-执行摘要（连字符）"
check_has_hyphen "frontend/js/modules/business-plan-generator.js" "id: 'market-analysis'" "商业计划书-市场分析（连字符）"
check_has_hyphen "frontend/js/modules/business-plan-generator.js" "id: 'project-summary'" "产品立项-项目摘要（连字符）"
echo ""

echo "2. 检查AgentProgressManager配置（agent-progress.js）"
echo "----------------------------------------"
check_no_underscore "frontend/js/components/agent-progress.js" "executive_summary:" "执行摘要agent"
check_no_underscore "frontend/js/components/agent-progress.js" "market_analysis:" "市场分析agent"
check_no_underscore "frontend/js/components/agent-progress.js" "project_summary:" "项目摘要agent"

check_has_hyphen "frontend/js/components/agent-progress.js" "'executive-summary':" "执行摘要agent（连字符）"
check_has_hyphen "frontend/js/components/agent-progress.js" "'market-analysis':" "市场分析agent（连字符）"
check_has_hyphen "frontend/js/components/agent-progress.js" "'project-summary':" "项目摘要agent（连字符）"
echo ""

echo "3. 检查后端CHAPTER_AGENTS配置（business-plan-routes.js）"
echo "----------------------------------------"
check_no_underscore "backend/src/features/business-plan/interfaces/business-plan-routes.js" "executive_summary:" "后端-执行摘要agent"
check_no_underscore "backend/src/features/business-plan/interfaces/business-plan-routes.js" "market_analysis:" "后端-市场分析agent"

check_has_hyphen "backend/src/features/business-plan/interfaces/business-plan-routes.js" "'executive-summary':" "后端-执行摘要agent（连字符）"
check_has_hyphen "backend/src/features/business-plan/interfaces/business-plan-routes.js" "'market-analysis':" "后端-市场分析agent（连字符）"
echo ""

echo "4. 检查后端prompt-loader.js"
echo "----------------------------------------"
check_no_underscore "backend/src/utils/prompt-loader.js" "id.replace(/-/g, '_')" "移除下划线转换逻辑"
check_no_underscore "backend/src/utils/prompt-loader.js" "chapter.id.replace(/-/g, '_')" "移除章节ID转换逻辑"
echo ""

echo "5. 检查后端generateSingleChapter函数"
echo "----------------------------------------"
check_no_underscore "backend/src/features/business-plan/interfaces/business-plan-routes.js" "chapterId.replace(/_/g, '-')" "移除章节ID转换逻辑"
echo ""

echo "=========================================="
echo "验证结果汇总"
echo "=========================================="
echo -e "通过: ${GREEN}${PASS}${NC}"
echo -e "失败: ${RED}${FAIL}${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ 所有检查通过！${NC}"
    echo ""
    echo "下一步："
    echo "1. 重启后端服务"
    echo "2. 清除浏览器缓存"
    echo "3. 测试商业计划书生成"
    echo "4. 测试产品立项材料生成"
    exit 0
else
    echo -e "${RED}✗ 发现 ${FAIL} 个问题，请检查！${NC}"
    exit 1
fi
