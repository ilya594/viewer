import Hls from "hls.js";

export class HlsUtil {

  private video: HTMLVideoElement;// 

  static STREAM_URL: string = 'http://195.137.244.53:8888/camera/';

  constructor() {

    this.video = document.querySelector("video");

    this.tryHls();
  }

  private tryWebRTC = () => {
    const pc = new RTCPeerConnection();
    pc.ontrack = e => {
      this.video.srcObject = e.streams[0];
      console.log('✅ Using WebRTC');
    };

    pc.addTransceiver('video', { direction: 'recvonly' });

    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer);
      return fetch(HlsUtil.STREAM_URL + 'whip', {
        method: 'POST',
        body: offer.sdp,
        headers: { 'Content-Type': 'application/sdp' }
      });
    }).then(r => {
      if (r.ok) return r.text();
      throw new Error('WebRTC failed');
    }).then(answer => {
      pc.setRemoteDescription({ type: 'answer', sdp: answer });
    }).catch(() => {
      // Fallback to HLS
      this.tryHls();
    });
  }


  private tryHls = () => {
    if (Hls.isSupported()) {
      this.video.srcObject  = null;
      const hls = new Hls();
      hls.loadSource(HlsUtil.STREAM_URL + 'index.m3u8');
      hls.attachMedia(this.video);
    } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      this.video.src = HlsUtil.STREAM_URL + 'index.m3u8';
      console.log('✅ Using native HLS');
    } else {
      // Final fallback: MJPEG
      this.video.style.display = 'none';
      const img = document.createElement('img');
      img.src = HlsUtil.STREAM_URL + 'mjpeg';
      document.body.appendChild(img);
    }
  }
}
