import { EventHandler } from "./utils/Events";

export class Model extends EventHandler {

    private _motionDetectorEnabled: boolean = true;

    public get motionDetectorEnabled(): boolean {
        return this._motionDetectorEnabled;
    }

    public set motionDetectorEnabled(value: boolean) {
        this._motionDetectorEnabled = value;
    }


    constructor() {
        super();
    }
}
export default new Model();