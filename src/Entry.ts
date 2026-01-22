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

      case ('security'): {
        this.initialize_tmp();
        break;
      }

      default: {
        this.initializeAuth();
        break;
      }
    }
  }

  private initialize_tmp = async () => {
   const vid =  new YourClass();
   vid.initialize();
    setTimeout(() =>vid.initWebRTC(), 1000);

  }

  private initializeAuth = async () => {

    Utils.tryResizeWindow();

    await Console.initialize();

    await Authentification.initialize();
    Authentification.addEventListener(NETWORK_AUTH_SUCCESS, () => this.initializeView());
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
      default: {
        this.initializeComponents();
        break;
      }
    }
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


class YourClass {


  constructor() {

  }

  public async initWebRTC(): Promise<HTMLVideoElement> {
    return this.simpleWebRTCMediaMTX();
  }

  private async simpleWebRTCMediaMTX(): Promise<HTMLVideoElement> {
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.controls = false; // Если нужно управление - установите true

    video.style.cssText = `
      position: fixed;
      width: 50%;
      height: 50%;
      top: 0;
      left: 0;
      border: 3px solid #167bff;
      background: #000;
      object-fit: cover;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.5s ease;
    `;

    document.body.appendChild(video);

    const serverUrl = 'http://195.137.244.53:8889/camera/whep';
    console.log('🚀 Подключаемся к WebRTC:', serverUrl);

    try {
      const pc = new RTCPeerConnection();
      pc.addTransceiver('video', { direction: 'recvonly' });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      let answerSdp = await response.text();

      // Исправляем SDP answer если нужно
      if (!answerSdp.includes('ice-ufrag')) {
        const localSdp = pc.localDescription!.sdp;
        const ufragMatch = localSdp.match(/a=ice-ufrag:(\S+)/);
        const pwdMatch = localSdp.match(/a=ice-pwd:(\S+)/);

        if (ufragMatch && pwdMatch) {
          answerSdp += `\r\na=ice-ufrag:${ufragMatch[1]}\r\na=ice-pwd:${pwdMatch[1]}`;
        }
      }

      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      });

      console.log('✅ WebRTC соединение установлено');

      // Ждём видео и плавно показываем
      pc.ontrack = (event) => {
        if (event.track.kind === 'video') {
          console.log('🎬 WebRTC видеопоток получен!');
          video.srcObject = new MediaStream([event.track]);
          setTimeout(() => {
            video.style.opacity = '1';
          }, 100);
        }
      };

      // Fallback проверка
      setTimeout(() => {
        if (!video.srcObject) {
          const receivers = pc.getReceivers();
          const videoTrack = receivers.find(r => r.track?.kind === 'video')?.track;
          if (videoTrack) {
            video.srcObject = new MediaStream([videoTrack]);
            video.style.opacity = '1';
          }
        }
      }, 3000);

      return video;

    } catch (error) {
      console.error('❌ Ошибка WebRTC:', error);
      video.remove();
      throw error;
    }
  }

  private async createWebRTCExperience(options?: {
    introVideoUrl?: string;
    cameraName?: string;
    webrtcOptions?: {
      width?: string;
      height?: string;
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      showAfterIntro?: boolean;
      borderColor?: string;
    };
  }): Promise<void> {
    const body = document.body;
    body.style.overflow = 'hidden';

    // 1. ПРЕЛОАД ОСНОВНОГО ВИДЕО
    const introVideoUrl = './videos/solars.mp4';
    console.log('📥 Прелоад видео:', introVideoUrl);

    const preloadVideo = document.createElement('video');
    //preloadVideo.style.display = 'none';
    preloadVideo.preload = 'auto';
    preloadVideo.src = introVideoUrl;

    // Ждём загрузки основного видео
    await new Promise<void>((resolve) => {
      const onCanPlayThrough = () => {
        console.log('✅ Основное видео готово');
        preloadVideo.removeEventListener('canplaythrough', onCanPlayThrough);
        resolve();
      };

      preloadVideo.addEventListener('canplaythrough', onCanPlayThrough);

      if (preloadVideo.readyState >= 4) {
        console.log('✅ Видео уже загружено');
        resolve();
      }
    });

    // 2. СОЗДАЁМ И ЗАПУСКАЕМ ОСНОВНОЕ ВИДЕО
    const introVideo = document.createElement('video');
    introVideo.src = introVideoUrl;
    introVideo.autoplay = true;
    introVideo.muted = true;
    introVideo.loop = true;
    introVideo.controls = false;
    introVideo.playsInline = true;

    Object.assign(introVideo.style, {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '1'
    });

    body.appendChild(introVideo);

    // 3. СОЗДАЁМ КОНТЕЙНЕР ДЛЯ WebRTC ВИДЕО
    const webrtcContainer = document.createElement('div');
    const webrtcOpts = options?.webrtcOptions || {};
    const position = webrtcOpts.position || 'top-left';
    const borderColor = webrtcOpts.borderColor || '#00ff00';

    let top = '0', left = '0', right = 'auto', bottom = 'auto';
    switch (position) {
      case 'top-right': top = '0'; left = 'auto'; right = '0'; break;
      case 'bottom-left': top = 'auto'; left = '0'; bottom = '0'; break;
      case 'bottom-right': top = 'auto'; left = 'auto'; right = '0'; bottom = '0'; break;
    }

    Object.assign(webrtcContainer.style, {
      position: 'fixed',
      top, left, right, bottom,
      width: webrtcOpts.width || '50%',
      height: webrtcOpts.height || '50%',
      zIndex: '2',
      display: 'none',
      opacity: '0',
      transition: 'opacity 0.5s ease'
    });
  }

  public async initialize() {
    // Используем WebRTC вместо HLS
    await this.createWebRTCExperience({
      introVideoUrl: './videos/solars.mp4',
      cameraName: 'camera',
      webrtcOptions: {
        width: '50%',
        height: '50%',
        position: 'top-left',
        showAfterIntro: true,
        borderColor: '#4CAF50' // Зелёная рамка
      }
    }).catch(console.error);
  }

  // ========== БЫСТРЫЙ ЗАПУСК WebRTC БЕЗ ОСНОВНОГО ВИДЕО ==========
  public async quickStartWebRTC() {
    
    try {
      const video = await this.simpleWebRTCMediaMTX();
      console.log('🚀 WebRTC запущен в режиме quick start');
      return video;
    } catch (error) {
      console.error('Ошибка быстрого запуска:', error);
      return null;
    }
  }
}



new Entry();