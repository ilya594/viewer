import Snaphots from "./record/Snaphots";
import MotionDetector from "./motion/MotionDetector";
import EventHandler, { NETWORK_AUTH_SUCCESS, STREAM_RECEIVED, USER_PROCEEDED } from "./utils/Events";
import StreamProvider from "./network/StreamProvider";
import View from "./view/View";
import Console from "./utils/Console";
import RestService from "./network/RestService";
import Authentification from "./auth/Authentification";
import Controls from "./view/Controls";
import Sounds from "./utils/Sounds";
import * as Utils from './utils/Utils';
import Matrix from "./view/Matrix";
import Model from "./store/Model";
import IPCamView_tmp from "./view/IPCamView_tmp";
import Detector from "./motion/YoloDetector";
import YoloDetector from "./motion/YoloDetector";
import SnapshotViewer from "./view/SnapshotViewer";
export const CONFIG = {
  BACKEND_URL: 'https://nodejs-http-server.onrender.com',
  DEFAULT_CAMERA: 'camera',
  INTRO_VIDEO_URL: './videos/solars.mp4'
} as const;
const route = (): string => window.location.search?.substring(1);

class Entry {

  private stream: any;

  constructor() {

    Model.initialize();

    switch (route()) {
      case ('show'): {
        this.initializeView();
        break;
      }


      default: {
        this.initializeAuth();
        break;
      }
    }


  }

  private initializeAuth = async () => {

    Utils.tryResizeWindow();

    await Console.initialize();
    Authentification.addEventListener(NETWORK_AUTH_SUCCESS, () => this.initializeView());
    await Authentification.initialize();

  }


  private initializeView = async () => {
    await View.initialize();
    View.addEventListener(USER_PROCEEDED, () => this.initializeRoutes());
  }

  private initializeRoutes = async () => {

    switch (route()) {
      case ('mix'): {
        this.initializeIntegratedComponents();
        break;
      }
      case ('proxy'): {
        this.initializeProxyComponents();
        break;
      }
      case ('low'): {
        this.initializeComponentsLow();
        break;
      }
      case ('check'): {       // this.initializeCheckComponents();
        break;
      }

      case ('my-stream'): {
        this.initializeComponents();
        break;
      }


      default: {
        this.initializeProductionComponents();
        break;
      }
    }
  }

  /*private initializeCheckComponents = async () => {
    const initializeCheckStream = async () => {
      console.log('[Entry] initializeRemoteStream importing streamer...');

      const { Streamer } = await System.import('https://html-peer-streamer.onrender.com/index.js');
      const ipCameraConfigProxy = {
        name: 'security-camera',
        url: 'https://nodejs-http-server.onrender.com/api/webrtc/camera/',
        type: 'webrtc' as const,
        quality: ''//StreamQuality.HIGH
      };

      const streamer = new Streamer();

      console.log('[Entry] initializeRemoteStream streamer imported. created instance. initializing...');

      const {
        peerId,
        primaryStream,
        streams,
        qualities,
        stats,
        cameraInfo,
        cameraHash
      } = await streamer.initialize({ ipCamera: ipCameraConfigProxy });

      return { primaryStream, streams };
    }

    const { primaryStream, streams } = await initializeCheckStream();
    console.log('[Entry] initializeIntegratedComponents initializing StreamProvider...');
    await StreamProvider.initialize(true, streams);

    console.log('[Entry] initializeIntegratedComponents displaying stream');

    View.displayStream((this.stream = primaryStream));
    Controls.setVisible(true);

    await this.initializeCommonComponents();
  }*/

  private initializeRemoteStream = async () => {
    console.log('[Entry] initializeRemoteStream importing streamer...');

    const { Streamer } = await System.import('https://html-peer-streamer.onrender.com/index.js');

    const streamer = new Streamer();

    console.log('[Entry] initializeRemoteStream streamer imported. created instance. initializing...');

    const {
      peerId,
      primaryStream,
      streams,
      qualities,
      stats,
      cameraInfo,
      cameraHash
    } = await streamer.initialize();

    return { primaryStream, streams };
  }

  private initializeProxyComponents = async () => {
    const { primaryStream, streams } = await this.initializeRemoteStream();
    console.log('[Entry] initializeIntegratedComponents initializing StreamProvider...');
    await StreamProvider.initialize(true, streams);

    console.log('[Entry] initializeIntegratedComponents displaying stream');

    View.displayStream((this.stream = primaryStream));
  }

  private initializeIntegratedComponents = async () => {
    const { primaryStream, streams } = await this.initializeRemoteStream();
    console.log('[Entry] initializeIntegratedComponents initializing StreamProvider...');
    await StreamProvider.initialize(true, streams);

    console.log('[Entry] initializeIntegratedComponents displaying stream');

    View.displayStream((this.stream = primaryStream));
    Controls.setVisible(true);

    await this.initializeCommonComponents();
  }

