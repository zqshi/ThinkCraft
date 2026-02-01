#!/bin/bash

# 批量替换console.log为logger的脚本

echo "🔧 开始批量替换console.log..."
echo ""

# 定义需要处理的文件和对应的模块名
declare -A files=(
    ["frontend/js/modules/report/report-generator.js"]="ReportGenerator"
    ["frontend/js/modules/state/report-button-manager.js"]="ReportButton"
    ["frontend/js/modules/project-manager.js"]="ProjectManager"
    ["frontend/js/modules/team/team-collaboration.js"]="TeamCollaboration"
    ["frontend/js/modules/onboarding/onboarding-manager.js"]="Onboarding"
    ["frontend/js/modules/settings/settings-manager.js"]="Settings"
    ["frontend/js/modules/ui-controller.js"]="UIController"
)

# 处理每个文件
for file in "${!files[@]}"; do
    module_name="${files[$file]}"

    if [ ! -f "$file" ]; then
        echo "⚠️  文件不存在: $file"
        continue
    fi

    echo "📝 处理: $file (模块: $module_name)"

    # 检查文件是否已经有logger定义
    if grep -q "const logger = " "$file"; then
        echo "   ✓ 已有logger定义，跳过添加"
    else
        # 在文件开头添加logger定义（在第一个class或function之前）
        # 找到第一个class或function的行号
        first_code_line=$(grep -n "^class\|^function\|^export class" "$file" | head -1 | cut -d: -f1)

        if [ -n "$first_code_line" ]; then
            # 在该行之前插入logger定义
            sed -i '' "${first_code_line}i\\
// 创建日志实例\\
const logger = window.createLogger ? window.createLogger('$module_name') : console;\\
" "$file"
            echo "   ✓ 已添加logger定义"
        else
            echo "   ⚠️  未找到合适的插入位置"
        fi
    fi

    # 替换console.log为logger.debug
    # 但保留console.error和console.warn
    sed -i '' 's/console\.log(/logger.debug(/g' "$file"

    echo "   ✓ 已替换console.log"
    echo ""
done

echo "✅ 批量替换完成！"
echo ""
echo "📊 统计结果:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 统计剩余的console.log
remaining=$(grep -r 'console\.log' frontend/js/modules/ | grep -v test | grep -v '//' | wc -l)
echo "剩余console.log数量: $remaining"

if [ $remaining -eq 0 ]; then
    echo "🎉 所有console.log已成功替换！"
else
    echo "⚠️  还有 $remaining 处console.log需要手动检查"
    echo ""
    echo "详细位置:"
    grep -rn 'console\.log' frontend/js/modules/ | grep -v test | grep -v '//'
fi
