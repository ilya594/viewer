import * as TWEEN from '@tweenjs/tween.js';
import {
    VIDEO_WIDTH,
    VIDEO_HEIGHT,
    SNAP_WIDTH,
    SNAP_HEIGHT,
    SNAP_COUNT,
    SNAP_SAVER_OPACITY,
} from "../utils/Constants";
import * as Utils from "../utils/Utils";

import Controls from '../view/Controls';
import FileSaver from 'file-saver';
import StreamProvider from '../network/StreamProvider';
import MobileUtils from '../utils/MobileUtils';
import EventHandler, { MOBILE_SWIPE_RIGHT, MOTION_DETECTION_STARTED, SNAPSHOT_SEND_HOMIE, STREAM_RECEIVED, STREAM_SWITCHED } from '../utils/Events';
import { HlsUtil } from '../utils/HlsUtil';
import NotesManager from '../utils/NotesManager';

class Snaphots {
    private _container: any;
    private _viewport: any;
    private _proxy: any;
    private _buffer: OffscreenCanvas | any;
    private _snapsaver: any;
    private _snapshot: any;
    private _count = 0;
    private _tween: any;
    private _previewTween: any;
    // Preview video
    private _previewVideo: HTMLVideoElement | null = null;
    private _previewContainer: HTMLElement | null = null;

    private get w() { return this._viewport.getBoundingClientRect().width; }
    private get h() { return this._viewport.getBoundingClientRect().height; }

    public get playing() { return !!this._tween?.isPlaying; };

    public initialize = async () => {
        this._container = document.getElementById("view-page");

        this._viewport = document.querySelector("video");
        this._viewport.addEventListener("click", this.onViewportClick);
        MobileUtils.on(document).addEventListener(MOBILE_SWIPE_RIGHT, this.onViewportClick);

        this._snapsaver = document.createElement("canvas");
        this._container.appendChild(this._snapsaver);
        this._snapsaver.style.setProperty('position', 'absolute');
        this._snapsaver.addEventListener("click", this.onViewportClick);
        this._snapsaver.style.setProperty('transform', 'translate(' + 0 + 'px,' + 0 + 'px)' + 'scale(' + 1 + ',' + 1 + ')');

        document.getElementById("next-stream-button").addEventListener("click", this.switchStreams);

        let context = this._snapsaver.getContext('2d', { willReadFrequently: true });
        context.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

        this._snapshot = document.createElement("canvas");
        this._container.appendChild(this._snapshot);
        this._snapshot.style.setProperty('position', 'absolute');
        this._snapshot.width = SNAP_WIDTH;
        this._snapshot.height = SNAP_HEIGHT;
        this._snapshot.getContext('2d', { willReadFrequently: true }).globalAlpha = 0;
        this._snapshot.getContext('2d').beginPath();
        this._snapshot.getContext('2d').lineWidth = "0";
        this._snapshot.getContext('2d').strokeStyle = "black";
        this._snapshot.getContext('2d').rect(0, 0, SNAP_WIDTH, SNAP_HEIGHT);
        this._snapshot.getContext('2d').stroke();

        this._proxy = document.createElement("canvas");

        this.createBufferCanvas();

        EventHandler.addEventListener(MOTION_DETECTION_STARTED, (data: any) => this.create('', false, data));

        // Инициализируем менеджер заметок
        EventHandler.addEventListener(STREAM_RECEIVED, async () => {
            await NotesManager.initialize("view-page");
            // После получения стрима обновляем preview
            setTimeout(() => {
                this.updatePreviewVideo();
            }, 1000);
        });

        // Слушаем переключение стримов
        EventHandler.addEventListener(STREAM_SWITCHED, () => {
            setTimeout(() => {
                this.updatePreviewVideo();
            }, 300);
        });

        // Создаем preview video
        this.createPreviewVideo();

        requestAnimationFrame(this.tick);
    };

