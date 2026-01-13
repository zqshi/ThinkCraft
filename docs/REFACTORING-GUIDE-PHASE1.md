# ThinkCraft 重构实施指南 - 阶段1：基础设施层拆分

## 目标

解决项目中最大的两个文件：
- `storage-manager.js` (1021行) → 拆分为 7个独立Repository
- `state-manager.js` (965行) → 拆分为 7个独立State

## 一、Storage Manager 重构

### 1.1 当前架构问题

```javascript
// 当前：frontend/js/core/storage-manager.js (1021行)
class StorageManager {
  // 管理6个对象存储：chats, reports, demos, settings, inspirations, knowledge
  // 包含66个方法，职责过多
  async saveChat(chat) { ... }
  async getChat(id) { ... }
  async getAllChats() { ... }
  async saveReport(report) { ... }
  async getReport(id) { ... }
  // ... 还有60个方法
}
```

**问题**：
1. 单个文件过大，难以维护
2. 修改任何一个存储都可能影响其他存储
3. 难以进行单元测试
4. 违反单一职责原则

### 1.2 目标架构

```
frontend/js/infrastructure/storage/
├── core/
│   ├── IndexedDBClient.js        # IndexedDB基础封装 (~150行)
│   └── BaseRepository.js         # Repository基类 (~100行)
├── repositories/
│   ├── ChatRepository.js         # 聊天存储 (~120行)
│   ├── ReportRepository.js       # 报告存储 (~100行)
│   ├── DemoRepository.js         # Demo存储 (~100行)
│   ├── InspirationRepository.js  # 灵感存储 (~150行)
│   ├── KnowledgeRepository.js    # 知识库存储 (~150行)
│   └── SettingsRepository.js     # 设置存储 (~80行)
├── StorageManager.js             # Facade门面 (~50行)
└── index.js                      # 统一导出
```

### 1.3 实施步骤

#### Step 1: 创建目录结构

```bash
mkdir -p frontend/js/infrastructure/storage/core
mkdir -p frontend/js/infrastructure/storage/repositories
```

#### Step 2: 创建 IndexedDBClient 基础类

**文件**: `frontend/js/infrastructure/storage/core/IndexedDBClient.js`

```javascript
/**
 * IndexedDB 基础客户端
 * 提供数据库连接和基本操作
 */
export class IndexedDBClient {
  constructor(dbName = 'ThinkCraft', version = 4) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.ready = false;
  }

  /**
   * 初始化数据库连接
   */
  async init(storeDefinitions) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('[IndexedDBClient] 数据库打开失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.ready = true;
        console.log(`[IndexedDBClient] 数据库 ${this.dbName} 已连接`);
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 根据定义创建对象存储
        storeDefinitions.forEach(({ name, keyPath, indexes }) => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath });

            // 创建索引
            if (indexes) {
              indexes.forEach(({ name: indexName, keyPath: indexKeyPath, options }) => {
                store.createIndex(indexName, indexKeyPath, options || {});
              });
            }

            console.log(`[IndexedDBClient] 创建对象存储: ${name}`);
          }
        });
      };
    });
  }

  /**
   * 确保数据库已就绪
   */
  async ensureReady() {
    if (this.ready) return;
    throw new Error('Database not initialized. Call init() first.');
  }

  /**
   * 获取事务
   */
  getTransaction(storeName, mode = 'readonly') {
    return this.db.transaction([storeName], mode);
  }

  /**
   * 获取对象存储
   */
  getStore(storeName, mode = 'readonly') {
    const transaction = this.getTransaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.ready = false;
      console.log('[IndexedDBClient] 数据库已关闭');
    }
  }
}

// 导出单例实例
export const dbClient = new IndexedDBClient();
```

#### Step 3: 创建 BaseRepository 抽象类

**文件**: `frontend/js/infrastructure/storage/core/BaseRepository.js`

```javascript
/**
 * Repository 基类
 * 提供通用的 CRUD 操作
 */
export class BaseRepository {
  constructor(dbClient, storeName) {
    this.dbClient = dbClient;
    this.storeName = storeName;
  }

  /**
   * 添加单个项
   */
  async add(item) {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.dbClient.getStore(this.storeName, 'readwrite');
      const request = store.add(item);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 保存（添加或更新）
   */
  async save(item) {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.dbClient.getStore(this.storeName, 'readwrite');
      const request = store.put(item);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 根据ID获取单个项
   */
  async getById(id) {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.dbClient.getStore(this.storeName, 'readonly');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取所有项
   */
  async getAll() {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.dbClient.getStore(this.storeName, 'readonly');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 根据索引查询
   */
  async getByIndex(indexName, value) {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.dbClient.getStore(this.storeName, 'readonly');
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除单个项
   */
  async delete(id) {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.dbClient.getStore(this.storeName, 'readwrite');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 清空存储
   */
  async clear() {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.dbClient.getStore(this.storeName, 'readwrite');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 统计数量
   */
  async count() {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.dbClient.getStore(this.storeName, 'readonly');
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
```

