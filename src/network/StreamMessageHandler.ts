/**
 * StreamMessageHandler
 * Управляет WebSocket соединением для обмена сообщениями с сервером
 * Синглтон - гарантирует единственное соединение на всё приложение
 */

type MessageCallback = (data: any) => void;
type MessageType = 'motion' | 'connected' | 'ping' | 'pong' | 'error' | 'response';

interface QueuedRequest {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    timeout: NodeJS.Timeout;
}

interface Message {
    type: MessageType;
    timestamp: string;
    data?: any;
    requestId?: string;
}

export class StreamMessageHandler {
    private static instance: StreamMessageHandler;
    
    private socket: WebSocket | null = null;
    private url: string;
    private connected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000;
    private messageQueue: QueuedRequest[] = [];
    private listeners: Map<MessageType, MessageCallback[]> = new Map();
    private requestMap: Map<string, QueuedRequest> = new Map();
    private pingInterval: NodeJS.Timeout | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    
    // Счетчики и статистика
    private messageCounter: number = 0;
    private eventCounter: number = 0;
    private lastMessageTime: Date | null = null;
    
    private constructor(url: string = 'wss://python-stream-handler.onrender.com/ws') {
        this.url = url;
        this.initListeners();
    }
    
    /**
     * Получить экземпляр синглтона
     */
    public static getInstance(url?: string): StreamMessageHandler {
        if (!StreamMessageHandler.instance) {
            StreamMessageHandler.instance = new StreamMessageHandler(url);
        } else if (url) {
            // Если URL передан и отличается от текущего, обновляем
            StreamMessageHandler.instance.setUrl(url);
        }
        return StreamMessageHandler.instance;
    }
    
    /**
     * Инициализация слушателей по умолчанию
     */
    private initListeners(): void {
        // Слушаем все типы сообщений
        this.on('connected', (data) => {
            console.log('✅ Connected to server:', data);
            this.eventCounter++;
        });
        
        this.on('motion', (data) => {
            console.log('🚨 Motion detected:', data);
            this.eventCounter++;
            this.lastMessageTime = new Date();
        });
        
        this.on('error', (data) => {
            console.error('❌ Server error:', data);
        });
    }
    
    /**
     * Подключиться к серверу
     */
    public connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (this.socket && this.connected) {
                    resolve();
                    return;
                }
                
                this.socket = new WebSocket(this.url);
                
                this.socket.onopen = () => {
                    console.log(`🔌 WebSocket connected to ${this.url}`);
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    this.startPingInterval();
                    this.processMessageQueue();
                    resolve();
                };
                
                this.socket.onmessage = (event) => {
                    this.handleMessage(event.data);
                };
                
                this.socket.onclose = () => {
                    console.log('🔌 WebSocket disconnected');
                    this.connected = false;
                    this.stopPingInterval();
                    this.attemptReconnect();
                };
                
