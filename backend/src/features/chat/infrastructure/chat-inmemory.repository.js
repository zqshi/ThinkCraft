/**
 * 聊天聚合根内存仓库实现
 * 用于测试和开发环境
 */
import { IChatRepository } from '../domain/chat.repository.js';
import { Chat } from '../domain/chat.aggregate.js';

export class InMemoryChatRepository extends IChatRepository {
    constructor() {
        super();
        this._chats = new Map();
        this._initMockData();
    }

    /**
     * 初始化模拟数据
     */
    _initMockData() {
        const mockChats = [
            {
                id: 'demo_fitness_app',
                title: '健身计划AI助手',
                status: 'active',
                messages: [
                    {
                        id: 'msg_001',
                        content: '你好！我是你的健身计划AI助手，我可以帮你制定个性化的健身计划，包括训练安排、饮食建议等。请告诉我你的健身目标是什么？',
                        type: 'text',
                        status: 'sent',
                        sender: 'assistant',
                        metadata: {},
                        createdAt: new Date(Date.now() - 86400000),
                        updatedAt: new Date(Date.now() - 86400000)
                    },
                    {
                        id: 'msg_002',
                        content: '我想增肌，已经健身半年了',
                        type: 'text',
                        status: 'sent',
                        sender: 'user',
                        metadata: {},
                        createdAt: new Date(Date.now() - 85000000),
                        updatedAt: new Date(Date.now() - 85000000)
                    },
                    {
                        id: 'msg_003',
                        content: '很好！你已经有一定的健身基础了。为了帮你制定更有效的增肌计划，我需要了解一些信息：\n\n1. 你的身高、体重和年龄？\n2. 你目前的训练频率是怎样的？\n3. 你主要训练哪些部位？\n\n基于这些信息，我可以为你制定一个适合的中级增肌计划。',
                        type: 'text',
                        status: 'sent',
                        sender: 'assistant',
                        metadata: {},
                        createdAt: new Date(Date.now() - 84000000),
                        updatedAt: new Date(Date.now() - 84000000)
                    }
                ],
                tags: ['健身', '计划', '助手'],
                isPinned: true,
                createdAt: new Date(Date.now() - 86400000),
                updatedAt: new Date(Date.now() - 84000000)
            },
            {
                id: 'chat_001',
                title: '项目需求分析',
                status: 'active',
                messages: [
                    {
                        id: 'msg_004',
                        content: '我需要为一个电商项目制作需求文档',
                        type: 'text',
                        status: 'sent',
                        sender: 'user',
                        metadata: {},
                        createdAt: new Date(Date.now() - 172800000),
                        updatedAt: new Date(Date.now() - 172800000)
                    },
                    {
                        id: 'msg_005',
                        content: '```javascript\n// 用户认证模块\nconst authModule = {\n  login: async (email, password) => {},\n  register: async (userData) => {},\n  resetPassword: async (email) => {}\n};\n```',
                        type: 'code',
                        status: 'sent',
                        sender: 'assistant',
                        metadata: { language: 'javascript' },
                        createdAt: new Date(Date.now() - 171800000),
                        updatedAt: new Date(Date.now() - 171800000)
                    }
                ],
                tags: ['项目', '文档'],
                isPinned: false,
                createdAt: new Date(Date.now() - 172800000),
                updatedAt: new Date(Date.now() - 171800000)
            },
            {
                id: 'chat_002',
                title: '商业计划书生成',
                status: 'active',
                messages: [
                    {
                        id: 'msg_006',
                        content: '帮我制作一个关于可持续时尚品牌的商业计划书',
                        type: 'text',
                        status: 'sent',
                        sender: 'user',
                        metadata: {},
                        createdAt: new Date(Date.now() - 259200000),
                        updatedAt: new Date(Date.now() - 259200000)
                    }
                ],
                tags: ['商业计划'],
                isPinned: false,
                createdAt: new Date(Date.now() - 259200000),
                updatedAt: new Date(Date.now() - 259200000)
            }
        ];

        mockChats.forEach(chat => {
            const chatAggregate = Chat.fromJSON(chat);
            this._chats.set(chat.id, chatAggregate);
        });
    }

    /**
     * 根据ID查找聊天
     */
    async findById(id) {
        return this._chats.get(id) || null;
    }

    /**
     * 保存聊天
     */
    async save(chat) {
        chat.validate();
        this._chats.set(chat.id, chat);
        return chat;
    }

    /**
     * 查找所有聊天
     */
    async findAll() {
        return Array.from(this._chats.values());
    }

    /**
     * 根据用户ID查找聊天（模拟）
     */
    async findByUserId(userId) {
        // 模拟：返回所有聊天（实际应用中需要根据用户ID筛选）
        return Array.from(this._chats.values());
    }

    /**
     * 查找置顶的聊天
     */
    async findPinned() {
        return Array.from(this._chats.values()).filter(chat => chat.isPinned);
    }

    /**
     * 根据标签查找聊天
     */
    async findByTags(tags) {
        if (!Array.isArray(tags) || tags.length === 0) {
            return [];
        }

        return Array.from(this._chats.values()).filter(chat => {
            return tags.some(tag => chat.tags.includes(tag));
        });
    }

    /**
     * 根据状态查找聊天
     */
    async findByStatus(status) {
        return Array.from(this._chats.values()).filter(chat => chat.status.value === status);
    }

    /**
     * 删除聊天
     */
    async delete(id) {
        const chat = this._chats.get(id);
        if (!chat) {
            return false;
        }

        // 软删除：将状态改为deleted
        const { ChatStatus } = await import('../domain/chat-status.vo.js');
        chat.updateStatus(ChatStatus.DELETED);
        await this.save(chat);

        return true;
    }

    /**
     * 检查聊天是否存在
     */
    async exists(id) {
        return this._chats.has(id);
    }

    /**
     * 统计聊天数量
     */
    async count() {
        return this._chats.size;
    }

    /**
     * 搜索聊天（标题和内容）
     */
    async search(keyword) {
        const results = [];
        const lowerKeyword = keyword.toLowerCase();

        for (const chat of this._chats.values()) {
            // 搜索标题
            if (chat.title.toLowerCase().includes(lowerKeyword)) {
                results.push(chat);
                continue;
            }

            // 搜索内容
            const hasMatchingMessage = chat.messages.some(message =>
                message.content.toLowerCase().includes(lowerKeyword)
            );

            if (hasMatchingMessage) {
                results.push(chat);
            }
        }

        return results;
    }

    /**
     * 清除所有数据（用于测试）
     */
    clear() {
        this._chats.clear();
    }

    /**
     * 导入数据（用于测试）
     */
    async importData(chatsData) {
        this._chats.clear();

        for (const chatData of chatsData) {
            const chat = Chat.fromJSON(chatData);
            await this.save(chat);
        }
    }

    /**
     * 导出数据（用于备份）
     */
    exportData() {
        const data = [];
        for (const chat of this._chats.values()) {
            data.push(chat.toJSON());
        }
        return data;
    }
}

// 导出单例实例
export const inMemoryChatRepository = new InMemoryChatRepository();