#### Step 4: 创建具体的 Repository 类

**文件**: `frontend/js/infrastructure/storage/repositories/ChatRepository.js`

```javascript
import { BaseRepository } from '../core/BaseRepository.js';

/**
 * Chat Repository
 * 管理对话数据的持久化
 */
export class ChatRepository extends BaseRepository {
  constructor(dbClient) {
    super(dbClient, 'chats');
  }

  /**
   * 保存对话
   */
  async saveChat(chat) {
    const chatData = {
      ...chat,
      updatedAt: Date.now()
    };
    return this.save(chatData);
  }

  /**
   * 获取对话
   */
  async getChat(id) {
    return this.getById(id);
  }

  /**
   * 获取所有对话（按创建时间倒序）
   */
  async getAllChats() {
    const chats = await this.getAll();
    return chats.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 删除对话
   */
  async deleteChat(id) {
    return this.delete(id);
  }

  /**
   * 按创建时间范围查询对话
   */
  async getChatsByTimeRange(startTime, endTime) {
    const allChats = await this.getAllChats();
    return allChats.filter(chat =>
      chat.createdAt >= startTime && chat.createdAt <= endTime
    );
  }

  /**
   * 搜索对话（按标题或消息内容）
   */
  async searchChats(keyword) {
    const allChats = await this.getAllChats();
    const lowerKeyword = keyword.toLowerCase();

    return allChats.filter(chat => {
      // 搜索标题
      if (chat.title && chat.title.toLowerCase().includes(lowerKeyword)) {
        return true;
      }

      // 搜索消息内容
      if (chat.messages && chat.messages.length > 0) {
        return chat.messages.some(msg =>
          msg.content && msg.content.toLowerCase().includes(lowerKeyword)
        );
      }

      return false;
    });
  }

  /**
   * 清空所有对话
   */
  async clearAllChats() {
    return this.clear();
  }

  /**
   * 统计对话数量
   */
  async countChats() {
    return this.count();
  }
}
```

**文件**: `frontend/js/infrastructure/storage/repositories/ReportRepository.js`

```javascript
import { BaseRepository } from '../core/BaseRepository.js';

/**
 * Report Repository
 * 管理报告数据的持久化
 */
export class ReportRepository extends BaseRepository {
  constructor(dbClient) {
    super(dbClient, 'reports');
  }

  /**
   * 保存报告
   */
  async saveReport(report) {
    return this.save(report);
  }

  /**
   * 获取报告
   */
  async getReport(id) {
    return this.getById(id);
  }

  /**
   * 获取所有报告（按时间倒序）
   */
  async getAllReports() {
    const reports = await this.getAll();
    return reports.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 根据类型获取报告
   */
  async getReportsByType(type) {
    return this.getByIndex('type', type);
  }

  /**
   * 删除报告
   */
  async deleteReport(id) {
    return this.delete(id);
  }

  /**
   * 清空所有报告
   */
  async clearAllReports() {
    return this.clear();
  }

  /**
   * 统计报告数量
   */
  async countReports() {
    return this.count();
  }

  /**
   * 按类型统计报告
   */
  async countByType() {
    const reports = await this.getAll();
    const stats = {};

    reports.forEach(report => {
      const type = report.type || 'unknown';
      stats[type] = (stats[type] || 0) + 1;
    });

    return stats;
  }
}
```

**文件**: `frontend/js/infrastructure/storage/repositories/InspirationRepository.js`

```javascript
import { BaseRepository } from '../core/BaseRepository.js';

/**
 * Inspiration Repository
 * 管理灵感数据的持久化
 */
export class InspirationRepository extends BaseRepository {
  constructor(dbClient) {
    super(dbClient, 'inspirations');
  }

  /**
   * 保存灵感
   */
  async saveInspiration(inspiration) {
    return this.save(inspiration);
  }

  /**
   * 获取灵感
   */
  async getInspiration(id) {
    return this.getById(id);
  }

  /**
   * 获取所有灵感（按创建时间倒序）
   */
  async getAllInspirations() {
    const inspirations = await this.getAll();
    return inspirations.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 根据状态获取灵感
   */
  async getInspirationsByStatus(status) {
    return this.getByIndex('status', status);
  }

  /**
   * 根据类型获取灵感
   */
  async getInspirationsByType(type) {
    return this.getByIndex('type', type);
  }

  /**
   * 根据分类获取灵感
   */
  async getInspirationsByCategory(category) {
    return this.getByIndex('category', category);
  }

  /**
   * 根据关联的ChatId获取灵感
   */
  async getInspirationsByChatId(chatId) {
    return this.getByIndex('linkedChatId', chatId);
  }

  /**
   * 删除灵感
   */
  async deleteInspiration(id) {
    return this.delete(id);
  }

  /**
   * 批量更新灵感状态
   */
  async batchUpdateStatus(ids, newStatus) {
    const promises = ids.map(async (id) => {
      const inspiration = await this.getById(id);
      if (inspiration) {
        inspiration.status = newStatus;
        inspiration.updatedAt = Date.now();
        return this.save(inspiration);
      }
    });

    return Promise.all(promises);
  }

  /**
   * 统计各状态的灵感数量
   */
  async getStatsByStatus() {
    const inspirations = await this.getAll();
    const stats = {
      unprocessed: 0,
      processing: 0,
      completed: 0
    };

    inspirations.forEach(item => {
      if (stats.hasOwnProperty(item.status)) {
        stats[item.status]++;
      }
    });

    return stats;
  }

  /**
   * 清空所有灵感
   */
  async clearAllInspirations() {
    return this.clear();
  }
}
```

