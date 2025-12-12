import * as Events from "../utils/Events";    
import { DataConnection, MediaConnection, Peer } from "peerjs";
import * as uuid from "uuid";
import axios from "axios";
import Sounds from "../utils/Sounds";
import Controls from "../view/Controls";
import RestService from "./RestService";

const id = (device: string = !!screen.orientation ? "static-" : "mobile-"): string => device + uuid.v4();

export class StreamProvider extends Events.EventHandler {

    private _streamers: Map<string, Streamer> = new Map();
    private _peer: any;
   // private _connection: any;
   // private _call: MediaConnection;
    private _streams: Array<MediaStream> = [];

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

    private getAllPeersIds = async (): Promise<Map<string, Streamer>> => {
      ((await RestService.getPeersIds()).data?.data as Array<string>).forEach((id: string) => {
        this._streamers.set(id, new Streamer(id));
      })
      return this._streamers;
    }

    private initializePeerStream = async () => {     

      const params = {
        host: "nodejs-peer-server.onrender.com",
        path: "/peer",
        secure: true,
      };

      this._streamers = await this.getAllPeersIds();
    
      this._peer = new Peer(id(), params);      
        
      this._peer.on('open', async () => {

        for (const id of Array.from(this._streamers.keys())) {
          this.createConnection(id);
        }
        
        this._peer.on('call', async (call: MediaConnection) => { 
          call.on('stream', (stream: MediaStream) => {
            if (this._streamers.get(call.peer).pending) {
              this._streamers.get(call.peer).setStream(stream);
              this.dispatchEvent(Events.STREAM_RECEIVED, stream); 
            }
          });
        });


      });
    }

    private createConnection = async (id: string) => {

        let connection = this._peer.connect(id);
            
        connection.on('open', async () => {

          connection.send({ type: 'custom-media-stream-request' });
       
          //await this.addCallEventHandler();

        }); 
    }

    /*private addDataEventHandler = () => {
          this._connection.on('data', (data: any) => {
            if (data?.type === 'sounds-adjust-homie-volume') {
              Controls.adjustVolume(Number(data?.data));
              this.adjustVolume(data?.data);
            }
          });
    }*/

    private addCallEventHandler = async () => {

          //  this._peer.on('call', async (call: MediaConnection) => {        

        //    call.on('stream', (stream) => {
         //     this.dispatchEvent(Events.STREAM_RECEIVED, stream); 
         //     this._streams.push(stream);

        //    });
        //    call.answer(null);
       //   );

    }

    /*public sendSnaphot = (snapshot: string) => {
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
    }*/

    private initializeLocalStream = async () => {
      this.dispatchEvent(Events.STREAM_RECEIVED);
    }

    private destroy = () => {
        //this._connection?.close?.();
        this._peer?.disconnect?.();
        this._peer?.destroy?.();  
    };
}

class Streamer {

  public id;
  public stream: MediaStream;

  public get pending(): boolean {
    return !this.stream;
  }

  constructor(id: string) {
    this.id = id;
  }

  public setStream = (stream: MediaStream) => {
    this.stream = stream;
  }
}

export default new StreamProvider();