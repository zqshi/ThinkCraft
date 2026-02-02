/**
 * Chat容器组件
 * 聊天功能的主要容器
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChatHeader } from './chat-header.jsx';
import { ChatMessages } from './chat-messages.jsx';
import { ChatInput } from './chat-input.jsx';
import { ChatSidebar } from './chat-sidebar.jsx';
import { chatUseCase } from '../application/chat.use-case.js';
import { chatEventHandler } from '../infrastructure/chat-event.handler.js';
import './chat-container.css';

export function ChatContainer({ projectId, className = '' }) {
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const eventSourceRef = useRef(null);

    // 加载聊天列表
    const loadChats = useCallback(async () => {
        try {
            setIsLoading(true);
            const chatList = await chatUseCase.getChats(projectId);
            setChats(chatList);
        } catch (error) {
            console.error('加载聊天列表失败:', error);
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    // 加载消息
    const loadMessages = useCallback(async (chatId) => {
        if (!chatId) return;

        try {
            setIsLoading(true);
            const messageList = await chatUseCase.getMessages(chatId);
            setMessages(messageList);
        } catch (error) {
            console.error('加载消息失败:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 创建新聊天
    const handleCreateChat = useCallback(async (title) => {
        try {
            const newChat = await chatUseCase.createChat(projectId, title);
            setChats(prev => [...prev, newChat]);
            setActiveChat(newChat);
            setMessages([]);
        } catch (error) {
            console.error('创建聊天失败:', error);
        }
    }, [projectId]);

    // 发送消息
    const handleSendMessage = useCallback(async (content, type = 'text') => {
        if (!activeChat || !content.trim()) return;

        try {
            // 立即显示用户消息
            const tempMessage = {
                id: `temp_${Date.now()}`,
                chatId: activeChat.id,
                content,
                type,
                sender: 'user',
                status: 'sending',
                createdAt: new Date().toISOString()
            };
            setMessages(prev => [...prev, tempMessage]);

            // 发送消息
            const sentMessage = await chatUseCase.sendMessage(activeChat.id, content, type);

            // 替换临时消息
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === tempMessage.id ? sentMessage : msg
                )
            );
        } catch (error) {
            console.error('发送消息失败:', error);
            // 更新消息状态为失败
            setMessages(prev =>
                prev.map(msg =>
                    msg.id.startsWith('temp_')
                        ? { ...msg, status: 'failed' }
                        : msg
                )
            );
        }
    }, [activeChat]);

    // 选择聊天
    const handleSelectChat = useCallback((chat) => {
        setActiveChat(chat);
        loadMessages(chat.id);
    }, [loadMessages]);

    // 监听聊天事件
    useEffect(() => {
        const unsubscribe = chatEventHandler.subscribe('chat:messageAdded', (data) => {
            if (activeChat && data.chatId === activeChat.id) {
                setMessages(prev => [...prev, data.message]);
            }
        });

        return () => unsubscribe();
    }, [activeChat]);

    // 监听SSE流
    useEffect(() => {
        if (!activeChat) return;

        // 关闭之前的连接
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        // 建立新连接
        eventSourceRef.current = chatUseCase.streamMessages(
            activeChat.id,
            (message) => {
                setMessages(prev => [...prev, message]);
            },
            (error) => {
                console.error('SSE连接错误:', error);
            }
        );

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [activeChat]);

    // 初始化加载
    useEffect(() => {
        loadChats();
    }, [loadChats]);

    return (
        <div className={`chat-container ${className} ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            <ChatSidebar
                chats={chats}
                activeChat={activeChat}
                onSelectChat={handleSelectChat}
                onCreateChat={handleCreateChat}
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
            />

            <div className="chat-main">
                {activeChat ? (
                    <>
                        <ChatHeader chat={activeChat} />
                        <ChatMessages
                            messages={messages}
                            isLoading={isLoading}
                            currentUserId="current-user-id" // 应该从认证服务获取
                        />
                        <ChatInput
                            onSendMessage={handleSendMessage}
                            disabled={isLoading}
                        />
                    </>
                ) : (
                    <div className="chat-empty-state">
                        <div className="empty-state-content">
                            <h3>选择一个聊天开始对话</h3>
                            <p>或者创建一个新的聊天</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}