import { EventHandler } from "../utils/Events";

export class WssService extends EventHandler {

    private socket: WebSocket;

    constructor() {
        super();
    }

    public heartBeat = (peerId: string) => {
        if (this.socket) {
            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({ type: 'heartbeat', id: peerId, timestamp: Date.now() }));
            } else {
                this.socket.close();
                this.createSocket();
            }
        } else {
            this.createSocket();
        }
    }

    private createSocket = () => {
        this.socket = new WebSocket(new URL("wss://nodejs-http-server.onrender.com/ws")); 
        this.socket.onopen = () => {
            console.log('[WssService] websocket connection opened...');
        }
    }
}
export default new WssService();