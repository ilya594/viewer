import { EventHandler } from "../utils/Events";

export class WssService extends EventHandler {

    private socket: WebSocket;

    constructor() {
        super();

        this.socket = new WebSocket(new URL("wss://nodejs-http-server.onrender.com:8001"));

        this.socket.onopen = () => {
            console.log('[WssService] websocket connection opened...');
        }
    }

    public heartBeat = (peerId: string) => {
        this.socket.send(JSON.stringify({ type: 'heartbeat', data: peerId }));
    }
}
export default new WssService();