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
  // Ваш бэкенд на Render
  BACKEND_URL: 'https://nodejs-http-server.onrender.com',

  // Имя камеры в MediaMTX (по умолчанию 'camera')
  DEFAULT_CAMERA: 'camera',

  // Основное видео
  INTRO_VIDEO_URL: './images/solars.mp4' // или любой другой URL
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
    async function createVideoExperience(options?: {
      introVideoUrl?: string;
      cameraName?: string;
      hlsOptions?: {
        width?: string;
        height?: string;
        position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
        autoplay?: boolean;
        muted?: boolean;
        controls?: boolean;
        showAfterIntro?: boolean;
      };
    }): Promise<void> {
      const body = document.body;

      // Очищаем страницу
      while (body.firstChild) {
        body.removeChild(body.firstChild);
      }

      // Стили для body
      Object.assign(body.style, {
        margin: '0',
        padding: '0',
        overflow: 'hidden',
        backgroundColor: '#000',
        height: '100vh',
        width: '100vw',
        position: 'relative'
      });

      // 1. СОЗДАЁМ ВСТУПИТЕЛЬНОЕ ВИДЕО
      const introVideo = createVideoElement({
        src: options?.introVideoUrl || CONFIG.INTRO_VIDEO_URL,
        autoplay: true,
        muted: true,
        loop: false,
        controls: false,
        styles: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          top: '0',
          left: '0',
          zIndex: '1'
        }
      });

      body.appendChild(introVideo);

      // 2. СОЗДАЁМ HLS ВИДЕО (скрытое)
      const cameraName = options?.cameraName || CONFIG.DEFAULT_CAMERA;
      const hlsUrl = `${CONFIG.BACKEND_URL}/hls/${cameraName}/video1_stream.m3u8`;

      console.log('🎥 HLS Stream URL:', hlsUrl);

      const hlsVideo = createVideoElement({
        src: hlsUrl,
        autoplay: options?.hlsOptions?.autoplay ?? true,
        muted: options?.hlsOptions?.muted ?? true,
        controls: options?.hlsOptions?.controls ?? true,
        playsInline: true,
        styles: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          backgroundColor: '#000',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '4px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
        }
      });

      // Контейнер для HLS видео
      const hlsContainer = document.createElement('div');
      const hlsOpts = options?.hlsOptions || {};
      const { top, left, right, bottom } = getPositionStyles(
        hlsOpts.position || 'top-left',
        hlsOpts.width || '50%',
        hlsOpts.height || '50%'
      );

      Object.assign(hlsContainer.style, {
        position: 'absolute',
        top, left, right, bottom,
        width: hlsOpts.width || '50%',
        height: hlsOpts.height || '50%',
        zIndex: '2',
        display: 'none' // Изначально скрыто
      });

      hlsContainer.appendChild(hlsVideo);
      body.appendChild(hlsContainer);

      // 3. ФУНКЦИЯ ДЛЯ ПОКАЗА HLS ПОТОКА
      const showHlsStream = async (): Promise<boolean> => {
        console.log('🔴 Включаем HLS поток...');
        hlsContainer.style.display = 'block';

        try {
          // Принудительно загружаем видео
          hlsVideo.load();

          // Ждём загрузки метаданных
          await new Promise<void>((resolve, reject) => {
            if (hlsVideo.readyState >= 1) {
              resolve();
              return;
            }

            const timeout = setTimeout(() => reject(new Error('Timeout loading HLS')), 5000);

            hlsVideo.addEventListener('loadedmetadata', () => {
              clearTimeout(timeout);
              resolve();
            }, { once: true });

            hlsVideo.addEventListener('error', (e) => {
              clearTimeout(timeout);
              reject(new Error(`Video error: ${e.message}`));
            }, { once: true });
          });

          // Пытаемся воспроизвести
          await hlsVideo.play();
          console.log('✅ HLS поток запущен успешно!');
          return true;

        } catch (error) {
          console.warn('⚠️ Автозапуск не удался:', error);

          // Показываем кнопку для ручного запуска
          showManualPlayButton(hlsContainer, hlsVideo);
          return false;
        }
      };

      // 4. ОБРАБОТКА ОКОНЧАНИЯ ВСТУПИТЕЛЬНОГО ВИДЕО
      const showAfterIntro = hlsOpts.showAfterIntro ?? true;

      if (showAfterIntro && !introVideo.loop) {
        introVideo.addEventListener('ended', () => {
          console.log('🎬 Вступительное видео завершено');
          showHlsStream();
        });

        // На случай ошибки вступительного видео
        introVideo.addEventListener('error', () => {
          console.log('⚠️ Ошибка вступительного видео, показываем поток сразу');
          showHlsStream();
        });
      } else {
        // Показываем HLS сразу
        console.log('🎬 Показываем HLS поток сразу');
        showHlsStream();
      }

      // 5. ГЛОБАЛЬНЫЙ ОБЪЕКТ ДЛЯ УПРАВЛЕНИЯ
      (window as any).videoPlayer = {
        showStream: showHlsStream,
        hideStream: () => {
          hlsContainer.style.display = 'none';
          hlsVideo.pause();
        },
        restartStream: () => {
          hlsVideo.src = hlsUrl;
          hlsVideo.load();
          setTimeout(() => hlsVideo.play().catch(console.warn), 500);
        },
        checkStream: async () => {
          const response = await fetch(`${CONFIG.BACKEND_URL}/check-stream/${cameraName}`);
          return response.json();
        },
        getStreamUrl: () => hlsUrl,
        elements: {
          introVideo,
          hlsVideo,
          hlsContainer
        }
      };

      // Запускаем вступительное видео
      introVideo.play().catch(() => {
        console.log('⚠️ Автозапуск вступительного видео заблокирован');
      });
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

    function createVideoElement(options: {
      src: string;
      autoplay: boolean;
      muted: boolean;
      controls?: boolean;
      loop?: boolean;
      playsInline?: boolean;
      styles?: Record<string, string>;
    }): HTMLVideoElement {
      const video = document.createElement('video');
      video.src = options.src;
      video.autoplay = options.autoplay;
      video.muted = options.muted;
      video.controls = options.controls || false;
      video.loop = options.loop || false;

      if (options.playsInline) {
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
      }

      if (options.styles) {
        Object.assign(video.style, options.styles);
      }

      return video;
    }

    function getPositionStyles(
      position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
      width: string,
      height: string
    ): { top: string; left: string; right: string; bottom: string } {
      switch (position) {
        case 'top-right':
          return { top: '0', left: 'auto', right: '0', bottom: 'auto' };
        case 'bottom-left':
          return { top: 'auto', left: '0', right: 'auto', bottom: '0' };
        case 'bottom-right':
          return { top: 'auto', left: 'auto', right: '0', bottom: '0' };
        default: // 'top-left'
          return { top: '0', left: '0', right: 'auto', bottom: 'auto' };
      }
    }

    function showManualPlayButton(container: HTMLElement, video: HTMLVideoElement): void {
      const button = document.createElement('div');
      button.innerHTML = `
    <div style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px 35px;
      border-radius: 12px;
      cursor: pointer;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      z-index: 10;
      border: none;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      transition: all 0.3s;
      min-width: 220px;
    ">
      <div style="font-size: 32px; margin-bottom: 10px;">▶</div>
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">
        Start Live Stream
      </div>
      <div style="font-size: 13px; opacity: 0.9;">
        Click to play live camera feed
      </div>
    </div>
  `;

      button.onclick = async () => {
        try {
          button.style.opacity = '0.7';
          button.style.transform = 'translate(-50%, -50%) scale(0.95)';

          await video.play();
          button.remove();

        } catch (error) {
          console.error('❌ Ошибка при ручном запуске:', error);
          button.innerHTML = `
        <div style="color: #ff6b6b; padding: 20px; text-align: center;">
          <div style="font-size: 24px;">⚠️</div>
          <div>Stream unavailable</div>
        </div>
      `;
        }
      };

      button.onmouseenter = () => {
        button.style.transform = 'translate(-50%, -50%) scale(1.05)';
        button.style.boxShadow = '0 15px 40px rgba(0,0,0,0.4)';
      };

      button.onmouseleave = () => {
        button.style.transform = 'translate(-50%, -50%) scale(1)';
        button.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
      };

      container.appendChild(button);
    }

    // ========== ИНИЦИАЛИЗАЦИЯ ==========
    // Простой способ запустить всё
    (window as any).startVideoExperience = (options?: any) => {
      return createVideoExperience(options);
    };

    // Для использования в консоли браузера:
    // startVideoExperience({ cameraName: 'camera' })

  }
}

new Entry();