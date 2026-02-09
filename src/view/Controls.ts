
import Snaphots from "../record/Snaphots";
import StreamProvider from "../network/StreamProvider";
import EventHandler, { STREAMS_COUNT_CHANGED } from "../utils/Events";
import RestService from "../network/RestService";
import FileSaver from "file-saver";
import Model from "../store/Model";


export class Controls {

    constructor() {

    }

    private _container: any;
    private _viewport: any;

    private _traceButton: any;
    private _chartButton: any;
    private _snapsButton: any;
    private _watchButton: any;
    private _voiceButton: any;

    private _fullsButton: any;

    private _lowButton: any;
    private _medButton: any;
    private _higButton: any;

    //private _watchToggle_0: any;
    private _watchToggle_1: any;

    private _watchButtons_0: Array<any> = [];
    private _imageButtons: Array<any> = [];
    private _imageButtonsBlocked: boolean = false;
    private _contextMenu: any;

    private _filesList: Array<any>;

    private _folders = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    public initialize = async () => {

        this._container = document.getElementById("controls");

        this._viewport = document.querySelector("video");

        this.createButtons();
    }

    private createButtons = () => {

        this.createTraceButton();

        this.createVoiceButton();

        this.createFullsButton();

        this.createSnapsButton();


        //this._watchToggle_0 = document.getElementById("watch-toggle-month");

        this.createWatchButton();

        this.createWatchToggle();

        this.createContextMenu();

        this.createJonTravolta();

        this.createSaveButtons();

        this.createHudsControl();

        this.createQualButtons();
    
        this.setupVideoInvertOnWheel(this._viewport);
    }

    private setupVideoInvertOnWheel = (videoElement: any) => {

    let isInverted = false;

    videoElement.addEventListener('wheel', function(event: any) {
        // Предотвращаем стандартное поведение прокрутки
        event.preventDefault();
        
        // Переключаем состояние инвертирования
        isInverted = !isInverted;
        
        // Применяем или убираем трансформацию
        if (isInverted) {
            videoElement.style.transform = 'scale(1, -1)';
            videoElement.style.webkitTransform = 'scale(1, -1)';
            videoElement.style.mozTransform = 'scale(1, -1)';
        } else {
            videoElement.style.transform = '';
            videoElement.style.webkitTransform = '';
            videoElement.style.mozTransform = '';
        }
    });

    // Опционально: отключаем прокрутку страницы при наведении на видео
    videoElement.addEventListener('wheel', function(event: any) {
        event.stopPropagation();
    }, { passive: false });
}

    private createHudsControl = () => {
        const streamersInfo = document.getElementById("sources-info");
        EventHandler.addEventListener(STREAMS_COUNT_CHANGED, (count: number) => {
            streamersInfo.innerText = "CAM⋅1⋅" + count;
        });
    }

    public setVisible = (value: boolean) => {
        this._container.style.setProperty('visibility', value ? 'visible' : 'hidden');
    }

    public get localSaveEnabled(): boolean {
        return !!document.getElementById("local-save-button")?.style.getPropertyValue('background-color');
    }

    public get remoteSaveEnabled(): boolean {
        return !!document.getElementById("remote-save-button")?.style.getPropertyValue('background-color');
    }

    public adjustVolume = (value: any) => {
        this._voiceButton.style.opacity = String(value);
    }

    private createTraceButton = () => {
        this._traceButton = document.getElementById("trace-button");
        this._traceButton.onclick = () => {
            Model.matrixScreenEnabled = !Model.matrixScreenEnabled;
            if (this._traceButton.style.getPropertyValue('background-color')) {
                this._traceButton.style.removeProperty('background-color');
            } else {
                this._traceButton.style.setProperty('background-color', '#00ff0077');
            }
        }

        this._chartButton = document.getElementById("chart-button");
        this._chartButton.onclick = () => {
            Model.colorCurvesEnabled = !Model.colorCurvesEnabled;
            if (this._chartButton.style.getPropertyValue('background-color')) {
                this._chartButton.style.removeProperty('background-color');
            } else {
                this._chartButton.style.setProperty('background-color', '#00ff0077');
            }
        }
    }
    

