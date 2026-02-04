import * as TWEEN from '@tweenjs/tween.js';
import StreamProvider from '../network/StreamProvider';
import EventHandler, { STREAM_RECEIVED, STREAM_SWITCHED } from './Events';
import { SNAP_WIDTH, SNAP_HEIGHT } from './Constants';

class PreviewManager {
    private static instance: PreviewManager;
    private _previewVideo: HTMLVideoElement | null = null;
    private _previewContainer: HTMLElement | null = null;
    private _previewTween: any = null;
    private _parentContainer: HTMLElement | null = null;
    private _viewport: HTMLVideoElement | null = null;

    private constructor() {
        this.setupEventListeners();
    }

    public static getInstance(): PreviewManager {
        if (!PreviewManager.instance) {
            PreviewManager.instance = new PreviewManager();
        }
        return PreviewManager.instance;
    }

    /**
     * Инициализация менеджера превью
     */
    public initialize(parentContainerId: string = 'view-page', viewportSelector: string = 'video'): void {
        this._parentContainer = document.getElementById(parentContainerId);
        this._viewport = document.querySelector(viewportSelector);
        
        if (!this._parentContainer || !this._viewport) {
            console.error('PreviewManager: Parent container or viewport not found');
            return;
        }

        this.createPreviewVideo();
    }

    /**
     * Настройка слушателей событий
     */
    private setupEventListeners(): void {
        EventHandler.addEventListener(STREAM_RECEIVED, () => {
            setTimeout(() => {
                this.updatePreviewVideo();
            }, 1000);
        });
        
        EventHandler.addEventListener(STREAM_SWITCHED, () => {
            setTimeout(() => {
                this.updatePreviewVideo();
            }, 300);
        });
    }

