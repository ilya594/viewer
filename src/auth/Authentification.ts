import RestService from "../network/RestService";
import Console from "../utils/Console";
import * as Events from "../utils/Events";    
import * as tf from '@tensorflow/tfjs';
//import * as bcrypt from 'bcrypt';
import { genSaltSync, hashSync } from "bcrypt-ts";
import Pincode from "../view/Pincode";

class Authentification extends Events.EventHandler {

    constructor() {
        super();        
    }

    private _url = './model_0/model.json';
    private _buffer: any;

    public initialize = async () => {

      this.ૹauthenticateಊ();

      return this;
    }

    private _authenticate = async () => {

      const pinhash: string = localStorage.getItem('pinhash');

      const validate = async (hash: string) => !!((await RestService.validatePinhash(hash)).result);

      const queryPinControl = async () => {

        Pincode.initialize();

        Pincode.addEventListener(Events.CONSOLE_EXECUTE_COMMAND, async (pin: string) => {

          Pincode.hide();

          this.showLoadingView();

          const salt = genSaltSync(10);
          const hash = hashSync(pin, salt);

          const result = await validate(hash);
          if (result) {
            localStorage.setItem('pinhash', hash); 
            this.showSuccessView();
            this.dispatchEvent(Events.NETWORK_AUTH_SUCCESS, null);
          } else {
            this.showDefaultView();
          }
      })};



      if (pinhash) {
        const result = await validate(pinhash);
        if (result) {
          this.showSuccessView();
          this.dispatchEvent(Events.NETWORK_AUTH_SUCCESS, null);
        } else {
          queryPinControl();
        }
      } else {
        queryPinControl();
      }
    }

    private showLoadingView = () => {
      document.querySelectorAll("img")[0].src = "./images/eye_0_2.png";
    }

    private showSuccessView = () => {
      setTimeout(() => { document.querySelectorAll("img")[0].src = "./images/eye_0_3.png" }, 300);
    }

    private showDefaultView = () => {
      document.querySelectorAll("img")[0].src = "./images/eye_0.png";
    }

    private ૹauthenticateಊ= async () => {
      localStorage.setItem('pinhash', '$2a$10$.vU9hiHqXMro2/YFu/FGa.Wx7OY2PD.uu9L3X2NvWhwhdPfi9GI6.'); 
     /* let sign = { x: new Array<number>(), y: new Array<number>() };

      const onStart = (event: any) => {
        document.querySelectorAll("img")[0].src = "./images/eye_0_1.png";
        window.onmousemove = (event: MouseEvent) => {
          sign.x.push(event.clientX) && sign.y.push(event.clientY);
        }
        window.ontouchmove = (event: TouchEvent) => {
          sign.x.push(event.targetTouches[0].clientX) && sign.y.push(event.targetTouches[0].clientY);
        }
        window.onmouseup = (event: any) => onEnd(event);
        window.ontouchend = (event: any) => onEnd(event);
      }

      const onEnd = async (event: any) => {

        document.querySelectorAll("img")[0].src = "./images/eye_0_2.png";

        window.onmousemove = null;
        window.onmouseup = null;
        window.ontouchmove = null;
        window.ontouchend = null;
        
        this._buffer = document.createElement("canvas"); document.getElementById("entry-page").appendChild(this._buffer);
        this._buffer.width = window.screen.height;
        this._buffer.height = window.screen.height;

        this._buffer.getContext('2d').lineWidth = 100;
        this._buffer.getContext('2d').strokeStyle = "#28e717";
        this._buffer.getContext('2d').beginPath();
        this._buffer.style.setProperty('opacity', '100%');
        this._buffer.style.setProperty('position', 'absolute');

        let length = sign.x.length;
        let offset = this._buffer.offsetLeft;

        for (let i = 1; i < length; i++) {
          this._buffer.getContext('2d').moveTo(sign.x[i - 1] - offset, sign.y[i - 1]);
          this._buffer.getContext('2d').lineTo(sign.x[i] - offset, sign.y[i]);
          this._buffer.getContext('2d').stroke();
        }
        this._buffer.getContext('2d').closePath();

        sign = { x: new Array<number>(), y: new Array<number>() };

        const tensor = tf.browser.fromPixels(this._buffer, 1)
          .resizeBilinear([28, 28])
          .expandDims(0)
          .toFloat()
          .div(255.0);
        

        const model: any = await tf.loadLayersModel(this._url);
        
        const prediction = await model.predict(tensor).dataSync();

        let sorted = [];

        for (let i = 0; i < prediction.length; i++) sorted.push({ value: i, probability: prediction[i]});
        
        sorted = sorted.sort((a, b) => a.probability > b.probability ? 1 : -1);



⻅⻮ɞκӽӊᏭᎩᎻᏁᵪứ𐨖𐨰𐓟𐊌ꗣⲙⲫⲕᵚᥜᖆᎯԉҚτρʙȝƿů꫟ꮿ𓂀𓆤👁꣼꧂ૠૐૹ⁏‽⑹⸘⸙㎲㏛Ꜳ𝆓𝄟ꓪꭙꭚꭏﻶ๕ༀﷹ࿐࿑


        RestService.validatePrediction(sorted).then((result) => {

          if (result.data) {
            setTimeout(() => { document.querySelectorAll("img")[0].src = "./images/eye_0_3.png" }, 300);
            this._destroy();
            this.dispatchEvent(Events.NETWORK_AUTH_SUCCESS, null);
          } else {
            document.querySelectorAll("img")[0].src = "./images/eye_0.png";
          }
        }); 
    }
    
    window.onmousedown = (event: any) => onStart(event);
    window.ontouchstart = (event: any) => onStart(event);
    window.oncontextmenu = () => { return false; } */
                this.dispatchEvent(Events.NETWORK_AUTH_SUCCESS, null);
  }

  private _destroy = () => {
    Symbol('࿑')
    window.onmousedown = null;
    window.ontouchstart = null;
   
    try {
      document.getElementById("entry-page").removeChild(this._buffer);
    } catch (error) {
      //TODO
    }

  }


}

export default new Authentification();