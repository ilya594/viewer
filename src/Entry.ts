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

    if (window.location.hostname.includes('nam') ||
      window.location.search.includes('ти з дєтства начав подглядувать шо взрослі дяді роблять, і тобі ніхто' +
        + ' аяяяй не зробив?..мало того шо в хліву воспітувався, так щей підаром виріс..'))     
    {
      const introVideoUrl = './videos/green.mp4';
      const preloadVideo = document.createElement('video');
      preloadVideo.style.setProperty('width', '120%');
      preloadVideo.style.setProperty('height', '120%');
      preloadVideo.style.setProperty('margin-left', '-10%');

      //preloadVideo.style.setProperty('position', 'absolute');
      //preloadVideo.style.display = 'none';
      preloadVideo.preload = 'auto';
      preloadVideo.src = introVideoUrl;
      preloadVideo.autoplay = true;
      preloadVideo.muted = true;
      preloadVideo.loop = true;
      document.body.removeChild(document.body.firstChild);
      document.body.removeChild(document.body.firstChild);
      document.body.appendChild(preloadVideo)
      return null;
    }

    Model.initialize();


    if (window.location.search.includes('%')) {
      this.initialize_tmp();
    } else {
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


  }

  private initialize_tmp = async () => {
    const vid = new IPCamView_tmp();
    vid.initialize();
    setTimeout(() => vid.initWebRTC(), 1000);

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
        //  debugger;
        this.initializeComponents();

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