    /**
     * Создает preview video
     */
    private createPreviewVideo = () => {
        // Контейнер
        this._previewContainer = document.createElement('div');
        this._previewContainer.id = 'preview-container';
        this._previewContainer.style.cssText = `
        position: absolute;
        bottom: 20px;
        right: 20px;
        width: 160px;
        height: 90px;
        cursor: pointer;
        z-index: 998;
        background: #000;
        border-radius: 4px;
        overflow: hidden;
        transition: transform 0.15s ease, z-index 0.15s ease;
    `;

        // Video элемент
        this._previewVideo = document.createElement('video');
        this._previewVideo.id = 'preview-video';
        this._previewVideo.playsInline = true;

        // Устанавливаем атрибуты ДО добавления в DOM
        this._previewVideo.setAttribute('muted', '');
        this._previewVideo.setAttribute('autoplay', '');

        this._previewVideo.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        background: #000;
        border: 2px solid #167bff;
        transition: transform 0.15s ease;
    `;

        // Добавляем обработчик для принудительного play
        this._previewVideo.addEventListener('loadeddata', () => {
            this.playPreviewVideo();
        });

        // Добавляем обработчик ошибок
        this._previewVideo.addEventListener('error', (e) => {
            console.error('Preview video error:', e);
        });

        // Добавляем в контейнер
        this._previewContainer.appendChild(this._previewVideo);

        // Добавляем в основной контейнер
        this._container.appendChild(this._previewContainer);

        // Обработчик клика для переключения
        this._previewContainer.addEventListener('click', this.switchToPreviewStream);

        // Обработчик для touch устройств
        this._previewContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.switchToPreviewStream();
        });

        // Анимация при наведении
        this._previewContainer.addEventListener('mouseenter', this.onPreviewMouseEnter);
        this._previewContainer.addEventListener('mouseleave', this.onPreviewMouseLeave);
    };

    /**
     * Анимация при наведении на preview
     */
    private onPreviewMouseEnter = () => {
        if (!this._previewContainer || !this._previewVideo) return;

        // Останавливаем предыдущую анимацию если есть
        if (this._previewTween) {
            this._previewTween.stop();
        }

        const currentRect = this._previewContainer.getBoundingClientRect();
        const scaleX = SNAP_WIDTH / currentRect.width;
        const scaleY = SNAP_HEIGHT / currentRect.height;

        // Центрируем увеличенный preview
        const translateX = -(currentRect.width * scaleX - currentRect.width) / 2;
        const translateY = -(currentRect.height * scaleY - currentRect.height) / 2;

        this._previewContainer.style.zIndex = '1001'; // Повышаем z-index

        this._previewTween = new TWEEN.Tween({
            scale: 1,
            translateX: 0,
            translateY: 0
        })
            .to({
                scale: Math.min(scaleX, scaleY),
                translateX: translateX,
                translateY: translateY
            }, 150)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate((obj) => {
                this._previewContainer!.style.transform =
                    `translate(${obj.translateX}px, ${obj.translateY}px) scale(${obj.scale})`;
            })
            .start();
    };

    /**
     * Анимация при уходе курсора с preview
     */
    private onPreviewMouseLeave = () => {
        if (!this._previewContainer || !this._previewVideo) return;

        // Останавливаем предыдущую анимацию если есть
        if (this._previewTween) {
            this._previewTween.stop();
        }

        this._previewTween = new TWEEN.Tween({
            scale: parseFloat(this._previewContainer.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || '1'),
            translateX: parseFloat(this._previewContainer.style.transform?.match(/translate\(([^)]+)\)/)?.[1]?.split(',')[0] || '0'),
            translateY: parseFloat(this._previewContainer.style.transform?.match(/translate\(([^)]+)\)/)?.[1]?.split(',')[1] || '0')
        })
            .to({
                scale: 1,
                translateX: 0,
                translateY: 0
            }, 150)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate((obj) => {
                this._previewContainer!.style.transform =
                    `translate(${obj.translateX}px, ${obj.translateY}px) scale(${obj.scale})`;
            })
            .onComplete(() => {
                this._previewContainer!.style.zIndex = '998'; // Возвращаем исходный z-index
            })
            .start();
    };

    /**
     * Пытается запустить preview видео
     */
    private playPreviewVideo = async () => {
        if (!this._previewVideo) return;

        try {
            if (this._previewVideo.readyState >= 2) { // HAVE_CURRENT_DATA или выше
                await this._previewVideo.play().catch(e => {
                    console.warn('Auto-play prevented:', e);
                    // Добавляем overlay для ручного запуска
                    this.addPlayOverlay();
                });
            }
        } catch (error) {
            console.warn('Failed to play preview video:', error);
        }
    };

    /**
     * Добавляет overlay для ручного запуска видео
     */
    private addPlayOverlay = () => {
        if (!this._previewContainer) return;

        // Удаляем существующий overlay
        this.removePlayOverlay();

        const overlay = document.createElement('div');
        overlay.id = 'preview-play-overlay';
        overlay.textContent = '▶';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: pointer;
            z-index: 1000;
        `;

        overlay.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await this._previewVideo?.play();
                this.removePlayOverlay();
            } catch (error) {
                console.warn('Manual play failed:', error);
            }
        });

        this._previewContainer.appendChild(overlay);
    };

    /**
     * Удаляет overlay для ручного запуска
     */
    private removePlayOverlay = () => {
        if (!this._previewContainer) return;

        const overlay = this._previewContainer.querySelector('#preview-play-overlay');
        if (overlay) {
            overlay.remove();
        }
    };

    /**
     * Обновляет preview video (показывает следующий стрим)
     */
    private updatePreviewVideo = () => {
        if (!this._previewVideo) return;

        console.log('Updating preview video...');

        // Получаем следующий стрим
        const nextStream = StreamProvider.getNextStreamSilently();

        if (nextStream) {
            console.log('Setting preview stream srcObject');
            this._previewVideo.srcObject = nextStream;

            // Убираем overlay если есть
            this.removePlayOverlay();

            // Пытаемся запустить видео
            setTimeout(() => {
                this.playPreviewVideo();
            }, 100);
        } else {
            console.log('No stream for preview');
            this._previewVideo.srcObject = null;
        }
    };

    /**
     * Переключает на стрим из preview
     */
    private switchToPreviewStream = () => {
        console.log('Switching to preview stream...');

        // Получаем следующий стрим (это тот же, что в preview)
        const nextStream = StreamProvider.getNextStream();

        if (nextStream) {
            console.log('Switching main viewport to next stream');
        //    NotesManager.hideCurrentNotes();
            // Переключаем основной viewport
            this._viewport.srcObject = nextStream;

            // Диспатчим событие переключения
            EventHandler.dispatchEvent(STREAM_SWITCHED);

            // Обновляем preview через небольшую задержку
            setTimeout(() => {
                this.updatePreviewVideo();
            }, 300);
        }
    };

    private onViewportClick = async (event: MouseEvent) => {
        await NotesManager.createNote(event);
    };

    private createBufferCanvas = () => {
        try {
            this._buffer = new OffscreenCanvas(VIDEO_WIDTH * SNAP_COUNT, VIDEO_HEIGHT * SNAP_COUNT);
        } catch (error: any) {
            this._buffer = document.createElement("canvas");
        }

        this._buffer.width = VIDEO_WIDTH * SNAP_COUNT;
        this._buffer.height = VIDEO_HEIGHT * SNAP_COUNT;
        this._buffer.getContext('2d', { willReadFrequently: true }).beginPath();
        this._buffer.getContext('2d').lineWidth = 1;
        this._buffer.getContext('2d').strokeStyle = "black";
        this._buffer.getContext('2d').rect(0, 0, VIDEO_WIDTH * 5, VIDEO_HEIGHT * 5);
        this._buffer.getContext('2d').stroke();
    };

    public create = (source: string = '', send: Boolean = false, data: any = null) => {
        this.createSnaphot(this.drawCanvasFromVideo(this._proxy, this._viewport, source, data), send);
    };

    private switchStreams = () => {
        EventHandler.dispatchEvent(STREAM_SWITCHED);
        const stream: any = StreamProvider.getNextStream();
        const viewport = document.querySelector("video");
        viewport.srcObject = stream;

      //  NotesManager.hideCurrentNotes();

        // Обновляем preview после переключения
        setTimeout(() => {
            this.updatePreviewVideo();
        }, 300);
    };

    private drawCanvasFromVideo(canvas: HTMLCanvasElement, video: any, source: string, data: any = null): HTMLCanvasElement {
        const w: number = canvas.width = video.getBoundingClientRect().width;
        const h: number = canvas.height = video.getBoundingClientRect().height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context?.clearRect(0, 0, w, h);
        context?.drawImage(video, 0, 0, w, h);
        Utils.addTimeStamp(canvas);
        Utils.addSourceStamp(canvas, source);
        Utils.addDataStamp(canvas, data);
        return canvas;
    };

    private createSnaphot = (source: HTMLCanvasElement, send: Boolean) => {
        if (this.playing) this._tween.stop();

        const x: number = (this._count % SNAP_COUNT) * VIDEO_WIDTH;
        const y: number = Math.floor(this._count / SNAP_COUNT) * VIDEO_HEIGHT;

        this._buffer.getContext('2d', { willReadFrequently: true }).drawImage(source, x, y, VIDEO_WIDTH, VIDEO_HEIGHT);

        this._snapsaver.style.setProperty('display', 'inline');
        this._snapsaver.width = this.w;
        this._snapsaver.height = this.h;
        this._snapsaver.getContext('2d', { willReadFrequently: true }).globalAlpha = SNAP_SAVER_OPACITY;
        this._snapsaver.getContext('2d').drawImage(source, 0, 0, this.w, this.h);

        this.startSaverTween(this.w, this.h);
    };

    private startSaverTween = (w: number, h: number) => {
        const ini = { scaleX: 1, scaleY: 1, x: 0, y: 0 };
        const end = {
            scaleX: SNAP_WIDTH / w,
            scaleY: SNAP_HEIGHT / h,
            x: this._viewport.getBoundingClientRect().left - this._viewport.offsetLeft - this._viewport.offsetParent.offsetLeft + (this.w - SNAP_WIDTH) / 2,
            y: -(h - SNAP_HEIGHT) / 2
        };

        this._tween = new TWEEN.Tween(ini)
            .to({ scaleX: end.scaleX, scaleY: end.scaleY, x: end.x, y: end.y }, 333)
            .easing(TWEEN.Easing.Linear.None)
            .onUpdate(() => this._snapsaver.style.setProperty('transform',
                'translate(' + ini.x + 'px,' + ini.y + 'px)' +
                'scale(' + ini.scaleX + ',' + ini.scaleY + ')'))
            .onComplete(() => this.onSaverTweenComplete())
            .onStop(() => this.onSaverTweenComplete())
            .start();
    };

    private onSaverTweenComplete = () => {
        this._snapshot.style.setProperty('transform',
            'translate(' +
            String(this._viewport.getBoundingClientRect().left - this._viewport.offsetLeft - this._viewport.offsetParent.offsetLeft + (this.w - SNAP_WIDTH) / 2) +
            'px,' +
            String(-(this.h - SNAP_HEIGHT) / 2) +
            'px)' +
            'scale(' + 1 + ',' + 1 + ')'
        );

        this._snapshot.getContext('2d', { willReadFrequently: true }).globalAlpha = 1;
        this._snapshot.getContext('2d').clearRect(0, 0, SNAP_WIDTH + 1, SNAP_HEIGHT + 1);
        this._snapshot.getContext('2d').drawImage(this._snapsaver, 0, 0, SNAP_WIDTH, SNAP_HEIGHT);
        this._snapshot.getContext('2d').beginPath();
        this._snapshot.getContext('2d').lineWidth = "1";
        this._snapshot.getContext('2d').strokeStyle = "black";
        this._snapshot.getContext('2d').rect(0, 0, SNAP_WIDTH, SNAP_HEIGHT);
        this._snapshot.getContext('2d').stroke();

        this._snapsaver.style.setProperty('transform', 'translate(' + 0 + 'px,' + 0 + 'px)' + 'scale(' + 1 + ',' + 1 + ')');
        this._snapsaver.style.setProperty('display', 'none');
        this._snapsaver.getContext('2d', { willReadFrequently: true }).clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

        document.getElementById("snaps-button").innerHTML = String(++this._count);

        if (this._count === SNAP_COUNT * SNAP_COUNT) this.flushBuffer();
    };

    public flushBuffer = () => {
        this.dispatchSendEvent();
        (this._buffer.getContext('2d', { willReadFrequently: true }) as any).clearRect(0, 0, VIDEO_WIDTH * SNAP_COUNT, VIDEO_HEIGHT * SNAP_COUNT);
        this._buffer.width = VIDEO_WIDTH * SNAP_COUNT;
        this._buffer.height = VIDEO_HEIGHT * SNAP_COUNT;
        document.getElementById("snaps-button").innerHTML = String(this._count = 0);
    };

    private viewSnapshotCollection = async () => {
        this.bufferToDataUrl((data: string) => {
            const tab: any = window.open();
            tab.document.body.style.width = tab.document.body.style.height = '100%';
            tab.document.body.style.overflow = 'hidden';
            tab.document.body.innerHTML =
                '<div width="100%" height="100%">' +
                '<img src="' + data + '" width="' + VIDEO_WIDTH + 'px" height="' + VIDEO_HEIGHT + 'px">' +
                '</div>';
        });
    };

    private bufferToDataUrl = (callback: Function): void => {
        (this._buffer as OffscreenCanvas).convertToBlob().then((value: Blob) => {
            if (Controls?.localSaveEnabled) {
                const name = new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0];
                FileSaver.saveAs(value, name.toString() + '.png');
            }

            const reader: FileReader = new FileReader();
            const file: File = new File([value], '_.png', { type: 'image/png' });

            reader.onload = (result: any) => callback(result?.target?.result);
            reader.readAsDataURL(file);
        });
    };

    private dispatchSendEvent = () => {
        this.bufferToDataUrl((data: string) => EventHandler.dispatchEvent(SNAPSHOT_SEND_HOMIE, data));
    };

    private tick = (time: number) => {
        requestAnimationFrame(this.tick);
        TWEEN.update(time);
    };
}

export default new Snaphots();