    private createQualButtons = () => {
        this._lowButton = document.getElementById("low-button");
        this._medButton = document.getElementById("med-button");
        this._higButton = document.getElementById("hig-button");
        this._higButton.style.setProperty('background-color', '#00ff0077');
        const list = [this._lowButton, this._medButton, this._higButton];

        const clickHandler = (target: any, quality: string) => {
            list.forEach((button: any) => {
                if (button.style.getPropertyValue('background-color')) {
                    button.style.removeProperty('background-color');
                }
            });
            if (target.style.getPropertyValue('background-color')) {
                target.style.removeProperty('background-color');
            } else {
                target.style.setProperty('background-color', '#00ff0077');
            }
            StreamProvider.switchStreamQuality(quality);
        };               

        this._lowButton.onclick = () => clickHandler(this._lowButton, 'low');
        this._medButton.onclick = () => clickHandler(this._medButton, 'medium');
        this._higButton.onclick = () => clickHandler(this._higButton, 'high');
    }

    private createVoiceButton = () => {
        this._voiceButton = document.getElementById("voice-button");
        this._voiceButton.onclick = () => {

            if (this._voiceButton.style.getPropertyValue('background-color')) {
                //StreamProvider?.stopVoiceMessage();
                this._voiceButton.style.removeProperty('background-color');
            } else {
                //StreamProvider?.sendVoiceMessage(); 
                this._voiceButton.style.setProperty('background-color', '#00ff0077');
            }
        }
    }

    private createFullsButton = () => {
        this._fullsButton = document.getElementById("fullscreen-button");
        this._fullsButton.onclick = () => {
            console.log('[Controls] displayStream requesting fullscreen if avail');

            if (document.body.requestFullscreen) {
                try {
                    document.body.requestFullscreen();
                } catch (error: any) {
                    console.log('[Controls] displayStream requesting fullscreen error');
                }
            }
        };

        const _fullsButtonStream = document.getElementById("fullscreen-button-stream");
        const _viewport = document.getElementById("video-container");//document.querySelector("video");

        _fullsButtonStream && (_fullsButtonStream.onclick = () => {
            try {
                _viewport.requestFullscreen();
            } catch (error: any) {
                console.log('[Controls] displayStream requesting fullscreen error');
            }
        });
    }

    private createSnapsButton = () => {
        this._snapsButton = document.getElementById("snaps-button").parentElement;
        this._snapsButton.onclick = () => Snaphots.flushBuffer();
    }

    private createWatchButton = () => {
        this._watchButton = document.getElementById("watch-button");

        this._watchButton.onmouseenter = () => {
            RestService.getFilesList().then((response: any) => this._filesList = response.data?.data);
            this._watchButton.firstElementChild.style.setProperty('visibility', 'visible');
        }
        this._watchButton.onmouseleave = () => this._watchButton.firstElementChild.style.setProperty('visibility', 'hidden');
    }

    private createWatchToggle = () => {
        this._watchToggle_1 = document.getElementById("watch-toggle-item");

        const arrow_0 = this._watchToggle_1.firstElementChild;

        const onButtonMouseOver = (index: number) => {
            this._watchToggle_1.replaceChildren(arrow_0);
            arrow_0.style.setProperty('top', (2 + (index * 8.25)).toString() + '%');

            if (this._filesList?.[index]?.length) {
                this.showContextMenu(index);
            } else {
                this.createJonTravolta();
            }
        }

        for (let i = 0; i < 12; i++) {
            const button = document.getElementById("watch-toggle-month-" + i);
            button.onmouseenter = () => onButtonMouseOver(i);
            this._watchButtons_0.push(button);
        }
    }

