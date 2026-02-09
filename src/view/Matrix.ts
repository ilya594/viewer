import MotionDetector from "../motion/MotionDetector";
import * as Utils from "../utils/Utils";
import EventHandler, { MATRIX_SCREEN_STATE_CHANGED } from "../utils/Events";

import {
    MATRIX_COOLDOWN_DELAY,
    MATRIX_FONT_SIZE
} from "../utils/Constants";
import Controls from "./Controls";

class Matrix {

    // private _enabled: boolean;
    private _page: any;
    private _container: any;
    private _graphic: HTMLCanvasElement;

    private _interval: any;
    private _timeout: any;

    constructor() {

    }

    public initialize = async () => {

        this._page = document.getElementById("view-page");

        this._container = document.createElement("div");
        this._container.id = "container";
        this._container.width = "100%";
        this._container.style.setProperty('z-index', '9999');
        this._container.style.setProperty("position", "absolute");

        this._graphic = document.createElement("canvas"); this._container.appendChild(this._graphic);

        document.onmousemove = () => this.hide();

        EventHandler.addEventListener(MATRIX_SCREEN_STATE_CHANGED, (value: boolean) => {
            if (value) this.will();
        });
        return this;
    }

    public show = () => {
        /* let request = new XMLHttpRequest();
         let url = "https://api.openai.com/v1/responses"; // Replace with your actual server endpoint
 
         request.open("POST", url, true);
         request.setRequestHeader("Content-Type", "application/json");
         request.setRequestHeader("Authorization", "Bearer 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");
        
         let payload = `{
         "model": "gpt-5",
         "input": "Сгенерируй плиз ответ от 'чёткого пацана с района' на вопрос Слышь, братан, чё по движу сегодня — где собираемся и во сколько залетать?" 
         }`;
        // res.output[1].content[0].text
         request.onload =() => {
             if (request.status >= 200 && request.status < 300) {
 
                               if (!this.exists()) {
             this._page.appendChild(this._container);
            // this.matrixEffect(this._graphic);     
             this.drawStuff(JSON.parse(request.response).output[1].content[0].text);
         }  
        // debugger;
       //  console.log("Response received:", request.response.output.content[0]);
         //           } else {
           //       console.error("Request failed. Status:", request.status, request.statusText);
           }
         };
 
         request.onerror = function() {
             console.error("A network error occurred during the request.");
         };
 
         request.send(payload);*/

        if (!this.exists()) {
            this._page.appendChild(this._container);
            this.matrixEffect(this._graphic);
        }
    }

    public hide = () => {
        if (this.exists()) {
            this._graphic.getContext("2d").clearRect(0, 0, window.innerWidth, window.innerHeight);
            this._page.removeChild(this._container);
            clearInterval(this._interval);
            clearTimeout(this._timeout);

            this.will();
        }
    }

    private will = () => {
        clearTimeout(this._timeout);
        return (this._timeout = setTimeout(() => this.show(), MATRIX_COOLDOWN_DELAY));
    }

    private exists = () => {
        return document.getElementById("view-page") && document.getElementById("container");
    }

    public drawStuff = (stuff: any) => {

        stuff = stuff.match(/.{1,77}/g) || [];
        const canvas = this._graphic;
        const context = canvas.getContext("2d", { willReadFrequently: true });

        const w = (canvas.width = window.innerWidth);
        const h = (canvas.height = window.innerHeight);

        context.fillStyle = "rgba(0,0,0,.05)";
        context.fillRect(0, 0, w, h);

        context.fillStyle = "#ff0077ff";

        context.font = "18px 'system-ui'";

        stuff.forEach((element: any, index: number) => {
            context.fillText(element, 222, 222 + index * 22);
        });
    }


