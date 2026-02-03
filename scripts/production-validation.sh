#!/bin/bash

# 生产环境验证自动化脚本
# 自动执行验证清单中的可自动化测试项

echo "🔍 ThinkCraft 生产环境验证"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# 测试函数
test_item() {
    local name="$1"
    local command="$2"
    local expected="$3"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "  [$TOTAL_TESTS] $name ... "

    if [ -z "$command" ]; then
        echo -e "${YELLOW}SKIP${NC} (需手动测试)"
        SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
        return
    fi

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# 1. 代码质量验证
echo "1️⃣  代码质量验证"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_item "app-boot.js 文件大小 < 15KB" \
    "[ \$(stat -f%z frontend/js/app-boot.js) -lt 15360 ]"

test_item "app-boot.js 行数 < 400行" \
    "[ \$(wc -l < frontend/js/app-boot.js) -lt 400 ]"

test_item "核心模块文件存在" \
    "[ -f frontend/js/modules/chat/message-handler.js ] && [ -f frontend/js/modules/report/report-generator.js ]"

test_item "模块数量 ≥ 15个" \
    "[ \$(find frontend/js/modules -name '*.js' ! -name '*.test.js' | wc -l) -ge 15 ]"

test_item "备份文件已归档" \
    "[ -d backups/2026-01-31-modular-refactor ] && [ -f backups/2026-01-31-modular-refactor/README.md ]"

test_item "懒加载工具已创建" \
    "[ -f frontend/js/utils/module-lazy-loader.js ]"

echo ""

# 2. 测试验证
echo "2️⃣  测试验证"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_item "Jest配置文件存在" \
    "[ -f jest.config.js ]"

test_item "E2E测试文件存在" \
    "[ -f tests/e2e/modular-refactor-validation.test.js ]"

test_item "单元测试文件存在" \
    "[ -f frontend/js/utils/dom.test.js ] && [ -f frontend/js/utils/format.test.js ]"

test_item "运行E2E测试" \
    "npm test -- tests/e2e/modular-refactor-validation.test.js --silent"

echo ""

# 3. 文档完整性验证
echo "3️⃣  文档完整性验证"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_item "README.md 已更新" \
    "grep -q '模块化重构' README.md"

test_item "模块API文档存在" \
    "[ -f docs/modules/MODULE_API.md ]"

test_item "架构决策记录存在" \
    "[ -f docs/architecture/ADR-001-modular-refactor.md ]"

test_item "懒加载实施指南存在" \
    "[ -f docs/LAZY_LOADING_IMPLEMENTATION_GUIDE.md ]"

test_item "性能测试报告存在" \
    "[ -f docs/PERFORMANCE_TEST_ACTUAL_RESULTS.md ]"

test_item "生产验证清单存在" \
    "[ -f docs/PRODUCTION_VALIDATION_CHECKLIST.md ]"

echo ""

# 4. 文件结构验证
echo "4️⃣  文件结构验证"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_item "modules目录存在" \
    "[ -d frontend/js/modules ]"

test_item "utils目录存在" \
    "[ -d frontend/js/utils ]"

test_item "boot目录存在" \
    "[ -d frontend/js/boot ]"

test_item "core目录存在" \
    "[ -d frontend/js/core ]"

test_item "tests目录存在" \
    "[ -d tests ]"

test_item "docs目录存在" \
    "[ -d docs ]"

test_item "scripts目录存在" \
    "[ -d scripts ]"

echo ""

# 5. 配置文件验证
echo "5️⃣  配置文件验证"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_item "package.json 存在" \
    "[ -f package.json ]"

test_item "jest.config.js 存在" \
    "[ -f jest.config.js ]"

test_item "jest.setup.js 存在" \
    "[ -f jest.setup.js ]"

test_item ".gitignore 存在" \
    "[ -f .gitignore ]"

echo ""

# 6. Git状态检查
echo "6️⃣  Git状态检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_item "Git仓库已初始化" \
    "[ -d .git ]"

test_item "当前分支检查（可选）" \
    ""

test_item "未追踪文件检查（可选）" \
    ""

echo ""

# 7. 性能指标验证
echo "7️⃣  性能指标验证"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_item "app-boot.js < 10KB（可选）" \
    ""

test_item "boot/init.js < 10KB（可选）" \
    ""

test_item "工具文件总大小 < 100KB" \
    "[ \$(find frontend/js/utils -name '*.js' ! -name '*.test.js' -exec cat {} \; | wc -c) -lt 102400 ]"

test_item "性能测试脚本可执行" \
    "[ -x scripts/performance-test-simple.sh ]"

echo ""

# 8. 安全性检查
echo "8️⃣  安全性检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_item "没有硬编码的API密钥" \
    "! rg -n \"API_KEY\\s*=\\s*['\\\"]?sk-\" frontend/js >/dev/null 2>&1"

test_item "没有硬编码的密码" \
    "! rg -n \"password\\s*[:=]\\s*['\\\"][^'\\\"]+['\\\"]\" frontend/js >/dev/null 2>&1"

test_item "console.log 检查（可选）" \
    ""

echo ""

# 9. 代码规范检查
echo "9️⃣  代码规范检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_item "没有语法错误（app-boot.js）" \
    "node -c frontend/js/app-boot.js"

test_item "没有语法错误（boot/init.js）" \
    "node -c frontend/js/boot/init.js"

test_item "模块文件命名规范" \
    "! find frontend/js/modules -name '*.js' ! -name '*.test.js' | grep -E '[A-Z]'"

echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 验证结果总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  总测试数: $TOTAL_TESTS"
echo -e "  ${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "  ${RED}失败: $FAILED_TESTS${NC}"
echo -e "  ${YELLOW}跳过: $SKIPPED_TESTS${NC}"
echo ""

# 计算通过率
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
    echo "  通过率: ${PASS_RATE}%"
    echo ""
fi

# 判断是否可以上线
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ 所有自动化测试通过！${NC}"
    echo ""
    echo "下一步:"
    echo "  1. 完成手动功能测试"
    echo "  2. 在浏览器中进行性能测试"
    echo "  3. 完成兼容性测试"
    echo "  4. 准备生产部署"
    exit 0
else
    echo -e "${RED}❌ 有 $FAILED_TESTS 个测试失败${NC}"
    echo ""
    echo "请修复失败的测试项后再继续"
    exit 1
fi
