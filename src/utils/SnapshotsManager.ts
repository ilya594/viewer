import * as TWEEN from '@tweenjs/tween.js';
import { 
    VIDEO_WIDTH, 
    VIDEO_HEIGHT,
    SNAP_WIDTH,
    SNAP_HEIGHT,
    SNAP_COUNT
} from "./Constants";

interface SnapshotInfo {
    x: number;
    y: number;
    width: number;
    height: number;
    timestamp: number;
}

class SnapshotsManager {
    private static instance: SnapshotsManager;
    private _modal: HTMLElement | null = null;
    private _modalCanvas: HTMLCanvasElement | null = null;
    private _modalContext: CanvasRenderingContext2D | null = null;
    private _currentIndex: number = 0;
    private _snapshots: SnapshotInfo[] = [];
    private _isModalOpen: boolean = false;
    private _modalTween: any = null;
    private _buffer: OffscreenCanvas | HTMLCanvasElement | null = null;
    private _bufferContext: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;

    constructor() {
        // Инициализация
    }

    public static getInstance(): SnapshotsManager {
        if (!SnapshotsManager.instance) {
            SnapshotsManager.instance = new SnapshotsManager();
        }
        return SnapshotsManager.instance;
    }

    /**
     * Устанавливает буфер снимков
     */
    public setBuffer(buffer: OffscreenCanvas | HTMLCanvasElement): void {
        this._buffer = buffer;
        
        // Получаем контекст буфера
        if (buffer instanceof OffscreenCanvas) {
            this._bufferContext = buffer.getContext('2d', { willReadFrequently: true });
        } else {
            this._bufferContext = buffer.getContext('2d', { willReadFrequently: true });
        }
        
        // Пересчитываем информацию о снимках
        this.recalculateSnapshots();
    }

