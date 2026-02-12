export class MessageBus {
  constructor() {
    this._agents = new Map();
    this._messageQueue = [];
    this._subscribers = new Map();
  }

  registerAgent(agent) {
    this._agents.set(agent.id, agent);

    agent.onMessage = message => this._handleMessage(agent.id, message);
  }

  unregisterAgent(agent) {
    this._agents.delete(agent.id);
    this._subscribers.delete(agent.id);
  }

  async sendMessage(targetAgent, message) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('消息发送超时'));
      }, 30000);

      const responseHandler = response => {
        clearTimeout(timeout);
        resolve(response);
      };

      targetAgent.receiveMessage(message, responseHandler);
    });
  }

  async broadcastMessage(message) {
    const promises = [];

    for (const agent of this._agents.values()) {
      promises.push(this.sendMessage(agent, message));
    }

    return await Promise.allSettled(promises);
  }

  _handleMessage(_senderId, _message) {
    // 这里可以实现更复杂的消息路由逻辑
  }

  getQueueSize() {
    return this._messageQueue.length;
  }
}
