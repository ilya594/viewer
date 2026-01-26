import WssService from "./WssService";

class AliveReporting {

    private _interval: any;

    constructor() {}

    public initialize = async (id: string) => {
        const HEARTBEAT_INTERVAL = 5000;
        if (this._interval) {
            clearInterval(this._interval);
        }
        return (this._interval = setInterval(() => this.sendHeartbeat(id), HEARTBEAT_INTERVAL));
    }

    private sendHeartbeat = (peerId: string) => {
        WssService.heartBeat(peerId);
    }
}

export default new AliveReporting();