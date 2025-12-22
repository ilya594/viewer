import Snaphots from "../record/Snaphots";
import EventHandler, { COLOR_CURVES_STATE_CHANGED, MOTION_DETECTION_STARTED, STREAM_SWITCHED } from "../utils/Events";
import { MOTION_DETECT_CHECKPOINT_SIZE, MOTION_DETECT_DELAY, MOTION_DETECT_HEAP_SIZE, MOTION_DETECT_PIXEL_COEF } from "../utils/Constants";
import * as Utils from "../utils/Utils";
import Controls from "../view/Controls";
import Matrix from "../view/Matrix";
import Model from "../store/Model";

export class MotionDetector {

    private _viewport: HTMLVideoElement | any;
    private _container: any;

    private _label: any;
    private _graphic: any;

    private _checkpoint: any = {
        size: MOTION_DETECT_CHECKPOINT_SIZE,
        coefs: [0.66, 0.33],
        canvas: null,
        context: function () {
            return this.canvas.getContext('2d', { willReadFrequently: true });
        }
    };

    private _shiftpoint: any = {
        size: MOTION_DETECT_CHECKPOINT_SIZE,
        coefs: [0.96, 0.96],
        canvas: null,
        context: function () {
            return this.canvas.getContext('2d', { willReadFrequently: true });
        }
    };


    private _values: DeltaValues = new DeltaValues();

    private get _width() { return this._viewport.videoWidth }
    private get _height() { return this._viewport.videoHeight }

    public initialize = async () => {

        this._viewport = document.querySelector("video");

        EventHandler.addEventListener(STREAM_SWITCHED, () => this._values = new DeltaValues());

        this.startDetector();
    };

    private startDetector = async () => {

        this._container = document.getElementById("view-page");

        this.aimview();

        this._label = document.createElement("label"); this._container.appendChild(this._label);
        this._label.style.setProperty('position', 'absolute');
        this._label.style.setProperty('top', '3%');
        this._label.style.setProperty('left', '13%');
        this._label.style.setProperty('font-size', '34px');
        this._label.style.setProperty('font-family', 'Courier New');
        this._label.style.setProperty('font-weight', 'bold');
        this._label.style.setProperty('color', '#00ff30');
        this._label.style.setProperty('visibility', 'hidden');

        this._graphic = document.createElement("canvas"); this._container.appendChild(this._graphic);
        this._graphic.style.setProperty("pointer-events", "none");
        this._graphic.style.setProperty('position', 'absolute');
        this._graphic.style.setProperty('bottom', '0%');
        this._graphic.style.setProperty('left', '0%');
        this._graphic.style.setProperty('height', '40%');
        this._graphic.style.setProperty('width', '100%');
        this._graphic.style.setProperty('display', 'none');

        EventHandler.addEventListener(COLOR_CURVES_STATE_CHANGED, (value: boolean) => {
            const propValue = value ? 'block' : 'none';
            this._graphic.style.setProperty('display', propValue);
            this._label.style.setProperty('display', propValue);
        });

        this._viewport.requestVideoFrameCallback(this.onVideoEnterFrame);
    }

    private aimview = () => {
        this._checkpoint.canvas = document.createElement("canvas"); //this._container.appendChild(this._points.canvas);         
        this._checkpoint.canvas.width = this._checkpoint.size;
        this._checkpoint.canvas.height = this._checkpoint.size;
        this._checkpoint.context().globalCompositeOperation = "difference";

        this._shiftpoint.canvas = document.createElement("canvas"); //this._container.appendChild(this._points.canvas);         
        this._shiftpoint.canvas.width = this._shiftpoint.size;
        this._shiftpoint.canvas.height = this._shiftpoint.size;
        this._shiftpoint.context().globalCompositeOperation = "difference";
    }

    private onVideoEnterFrame = (...args: any) => {
        this.drawCheckpoint();
        this.analyzeVideoFrame();
    };