    private matrixEffect(canvas: HTMLCanvasElement, font = 24) {

        const context = canvas.getContext("2d", { willReadFrequently: true });
        const w = (canvas.width = window.innerWidth);
        const h = (canvas.height = window.innerHeight);



        const str = "А+Б0ƓВڲ-Г1Д=Е2Ё Ж3З И4Йۺ К5Лإ М6Нڧ О7П ۴ڟ Ф!ڮХ ЦÛ?Ч ƪШ.іагb н ьцск бйщцгу ритй" +
            "шлщшб пр,Ы Ь:ЭЮ;ڿڿڦЯ 开儿 艾  诶Ƣ 开伊 艾2 艾ƕڪ   西Ý 吉 3艾 %$艾 伊4 ¿ 67 娜% ڠ伊" +
            "6a bcƜ dٿefïo#pؠ-qrstu &v* ڜ wxy3z ¼ ¾ æè ƩỺ ʭʩʥ˩˩ͼ  ͽͽΔΔΔΔω ϘϠ ϠϡϢϧ Ϩ ϬϬϪЉЊ" +
            "1871640532 1 udp 1677729535 188.212777 typ srflx raddr 0.0.0.0 rport 0 generation 0" +
            "ufrag AfOL network-coe:832498458 1 udp 1677729535 4147.105 55549 typ srflx" +
            " raddr 0.0.0.0 rport 0 generation 0 ufrag 4W3O ne ϲτ χ κ ͷρ φ 	π314 ʏ ƙ ɜ ӆ ϰ ƴ" +
            "и̷ ய ౦ ӥ ❡ ㄐ и̷ௐ ჯ ய౦? ቀ 	ჶ ෲ? ƿ ᗱ ㄏ ㄨ ȹ Ⴏ ȝ Κ Ͷ Λ  Ο Φ Η БΛЯΤЬ ❞૱ઐᙓዘҚ☯" +
            " нaχƴй ㄨㄦ੦ഠ〇ㄇㄐ૯ㄏㄏ πiȝgyютьㄇㄈ ㄋ ㄏ ㄐ ㄒ	ㄗ ㄙ ㄚ	 ㄤ ㄥ ㄦ ㄨ ㄩ	4TG";
⚡⛔⻅⻮ɞκӽӊᏭᎩᎻᏁᤕᲁᵪứ𐨖𐨰𐓟𐊌ꗣⲙⲫⲕᵚᥜᖆᎯԉҚτρʙȝƿů꫟ꮿ𓂀𓆤𛃾𝄠🎥👁꣼꧂𑑙𑜿🆕ૠૐૹᬽ⁏‽⑹⸘⸙㎲㏛Ꜳ𐃘𝄠𝅙𝆓𝄟ꓪꭙꭚꭏﻶ𝨵๕ༀﷹ𖹃𛂄ಊૹ࿐࿑༈༆᭄༯ཛྷ𑓀𝄞𝆕𝆮𝒩𝒪𝓣𝓔𝧿🅭💥📌ɜȹʙͷⲡⲏⲙⲧꮁꮟ𝖺𝗒𝗉ŭɡҗ𐇔𓀿𓀥𓅽𓆀𐃵𝄟🤞🤝🦎〽〰〄Ⲭⲩⲏ⚛☏𝄟𝄞𝄟𝄠ං᪀𑐾𝄐𝄑𝅖⚬
        const matrix = str.split("");
//цɜ𝗒​ⲙꮟɯ​𝗒οⲧҗ​ⲫ​ϲы𝗒ɜ​66щⲕ𝗒
//цзумьшуотжфсыузббщку

        let cols = w / font;
        let pool: any = [];

        for (let i = 0; i < cols; i++) pool[i] = 1;

        const draw = () => {

            context.fillStyle = "rgba(0,0,0,.05)";
            context.fillRect(0, 0, w, h);

            context.fillStyle = "#00ff00";

            if (Math.random() > 0.9955) {
                context.fillStyle = "#f00";
            }
            context.font = font + "px system-ui";

            for (let i = 0; i < pool.length; i++) {
                const txt = matrix[Math.floor(Math.random() * matrix.length)];
                context.fillText(txt, i * font, pool[i] * font);
                if (pool[i] * font > h && Math.random() > 0.95) pool[i] = 0;
                pool[i]++;
            }
        }

        this._interval = setInterval(draw, 77);
    }


}



export default new Matrix();