  private initializeProductionComponents = async () => {
    const stream = await IPCamView_tmp.getStream();

    View.displayStream(stream);
    Sounds.playStream(stream);
    await SnapshotViewer.initialize();
    SnapshotViewer.showhide();
    //Controls.setVisible(true);
  }


  private initializeComponents = async () => {
    await StreamProvider.initialize();
    EventHandler.addEventListener(STREAM_RECEIVED, (data: any) => {
      View.displayStream(data.stream);
      Sounds.playStream(data.stream);
      Controls.setVisible(true);
    });

    await this.initializeCommonComponents();
  }



  private initializeComponentsLow = async () => {
    Model.motionDetectorEnabled = false;
    Model.colorCurvesEnabled = true;
    Model.prefferedStreamQuality = 'low';

    await StreamProvider.initialize();
    EventHandler.addEventListener(STREAM_RECEIVED, (data: any) => {
      View.displayStream(data.stream);
      MotionDetector.initialize();
    });
  }

  private initializeCommonComponents = async () => {

    await RestService.initialize();

    await Snaphots.initialize();

    //await MotionDetector.initialize();

    await YoloDetector.initialize();

    await Sounds.initialize();

    await Matrix.initialize();

    await Console.initialize();
  }

  /*private sendAndReceiveVideo = async (stream: MediaStream) => {
    // const stream = await navigator.mediaDevices.getUserMedia({ video: true });

    const client = new FastRTCClient(
      'http://127.0.0.1:7860',
      stream,
      {
        onLog: (msg, type) => console.log(`[${type}] ${msg}`),
        onTrack: (remoteStream) => {
          // Получили видео от сервера
          console.log('🎥 Received remote stream with tracks:',
            remoteStream.getTracks().length);

          // Здесь можно, например, подключить к canvas для обработки
          // или отправить куда-то еще
        }
      }
    );

    await client.start('video', {
      onDataChannelMessage: (data) => {
        console.log('📨 Data channel message:', data);
        // Сервер может присылать результаты обработки
        if (data.type === 'detection') {
          console.log('Detected people:', data.count);
        }
      }
    });

    return client;
  }*/
}






new Entry();

class FastRTCClient {
  private serverUrl: string;
  private pc: RTCPeerConnection | null;
  private localStream: MediaStream | null;
  private webrtcId: string;
  private onLog: (message: string, type: 'info' | 'success' | 'error' | 'debug') => void;
  private onTrack?: (stream: MediaStream) => void;

  constructor(
    serverUrl: string,
    stream: MediaStream,
    options?: {
      webrtcId?: string,
      onLog?: (message: string, type: 'info' | 'success' | 'error' | 'debug') => void,
      onTrack?: (stream: MediaStream) => void,
      iceServers?: RTCIceServer[]
    }
  ) {
    this.serverUrl = serverUrl;
    this.pc = null;
    this.localStream = stream;
    this.webrtcId = options?.webrtcId || this.generateWebRTCId();
    this.onLog = options?.onLog || (() => { });
    this.onTrack = options?.onTrack;

    this.log(`FastRTCClient initialized with ID: ${this.webrtcId}`, 'info');
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'debug' = 'debug') {
    const prefix = {
      'info': '📌',
      'success': '✅',
      'error': '❌',
      'debug': '🔍'
    }[type];

    console.log(`${prefix} ${message}`);
    this.onLog(message, type);
  }

  public generateWebRTCId(): string {
    return 'stream_' + Math.random().toString(36).substring(2, 15);
  }

  public setWebRTCId(id: string) {
    this.webrtcId = id;
    this.log(`WebRTC ID set to: ${id}`, 'info');
  }

  public getWebRTCId(): string {
    return this.webrtcId;
  }

  private createPeerConnection(pc: RTCPeerConnection): RTCPeerConnection {
    pc.addEventListener(
      "icegatheringstatechange",
      () => this.log(`ICE gathering: ${pc.iceGatheringState}`, 'debug'),
      false,
    );

    pc.addEventListener(
      "iceconnectionstatechange",
      () => {
        this.log(`ICE connection: ${pc.iceConnectionState}`, 'debug');
        if (pc.iceConnectionState === 'connected') {
          this.log('ICE connected - streaming!', 'success');
        } else if (pc.iceConnectionState === 'failed') {
          this.log('ICE connection failed', 'error');
        }
      },
      false,
    );

    pc.addEventListener(
      "signalingstatechange",
      () => this.log(`Signaling state: ${pc.signalingState}`, 'debug'),
      false,
    );

    pc.addEventListener(
      "connectionstatechange",
      () => {
        this.log(`Connection state: ${pc.connectionState}`, 'debug');
        if (pc.connectionState === 'connected') {
          this.log('WebRTC connected!', 'success');
        } else if (pc.connectionState === 'failed') {
          this.log('WebRTC connection failed', 'error');
        }
      },
      false,
    );

    pc.addEventListener("track", (evt: RTCTrackEvent) => {
      this.log(`📡 Received track: ${evt.track.kind}`, 'info');
      if (this.onTrack && evt.streams[0]) {
        this.onTrack(evt.streams[0]);
      }
    });

    return pc;
  }