**文件**: `frontend/js/infrastructure/storage/repositories/KnowledgeRepository.js`

```javascript
import { BaseRepository } from '../core/BaseRepository.js';

/**
 * Knowledge Repository
 * 管理知识库数据的持久化
 */
export class KnowledgeRepository extends BaseRepository {
  constructor(dbClient) {
    super(dbClient, 'knowledge');
  }

  /**
   * 保存知识条目
   */
  async saveKnowledge(knowledge) {
    return this.save(knowledge);
  }

  /**
   * 获取知识条目
   */
  async getKnowledge(id) {
    return this.getById(id);
  }

  /**
   * 获取所有知识条目（按创建时间倒序）
   */
  async getAllKnowledge() {
    const items = await this.getAll();
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 根据类型获取知识
   */
  async getKnowledgeByType(type) {
    return this.getByIndex('type', type);
  }

  /**
   * 根据范围获取知识（project/global）
   */
  async getKnowledgeByScope(scope) {
    return this.getByIndex('scope', scope);
  }

  /**
   * 根据项目ID获取知识
   */
  async getKnowledgeByProject(projectId) {
    return this.getByIndex('projectId', projectId);
  }

  /**
   * 根据标签获取知识（多值索引）
   */
  async getKnowledgeByTag(tag) {
    return this.getByIndex('tags', tag);
  }

  /**
   * 删除知识条目
   */
  async deleteKnowledge(id) {
    return this.delete(id);
  }

  /**
   * 搜索知识（按标题和内容）
   */
  async searchKnowledge(keyword) {
    const allKnowledge = await this.getAllKnowledge();
    const lowerKeyword = keyword.toLowerCase();

    return allKnowledge.filter(item => {
      return (
        (item.title && item.title.toLowerCase().includes(lowerKeyword)) ||
        (item.content && item.content.toLowerCase().includes(lowerKeyword)) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)))
      );
    });
  }

  /**
   * 统计各维度的知识数量
   */
  async getStats() {
    const items = await this.getAll();

    const stats = {
      total: items.length,
      byProject: {},
      byType: {},
      byTag: {}
    };

    items.forEach(item => {
      // 按项目统计
      if (item.projectId) {
        stats.byProject[item.projectId] = (stats.byProject[item.projectId] || 0) + 1;
      }

      // 按类型统计
      if (item.type) {
        stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
      }

      // 按标签统计
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
        });
      }
    });

    return stats;
  }

  /**
   * 清空所有知识
   */
  async clearAllKnowledge() {
    return this.clear();
  }
}
```

**文件**: `frontend/js/infrastructure/storage/repositories/DemoRepository.js` 和 `SettingsRepository.js` (类似结构，省略)

#### Step 5: 创建 StorageManager Facade

**文件**: `frontend/js/infrastructure/storage/StorageManager.js`

