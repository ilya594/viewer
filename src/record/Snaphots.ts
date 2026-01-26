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
import EventHandler, { MOBILE_SWIPE_RIGHT, MOTION_DETECTION_STARTED, SNAPSHOT_SEND_HOMIE, STREAM_SWITCHED } from '../utils/Events';
import { HlsUtil } from '../utils/HlsUtil';
import { StreamUserNotes } from '../utils/Notes';

class Snaphots {

    private _container: any;
    private _viewport: any;
    private _proxy: any;
    private _buffer: OffscreenCanvas | any;
    private _snapsaver: any;
    private _snapshot: any;
    private _count = 0;
    private _tween: any;
    private _streamNotes: StreamUserNotes;
    private get w() { return this._viewport.getBoundingClientRect().width; }
    private get h() { return this._viewport.getBoundingClientRect().height; }

    public get playing() { return !!this._tween?.isPlaying; };

    public initialize = async () => {
        this._container = document.getElementById("view-page");

        this._viewport = document.querySelector("video");
        this._viewport.addEventListener("click", this.onViewportClick);
        MobileUtils.on(document).addEventListener(MOBILE_SWIPE_RIGHT, this.onViewportClick);
        //   this._viewport.addEventListener("touchstart", this.onViewportClick);

        this._snapsaver = document.createElement("canvas"); this._container.appendChild(this._snapsaver);
        this._snapsaver.style.setProperty('position', 'absolute');
        this._snapsaver.addEventListener("click", this.onViewportClick);
        // this._snapsaver.addEventListener("touchstart", this.onViewportClick);
        this._snapsaver.style.setProperty('transform', 'translate(' + 0 + 'px,' + 0 + 'px)' + 'scale(' + 1 + ',' + 1 + ')');
        let context = this._snapsaver.getContext('2d', { willReadFrequently: true });
        context.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

        this._snapshot = document.createElement("canvas"); this._container.appendChild(this._snapshot);
        this._snapshot.style.setProperty('position', 'absolute');

        this._snapshot.width = SNAP_WIDTH;
        this._snapshot.height = SNAP_HEIGHT;
        this._snapshot.getContext('2d', { willReadFrequently: true }).globalAlpha = 0;
        this._snapshot.getContext('2d').beginPath();
        this._snapshot.getContext('2d').lineWidth = "0";
        this._snapshot.getContext('2d').strokeStyle = "black";
        this._snapshot.getContext('2d').rect(0, 0, SNAP_WIDTH, SNAP_HEIGHT);
        this._snapshot.getContext('2d').stroke();
        //this._snapshot.onclick = () => this.viewSnapshotCollection();

        this._proxy = document.createElement("canvas");

        this.createBufferCanvas();

        EventHandler.addEventListener(MOTION_DETECTION_STARTED, (data: any) => this.create('', false, data));
        this._streamNotes = new StreamUserNotes('main-stream');
        requestAnimationFrame(this.tick);
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
    }

    public create = (source: string = '', send: Boolean = false, data: any = null) => {
        this.createSnaphot(this.drawCanvasFromVideo(this._proxy, this._viewport, source, data), send);
    }

    private onViewportClick = (event: MouseEvent) => {
        // 1. Показываем поле ввода
        const input = document.createElement('input');
        input.type = 'text';
        input.style.cssText = `
        position: fixed;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
        z-index: 10000;
        background: rgba(0,0,0,0.9);
        color: yellow;
        border: 2px solid #167bff;
        padding: 8px;
        font-size: 18px;
        font-family: Comic Sans MS, Comic Sans, cursive;
      
        outline: none;
        min-width: 200px;
    `;

        document.body.appendChild(input);
        input.focus();

        // 2. Обработка сохранения
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                const text = input.value.trim();
                if (text) {
                    // Создаем UserNote
                    const containerRect = this._container.getBoundingClientRect();
                    const x = event.clientX - containerRect.left;
                    const y = event.clientY - containerRect.top;

                    const note = this._streamNotes.createNote(text + '📌', x, y);

                    // Создаем визуальный элемент
                    const noteEl = document.createElement('div');
                    noteEl.textContent = note.text;
                    noteEl.style.cssText = `
                    position: absolute;
                    left: ${note.x}px;
                    top: ${note.y}px;
                    color: yellow;
                    font-size: 18px;
                   
                    font-family: Comic Sans MS, Comic Sans, cursive;
                    z-index: 9999;
                    pointer-events: none;
                `;

                    this._container.appendChild(noteEl);
                }

                // Удаляем поле ввода
                input.remove();
                document.removeEventListener('keydown', handleKeyDown);
            }

            if (e.key === 'Escape') {
                input.remove();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };

        // 3. Обработка потери фокуса
        const handleBlur = () => {
            setTimeout(() => {
                if (document.activeElement !== input) {
                    input.remove();
                    document.removeEventListener('keydown', handleKeyDown);
                    input.removeEventListener('blur', handleBlur);
                }
            }, 100);
        };

        document.addEventListener('keydown', handleKeyDown);
        input.addEventListener('blur', handleBlur);
    };

    private switchStreams = () => {
        EventHandler.dispatchEvent(STREAM_SWITCHED);
        const stream: any = StreamProvider.getNextStream();
        if (!stream) {
            new HlsUtil();
        } else {
            const viewport = document.querySelector("video");
            viewport.srcObject = stream;//;
        }


    }

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
        const end = { scaleX: SNAP_WIDTH / w, scaleY: SNAP_HEIGHT / h, x: this._viewport.getBoundingClientRect().left - this._viewport.offsetLeft - this._viewport.offsetParent.offsetLeft + (this.w - SNAP_WIDTH) / 2, y: -(h - SNAP_HEIGHT) / 2 };   //TODO simplify this !!!!!
        this._tween = new TWEEN.Tween(ini)
            .to({ scaleX: end.scaleX, scaleY: end.scaleY, x: end.x, y: end.y }, 333)
            .easing(TWEEN.Easing.Linear.None)
            .onUpdate(() => this._snapsaver.style.setProperty('transform',
                'translate(' + ini.x + 'px,' + ini.y + 'px)' +
                'scale(' + ini.scaleX + ',' + ini.scaleY + ')'))
            .onComplete(() => this.onSaverTweenComplete())
            .onStop(() => this.onSaverTweenComplete())
            .start();
    }

    private onSaverTweenComplete = () => {
        this._snapshot.style.setProperty('transform', 'translate(' + String(this._viewport.getBoundingClientRect().left - this._viewport.offsetLeft - this._viewport.offsetParent.offsetLeft + (this.w - SNAP_WIDTH) / 2) + 'px,' + String(-(this.h - SNAP_HEIGHT) / 2) + 'px)' + 'scale(' + 1 + ',' + 1 + ')');    //TODO simplify this !!!!!

        this._snapshot.getContext('2d', { willReadFrequently: true }).globalAlpha = 1;
        this._snapshot.getContext('2d').clearRect(0, 0, SNAP_WIDTH + 1, SNAP_HEIGHT) + 1;
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

    }

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
                '<div width="100%" height="100%">' + '<img src="' + data + '" width="' + VIDEO_WIDTH + 'px" height="' + VIDEO_HEIGHT + 'px">' + '</div>';
        });
    }

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
    }

    private dispatchSendEvent = () => {
        this.bufferToDataUrl((data: string) => EventHandler.dispatchEvent(SNAPSHOT_SEND_HOMIE, data));
    }

    private tick = (time: number) => {
        requestAnimationFrame(this.tick);
        TWEEN.update(time);
    };
}

export default new Snaphots();

