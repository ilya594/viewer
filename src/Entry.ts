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
export const CONFIG = {
  BACKEND_URL: 'https://nodejs-http-server.onrender.com',
  DEFAULT_CAMERA: 'camera',
  INTRO_VIDEO_URL: './videos/solars.mp4'
} as const;
const route = (): string => window.location.search?.substring(1);



class Entry {

  private stream: MediaStream;

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
      case ('check'): {
        this.initializeCheckComponents();
        break;
      }

      default: {
        this.initializeProxyComponents();
        break;
      }
    }
  }

  private initializeCheckComponents = async () => {
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

      // debugger;
      return { primaryStream, streams };
    }

    const { primaryStream, streams } = await initializeCheckStream();
    console.log('[Entry] initializeIntegratedComponents initializing StreamProvider...');
    await StreamProvider.initialize(true, streams);

    console.log('[Entry] initializeIntegratedComponents displaying stream');

    View.displayStream((this.stream = primaryStream));
    Controls.setVisible(true);

    await this.initializeCommonComponents();
  }

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

    // debugger;
    return { primaryStream, streams };
  }

  private initializeProxyComponents = async () => {
 
    Model.motionDetectorEnabled = false;
    //await StreamProvider.initialize();
    document.querySelector("video").muted = true;
   document.querySelector("video").playsInline = true;
    const stream = await getWhepStream('https://node-mediamtx-proxy.onrender.com/camera/whep');
    View.displayStream(stream);
  //  EventHandler.addEventListener(STREAM_RECEIVED, (data: any) => {
  //    View.displayStream(data.stream);
  //  });
   //     console.log('[Entry] initializeIntegratedComponents displaying stream');

   // View.displayStream((this.stream = primaryStream));
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

    await MotionDetector.initialize();

    await Sounds.initialize();

    await Matrix.initialize();

    await Console.initialize();
  }
}

new Entry();

const getWhepStream = async (url: string) => {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  });

  // Promise, который резолвится когда приходит первый поток
  const streamPromise = new Promise((resolve, reject) => {
    pc.ontrack = (event) => {
      resolve(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        reject(new Error('WebRTC connection failed'));
      }
    };
  });

  // создаём offer
  const offer = await pc.createOffer({
    offerToReceiveVideo: true,
    offerToReceiveAudio: true
  });

  await pc.setLocalDescription(offer);

  // отправляем SDP
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sdp'
    },
    body: offer.sdp
  });

  if (!response.ok) {
    throw new Error(`WHEP error: ${response.status}`);
  }

  const answerSDP = await response.text();

  await pc.setRemoteDescription({
    type: 'answer',
    sdp: answerSDP
  });

  return streamPromise;
};