```javascript
import { dbClient } from './core/IndexedDBClient.js';
import { ChatRepository } from './repositories/ChatRepository.js';
import { ReportRepository } from './repositories/ReportRepository.js';
import { DemoRepository } from './repositories/DemoRepository.js';
import { InspirationRepository } from './repositories/InspirationRepository.js';
import { KnowledgeRepository } from './repositories/KnowledgeRepository.js';
import { SettingsRepository } from './repositories/SettingsRepository.js';

/**
 * StorageManager - Facade模式
 * 保持向后兼容的接口，内部委托给各个Repository
 */
export class StorageManager {
  constructor() {
    this.db = null;
    this.dbName = 'ThinkCraft';
    this.dbVersion = 4;
    this.ready = false;

    // 初始化各个Repository
    this.chatRepo = new ChatRepository(dbClient);
    this.reportRepo = new ReportRepository(dbClient);
    this.demoRepo = new DemoRepository(dbClient);
    this.inspirationRepo = new InspirationRepository(dbClient);
    this.knowledgeRepo = new KnowledgeRepository(dbClient);
    this.settingsRepo = new SettingsRepository(dbClient);
  }

  /**
   * 初始化数据库
   */
  async init() {
    const storeDefinitions = [
      {
        name: 'chats',
        keyPath: 'id',
        indexes: [
          { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } }
        ]
      },
      {
        name: 'reports',
        keyPath: 'id',
        indexes: [
          { name: 'type', keyPath: 'type', options: { unique: false } },
          { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } }
        ]
      },
      {
        name: 'demos',
        keyPath: 'id',
        indexes: [
          { name: 'type', keyPath: 'type', options: { unique: false } },
          { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } }
        ]
      },
      {
        name: 'settings',
        keyPath: 'key'
      },
      {
        name: 'inspirations',
        keyPath: 'id',
        indexes: [
          { name: 'status', keyPath: 'status', options: { unique: false } },
          { name: 'type', keyPath: 'type', options: { unique: false } },
          { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
          { name: 'category', keyPath: 'category', options: { unique: false } },
          { name: 'linkedChatId', keyPath: 'linkedChatId', options: { unique: false } }
        ]
      },
      {
        name: 'knowledge',
        keyPath: 'id',
        indexes: [
          { name: 'type', keyPath: 'type', options: { unique: false } },
          { name: 'scope', keyPath: 'scope', options: { unique: false } },
          { name: 'projectId', keyPath: 'projectId', options: { unique: false } },
          { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
          { name: 'tags', keyPath: 'tags', options: { unique: false, multiEntry: true } }
        ]
      }
    ];

    await dbClient.init(storeDefinitions);
    this.db = dbClient.db;
    this.ready = true;
  }

  async ensureReady() {
    if (this.ready) return;
    await this.init();
  }

  // ========== Chat 方法（委托给 ChatRepository） ==========
  async saveChat(chat) {
    return this.chatRepo.saveChat(chat);
  }

  async getChat(id) {
    return this.chatRepo.getChat(id);
  }

  async getAllChats() {
    return this.chatRepo.getAllChats();
  }

  async deleteChat(id) {
    return this.chatRepo.deleteChat(id);
  }

  async clearAllChats() {
    return this.chatRepo.clearAllChats();
  }

  // ========== Report 方法（委托给 ReportRepository） ==========
  async saveReport(report) {
    return this.reportRepo.saveReport(report);
  }

  async getReport(id) {
    return this.reportRepo.getReport(id);
  }

  async getAllReports() {
    return this.reportRepo.getAllReports();
  }

  async deleteReport(id) {
    return this.reportRepo.deleteReport(id);
  }

  // ========== Inspiration 方法（委托） ==========
  async saveInspiration(inspiration) {
    return this.inspirationRepo.saveInspiration(inspiration);
  }

  async getInspiration(id) {
    return this.inspirationRepo.getInspiration(id);
  }

  async getAllInspirations() {
    return this.inspirationRepo.getAllInspirations();
  }

  async getInspirationsByStatus(status) {
    return this.inspirationRepo.getInspirationsByStatus(status);
  }

  // ========== Knowledge 方法（委托） ==========
  async saveKnowledge(knowledge) {
    return this.knowledgeRepo.saveKnowledge(knowledge);
  }

  async getKnowledge(id) {
    return this.knowledgeRepo.getKnowledge(id);
  }

  async getAllKnowledge() {
    return this.knowledgeRepo.getAllKnowledge();
  }

  async searchKnowledge(keyword) {
    return this.knowledgeRepo.searchKnowledge(keyword);
  }

  // ... 其他委托方法
}

// 导出单例
export const storageManager = new StorageManager();
```

#### Step 6: 创建统一导出文件

**文件**: `frontend/js/infrastructure/storage/index.js`

```javascript
export { StorageManager, storageManager } from './StorageManager.js';
export { ChatRepository } from './repositories/ChatRepository.js';
export { ReportRepository } from './repositories/ReportRepository.js';
export { DemoRepository } from './repositories/DemoRepository.js';
export { InspirationRepository } from './repositories/InspirationRepository.js';
export { KnowledgeRepository } from './repositories/KnowledgeRepository.js';
export { SettingsRepository } from './repositories/SettingsRepository.js';
export { dbClient } from './core/IndexedDBClient.js';
```

#### Step 7: 更新现有代码的导入

**之前**：
```javascript
import { storageManager } from './core/storage-manager.js';
```

**之后**：
```javascript
import { storageManager } from './infrastructure/storage/index.js';
```

所有使用 `storageManager` 的代码无需修改，保持100%向后兼容。

#### Step 8: 逐步弃用旧文件

1. 将 `core/storage-manager.js` 重命名为 `core/storage-manager.js.deprecated`
2. 创建 `core/storage-manager.js` 作为过渡文件：