                this.socket.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    reject(error);
                };
                
            } catch (error) {
                console.error('❌ Connection error:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Отключиться от сервера
     */
    public disconnect(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        
        this.connected = false;
        
        // Отклоняем все ожидающие запросы
        this.requestMap.forEach((request, requestId) => {
            clearTimeout(request.timeout);
            request.reject(new Error('Connection closed'));
            this.requestMap.delete(requestId);
        });
    }
    
    /**
     * Установить новый URL для подключения
     */
    public setUrl(url: string): void {
        if (this.url !== url) {
            this.url = url;
            if (this.connected) {
                this.reconnect();
            }
        }
    }
    
    /**
     * Переподключиться
     */
    public async reconnect(): Promise<void> {
        this.disconnect();
        await this.connect();
    }
    
    /**
     * Попытка переподключения с экспоненциальной задержкой
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            return;
        }
        
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        
        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect().catch(() => {
                this.attemptReconnect();
            });
        }, delay);
    }
    
    /**
     * Запустить ping интервал для поддержания соединения
     */
    private startPingInterval(): void {
        this.pingInterval = setInterval(() => {
            if (this.connected) {
                this.send('ping', { timestamp: new Date().toISOString() })
                    .then(response => {
                        if (response?.type === 'pong') {
                            console.debug('🏓 Pong received');
                        }
                    })
                    .catch(error => {
                        console.error('Ping failed:', error);
                    });
            }
        }, 30000); // Каждые 30 секунд
    }
    
    /**
     * Остановить ping интервал
     */
    private stopPingInterval(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    /**
     * Обработать входящее сообщение
     */
    private handleMessage(data: string): void {
        try {
            const message: Message = JSON.parse(data);
            console.debug('📩 Received:', message);
            
            this.messageCounter++;
            this.lastMessageTime = new Date();
            
            // Если есть requestId - это ответ на запрос
            if (message.requestId && this.requestMap.has(message.requestId)) {
                const request = this.requestMap.get(message.requestId)!;
                clearTimeout(request.timeout);
                request.resolve(message.data);
                this.requestMap.delete(message.requestId);
                return;
            }
            
            // Иначе - триггерим слушателей
            const listeners = this.listeners.get(message.type) || [];
            listeners.forEach(callback => {
                try {
                    callback(message.data);
                } catch (error) {
                    console.error(`Error in ${message.type} listener:`, error);
                }
            });
            
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }
    
    /**
     * Отправить сообщение и ждать ответ
     */
    public async send<T = any>(
        type: MessageType, 
        data?: any, 
        timeoutMs: number = 5000
    ): Promise<T> {
        if (!this.connected) {
            throw new Error('WebSocket not connected');
        }
        
        const requestId = this.generateRequestId();
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.requestMap.delete(requestId);
                reject(new Error(`Request timeout after ${timeoutMs}ms`));
            }, timeoutMs);
            
            const request: QueuedRequest = { resolve, reject, timeout };
            this.requestMap.set(requestId, request);
            
            const message: Message = {
                type,
                timestamp: new Date().toISOString(),
                data,
                requestId
            };
            
            try {
                this.socket?.send(JSON.stringify(message));
                console.debug('📤 Sent:', message);
            } catch (error) {
                clearTimeout(timeout);
                this.requestMap.delete(requestId);
                reject(error);
            }
        });
    }
    
    /**
     * Отправить сообщение без ожидания ответа
     */
    public sendRaw(type: MessageType, data?: any): void {
        if (!this.connected) {
            console.warn('WebSocket not connected, message queued');
            this.queueMessage(type, data);
            return;
        }
        
        const message: Message = {
            type,
            timestamp: new Date().toISOString(),
            data
        };
        
        try {
            this.socket?.send(JSON.stringify(message));
            console.debug('📤 Sent (raw):', message);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
    
    /**
     * Поставить сообщение в очередь (если нет соединения)
     */
    private queueMessage(type: MessageType, data?: any): void {
        // Здесь можно реализовать очередь сообщений
        console.log('Message queued:', type, data);
    }
    
    /**
     * Обработать очередь сообщений при подключении
     */
    private processMessageQueue(): void {
        // Здесь можно обработать накопленные сообщения
    }
    
    /**
     * Подписаться на тип сообщений
     */
    public on(type: MessageType, callback: MessageCallback): () => void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        
        this.listeners.get(type)!.push(callback);
        
        // Возвращаем функцию отписки
        return () => {
            const listeners = this.listeners.get(type) || [];
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        };
    }
    
    /**
     * Подписаться однократно
     */
    public once(type: MessageType, callback: MessageCallback): void {
        const wrapper = (data: any) => {
            callback(data);
            this.off(type, wrapper);
        };
        this.on(type, wrapper);
    }
    
    /**
     * Отписаться от типа сообщений
     */
    public off(type: MessageType, callback: MessageCallback): void {
        const listeners = this.listeners.get(type) || [];
        const index = listeners.indexOf(callback);
        if (index !== -1) {
            listeners.splice(index, 1);
        }
    }
    
    /**
     * Генерация уникального ID для запроса
     */
    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Проверить состояние соединения
     */
    public isConnected(): boolean {
        return this.connected;
    }
    
    /**
     * Получить статистику
     */
    public getStats() {
        return {
            connected: this.connected,
            messagesReceived: this.messageCounter,
            events: this.eventCounter,
            lastMessage: this.lastMessageTime,
            pendingRequests: this.requestMap.size,
            url: this.url
        };
    }
    
    /**
     * Сбросить синглтон (для тестирования)
     */
    public static resetInstance(): void {
        if (StreamMessageHandler.instance) {
            StreamMessageHandler.instance.disconnect();
            StreamMessageHandler.instance = null as any;
        }
    }
}