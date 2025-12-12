import RestService from "./RestService";

class AliveReporting {

    private _interval: any;

    constructor() {}

    public initialize = async (id: string) => {
        const HEARTBEAT_INTERVAL = 5000;
        this._interval = setInterval(() => this.sendHeartbeat(id), HEARTBEAT_INTERVAL);

        return window.addEventListener('beforeunload', async () => {
            clearInterval(this._interval);

            navigator.sendBeacon(
              RestService.SERVER_URL + 'removepeerid',
              JSON.stringify({ id: id })
            );
        });
    }

    private sendHeartbeat = async (peerId: string) => {
        const result = await RestService.heartBeat(peerId);
    }
}

export default new AliveReporting();