export class IPCamView_tmp {


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

    const serverUrl = 'https://nodejs-http-server.onrender.com/api/webrtc/camera/';
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
    document.querySelector('picture').style.opacity = '0.5';    // 1. ПРЕЛОАД ОСНОВНОГО ВИДЕО
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
    document.querySelector('picture').style.opacity = '0';
    const introVideo = document.createElement('video');
    introVideo.src = introVideoUrl;
    introVideo.autoplay = true;
    introVideo.muted = true;
    introVideo.loop = true;
    introVideo.controls = false;
    introVideo.playsInline = true;

    Object.assign(introVideo.style, {
      width: '120%',
      height: '120%',
      objectFit: 'cover',
      position: 'fixed',
      top: '-10%',
      left: '-10%',
      zIndex: '1',
      opacity: '0.4'
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

export default IPCamView_tmp;