    /**
     * Создает preview video
     */
    private createPreviewVideo = () => {
        if (!this._parentContainer) return;

        // Контейнер
        this._previewContainer = document.createElement('div');
        this._previewContainer.id = 'preview-container';
        this._previewContainer.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 160px;
            height: 90px;
            cursor: pointer;
            z-index: 998;
            background: #000;
            border-radius: 4px;
            overflow: hidden;
            transition: transform 0.15s ease, z-index 0.15s ease;
        `;

        // Video элемент
        this._previewVideo = document.createElement('video');
        this._previewVideo.id = 'preview-video';
        this._previewVideo.playsInline = true;

        // Устанавливаем атрибуты ДО добавления в DOM
        this._previewVideo.setAttribute('muted', '');
        this._previewVideo.setAttribute('autoplay', '');

        this._previewVideo.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
            background: #000;
            border: 2px solid #167bff;
            transition: transform 0.15s ease;
        `;

        // Добавляем обработчик для принудительного play
        this._previewVideo.addEventListener('loadeddata', () => {
            this.playPreviewVideo();
        });

        // Добавляем обработчик ошибок
        this._previewVideo.addEventListener('error', (e) => {
            console.error('Preview video error:', e);
        });

        // Добавляем в контейнер
        this._previewContainer.appendChild(this._previewVideo);
        
        // Добавляем в основной контейнер
        this._parentContainer.appendChild(this._previewContainer);

        // Обработчик клика для переключения
        this._previewContainer.addEventListener('click', this.switchToPreviewStream);

        // Обработчик для touch устройств
        this._previewContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.switchToPreviewStream();
        });

        // Анимация при наведении
        this._previewContainer.addEventListener('mouseenter', this.onPreviewMouseEnter);
        this._previewContainer.addEventListener('mouseleave', this.onPreviewMouseLeave);
    };

    /**
     * Анимация при наведении на preview
     */
    private onPreviewMouseEnter = () => {
        if (!this._previewContainer || !this._previewVideo) return;

        // Останавливаем предыдущую анимацию если есть
        if (this._previewTween) {
            this._previewTween.stop();
        }

        const currentRect = this._previewContainer.getBoundingClientRect();
        const scaleX = SNAP_WIDTH / currentRect.width;
        const scaleY = SNAP_HEIGHT / currentRect.height;

        // Центрируем увеличенный preview
        const translateX = -(currentRect.width * scaleX - currentRect.width) / 2;
        const translateY = -(currentRect.height * scaleY - currentRect.height) / 2;

        this._previewContainer.style.zIndex = '1001'; // Повышаем z-index

        this._previewTween = new TWEEN.Tween({
            scale: 1,
            translateX: 0,
            translateY: 0
        })
            .to({
                scale: Math.min(scaleX, scaleY),
                translateX: translateX,
                translateY: translateY
            }, 150)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate((obj) => {
                this._previewContainer!.style.transform =
                    `translate(${obj.translateX}px, ${obj.translateY}px) scale(${obj.scale})`;
            })
            .start();
    };

    /**
     * Анимация при уходе курсора с preview
     */
    private onPreviewMouseLeave = () => {
        if (!this._previewContainer || !this._previewVideo) return;

        // Останавливаем предыдущую анимацию если есть
        if (this._previewTween) {
            this._previewTween.stop();
        }

        this._previewTween = new TWEEN.Tween({
            scale: parseFloat(this._previewContainer.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || '1'),
            translateX: parseFloat(this._previewContainer.style.transform?.match(/translate\(([^)]+)\)/)?.[1]?.split(',')[0] || '0'),
            translateY: parseFloat(this._previewContainer.style.transform?.match(/translate\(([^)]+)\)/)?.[1]?.split(',')[1] || '0')
        })
            .to({
                scale: 1,
                translateX: 0,
                translateY: 0
            }, 150)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate((obj) => {
                this._previewContainer!.style.transform =
                    `translate(${obj.translateX}px, ${obj.translateY}px) scale(${obj.scale})`;
            })
            .onComplete(() => {
                this._previewContainer!.style.zIndex = '998'; // Возвращаем исходный z-index
            })
            .start();
    };

    /**
     * Пытается запустить preview видео
     */
    private playPreviewVideo = async () => {
        if (!this._previewVideo) return;

        try {
            if (this._previewVideo.readyState >= 2) { // HAVE_CURRENT_DATA или выше
                await this._previewVideo.play().catch(e => {
                    console.warn('Auto-play prevented:', e);
                    // Добавляем overlay для ручного запуска
                    this.addPlayOverlay();
                });
            }
        } catch (error) {
            console.warn('Failed to play preview video:', error);
        }
    };

    /**
     * Добавляет overlay для ручного запуска видео
     */
    private addPlayOverlay = () => {
        if (!this._previewContainer) return;

        // Удаляем существующий overlay
        this.removePlayOverlay();

        const overlay = document.createElement('div');
        overlay.id = 'preview-play-overlay';
        overlay.textContent = '▶';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: pointer;
            z-index: 1000;
        `;

        overlay.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await this._previewVideo?.play();
                this.removePlayOverlay();
            } catch (error) {
                console.warn('Manual play failed:', error);
            }
        });

        this._previewContainer.appendChild(overlay);
    };

    /**
     * Удаляет overlay для ручного запуска
     */
    private removePlayOverlay = () => {
        if (!this._previewContainer) return;

        const overlay = this._previewContainer.querySelector('#preview-play-overlay');
        if (overlay) {
            overlay.remove();
        }
    };

    /**
     * Обновляет preview video (показывает следующий стрим)
     */
    private updatePreviewVideo = () => {
        if (!this._previewVideo) return;

        console.log('Updating preview video...');

        // Получаем следующий стрим
        const nextStream = StreamProvider.getNextStreamSilently();

        if (nextStream) {
            console.log('Setting preview stream srcObject');
            this._previewVideo.srcObject = nextStream;

            // Убираем overlay если есть
            this.removePlayOverlay();

            // Пытаемся запустить видео
            setTimeout(() => {
                this.playPreviewVideo();
            }, 100);
        } else {
            console.log('No stream for preview');
            this._previewVideo.srcObject = null;
        }
    };

    /**
     * Переключает на стрим из preview
     */
    private switchToPreviewStream = () => {
        console.log('Switching to preview stream...');

        // Получаем следующий стрим (это тот же, что в preview)
        const nextStream = StreamProvider.getNextStream();

        if (nextStream && this._viewport) {
            console.log('Switching main viewport to next stream');
            // Переключаем основной viewport
            this._viewport.srcObject = nextStream;

            // Диспатчим событие переключения
            EventHandler.dispatchEvent(STREAM_SWITCHED);

            // Обновляем preview через небольшую задержку
            setTimeout(() => {
                this.updatePreviewVideo();
            }, 300);
        }
    };

    /**
     * Обновляет preview видео
     */
    public update(): void {
        this.updatePreviewVideo();
    }

    /**
     * Очистка ресурсов
     */
    public destroy(): void {
        if (this._previewVideo) {
            this._previewVideo.srcObject = null;
        }
        if (this._previewContainer) {
            this._previewContainer.remove();
        }
    }
}

export default PreviewManager.getInstance();