    private drawCheckpoint = () => {

        const size = this._checkpoint.size;

        const context = this._checkpoint.context();

        context.clearRect(0, 0, size, size);

        return context.drawImage(
            this._viewport,
            this._width * this._checkpoint.coefs[0],
            this._height * this._checkpoint.coefs[1],
            size, size, 0, 0, size, size
        );
    }


    private analyzeVideoFrame = (): any => {

        const getPointData = (point: any) => {
            const image: ImageData = point.context().getImageData(0, 0, point.size, point.size);
            const rgb: { r: number, g: number, b: number } = Utils.getRgb(image);
            const hsv: { h: number, s: number, v: number } = Utils.rbgToHsv(rgb);
            return hsv;
        }

        const data = getPointData(this._checkpoint);

        this.analyzeDeltaValues(data);

        if (Model.colorCurvesEnabled) {
            this.trace(data);
        }
    }

    private analyzeDeltaValues = (value: any) => {

        const current: number = value.h;
        const previous: number = this._values.hue.last;
        const average: number = this._values.hue.average;

        let timeout: number = 0;

        if (
            Math.abs(current - average) > MOTION_DETECT_PIXEL_COEF &&
            Math.abs(previous - average) > MOTION_DETECT_PIXEL_COEF
        ) {
            timeout = MOTION_DETECT_DELAY;
            Matrix.hide();
            EventHandler.dispatchEvent(MOTION_DETECTION_STARTED, value);
        }

        this._values.add(value);
        this._viewport.requestVideoFrameCallback(this.onVideoEnterFrame);
        // setTimeout(() => , timeout);
    }

    private trace = ({ h, s, v }: any) => {

        this.drawDeltaGraphics(this._values.hue, "rgb(0, 255, 0, 1)", true, -100);
        // this.drawDeltaGraphics(this._values.saturation,"rgb(0, 188, 188, 1)", false, 50);
        this.drawDeltaGraphics(this._values.brightness, "rgb(255, 255, 255, 1)", false, 30);
    }

    private drawDeltaGraphics = (values: any, color: string, clear: boolean = false, adjust: number = 0) => {

        const ctx = this._graphic.getContext('2d', { willReadFrequently: true });

        clear && ctx.clearRect(0, 0, this._width, this._height);

        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.strokeStyle = color;
        ctx.beginPath();

        for (let i = 1; i < values.cached.length; i++) {
            ctx.moveTo(i - 1, values.cached[i - 1] + adjust);
            ctx.lineTo(i, values.cached[i] + adjust);
        }
        ctx.stroke();
        ctx.closePath();
    }
}

class DeltaValues {

    private _h: DeltaValue = new DeltaValue();
    private _s: DeltaValue = new DeltaValue();
    private _v: DeltaValue = new DeltaValue();

    public get hue() { return this._h; }

    public get saturation() { return this._s; }

    public get brightness() { return this._v; }

    public add = (value: { h: number, s: number, v: number }) => {
        this._h.add(value.h);
        this._s.add(value.s);
        this._v.add(value.v);
    }
}

class DeltaValue {

    private _values: any = {
        cached: [] = [],
        average: Number,
    }

    public size: number = MOTION_DETECT_HEAP_SIZE;

    public get average(): number {
        return this._values.average;
    }

    public get cached(): any {
        return this._values.cached;
    }

    public get length(): number {
        return this._values.cached.length;
    }

    public get last(): number {
        return this.cached.length ?
            this.cached[this.cached.length - 1] : undefined;
    }

    public add = (value: any): void => {
        this._values.cached.push(value);
        this.updateCached();
        this.updateAverage();
    }

    private updateAverage = (): void => {
        this._values.average = this._values.cached.length ? this._values.cached.reduce(
            (previous: number, current: number) => previous + current) / this._values.cached.length : 0;
    }

    private updateCached = (): void => {
        if (this._values.cached.length > this.size) {
            this._values.cached.shift();
        }
    }
}

export default new MotionDetector();