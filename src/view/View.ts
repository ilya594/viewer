
import * as Events from "../utils/Events";  
import Controls from "./Controls";


export class View extends Events.EventHandler {

    constructor() { 
        super();
    }

    public initialize = async () => {
      this.initializeView();
    }

    private initializeView = async () => {
      //@ts-ignore-line
      //screen.lockOrientation?.("landscape") || screen.lock?.("landscape");
      //document.querySelector("img").src = "./images/eye_frozen.png";

      document.querySelector("img").onclick = () => {
        document.getElementById("entry-page").style.setProperty('visibility', 'hidden');
        document.getElementById("view-page").style.setProperty('visibility', 'visible'); 
  
        document.getElementById("entry-page").style.display = 'none';
        document.getElementById("view-page").style.display = 'flex'; 
  
        Controls.initialize();
  
        this.dispatchEvent(Events.USER_PROCEEDED, null);
      };
    }


    // TODO move this somewhere idk/////////////////////////////////////////////////////////////////
    public displayStream = async (stream: any, devices: Array<MediaDeviceInfo> = []) => {

      document.getElementById("loader").style.setProperty('visibility', 'hidden'); 
      document.getElementById("loader").style.display = 'none';   

      const deviceId = await this.handleMediaDevices();
      const viewport = document.querySelector("video");    
      viewport.style.setProperty('visibility', 'visible');
      viewport.style.display = 'flex';          
      viewport.onloadedmetadata = viewport.play;       

      console.log('[Viewer] displayStream setting viewport sinkId and assigning stream');

      if (deviceId) {
        (viewport as any).setSinkId(deviceId);
      }
      viewport.srcObject = stream;
    //this.createDevicesInfoLabel(devices);
    }


    private handleMediaDevices = async (deviceOptions: any = { labels: ['720', 'back', 'Back'] }) => {

      console.log('[Viewer] handleMediaDevices. starting devices enumeration..')

      let devices = await navigator.mediaDevices.enumerateDevices();

      console.log('[Viewer] handleMediaDevices got devices: ');

      devices?.forEach((device: any) => {

            //  let button = document.createElement("button");
           //   button.type = 'radio';
           //   button.style.width = '50%';
          //    button.style.height = '5%';
           //   button.textContent = device.deviceId + '* kind: [' + device.kind + ' ] label: [' + device.label + ']';
           //   button.onclick = (event: any) => {
           //     callback(event.currentTarget.textContent.split('*')[0]);
          //    };
         //     document.getElementById("view-page").appendChild(button)
        alert(device.label + '-' + device.kind + '-' + device.deviceId);
      });

      let deviceId: string;

      if (deviceOptions.labels) {

          deviceOptions.labels.forEach((label: string) => {
            try {
              deviceId = (devices.find((device) => 
                device.label.includes(label) || device.kind.includes(label))).deviceId;
            }
            catch (e) {
              console.log('      .device not found...');
            }
            if (deviceId) return deviceId;
          });         
      }
      /*if (!deviceId && deviceOptions.kind) {
        try {
          deviceId = (devices.slice().reverse().find((device) => device.kind === deviceOptions.kind));
        } catch (e) {
          console.log('      .device not found...');
        }
      }  */    

      console.log('[Viewer] handleMediaDevices found device: ' + (deviceId != undefined ? deviceId : 'no device found!'));

      return deviceId;
    }

    private createDevicesInfoLabel = (devices: Array<MediaDeviceInfo>) => {
      console.log('[Viewer] View.createDevicesInfoLabel. devices: ');
      devices.forEach((device: MediaDeviceInfo, index) => {
        console.log('....deviceId: [' + device.deviceId + ']');
        const _label = document.createElement("label"); document.getElementById("view-page").appendChild(_label);       
        _label.style.setProperty('position', 'absolute');
        _label.style.setProperty('top', String(index * 5 + 45) + '%');
        _label.style.setProperty('right', '3%');
        _label.style.setProperty('font-size', '18px');
        _label.style.setProperty('font-family', 'Courier New');
        _label.style.setProperty('font-weight', 'bold');
        _label.style.setProperty('color', '#00ff30');
        _label.style.setProperty('visibility', 'visible');
        _label.textContent = '[' + device.kind + '] ' + device.label;
      });

    }


}

export default new View();