import { PINCODE_CHAR_LENGTH } from "../utils/Constants";
import * as Events from "../utils/Events";  

class Pincode extends Events.EventHandler {

    private _container: any = null;
    private _console: any = null;
   // private _inputs: Array<any> = [];

    constructor() {
        super();
    }

    public initialize = async () => {

        const viewport = document.getElementById("entry-page");

        this._container = document.createElement("div"); viewport.appendChild(this._container);

            this._console = document.createElement("input"); this._container.appendChild(this._console);
            this._console.type = 'password';
            this._console.maxLength = 4;
            this._console.style.setProperty('position', 'absolute');
            this. _console.style.setProperty('top', '45%');
            this._console.style.setProperty('left', '25%');
            this._console.style.setProperty('width', '50%');
            this._console.style.setProperty('background-color', 'black');
            this._console.style.setProperty('font-size', '48px');
            this._console.style.setProperty('text-align', 'center');
            this._console.style.setProperty('font-family', 'Courier New');
            this._console.style.setProperty('font-weight', 'bold');
            this._console.style.setProperty('color', 'green');
            this._console.style.setProperty('overflow', 'hidden');

        document.onkeyup = (_: KeyboardEvent) => {

            if (this._console.value.length === PINCODE_CHAR_LENGTH) {
                const pin = this._console.value;
                this._console.value = "";
                this.dispatchEvent(Events.CONSOLE_EXECUTE_COMMAND, pin);
                document.onkeyup = () => {};

            }
        };
    }

    public show = () => {
        this._container.style.setProperty('display', 'inline');
    }

    public hide = () => {
        this._container.style.setProperty('display', 'none');
    }
}

export default new Pincode();


