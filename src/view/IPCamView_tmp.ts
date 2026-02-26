export class IPCamView_tmp {

  constructor() { }

  public async getStream(): Promise<MediaStream> {

    const serverUrl = 'https://stairs.live/nserver/api/webrtc/camera/';
    console.log('🚀 Подключаемся к WebRTC:', serverUrl);

    return new Promise(async (resolve, reject) => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });

        const transceiver = pc.addTransceiver('video', {
          direction: 'recvonly',
          streams: [] 
        });

        const timeout = setTimeout(() => {
          reject(new Error('Timeout: No video track received'));
          pc.close();
        }, 10000);

        pc.ontrack = (event) => {
          if (event.track.kind === 'video') {
            const stream = new MediaStream([event.track]);

            event.track.onended = () => {
              console.log('📡 Видеотрек завершен');
            };

            clearTimeout(timeout);
            resolve(stream);
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
            clearTimeout(timeout);
            reject(new Error(`ICE connection failed: ${pc.iceConnectionState}`));
          }
        };

        const offer = await pc.createOffer({
          offerToReceiveVideo: true,
          offerToReceiveAudio: false
        });

        await pc.setLocalDescription(offer);

        const response = await fetch(serverUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/sdp'
          },
          body: offer.sdp
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        let answerSdp = await response.text();
        console.log('📥 Получен answer от сервера');

        if (!answerSdp.includes('ice-ufrag') && pc.localDescription) {
          const localSdp = pc.localDescription.sdp;
          const ufragMatch = localSdp.match(/a=ice-ufrag:(\S+)/);
          const pwdMatch = localSdp.match(/a=ice-pwd:(\S+)/);

          if (ufragMatch && pwdMatch) {
            answerSdp += `\r\na=ice-ufrag:${ufragMatch[1]}\r\na=ice-pwd:${pwdMatch[1]}`;
            console.log('📝 Добавлены ICE параметры в answer');
          }
        }

        console.log('📥 Установка удаленного описания...');
        await pc.setRemoteDescription({
          type: 'answer',
          sdp: answerSdp
        });

        console.log('✅ WebRTC соединение установлено, ожидание видеотрека...');

      } catch (error) {
        reject(error);
      }
    });
  }
}

export default new IPCamView_tmp;