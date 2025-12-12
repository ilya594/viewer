import RestService from "./RestService";

class AliveReporting {

    private _interval: any;

    constructor() {

    }

    public initialize = async (id: string) => {
        const HEARTBEAT_INTERVAL = 15000; // 15 seconds
        this._interval = setInterval(() => this.sendHeartbeat(id), HEARTBEAT_INTERVAL);

        return window.addEventListener('beforeunload', async () => {
            clearInterval(this._interval);

            // Use navigator.sendBeacon for reliable unload request
            //navigator.sendBeacon(
            //  `${SERVER_URL}/api/deregister`,
            //  JSON.stringify({ peerId: myPeerId })
            //);
            //});
        });
    }

    private sendHeartbeat = async (peerId: string) => {
        const result = await RestService.heartBeat(peerId);
    }
}

export default new AliveReporting();