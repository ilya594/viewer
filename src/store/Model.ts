import EventHandler, { COLOR_CURVES_STATE_CHANGED, MATRIX_SCREEN_STATE_CHANGED, MOTION_DETECTOR_STATE_CHANGED, STREAMS_COUNT_CHANGED } from "../utils/Events";

export class Model {

    public initialize = () => {

    }

    private _motionDetectorEnabled: boolean = true;

    public get motionDetectorEnabled(): boolean {
        return this._motionDetectorEnabled;
    }

    public set motionDetectorEnabled(value: boolean) {
        if (this._motionDetectorEnabled !== value) {
            this._motionDetectorEnabled = value;
            EventHandler.dispatchEvent(MOTION_DETECTOR_STATE_CHANGED, value);
        }
    }



    private _matrixScreenEnabled: boolean = false;

    public get matrixScreenEnabled(): boolean {
        return this._matrixScreenEnabled;
    }

    public set matrixScreenEnabled(value: boolean) {
        if (this._matrixScreenEnabled !== value) {
            this._matrixScreenEnabled = value;
            EventHandler.dispatchEvent(MATRIX_SCREEN_STATE_CHANGED, value);
        }
    }


    private _colorCurvesEnabled: boolean = false;

    public get colorCurvesEnabled(): boolean {
        return this._colorCurvesEnabled;
    }

    public set colorCurvesEnabled(value: boolean) {
        if (this._colorCurvesEnabled !== value) {
            this._colorCurvesEnabled = value;
            EventHandler.dispatchEvent(COLOR_CURVES_STATE_CHANGED, value);
        }
    }

    private _streamersTotalCount: number = 0;

    public get streamersTotalCount(): number {
        return this._streamersTotalCount;
    }

    public set streamersTotalCount(value: number) {
        if (this._streamersTotalCount !== value) {
            this._streamersTotalCount = value;
            EventHandler.dispatchEvent(STREAMS_COUNT_CHANGED, value);
        }
    }

    
    private _prefferedStreamQuality: 'low' | 'medium' | 'high' = 'high';

    public get prefferedStreamQuality(): 'low' | 'medium' | 'high' {
        return this._prefferedStreamQuality;
    }

    public set prefferedStreamQuality(value: 'low' | 'medium' | 'high') {
        if (this._prefferedStreamQuality !== value) {
            this._prefferedStreamQuality = value;            
        }
    }


    constructor() {

    }
}
export default new Model();