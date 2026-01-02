import EventHandler, { SNAPSHOT_SEND_HOMIE } from "../utils/Events";
import axios from "axios";

export class RestService {

  public SERVER_URL: string = 'https://nodejs-http-server.onrender.com/';
  private TIME_ZONE: string = 'Europe/Kyiv';

  constructor() {

  }

  public initialize = async () => {
    EventHandler.addEventListener(SNAPSHOT_SEND_HOMIE, (data: any) => this.sendSnaphot(data));
  }

  public sendSnaphot = (snapshot: string) => {

    const name: string = new Date().toLocaleString('ua-UA', { timeZone: this.TIME_ZONE })
      .replace(/:/g, '.').replace(', ', '-') + '.png';

    axios({
      method: 'post',
      url: this.SERVER_URL + 'snapshot',
      data: { file: snapshot, name: name, pin: localStorage.getItem('pinhash') }
    });
  }

  public getSnapshot = async (month: string, name: string) => {

    const response = await axios.get(this.SERVER_URL + 'snapshot', {
      params: {
        month: month,
        name: name,
        pin: localStorage.getItem('pinhash')
      }
    });

    const url: string = 'data:image/png;base64,'.concat(response.data as string);

    return url;
  }

  public deleteSnapshot = async (month: string, name: string) => {
    const response = await axios.get(this.SERVER_URL + 'delsnapshot', {
      params: {
        month: month,
        name: name,
        pin: localStorage.getItem('pinhash')
      }
    });

    return response.data;
  };

  public getFilesList = () => {
    return axios.get(this.SERVER_URL + 'lsall', {
      params: {
        pin: localStorage.getItem('pinhash')
      }
    });
  };

  public validatePrediction = async (prediction: any) => {
    const response = await axios.get(this.SERVER_URL + 'valprediction', {
      params: {
        prediction: prediction,
        pin: localStorage.getItem('pinhash')
      }
    });
    return response.data;
  };

  public validatePinhash = async (hash: string) => {
    const response = await axios.get(this.SERVER_URL + 'login', {
      params: {
        pin: hash,
      }
    });
    return response.data;
  }


  public updateAudioVolume = async (volume: number) => {
    axios({
      method: 'post',
      url: this.SERVER_URL + 'setvolume',
      data: { volume: volume }
    });
  }

  public getAudioVolume = async () => {
    const response = await axios.get(this.SERVER_URL + 'getvolume', {
      params: {
        pin: localStorage.getItem('pinhash')
      }
    });
    return response.data;
  }

  public addPeerId = async (id: string) => {
    axios({
      method: 'post',
      url: this.SERVER_URL + 'addpeerid',
      data: { id: id }
    });
  }

  public removePeerId = async (id: string) => {
    axios({
      method: 'post',
      url: this.SERVER_URL + 'removepeerid',
      data: { id: id }
    });
  }

  public getPeersIds = async () => {
    return axios.get(this.SERVER_URL + 'getpeersids', {
      params: {
        pin: localStorage.getItem('pinhash')
      }
    });
  }

  public heartBeat = async (peerId: string) => {
    return axios({
      method: 'post',
      url: this.SERVER_URL + 'heartbeat',
      data: { id: peerId },
      //signal: AbortSignal.timeout(5000)
    });  
  }
}

export default new RestService();