```javascript
// 过渡文件：重新导出新的实现
console.warn('[Deprecated] core/storage-manager.js is deprecated. Use infrastructure/storage/index.js instead.');
export { storageManager } from '../infrastructure/storage/index.js';
```

3. 在后续版本中完全删除旧文件

---

## 二、State Manager 重构

### 2.1 当前架构问题

```javascript
// 当前：frontend/js/core/state-manager.js (965行)
class StateManager {
  constructor() {
    this.state = {
      // 对话状态
      currentChat: null,
      messages: [],
      // 生成状态
      generation: { ... },
      // Demo状态
      demo: { ... },
      // 灵感状态
      inspiration: { ... },
      // 知识库状态
      knowledge: { ... },
      // 设置
      settings: { ... }
    };
    this.observers = [];
  }
  // 24个方法管理所有状态
}
```

### 2.2 目标架构

```
frontend/js/infrastructure/state/
├── core/
│   ├── StateStore.js          # 状态存储基类 (~100行)
│   └── EventBus.js            # 事件总线 (~80行)
├── stores/
│   ├── ConversationState.js   # 对话状态 (~120行)
│   ├── GenerationState.js     # 生成状态 (~150行)
│   ├── DemoState.js           # Demo状态 (~120行)
│   ├── InspirationState.js    # 灵感状态 (~120行)
│   ├── KnowledgeState.js      # 知识库状态 (~120行)
│   └── SettingsState.js       # 设置状态 (~80行)
├── StateManager.js            # Facade门面 (~80行)
└── index.js                   # 统一导出
```

### 2.3 实施步骤

#### Step 1: 创建 StateStore 基类

**文件**: `frontend/js/infrastructure/state/core/StateStore.js`

```javascript
/**
 * StateStore 基类
 * 提供观察者模式的状态管理
 */
export class StateStore {
  constructor(initialState = {}) {
    this._state = initialState;
    this._observers = new Map(); // key: observerId, value: callback
    this._nextObserverId = 0;
  }

  /**
   * 获取状态（只读）
   */
  getState() {
    // 返回深拷贝，防止外部修改
    return JSON.parse(JSON.stringify(this._state));
  }

  /**
   * 更新状态
   */
  setState(updates) {
    const oldState = this.getState();

    // 合并更新
    this._state = {
      ...this._state,
      ...updates
    };

    const newState = this.getState();

    // 通知所有观察者
    this._notifyObservers(newState, oldState);
  }

  /**
   * 部分更新（深度合并）
   */
  updateState(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();

    let target = this._state;
    for (const key of keys) {
      if (!target[key]) target[key] = {};
      target = target[key];
    }

    target[lastKey] = value;

    const newState = this.getState();
    this._notifyObservers(newState, this._state);
  }

  /**
   * 订阅状态变化
   */
  subscribe(callback) {
    const observerId = this._nextObserverId++;
    this._observers.set(observerId, callback);

    // 返回取消订阅函数
    return () => {
      this._observers.delete(observerId);
    };
  }

  /**
   * 通知所有观察者
   */
  _notifyObservers(newState, oldState) {
    this._observers.forEach(callback => {
      try {
        callback(newState, oldState);
      } catch (error) {
        console.error('[StateStore] Observer error:', error);
      }
    });
  }

  /**
   * 重置状态
   */
  reset(initialState) {
    this._state = initialState || {};
    this._notifyObservers(this.getState(), {});
  }
}
```

#### Step 2: 创建具体的 State 类

**文件**: `frontend/js/infrastructure/state/stores/ConversationState.js`

```javascript
import { StateStore } from '../core/StateStore.js';

/**
 * 对话状态管理
 */
export class ConversationState extends StateStore {
  constructor() {
    super({
      currentChat: null,
      chats: [],
      messages: [],
      userData: {},
      conversationStep: 0,
      isTyping: false,
      isLoading: false,
      analysisCompleted: false
    });
  }

  // ========== Getters ==========

  getCurrentChat() {
    return this._state.currentChat;
  }

  getMessages() {
    return [...this._state.messages];
  }

  getConversationStep() {
    return this._state.conversationStep;
  }

  isTyping() {
    return this._state.isTyping;
  }

  isLoading() {
    return this._state.isLoading;
  }

  // ========== Setters ==========

  setCurrentChat(chat) {
    this.setState({ currentChat: chat });
  }

  setMessages(messages) {
    this.setState({ messages: [...messages] });
  }

  addMessage(message) {
    this.setState({
      messages: [...this._state.messages, message]
    });
  }

  updateMessage(index, updates) {
    const messages = [...this._state.messages];
    messages[index] = { ...messages[index], ...updates };
    this.setState({ messages });
  }

  setConversationStep(step) {
    this.setState({ conversationStep: step });
  }

  incrementConversationStep() {
    this.setState({
      conversationStep: this._state.conversationStep + 1
    });
  }

  setTyping(isTyping) {
    this.setState({ isTyping });
  }

  setLoading(isLoading) {
    this.setState({ isLoading });
  }

  setAnalysisCompleted(completed) {
    this.setState({ analysisCompleted: completed });
  }

  // ========== 复合操作 ==========

  startNewChat(chatId) {
    this.setState({
      currentChat: chatId,
      messages: [],
      conversationStep: 0,
      userData: {},
      analysisCompleted: false
    });
  }

  clearConversation() {
    this.setState({
      currentChat: null,
      messages: [],
      conversationStep: 0,
      userData: {},
      isTyping: false,
      isLoading: false,
      analysisCompleted: false
    });
  }
}

// 导出单例
export const conversationState = new ConversationState();
```

