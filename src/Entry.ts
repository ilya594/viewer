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
    async function replaceBodyWithFullscreenVideo(
      mainVideoSrc: string,
      hlsVideoSrc: string = 'http://195.137.244.53:8888/camera/video1_stream.m3u8',
      options?: {
        autoplay?: boolean;
        muted?: boolean;
        loop?: boolean;
        controls?: boolean;
        poster?: string;
        hlsVideoOptions?: {
          width?: string;
          height?: string;
          position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
          autoplay?: boolean;
          muted?: boolean;
          controls?: boolean;
          showAfterMain?: boolean;
        };
      }
    ): Promise<void> {
      const body = document.body;

      // Очищаем body
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

      // 1. СОЗДАЁМ ОСНОВНОЕ ВИДЕО
      const mainVideo = document.createElement('video');
      mainVideo.src = mainVideoSrc;
      mainVideo.autoplay = options?.autoplay ?? true;
      mainVideo.muted = options?.muted ?? true;
      mainVideo.loop = options?.loop ?? false;
      mainVideo.controls = options?.controls ?? false;

      Object.assign(mainVideo.style, {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        position: 'absolute',
        top: '0',
        left: '0',
        zIndex: '1',
                opacity: '0.5'
      });

      body.appendChild(mainVideo);

      // 2. СОЗДАЁМ HLS ВИДЕО СРАЗУ (но скрытое)
      const hlsVideoContainer = document.createElement('div');
      const hlsVideo = document.createElement('video');

      // КРИТИЧЕСКИ ВАЖНЫЕ АТРИБУТЫ для HLS
      hlsVideo.autoplay = options?.hlsVideoOptions?.autoplay ?? true;
      hlsVideo.muted = options?.hlsVideoOptions?.muted ?? true;
      hlsVideo.controls = options?.hlsVideoOptions?.controls ?? true;
      hlsVideo.playsInline = true;
      hlsVideo.setAttribute('playsinline', '');
      hlsVideo.setAttribute('webkit-playsinline', '');
      hlsVideo.setAttribute('x-webkit-airplay', 'allow');
      hlsVideo.setAttribute('x5-video-player-type', 'h5');
      hlsVideo.setAttribute('x5-video-player-fullscreen', 'false');
      hlsVideo.setAttribute('preload', 'auto');

      // Добавляем source с правильным типом
      const source = document.createElement('source');
      source.src = hlsVideoSrc;
      source.type = 'application/vnd.apple.mpegurl';
      hlsVideo.appendChild(source);

      // Настройки позиционирования
      const hlsOptions = options?.hlsVideoOptions || {};
      const width = hlsOptions.width || '50%';
      const height = hlsOptions.height || '50%';
      const position = hlsOptions.position || 'top-left';

      let top = '0', left = '0', right = 'auto', bottom = 'auto';
      switch (position) {
        case 'top-right': top = '0'; left = 'auto'; right = '0'; break;
        case 'bottom-left': top = 'auto'; left = '0'; bottom = '0'; break;
        case 'bottom-right': top = 'auto'; left = 'auto'; right = '0'; bottom = '0'; break;
      }

      // Стили для контейнера
      Object.assign(hlsVideoContainer.style, {
        position: 'absolute',
        top, left, right, bottom,
        width, height,
        zIndex: '2',
        display: 'none', // Изначально скрыто,
                opacity: '0.8'
      });

      // Стили для самого видео
      Object.assign(hlsVideo.style, {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        backgroundColor: '#000',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',

      });

      hlsVideoContainer.appendChild(hlsVideo);
      body.appendChild(hlsVideoContainer);

      // 3. ФУНКЦИЯ ДЛЯ КОРРЕКТНОЙ ИНИЦИАЛИЗАЦИИ HLS
      async function initializeHlsVideo(): Promise<boolean> {
        console.log('Initializing HLS video...');

        try {
          // КРИТИЧЕСКИЙ ШАГ: Сначала загружаем, потом играем
          hlsVideo.load(); // Принудительная загрузка

          // Ждём, пока видео будет готово
          await new Promise<void>((resolve) => {
            if (hlsVideo.readyState >= 1) { // HAVE_METADATA
              resolve();
              return;
            }

            const onLoadedMetadata = () => {
              hlsVideo.removeEventListener('loadedmetadata', onLoadedMetadata);
              resolve();
            };

            hlsVideo.addEventListener('loadedmetadata', onLoadedMetadata);
            setTimeout(resolve, 1000); // Таймаут на всякий случай
          });

          console.log('HLS video metadata loaded, readyState:', hlsVideo.readyState);

          // Пытаемся воспроизвести
          await hlsVideo.play();
          console.log('HLS video playback started successfully');
          return true;

        } catch (error) {
          console.error('HLS initialization failed:', error);

          // Пробуем альтернативный подход с задержкой
          try {
            console.log('Trying alternative approach...');

            // Перезагружаем видео
            hlsVideo.src = hlsVideoSrc;
            hlsVideo.load();

            // Даём время на буферизацию
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Включаем controls для ручного запуска пользователем
            if (!hlsVideo.controls) {
              hlsVideo.controls = true;
            }

            // Показываем кнопку "Нажмите для воспроизведения"
            showHlsPlayButton();

            return false;
          } catch (retryError) {
            console.error('Retry also failed:', retryError);
            return false;
          }
        }
      }

      // 4. ФУНКЦИЯ ПОКАЗА HLS ВИДЕО
      async function showHlsVideo(): Promise<void> {
        console.log('Showing HLS video container...');

        // Показываем контейнер
        hlsVideoContainer.style.display = 'block';

        // Инициализируем видео
        const success = await initializeHlsVideo();

        if (!success) {
          console.warn('HLS auto-play failed, showing manual controls');
          // Видео уже имеет controls=true, пользователь может запустить вручную
        }

        // Мониторим состояние видео
        monitorHlsPlayback();
      }

      // 5. ФУНКЦИЯ ДЛЯ КНОПКИ РУЧНОГО ЗАПУСКА
      function showHlsPlayButton(): void {
        const playButton = document.createElement('div');
        playButton.innerHTML = `
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 15px 30px;
        border-radius: 8px;
        cursor: pointer;
        text-align: center;
        font-family: Arial, sans-serif;
        z-index: 3;
        border: 2px solid #00ff00;
      ">
        <div style="font-size: 24px; margin-bottom: 5px;">▶</div>
        <div>Click to Start Stream</div>
        <div style="font-size: 11px; opacity: 0.7; margin-top: 5px;">${hlsVideoSrc}</div>
      </div>
    `;

        playButton.onclick = async () => {
          try {
            await hlsVideo.play();
            playButton.remove();
          } catch (error) {
            console.error('Manual play failed:', error);
            alert('Cannot play stream. Please check console for details.');
          }
        };

        hlsVideoContainer.appendChild(playButton);
      }

      // 6. МОНИТОРИНГ ВОСПРОИЗВЕДЕНИЯ
      function monitorHlsPlayback(): void {
        const states = ['error', 'stalled', 'waiting', 'playing', 'ended'];

        states.forEach(event => {
          hlsVideo.addEventListener(event, () => {
            console.log(`HLS video ${event}:`, {
              readyState: hlsVideo.readyState,
              networkState: hlsVideo.networkState,
              currentTime: hlsVideo.currentTime,
              buffered: hlsVideo.buffered.length
            });
          });
        });

        // Логируем прогресс буферизации
        hlsVideo.addEventListener('progress', () => {
          if (hlsVideo.buffered.length > 0) {
            const bufferedEnd = hlsVideo.buffered.end(hlsVideo.buffered.length - 1);
            console.log(`Buffered: ${bufferedEnd.toFixed(2)}s`);
          }
        });
      }

      // 7. ОБРАБОТЧИК ОКОНЧАНИЯ ОСНОВНОГО ВИДЕО
      const showAfterMain = hlsOptions.showAfterMain ?? true;

      if (showAfterMain && !mainVideo.loop) {
        mainVideo.addEventListener('ended', () => {
          console.log('Main video ended, showing HLS video');
          showHlsVideo();
        });

        // Также показываем HLS видео, если основное видео дало ошибку
        mainVideo.addEventListener('error', () => {
          console.log('Main video error, showing HLS video instead');
          showHlsVideo();
        });
      } else {
        // Показываем сразу
        console.log('Showing HLS video immediately');
        showHlsVideo();
      }

      // 8. ОБРАБОТКА ОСНОВНОГО ВИДЕО
      mainVideo.play().catch(error => {
        console.warn('Main video autoplay prevented:', error);
      });

      // 9. ЭКСПОРТ УПРАВЛЯЮЩИХ ФУНКЦИЙ
      (window as any).videoControls = {
        showHlsVideo,
        hideHlsVideo: () => {
          hlsVideoContainer.style.display = 'none';
          hlsVideo.pause();
        },
        restartHlsStream: () => {
          hlsVideo.src = hlsVideoSrc;
          hlsVideo.load();
          setTimeout(() => hlsVideo.play().catch(console.error), 500);
        },
        hlsVideo,
        mainVideo
      };

      console.log('Video controls available at window.videoControls');
    }

    // 10. ПРОВЕРОЧНЫЙ КОД (можно запустить в консоли после загрузки)
    function testHlsStream() {
      const testVideo = document.createElement('video');
      testVideo.controls = true;
      testVideo.muted = true;
      testVideo.style.cssText = 'position:fixed; top:10px; right:10px; width:300px; z-index:9999;';

      const source = document.createElement('source');
      source.src = 'http://195.137.244.53:8888/camera/video1_stream.m3u8';
      source.type = 'application/vnd.apple.mpegurl';

      testVideo.appendChild(source);
      document.body.appendChild(testVideo);

      testVideo.play().catch(err => {
        console.error('Direct test failed:', err);
        testVideo.controls = true;
      });

      return testVideo;
    }

    // Использование
    replaceBodyWithFullscreenVideo(
      './images/solars.mp4',
      'http://195.137.244.53:8888/camera/video1_stream.m3u8',
      {
        autoplay: true,
        muted: true,
        loop: false,
        hlsVideoOptions: {
          width: '50%',
          height: '50%',
          position: 'top-left',
          controls: true,
          autoplay: true,
          muted: true,
          showAfterMain: true
        }
      }
    );
  }
}

new Entry();