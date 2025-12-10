import * as Events from "../utils/Events";    
import { DataConnection, MediaConnection, Peer } from "peerjs";
import * as uuid from "uuid";
import axios from "axios";
import Sounds from "../utils/Sounds";
import Controls from "../view/Controls";
import RestService from "./RestService";

const id = (device: string = !!screen.orientation ? "static-" : "mobile-"): string => device + uuid.v4();

export class StreamProvider extends Events.EventHandler {

    private _peer: any;
    private _connection: any;
    private _call: MediaConnection;
    private _stream: any;

    constructor() {
        super();

        window.onunload = (_) => this.destroy();
        window.onpagehide = (_) => { this.destroy(); };
    }

    public initialize = async (local: boolean = false) => {

        if (local) {
            this.initializeLocalStream();
        } else {
            this.initializePeerStream();
        }

        return this;
    }

    private getAllPeersIds = async (): Promise<string[]> => {
      return (await RestService.getPeersIds()).data?.data as Array<string>;
    }

    private initializePeerStream = async () => {     

      const params = {
        host: "nodejs-peer-server.onrender.com",
        path: "/peer",
        secure: true,
      };

      const ids: Array<string> = await this.getAllPeersIds();
    
      this._peer = new Peer(id(), params);      
        
      this._peer.on('open', () => {
        
        this._connection = this._peer.connect(ids.shift());
            
        this._connection.on('open', () => {

          this._connection.send({ type: 'custom-media-stream-request' });

          this._connection.on('data', (data: any) => {
            if (data?.type === 'sounds-adjust-homie-volume') {
              Controls.adjustVolume(Number(data?.data));
              this.adjustVolume(data?.data);
            }
          });
        
          this._peer.on('call', async (call: MediaConnection) => {        
            call.on('stream', (stream) => {
              this.dispatchEvent(Events.STREAM_RECEIVED, stream); 
              this._call = call;
              this._stream = stream;
            });
            call.answer(null);
          });
        });   
      });
    }

    public sendSnaphot = (snapshot: string) => {
      //TODO replace this somewhere
      if (!Controls.remoteSaveEnabled) return false;
      this._connection?.send({ type : 'snapshot-send-homie-message', data: snapshot });     
    }

    public adjustVolume = (value: number) => {
      this._connection?.send({ type: 'sounds-adjust-homie-volume', data: value });
    }

    public sendVoiceMessage = async () => {
      const route = (): string => window.location.search?.substring(1); 
      if (route() !== 'mix') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        this._call =  this._peer.call(this._connection?.peer, stream);
      }
    }

    public stopVoiceMessage = async () => {
      this._call.close();
    }

    private initializeLocalStream = async () => {
      this.dispatchEvent(Events.STREAM_RECEIVED);
    }

    private destroy = () => {
        this._connection?.close?.();
        this._peer?.disconnect?.();
        this._peer?.destroy?.();  
    };



}

export default new StreamProvider();