**文件**: `frontend/js/infrastructure/state/stores/GenerationState.js`

```javascript
import { StateStore } from '../core/StateStore.js';

/**
 * 生成流程状态管理
 */
export class GenerationState extends StateStore {
  constructor() {
    super({
      type: null, // 'business-plan' | 'proposal' | 'demo' | null
      status: 'idle', // 'idle' | 'selecting' | 'generating' | 'completed' | 'error'
      selectedChapters: [],
      progress: {
        current: 0,
        total: 0,
        currentAgent: null,
        percentage: 0
      },
      results: {}, // { chapterId: { content, agent, timestamp } }
      error: null,
      startTime: null,
      endTime: null
    });
  }

  // ========== Getters ==========

  getType() {
    return this._state.type;
  }

  getStatus() {
    return this._state.status;
  }

  getProgress() {
    return { ...this._state.progress };
  }

  getResults() {
    return { ...this._state.results };
  }

  isGenerating() {
    return this._state.status === 'generating';
  }

  // ========== Setters ==========

  setType(type) {
    this.setState({ type });
  }

  setStatus(status) {
    this.setState({ status });
  }

  setSelectedChapters(chapters) {
    this.setState({ selectedChapters: [...chapters] });
  }

  updateProgress(current, total, currentAgent = null) {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    this.setState({
      progress: {
        current,
        total,
        currentAgent,
        percentage
      }
    });
  }

  addResult(chapterId, result) {
    this.setState({
      results: {
        ...this._state.results,
        [chapterId]: result
      }
    });
  }

  setError(error) {
    this.setState({
      error,
      status: 'error'
    });
  }

  // ========== 生成流程控制 ==========

  startGeneration(type, chapters) {
    this.setState({
      type,
      status: 'generating',
      selectedChapters: [...chapters],
      progress: {
        current: 0,
        total: chapters.length,
        currentAgent: null,
        percentage: 0
      },
      results: {},
      error: null,
      startTime: Date.now(),
      endTime: null
    });
  }

  completeGeneration() {
    this.setState({
      status: 'completed',
      endTime: Date.now()
    });
  }

  resetGeneration() {
    this.setState({
      type: null,
      status: 'idle',
      selectedChapters: [],
      progress: {
        current: 0,
        total: 0,
        currentAgent: null,
        percentage: 0
      },
      results: {},
      error: null,
      startTime: null,
      endTime: null
    });
  }

  // ========== 辅助方法 ==========

  getDuration() {
    if (!this._state.startTime) return 0;
    const endTime = this._state.endTime || Date.now();
    return endTime - this._state.startTime;
  }

  getCompletedChapters() {
    return Object.keys(this._state.results).length;
  }
}

// 导出单例
export const generationState = new GenerationState();
```

**其他State文件**（DemoState, InspirationState, KnowledgeState, SettingsState）类似结构

#### Step 3: 创建 EventBus（可选，用于跨域通信）

**文件**: `frontend/js/infrastructure/state/core/EventBus.js`

```javascript
/**
 * 事件总线
 * 用于不同State之间的通信
 */
export class EventBus {
  constructor() {
    this._events = new Map();
  }

  /**
   * 订阅事件
   */
  on(eventName, callback) {
    if (!this._events.has(eventName)) {
      this._events.set(eventName, []);
    }

    this._events.get(eventName).push(callback);

    // 返回取消订阅函数
    return () => {
      const callbacks = this._events.get(eventName);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * 发布事件
   */
  emit(eventName, data) {
    const callbacks = this._events.get(eventName);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus] Error in ${eventName} handler:`, error);
        }
      });
    }
  }

  /**
   * 一次性订阅
   */
  once(eventName, callback) {
    const unsubscribe = this.on(eventName, (data) => {
      callback(data);
      unsubscribe();
    });
    return unsubscribe;
  }

  /**
   * 清空所有监听器
   */
  clear() {
    this._events.clear();
  }
}