  private createServerFunction() {
    return async (body: any) => {
      // ВАЖНО: Все запросы идут на один эндпоинт /webrtc/offer
      const url = body.type === 'ice-candidate' ? `${this.serverUrl}/webrtc/offer` : `${this.serverUrl}/webrtc/offer`;

      this.log(`${body.type || 'request'} to /webrtc/offer`, 'debug');

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    };
  }

  private async makeOffer(
    server_fn: (body: any) => Promise<any>,
    body: any,
    reject_cb?: (data?: any) => void
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      server_fn(body)
        .then((data: any) => {
          this.log(`Received response: ${data.type || 'unknown'}`, 'debug');

          if (data?.status === "failed") {
            if (reject_cb) reject_cb(data);
            reject(new Error("Offer failed"));
          }
          resolve(data);
        })
        .catch((err: any) => {
          this.log(`Offer error: ${err.message || err}`, 'error');
          reject(err);
        });
    });
  }

  private async negotiate(
    pc: RTCPeerConnection,
    server_fn: (body: any) => Promise<any>,
    webrtc_id: string
  ): Promise<void> {
    pc.onicecandidate = ({ candidate }: RTCPeerConnectionIceEvent) => {
      if (candidate) {
        this.log('Sending ICE candidate', 'debug');

        // ВАЖНО: Отправляем кандидаты через ту же функцию
        server_fn({
          candidate: candidate.toJSON ? candidate.toJSON() : candidate,
          webrtc_id: webrtc_id,
          type: "ice-candidate",  // FastRTC понимает этот тип
        }).catch((err: any) => {
          this.log(`Error sending ICE candidate: ${err.message || err}`, 'error');
        });
      }
    };

    this.log('Creating offer...', 'info');

    try {
      const offer = await pc.createOffer();
      this.log('Offer created, setting local description', 'debug');
      await pc.setLocalDescription(offer);

      const localOffer = pc.localDescription;
      this.log('Sending offer to server...', 'info');

      const response = await this.makeOffer(
        server_fn,
        {
          sdp: localOffer?.sdp,
          type: localOffer?.type,
          webrtc_id: webrtc_id,
        }
      );

      this.log('Received answer from server', 'info');
      this.log('Setting remote description...', 'debug');
      await pc.setRemoteDescription(response);

      this.log('Negotiation complete!', 'success');
    } catch (error) {
      this.log(`Negotiation error: ${error}`, 'error');
      throw error;
    }
  }

  public async start(
    modality: "video" | "audio" = "video",
    options?: {
      rtp_params?: any,
      onDataChannelMessage?: (data: any) => void,
      iceServers?: RTCIceServer[]
    }
  ): Promise<RTCPeerConnection> {
    if (!this.localStream) {
      throw new Error('No local stream available');
    }

    this.log(`Starting WebRTC connection with ID: ${this.webrtcId}`, 'info');

    this.pc = new RTCPeerConnection({
      iceServers: options?.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    });

    const server_fn = this.createServerFunction();
    this.pc = this.createPeerConnection(this.pc);

    const data_channel = this.pc.createDataChannel("text");

    data_channel.onopen = () => {
      this.log('Data channel opened', 'success');
      data_channel.send("handshake");
    };

    data_channel.onmessage = (event: MessageEvent) => {
      this.log(`Received data: ${event.data}`, 'info');
      try {
        const event_json = JSON.parse(event.data);
        if (options?.onDataChannelMessage) {
          options.onDataChannelMessage(event_json);
        }
      } catch (e) { }
    };

    this.localStream.getTracks().forEach(async (track) => {
      this.log(`Adding track: ${track.kind}`, 'debug');
      const sender = this.pc!.addTrack(track, this.localStream!);

      if (options?.rtp_params) {
        const params = sender.getParameters();
        const updated_params = { ...params, ...options.rtp_params };
        await sender.setParameters(updated_params);
      }
    });

    this.log(`Added ${this.localStream.getTracks().length} tracks`, 'success');

    await this.negotiate(this.pc, server_fn, this.webrtcId);

    return this.pc;
  }

  public stop(): void {
    this.log('Stopping peer connection...', 'info');

    if (this.pc) {
      if (this.pc.getTransceivers) {
        this.pc.getTransceivers().forEach((transceiver) => {
          if (transceiver.stop) transceiver.stop();
        });
      }

      if (this.pc.getSenders()) {
        this.pc.getSenders().forEach((sender) => {
          if (sender.track && sender.track.stop) sender.track.stop();
        });
      }

      setTimeout(() => {
        if (this.pc) {
          this.pc.close();
          this.pc = null;
          this.log('Peer connection closed', 'success');
        }
      }, 500);
    }
  }

  public getPeerConnection(): RTCPeerConnection | null {
    return this.pc;
  }
}