    private onDeleteButtonClick = (contextMenu: any) => {
        const button = contextMenu.parentElement;
        button.classList.toggle('button-months-deleting');
        this._imageButtonsBlocked = true;

        contextMenu.parentElement.removeChild(contextMenu);

        const [month, name] = contextMenu.nonce.split('/');

        RestService.deleteSnapshot(month, name).then((_: any) => {
            button.classList.remove('button-months-deleting');
            this._imageButtonsBlocked = false;
            this._watchToggle_1.removeChild(button);
        });
    }

    private onImageButtonClick = async (button: any) => {
        if (button._state) return;
        const [month, name] = button.name.split('/');

        this._imageButtonsBlocked = true;
        button.classList.toggle('button-months-downloading');

        const result: string = await RestService.getSnapshot(month, name);
        button.classList.remove('button-months-downloading');
        this._imageButtonsBlocked = false;
        return FileSaver.saveAs(result, name);
    };

    private createContextMenu = (index: number = undefined) => {
        this._contextMenu = document.getElementById("context-menu");

        //@ts-ignore
        this._contextMenu.firstElementChild.onclick = (event) => {
            event.preventDefault(); event.stopPropagation();
            this.onDeleteButtonClick(this._contextMenu);
        }

        //@ts-ignore
        this._contextMenu.lastElementChild.onclick = (event) => {
            event.preventDefault(); event.stopPropagation();
            this.onImageButtonClick(this._contextMenu.parentElement).then((_: any) => {
                this.onDeleteButtonClick(this._contextMenu);
            });
        }
    }

    private showContextMenu = (index: number) => {
        this._imageButtons.length = 0;
        this._filesList[index].forEach((fileName: string) => {
            const imageButton = this._watchButtons_0[0].cloneNode(true);
            if (!imageButton) return;
            imageButton.textContent = fileName;
            imageButton.style.setProperty('font-size', '24px');
            imageButton.name = this._folders[index] + '/' + fileName;
            imageButton.onclick = () => this.onImageButtonClick(imageButton);
            imageButton.onmouseenter = () => {
                if (this._imageButtonsBlocked) return;
                this._imageButtons.forEach((button: any) => {
                    if (button && button !== imageButton) button.style.removeProperty('background-color');
                })
            }
            imageButton.oncontextmenu = () => {
                if (this._imageButtonsBlocked) return;
                imageButton.appendChild(this._contextMenu);
                this._contextMenu.style.setProperty('visibility', 'visible');
                this._contextMenu.nonce = this._folders[index] + '/' + fileName;
                this._contextMenu.onmouseleave = () => {
                    this._contextMenu.style.setProperty('visibility', 'hidden');
                    imageButton.style.removeProperty('background-color');
                };
                imageButton.style.setProperty('background-color', '#ff0000');
                return false;
            }
            this._imageButtons.push(imageButton);
            this._watchToggle_1.appendChild(imageButton);
        });
    }

    private createJonTravolta = () => {
        const backgroundImage = document.createElement("div");
        backgroundImage.style.setProperty('background-image', 'url(./images/nothing_here.png');
        backgroundImage.style.setProperty('width', '100%');
        backgroundImage.style.setProperty('height', '100%');
        backgroundImage.style.setProperty('background-repeat', 'no-repeat');
        backgroundImage.style.setProperty('background-position', 'center');
        backgroundImage.style.setProperty('opacity', '77%');
        this._watchToggle_1.appendChild(backgroundImage);
    }

    private createSaveButtons = () => {
        const localSaveButton = document.getElementById("local-save-button");
        const remoteSaveButton = document.getElementById("remote-save-button");
        const onSaveButtonClick = (button: any) => {
            if (button.style.getPropertyValue('background-color')) {
                button.style.removeProperty('background-color');
            } else {
                button.style.setProperty('background-color', '#00ff0077');
            }
        }
        localSaveButton.onclick = () => onSaveButtonClick(localSaveButton);
        remoteSaveButton.onclick = () => onSaveButtonClick(remoteSaveButton);
    }
}

export default new Controls();