// 导出单例
export const eventBus = new EventBus();
```

#### Step 4: 创建 StateManager Facade

**文件**: `frontend/js/infrastructure/state/StateManager.js`

```javascript
import { conversationState } from './stores/ConversationState.js';
import { generationState } from './stores/GenerationState.js';
import { demoState } from './stores/DemoState.js';
import { inspirationState } from './stores/InspirationState.js';
import { knowledgeState } from './stores/KnowledgeState.js';
import { settingsState } from './stores/SettingsState.js';
import { eventBus } from './core/EventBus.js';

/**
 * StateManager - Facade模式
 * 保持向后兼容的接口
 */
export class StateManager {
  constructor() {
    // 各个状态store
    this.conversation = conversationState;
    this.generation = generationState;
    this.demo = demoState;
    this.inspiration = inspirationState;
    this.knowledge = knowledgeState;
    this.settings = settingsState;

    // 事件总线
    this.eventBus = eventBus;

    // 兼容旧接口：state对象
    this._setupCompatibilityLayer();
  }

  /**
   * 设置兼容层（使旧代码无需修改）
   */
  _setupCompatibilityLayer() {
    // 使用Proxy拦截state访问
    this.state = new Proxy({}, {
      get: (target, prop) => {
        // 映射到对应的store
        switch(prop) {
          case 'currentChat':
          case 'messages':
          case 'userData':
          case 'conversationStep':
          case 'isTyping':
          case 'isLoading':
          case 'analysisCompleted':
            return this.conversation._state[prop];

          case 'generation':
            return this.generation._state;

          case 'demo':
            return this.demo._state;

          case 'inspiration':
            return this.inspiration._state;

          case 'knowledge':
            return this.knowledge._state;

          case 'settings':
            return this.settings._state;

          default:
            return undefined;
        }
      },

      set: (target, prop, value) => {
        console.warn(`[StateManager] Direct state mutation is deprecated. Use specific methods instead.`);
        return false;
      }
    });

    // 兼容旧的observers
    this.observers = [];
  }

  /**
   * 兼容旧的subscribe方法
   */
  subscribe(callback) {
    this.observers.push(callback);

    // 订阅所有store的变化
    const unsubscribes = [
      this.conversation.subscribe(() => this._notifyObservers()),
      this.generation.subscribe(() => this._notifyObservers()),
      this.demo.subscribe(() => this._notifyObservers()),
      this.inspiration.subscribe(() => this._notifyObservers()),
      this.knowledge.subscribe(() => this._notifyObservers()),
      this.settings.subscribe(() => this._notifyObservers())
    ];

    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
      unsubscribes.forEach(unsub => unsub());
    };
  }

  _notifyObservers() {
    this.observers.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        console.error('[StateManager] Observer error:', error);
      }
    });
  }

  // ========== 兼容旧的方法（委托给新的stores） ==========

  getCurrentChat() {
    return this.conversation.getCurrentChat();
  }

  setCurrentChat(chat) {
    this.conversation.setCurrentChat(chat);
  }

  getMessages() {
    return this.conversation.getMessages();
  }

  addMessage(message) {
    this.conversation.addMessage(message);
  }

  // ... 其他兼容方法
}

// 导出单例
export const stateManager = new StateManager();
```

---

## 三、验证与测试

### 3.1 单元测试示例

**文件**: `frontend/js/infrastructure/storage/__tests__/ChatRepository.test.js`

```javascript
import { ChatRepository } from '../repositories/ChatRepository.js';
import { dbClient } from '../core/IndexedDBClient.js';