    /**
     * Пересчитывает информацию о снимках в буфере
     */
    private recalculateSnapshots(): void {
        if (!this._buffer) return;

        this._snapshots = [];
        const bufferWidth = this._buffer.width;
        
        // Вычисляем, сколько снимков реально есть в буфере
        const maxSnapshots = Math.floor(bufferWidth / VIDEO_WIDTH) * Math.floor(bufferWidth / VIDEO_WIDTH);
        const count = Math.min(this.getCurrentSnapshotCount(), maxSnapshots);

        for (let i = 0; i < count; i++) {
            const x = (i % SNAP_COUNT) * VIDEO_WIDTH;
            const y = Math.floor(i / SNAP_COUNT) * VIDEO_HEIGHT;
            
            this._snapshots.push({
                x,
                y,
                width: VIDEO_WIDTH,
                height: VIDEO_HEIGHT,
                timestamp: Date.now() - (count - i) * 1000 // Примерное время
            });
        }

        // Сортируем от новых к старым
        this._snapshots.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Получает текущее количество снимков в буфере
     */
    private getCurrentSnapshotCount(): number {
        // Эта функция должна вызываться из Snaphots для получения актуального _count
        // Пока возвращаем примерное значение
        return this._snapshots.length;
    }

    /**
     * Добавляет информацию о новом снимке
     */
    public addSnapshotInfo(count: number): void {
        const index = count - 1;
        const x = (index % SNAP_COUNT) * VIDEO_WIDTH;
        const y = Math.floor(index / SNAP_COUNT) * VIDEO_HEIGHT;
        
        this._snapshots.unshift({
            x,
            y,
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
            timestamp: Date.now()
        });

        // Ограничиваем количество
        if (this._snapshots.length > SNAP_COUNT * SNAP_COUNT) {
            this._snapshots.pop();
        }
    }

    /**
     * Инициализация менеджера снимков
     */
    public initialize(snapshotContainerId: string = 'snapshot-container'): void {
        const snapshotContainer = document.getElementById(snapshotContainerId);
        if (!snapshotContainer) {
            console.error(`Snapshot container with id "${snapshotContainerId}" not found`);
            return;
        }

        // Добавляем обработчик клика на контейнер снимка
        snapshotContainer.style.cursor = 'pointer';
        snapshotContainer.addEventListener('click', () => {
            this.openModal();
        });

        this.createModal();
    }

    /**
     * Создает модальное окно с Canvas
     */
    private createModal(): void {
        // Создаем overlay
        const overlay = document.createElement('div');
        overlay.id = 'snapshots-modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
        `;

        // Создаем модальное окно
        this._modal = document.createElement('div');
        this._modal.id = 'snapshots-modal';
        this._modal.style.cssText = `
            position: relative;
            width: 90vw;
            height: 90vh;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #167bff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
            transform: scale(0.9);
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Кнопка закрытия
        const closeButton = document.createElement('div');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            position: absolute;
            top: 15px;
            right: 15px;
            width: 30px;
            height: 30px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: pointer;
            z-index: 10001;
            transition: background 0.2s, transform 0.2s;
        `;

        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
            closeButton.style.transform = 'scale(1.1)';
        });

        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
            closeButton.style.transform = 'scale(1)';
        });

        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeModal();
        });

        // Canvas для отображения снимков
        this._modalCanvas = document.createElement('canvas');
        this._modalCanvas.style.cssText = `
            max-width: 95%;
            max-height: 95%;
            object-fit: contain;
            cursor: pointer;
            background: #000;
        `;

        this._modalContext = this._modalCanvas.getContext('2d', { willReadFrequently: true });

        // Добавляем обработчик клика по canvas для переключения
        this._modalCanvas.addEventListener('click', () => {
            this.showNextSnapshot();
        });

        // Индикатор номера снимка
        const counter = document.createElement('div');
        counter.id = 'snapshot-counter';
        counter.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10001;
            display: none;
        `;

        // Собираем модальное окно
        this._modal.appendChild(closeButton);
        this._modal.appendChild(this._modalCanvas);
        this._modal.appendChild(counter);
        overlay.appendChild(this._modal);
        
        // Добавляем на страницу
        document.body.appendChild(overlay);

        // Обработчик закрытия по клику на overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeModal();
            }
        });

        // Обработчик клавиши ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._isModalOpen) {
                this.closeModal();
            }
        });

        // Обработчик изменения размера окна
        window.addEventListener('resize', () => {
            if (this._isModalOpen) {
                this.updateModalCanvasSize();
                this.renderCurrentSnapshot();
            }
        });
    }

    /**
     * Обновляет размер canvas в модальном окне
     */
    private updateModalCanvasSize(): void {
        if (!this._modalCanvas || !this._modal) return;

        const modalRect = this._modal.getBoundingClientRect();
        const padding = 20; // Отступы
        
        const maxWidth = modalRect.width - padding * 2;
        const maxHeight = modalRect.height - padding * 2;
        
        // Сохраняем пропорции VIDEO_WIDTH:VIDEO_HEIGHT
        const aspectRatio = VIDEO_WIDTH / VIDEO_HEIGHT;
        
        let width = maxWidth;
        let height = width / aspectRatio;
        
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }
        
        this._modalCanvas.width = width;
        this._modalCanvas.height = height;
    }

    /**
     * Отрисовывает текущий снимок в модальном окне
     */
    private renderCurrentSnapshot(): void {
        if (!this._buffer || !this._bufferContext || !this._modalCanvas || !this._modalContext || 
            this._snapshots.length === 0 || this._currentIndex >= this._snapshots.length) {
            return;
        }

        const snapshot = this._snapshots[this._currentIndex];
        
        // Очищаем canvas
        this._modalContext.clearRect(0, 0, this._modalCanvas.width, this._modalCanvas.height);
        
        // Вычисляем размеры для отрисовки с сохранением пропорций
        const aspectRatio = snapshot.width / snapshot.height;
        const canvasAspectRatio = this._modalCanvas.width / this._modalCanvas.height;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (canvasAspectRatio > aspectRatio) {
            // Canvas шире, чем изображение
            drawHeight = this._modalCanvas.height;
            drawWidth = drawHeight * aspectRatio;
            offsetX = (this._modalCanvas.width - drawWidth) / 2;
            offsetY = 0;
        } else {
            // Canvas уже, чем изображение
            drawWidth = this._modalCanvas.width;
            drawHeight = drawWidth / aspectRatio;
            offsetX = 0;
            offsetY = (this._modalCanvas.height - drawHeight) / 2;
        }
        
        // Рисуем снимок из буфера
        if (this._buffer instanceof OffscreenCanvas) {
            // Создаем временный canvas для рисования из OffscreenCanvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = snapshot.width;
            tempCanvas.height = snapshot.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            if (tempCtx) {
                // Копируем часть из OffscreenCanvas
                const imageBitmap = this._buffer.transferToImageBitmap();
                tempCtx.drawImage(
                    imageBitmap,
                    snapshot.x, snapshot.y, snapshot.width, snapshot.height,
                    0, 0, snapshot.width, snapshot.height
                );
                
                // Рисуем на модальном canvas
                this._modalContext.drawImage(
                    tempCanvas,
                    0, 0, snapshot.width, snapshot.height,
                    offsetX, offsetY, drawWidth, drawHeight
                );
            }
        } else {
            // Для обычного Canvas
            this._modalContext.drawImage(
                this._buffer,
                snapshot.x, snapshot.y, snapshot.width, snapshot.height,
                offsetX, offsetY, drawWidth, drawHeight
            );
        }
    }

    /**
     * Открывает модальное окно с последним снимком
     */
    private openModal(): void {
        if (this._snapshots.length === 0) {
            console.log('No snapshots available');
            return;
        }

        const overlay = document.getElementById('snapshots-modal-overlay');
        if (!overlay || !this._modal || !this._modalCanvas) return;

        this._currentIndex = 0; // Начинаем с последнего снимка
        
        // Обновляем размер canvas
        this.updateModalCanvasSize();
        
        // Отрисовываем снимок
        this.renderCurrentSnapshot();
        
        // Показываем overlay
        overlay.style.display = 'flex';
        
        // Анимация открытия
        setTimeout(() => {
            if (this._modal) {
                this._modal.style.transform = 'scale(1)';
                this._modal.style.opacity = '1';
            }
        }, 10);

        this._isModalOpen = true;
        this.updateCounter();
        
        // Блокируем скролл страницы
        document.body.style.overflow = 'hidden';
    }

    /**
     * Закрывает модальное окно
     */
    private closeModal(): void {
        const overlay = document.getElementById('snapshots-modal-overlay');
        if (!overlay || !this._modal) return;

        // Анимация закрытия
        this._modal.style.transform = 'scale(0.9)';
        this._modal.style.opacity = '0';

        setTimeout(() => {
            overlay.style.display = 'none';
            this._isModalOpen = false;
            
            // Разблокируем скролл страницы
            document.body.style.overflow = '';
        }, 300);
    }

    /**
     * Показывает следующий снимок
     */
    private showNextSnapshot(): void {
        if (this._snapshots.length === 0) return;

        // Вычисляем индекс следующего снимка
        this._currentIndex = (this._currentIndex + 1) % this._snapshots.length;
        
        // Анимация перехода
        if (this._modalTween) {
            this._modalTween.stop();
        }

        this._modalTween = new TWEEN.Tween({ opacity: 1 })
            .to({ opacity: 0 }, 150)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate((obj) => {
                if (this._modalCanvas) {
                    this._modalCanvas.style.opacity = obj.opacity.toString();
                }
            })
            .onComplete(() => {
                // Отрисовываем новый снимок
                this.renderCurrentSnapshot();
                
                // Анимация появления
                new TWEEN.Tween({ opacity: 0 })
                    .to({ opacity: 1 }, 150)
                    .easing(TWEEN.Easing.Quadratic.In)
                    .onUpdate((obj) => {
                        if (this._modalCanvas) {
                            this._modalCanvas.style.opacity = obj.opacity.toString();
                        }
                    })
                    .start();
                
                this.updateCounter();
            })
            .start();
    }

    /**
     * Обновляет счетчик снимков
     */
    private updateCounter(): void {
        const counter = document.getElementById('snapshot-counter');
        if (counter && this._snapshots.length > 1) {
            counter.textContent = `${this._currentIndex + 1} / ${this._snapshots.length}`;
            counter.style.display = 'block';
        } else if (counter) {
            counter.style.display = 'none';
        }
    }

    /**
     * Очищает все снимки
     */
    public clearSnapshots(): void {
        this._snapshots = [];
        this._currentIndex = 0;
    }

    /**
     * Открывает модальное окно (публичный метод)
     */
    public open(): void {
        this.openModal();
    }

    /**
     * Закрывает модальное окно (публичный метод)
     */
    public close(): void {
        this.closeModal();
    }

    /**
     * Проверяет, открыто ли модальное окно
     */
    public isOpen(): boolean {
        return this._isModalOpen;
    }

    /**
     * Получает количество снимков
     */
    public getSnapshotCount(): number {
        return this._snapshots.length;
    }
}

export default SnapshotsManager.getInstance();