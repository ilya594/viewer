import { EventHandler, MOBILE_SWIPE_RIGHT } from "./Events";

export class MobileUtils extends EventHandler {

    constructor() {
        super();
    }

    public on = (element: any) => {
        let touchstartX = 0;
        let touchendX = 0;

        const checkDirection = () => {        
            if (touchendX < touchstartX) this.dispatchEvent(MOBILE_SWIPE_RIGHT);
        }

        element.addEventListener('touchstart', (event: any) => {
            touchstartX = event.changedTouches[0].screenX;
        })

        element.addEventListener('touchend', (event: any) => {
            touchendX = event.changedTouches[0].screenX;
            checkDirection();
        })
        return this;
    }
}
export default new MobileUtils();