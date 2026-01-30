/**
 * 图标系统工具函数
 * 提供SVG图标生成和Agent图标映射功能
 */

/* eslint-disable no-unused-vars */

/**
 * 获取默认图标SVG
 * @param {number} size - 图标大小
 * @param {string} className - CSS类名
 * @returns {string} SVG字符串
 */
function getDefaultIconSvg(size = 48, className = 'empty-icon') {
    return `
        <svg class="${className}" width="${size}" height="${size}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
    `;
}

/**
 * 构建SVG图标
 * @param {Array<string>} paths - SVG路径数组
 * @param {number} size - 图标大小
 * @param {string} className - CSS类名
 * @returns {string} SVG字符串
 */
function buildIconSvg(paths, size, className) {
    return `
        <svg class="${className}" width="${size}" height="${size}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${paths.map(d => `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${d}"/>`).join('')}
        </svg>
    `;
}

/**
 * 解析Agent图标键
 * @param {string} key - Agent角色或技能关键词
 * @returns {string} 图标键名
 */
function resolveAgentIconKey(key) {
    const value = String(key || '');
    if (/市场|📊/.test(value)) return 'chart';
    if (/技术|架构|工程|⚙️|👨‍💻|👩‍💻/.test(value)) return 'cog';
    if (/增长|营销|📈/.test(value)) return 'trend';
    if (/组织|团队|👥/.test(value)) return 'users';
    if (/财务|资金|💰|💵/.test(value)) return 'dollar';
    if (/风险|⚠️/.test(value)) return 'shield';
    if (/产品|创意|💡/.test(value)) return 'lightbulb';
    if (/项目|📋/.test(value)) return 'clipboard';
    if (/文档|📎/.test(value)) return 'document';
    if (/竞争|⚔️/.test(value)) return 'shield';
    if (/综合|🤖/.test(value)) return 'default';
    return 'default';
}

/**
 * 获取Agent图标SVG
 * @param {string} key - Agent角色或技能关键词
 * @param {number} size - 图标大小
 * @param {string} className - CSS类名
 * @returns {string} SVG字符串
 */
function getAgentIconSvg(key, size = 28, className = 'agent-avatar-icon') {
    const iconKey = resolveAgentIconKey(key);
    const icons = {
        default: [
            'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
        ],
        lightbulb: [
            'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
        ],
        chart: [
            'M3 3v18h18',
            'M8 17V9',
            'M12 17V5',
            'M16 17v-7'
        ],
        cog: [
            'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
            'M15 12a3 3 0 11-6 0 3 3 0 016 0z'
        ],
        trend: [
            'M3 17l6-6 4 4 7-7',
            'M14 7h7v7'
        ],
        users: [
            'M16 7a4 4 0 11-8 0 4 4 0 018 0z',
            'M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
        ],
        dollar: [
            'M12 8c-2.761 0-5 1.343-5 3s2.239 3 5 3 5 1.343 5 3-2.239 3-5 3m0-12V6m0 12v2'
        ],
        shield: [
            'M12 3l7 4v5c0 5-3.5 9.5-7 11-3.5-1.5-7-6-7-11V7l7-4z'
        ],
        clipboard: [
            'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
        ],
        document: [
            'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
        ]
    };

    return buildIconSvg(icons[iconKey] || icons.default, size, className);
}