describe('ChatRepository', () => {
  let chatRepo;

  beforeAll(async () => {
    // 初始化测试数据库
    await dbClient.init([
      {
        name: 'chats',
        keyPath: 'id',
        indexes: [
          { name: 'createdAt', keyPath: 'createdAt' }
        ]
      }
    ]);

    chatRepo = new ChatRepository(dbClient);
  });

  afterEach(async () => {
    // 清空数据
    await chatRepo.clear();
  });

  test('should save and retrieve chat', async () => {
    const chat = {
      id: 'test-1',
      title: 'Test Chat',
      createdAt: Date.now(),
      messages: []
    };

    await chatRepo.saveChat(chat);
    const retrieved = await chatRepo.getChat('test-1');

    expect(retrieved.id).toBe('test-1');
    expect(retrieved.title).toBe('Test Chat');
  });

  test('should get all chats sorted by time', async () => {
    const chat1 = { id: '1', title: 'Chat 1', createdAt: 1000 };
    const chat2 = { id: '2', title: 'Chat 2', createdAt: 2000 };

    await chatRepo.saveChat(chat1);
    await chatRepo.saveChat(chat2);

    const chats = await chatRepo.getAllChats();

    expect(chats).toHaveLength(2);
    expect(chats[0].id).toBe('2'); // 最新的在前
  });

  test('should search chats by keyword', async () => {
    const chat = {
      id: '1',
      title: 'Product Planning',
      createdAt: Date.now(),
      messages: [
        { content: 'Let's discuss the roadmap' }
      ]
    };

    await chatRepo.saveChat(chat);

    const results = await chatRepo.searchChats('roadmap');
    expect(results).toHaveLength(1);
  });
});
```

### 3.2 集成测试

```javascript
// 测试旧代码的兼容性
import { storageManager } from './infrastructure/storage/index.js';

async function testBackwardCompatibility() {
  // 旧代码应该仍然可以工作
  await storageManager.saveChat({
    id: 'test',
    title: 'Test',
    createdAt: Date.now()
  });

  const chat = await storageManager.getChat('test');
  console.assert(chat.id === 'test', 'Backward compatibility failed');

  console.log('✅ Backward compatibility test passed');
}
```

---

## 四、迁移清单

### 4.1 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `infrastructure/storage/core/IndexedDBClient.js` | IndexedDB基础封装 |
| 新建 | `infrastructure/storage/core/BaseRepository.js` | Repository基类 |
| 新建 | `infrastructure/storage/repositories/*.js` | 6个Repository |
| 新建 | `infrastructure/storage/StorageManager.js` | Facade |
| 新建 | `infrastructure/storage/index.js` | 导出文件 |
| 重命名 | `core/storage-manager.js` → `core/storage-manager.js.deprecated` | 标记弃用 |
| 新建 | `infrastructure/state/core/StateStore.js` | 状态基类 |
| 新建 | `infrastructure/state/core/EventBus.js` | 事件总线 |
| 新建 | `infrastructure/state/stores/*.js` | 6个State |
| 新建 | `infrastructure/state/StateManager.js` | Facade |
| 新建 | `infrastructure/state/index.js` | 导出文件 |
| 重命名 | `core/state-manager.js` → `core/state-manager.js.deprecated` | 标记弃用 |

### 4.2 导入更新清单

所有导入 `storage-manager` 或 `state-manager` 的文件需要更新导入路径：

```javascript
// 旧导入
import { storageManager } from './core/storage-manager.js';
import { stateManager } from './core/state-manager.js';

// 新导入
import { storageManager } from './infrastructure/storage/index.js';
import { stateManager } from './infrastructure/state/index.js';
```

受影响的文件（需要逐一检查）：
- `frontend/js/handlers/*.js`
- `frontend/js/components/*.js`
- `frontend/js/modules/*.js`
- `frontend/js/app.js`

---

## 五、预期效果

### 5.1 代码指标对比

| 指标 | 重构前 | 重构后 | 改进 |
|------|--------|--------|------|
| 最大文件行数 | 1021 | ~150 | ↓ 85% |
| storage相关文件数 | 1个 | 10个 | 职责分离 |
| state相关文件数 | 1个 | 10个 | 职责分离 |
| 可测试性 | 低 | 高 | 每个Repository可独立测试 |
| 代码复用性 | 低 | 高 | BaseRepository提供通用逻辑 |

### 5.2 质量提升

1. **可维护性** ⬆️
   - 每个文件职责单一
   - 修改影响范围小
   - 代码结构清晰

2. **可测试性** ⬆️
   - 每个Repository/State可独立测试
   - 依赖注入便于Mock
   - 测试覆盖率提升

3. **可扩展性** ⬆️
   - 新增存储：继承BaseRepository
   - 新增状态：继承StateStore
   - 无需修改现有代码

4. **向后兼容** ✅
   - Facade模式保持旧接口
   - 现有代码无需修改
   - 渐进式迁移

---

## 六、执行计划

### Week 1: Storage Manager 重构

- Day 1-2: 创建基础类（IndexedDBClient, BaseRepository）
- Day 3-4: 创建6个Repository
- Day 5: 创建Facade，更新导入，测试验证

### Week 2: State Manager 重构

- Day 1-2: 创建基础类（StateStore, EventBus）
- Day 3-4: 创建6个State
- Day 5: 创建Facade，更新导入，测试验证

### Week 3: 测试与文档

- Day 1-2: 编写单元测试
- Day 3-4: 编写集成测试
- Day 5: 更新文档，代码审查

---

## 七、风险应对

| 风险 | 应对措施 |
|------|----------|
| 功能回归 | 每步验证；保留旧文件作为备份 |
| 性能问题 | 基准测试；优化热路径 |
| 学习成本 | 详细文档；代码注释；团队培训 |
| 时间超期 | 分阶段执行；每阶段独立交付 |

---

## 八、下一步

完成阶段1后，继续执行：
- **阶段2**: 后端领域拆分（参见 `REFACTORING-GUIDE-PHASE2.md`）
- **阶段3**: 前端领域拆分
- **阶段4**: 代码质量提升

---

**文档版本**: v1.0
**创建日期**: 2026-01-13
**预计工作量**: 2-3周
**状态**: 待执行
