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
  INTRO_VIDEO_URL: './images/solars.mp4'
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
    new TmpVideo();


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

class TmpVideo {
  constructor() {
    this.initialize();
  }

  private async initialize() {
    const createVideoExperience = async (options?: {
      introVideoUrl?: string;
      cameraName?: string;
      hlsOptions?: {
        width?: string;
        height?: string;
        position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
        showAfterIntro?: boolean;
      };
    }): Promise<void> => {
      const body = document.body;

      // Оставляем вашу существующую заставку на body как есть
      // Только добавляем overflow hidden
      body.style.overflow = 'hidden';

      // 1. ПРЕЛОАД ОСНОВНОГО ВИДЕО
      const introVideoUrl = options?.introVideoUrl || CONFIG.INTRO_VIDEO_URL;
      console.log('📥 Прелоад видео:', introVideoUrl);

      // Создаём невидимое видео для прелоада
      const preloadVideo = document.createElement('video');
      preloadVideo.style.display = 'none';
      preloadVideo.preload = 'auto';
      preloadVideo.src = introVideoUrl;

      // Ждём когда видео достаточно загрузится
      await new Promise<void>((resolve) => {
        const onCanPlayThrough = () => {
          console.log('✅ Видео готово к воспроизведению');
          preloadVideo.removeEventListener('canplaythrough', onCanPlayThrough);
          resolve();
        };

        preloadVideo.addEventListener('canplaythrough', onCanPlayThrough);

        // Если уже загружено
        if (preloadVideo.readyState >= 4) {
          console.log('✅ Видео уже загружено');
          resolve();
        }
      });

      // 2. СОЗДАЁМ ОСНОВНОЕ ВИДЕО (уже прелоаженное)
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

      // 3. СОЗДАЁМ HLS ВИДЕО (скрытое)
      const cameraName = options?.cameraName || CONFIG.DEFAULT_CAMERA;
      const hlsUrl = `${CONFIG.BACKEND_URL}/hls/${cameraName}/video1_stream.m3u8`;

      const hlsVideo = document.createElement('video');
      hlsVideo.src = hlsUrl;
      hlsVideo.autoplay = true;
      hlsVideo.muted = true;
      hlsVideo.controls = false;
      hlsVideo.playsInline = true;
      hlsVideo.preload = 'auto';

      // Контейнер для HLS видео
      const hlsContainer = document.createElement('div');
      const hlsOpts = options?.hlsOptions || {};
      const position = hlsOpts.position || 'top-left';

      let top = '0', left = '0', right = 'auto', bottom = 'auto';
      switch (position) {
        case 'top-right': top = '0'; left = 'auto'; right = '0'; break;
        case 'bottom-left': top = 'auto'; left = '0'; bottom = '0'; break;
        case 'bottom-right': top = 'auto'; left = 'auto'; right = '0'; bottom = '0'; break;
      }

      Object.assign(hlsContainer.style, {
        position: 'fixed',
        top, left, right, bottom,
        width: hlsOpts.width || '50%',
        height: hlsOpts.height || '50%',
        zIndex: '2',
        display: 'none'
      });

      Object.assign(hlsVideo.style, {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        backgroundColor: '#000'
      });

      hlsContainer.appendChild(hlsVideo);
      body.appendChild(hlsContainer);

      // 4. ФУНКЦИЯ ПОКАЗА HLS (после загрузки)
      const showHlsStream = async (): Promise<void> => {
        console.log('🔴 Включаем HLS поток...');
        hlsContainer.style.display = 'block';

        // Ждём когда HLS загрузит метаданные
        await new Promise<void>((resolve) => {
          if (hlsVideo.readyState >= 1) {
            resolve();
            return;
          }

          hlsVideo.addEventListener('loadedmetadata', () => {
            console.log('✅ HLS метаданные загружены');
            resolve();
          }, { once: true });
        });

        // Просто запускаем
        await hlsVideo.play();
        console.log('✅ HLS поток запущен');
      };

      // 5. ОБРАБОТКА ОКОНЧАНИЯ ОСНОВНОГО ВИДЕО
      const showAfterIntro = hlsOpts.showAfterIntro ?? true;

      if (showAfterIntro) {
        introVideo.addEventListener('ended', () => {
          console.log('🎬 Основное видео завершено');
          showHlsStream();
        }, { once: true });
      } else {
        // Показываем HLS сразу
        showHlsStream();
      }

      // 6. ЗАПУСКАЕМ ОСНОВНОЕ ВИДЕО
      try {
        await introVideo.play();
        console.log('🎬 Основное видео запущено');
      } catch (error) {
        console.warn('⚠️ Автозапуск не сработал:', error);
        // Если не запустилось - показываем HLS
        showHlsStream();
      }

      // 7. ЭКСПОРТ ДЛЯ ДЕБАГА
      (window as any).videoPlayer = {
        introVideo,
        hlsVideo,
        hlsContainer,
        showHlsStream
      };
    }

    // ========== ИНИЦИАЛИЗАЦИЯ ==========
    // Просто запускаем
    createVideoExperience({
      introVideoUrl: './images/solars.mp4',
      cameraName: 'camera',
      hlsOptions: {
        width: '50%',
        height: '50%',
        position: 'top-left',
        showAfterIntro: true
      }
    }).catch(console.error);
  }
}

new Entry();