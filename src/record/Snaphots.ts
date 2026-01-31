import * as TWEEN from '@tweenjs/tween.js';
import {
    VIDEO_WIDTH,
    VIDEO_HEIGHT,
    SNAP_WIDTH,
    SNAP_HEIGHT,
    SNAP_COUNT,
    SNAP_SAVER_OPACITY,
} from "../utils/Constants";
import * as Utils from "../utils/Utils";

import Controls from '../view/Controls';
import FileSaver from 'file-saver';
import StreamProvider from '../network/StreamProvider';
import MobileUtils from '../utils/MobileUtils';
import EventHandler, { MOBILE_SWIPE_RIGHT, MOTION_DETECTION_STARTED, SNAPSHOT_SEND_HOMIE, STREAM_RECEIVED, STREAM_SWITCHED } from '../utils/Events';
import { HlsUtil } from '../utils/HlsUtil';
import { StreamUserNotes } from '../utils/Notes';


class Snaphots {
    private _container: any;
    private _viewport: any;
    private _proxy: any;
    private _buffer: OffscreenCanvas | any;
    private _snapsaver: any;
    private _snapshot: any;
    private _count = 0;
    private _tween: any;
    private _streamNotes: StreamUserNotes;
    private _notesContainer: HTMLElement;
    private _isDrawingNotes: boolean = false;

    private get w() { return this._viewport.getBoundingClientRect().width; }
    private get h() { return this._viewport.getBoundingClientRect().height; }

    public get playing() { return !!this._tween?.isPlaying; };
    public get streamNotes() { return this._streamNotes; }

    public initialize = async () => {
        this._container = document.getElementById("view-page");

        this._viewport = document.querySelector("video");
        this._viewport.addEventListener("click", this.onViewportClick);
        MobileUtils.on(document).addEventListener(MOBILE_SWIPE_RIGHT, this.onViewportClick);

        // Создаем контейнер для заметок
        this._notesContainer = document.createElement('div');
        this._notesContainer.id = 'notes-container';
        this._notesContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 999;
        `;
        this._container.appendChild(this._notesContainer);

        this._snapsaver = document.createElement("canvas");
        this._container.appendChild(this._snapsaver);
        this._snapsaver.style.setProperty('position', 'absolute');
        this._snapsaver.addEventListener("click", this.onViewportClick);
        this._snapsaver.style.setProperty('transform', 'translate(' + 0 + 'px,' + 0 + 'px)' + 'scale(' + 1 + ',' + 1 + ')');

        let context = this._snapsaver.getContext('2d', { willReadFrequently: true });
        context.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

        this._snapshot = document.createElement("canvas");
        this._container.appendChild(this._snapshot);
        this._snapshot.style.setProperty('position', 'absolute');
        this._snapshot.width = SNAP_WIDTH;
        this._snapshot.height = SNAP_HEIGHT;
        this._snapshot.getContext('2d', { willReadFrequently: true }).globalAlpha = 0;
        this._snapshot.getContext('2d').beginPath();
        this._snapshot.getContext('2d').lineWidth = "0";
        this._snapshot.getContext('2d').strokeStyle = "black";
        this._snapshot.getContext('2d').rect(0, 0, SNAP_WIDTH, SNAP_HEIGHT);
        this._snapshot.getContext('2d').stroke();

        this._proxy = document.createElement("canvas");

        this.createBufferCanvas();

        EventHandler.addEventListener(MOTION_DETECTION_STARTED, (data: any) => this.create('', false, data));
        EventHandler.addEventListener(STREAM_RECEIVED, async () => {
            this._streamNotes = await this.loadNotesFromStorage();
            // Отрисовываем существующие заметки
            setTimeout(async() => {
                await this.renderAllNotes();
                // Подписываемся на изменения заметок
                this.setupNotesListeners();
                // Автосохранение заметок каждые 30 секунд
                this.startAutoSave();
            }, 1000);

        });
        // Инициализируем заметки с загрузкой из хранилища
        //   this._streamNotes = await this.loadNotesFromStorage();



        requestAnimationFrame(this.tick);
    };

    private createBufferCanvas = () => {
        try {
            this._buffer = new OffscreenCanvas(VIDEO_WIDTH * SNAP_COUNT, VIDEO_HEIGHT * SNAP_COUNT);
        } catch (error: any) {
            this._buffer = document.createElement("canvas");
        }

        this._buffer.width = VIDEO_WIDTH * SNAP_COUNT;
        this._buffer.height = VIDEO_HEIGHT * SNAP_COUNT;
        this._buffer.getContext('2d', { willReadFrequently: true }).beginPath();
        this._buffer.getContext('2d').lineWidth = 1;
        this._buffer.getContext('2d').strokeStyle = "black";
        this._buffer.getContext('2d').rect(0, 0, VIDEO_WIDTH * 5, VIDEO_HEIGHT * 5);
        this._buffer.getContext('2d').stroke();
    }

    public create = (source: string = '', send: Boolean = false, data: any = null) => {
        this.createSnaphot(this.drawCanvasFromVideo(this._proxy, this._viewport, source, data), send);
    }

    private onViewportClick = async (event: MouseEvent) => {
        // Создаем поле ввода для новой заметки
        const input = document.createElement('input');
        input.type = 'text';
        input.style.cssText = `
            position: fixed;
            left: ${event.clientX}px;
            top: ${event.clientY}px;
            z-index: 10000;
            background: rgba(0,0,0,0.9);
            color: yellow;
            border: 2px solid #167bff;
            padding: 8px;
            font-size: 18px;
            font-family: Comic Sans MS, Comic Sans, cursive;
            outline: none;
            min-width: 200px;
            box-shadow: 0 0 20px rgba(22, 123, 255, 0.7);
            border-radius: 5px;
        `;

        document.body.appendChild(input);
        input.focus();

        // Обработка сохранения заметки
        const handleKeyDown = async (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                const text = input.value.trim();
                if (text) {
                    // Преобразуем координаты относительно контейнера
                    const containerRect = this._container.getBoundingClientRect();
                    const x = event.clientX - containerRect.left;
                    const y = event.clientY - containerRect.top;

                    // Создаем заметку через менеджер
                    const note = this._streamNotes.createNote(text + '📌', x, y, '#ffff00');

                    // Отрисовываем заметку
                    this.renderNote(note);

                    // Сохраняем в хранилище
                    await this.saveNotesToStorage();
                }

                // Удаляем поле ввода
                input.remove();
                document.removeEventListener('keydown', handleKeyDown);
                input.removeEventListener('blur', handleBlur);
            }

            if (e.key === 'Escape') {
                input.remove();
                document.removeEventListener('keydown', handleKeyDown);
                input.removeEventListener('blur', handleBlur);
            }
        };

        // Обработка потери фокуса
        const handleBlur = () => {
            setTimeout(() => {
                if (document.activeElement !== input) {
                    input.remove();
                    document.removeEventListener('keydown', handleKeyDown);
                    input.removeEventListener('blur', handleBlur);
                }
            }, 100);
        };

        document.addEventListener('keydown', handleKeyDown);
        input.addEventListener('blur', handleBlur);
    };

    // ========== МЕТОДЫ РАБОТЫ С ЗАМЕТКАМИ ==========

    /**
     * Загружает заметки из хранилища
     */
    private async loadNotesFromStorage(): Promise<StreamUserNotes> {
        try {
            console.log('Загрузка заметок из хранилища...');
            const notes = await StreamUserNotes.loadFromStorage('main-stream');
            console.log(`Загружено ${notes.count} заметок`);
            return notes;
        } catch (error) {
            console.error('Ошибка при загрузке заметок:', error);
            return new StreamUserNotes('main-stream');
        }
    }

    /**
     * Сохраняет заметки в хранилище
     */
    private async saveNotesToStorage(): Promise<boolean> {
        try {
            const success = await this._streamNotes.saveToStorage();
            if (success) {
                console.log('Заметки успешно сохранены');
            }
            return success;
        } catch (error) {
            console.error('Ошибка при сохранении заметок:', error);
            return false;
        }
    }

    /**
     * Отрисовывает все заметки на экране
     */
    private async renderAllNotes(): Promise<void> {
        if (this._isDrawingNotes) return;
        this._isDrawingNotes = true;

        try {
            // Очищаем контейнер
            this._notesContainer.innerHTML = '';

            // Отрисовываем только видимые заметки
            const visibleNotes = this._streamNotes.visibleNotes;

            visibleNotes.forEach(note => {
                this.renderNote(note);
            });

            console.log(`Отрисовано ${visibleNotes.length} заметок`);
        } catch (error) {
            console.error('Ошибка при отрисовке заметок:', error);
        } finally {
            this._isDrawingNotes = false;
        }
    }

    /**
     * Отрисовывает одну заметку
     */
    private renderNote(note: any): HTMLElement {
        const noteEl = document.createElement('div');
        noteEl.id = `note-${note.id}`;
        noteEl.textContent = note.text;
        noteEl.style.cssText = `
            position: absolute;
            left: ${note.x}px;
            top: ${note.y}px;
            color: ${note.color || '#ffff00'};
            font-size: ${note.fontSize || 18}px;
            font-family: Comic Sans MS, Comic Sans, cursive;
            z-index: 9999;
            pointer-events: auto;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
            background: rgba(0, 0, 0, 0.5);
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid rgba(255, 255, 0, 0.3);
            cursor: move;
            user-select: none;
            transition: transform 0.2s, box-shadow 0.2s;
            max-width: 300px;
            word-wrap: break-word;
        `;

        // Добавляем обработчики для перемещения
        this.makeNoteDraggable(noteEl, note.id);

        // Добавляем обработчик клика для редактирования
        noteEl.addEventListener('dblclick', () => this.editNote(note.id));

        this._notesContainer.appendChild(noteEl);
        return noteEl;
    }

    /**
     * Делает заметку перетаскиваемой
     */
    private makeNoteDraggable(element: HTMLElement, noteId: string): void {
        let isDragging = false;
        let startX: number, startY: number;
        let initialX: number, initialY: number;

        const onMouseDown = (e: MouseEvent) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = element.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;

            element.style.zIndex = '10000';
            element.style.boxShadow = '0 0 20px rgba(255, 255, 0, 0.7)';
            element.style.transform = 'scale(1.05)';

            e.preventDefault();
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            element.style.left = `${initialX + dx}px`;
            element.style.top = `${initialY + dy}px`;
        };

        const onMouseUp = async (e: MouseEvent) => {
            if (!isDragging) return;

            isDragging = false;
            element.style.zIndex = '9999';
            element.style.boxShadow = 'none';
            element.style.transform = 'scale(1)';

            // Обновляем позицию в менеджере заметок
            const rect = element.getBoundingClientRect();
            const containerRect = this._container.getBoundingClientRect();

            const newX = rect.left - containerRect.left;
            const newY = rect.top - containerRect.top;

            this._streamNotes.updateNote(noteId, { x: newX, y: newY });

            // Сохраняем изменения
            await this.saveNotesToStorage();

            // Удаляем обработчики
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        const onMouseLeave = () => {
            if (isDragging) {
                onMouseUp(new MouseEvent('mouseup'));
            }
        };

        element.addEventListener('mousedown', onMouseDown);

        element.addEventListener('mouseleave', onMouseLeave);

        // Динамически добавляем обработчики к документу при начале перетаскивания
        element.addEventListener('mousedown', () => {
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true });
        });
    }

    /**
     * Редактирует существующую заметку
     */
    private async editNote(noteId: string): Promise<void> {
        const note = this._streamNotes.getNote(noteId);
        if (!note) return;

        const noteElement = document.getElementById(`note-${noteId}`);
        if (!noteElement) return;

        const rect = noteElement.getBoundingClientRect();

        // Создаем поле ввода для редактирования
        const input = document.createElement('textarea');
        input.value = note.text.replace('📌', '').trim();
        input.style.cssText = `
            position: fixed;
            left: ${rect.left}px;
            top: ${rect.top}px;
            z-index: 10001;
            background: rgba(0,0,0,0.95);
            color: yellow;
            border: 2px solid #ff167b;
            padding: 8px;
            font-size: ${note.fontSize || 18}px;
            font-family: Comic Sans MS, Comic Sans, cursive;
            outline: none;
            width: ${Math.max(rect.width, 200)}px;
            height: ${Math.max(rect.height, 100)}px;
            resize: both;
            box-shadow: 0 0 20px rgba(255, 22, 123, 0.7);
            border-radius: 5px;
        `;

        document.body.appendChild(input);
        input.focus();
        input.select();

        const handleKeyDown = async (e: KeyboardEvent) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                const newText = input.value.trim();
                if (newText && newText !== note.text.replace('📌', '').trim()) {
                    // Обновляем заметку
                    this._streamNotes.updateNote(noteId, {
                        text: newText + '📌'
                    });

                    // Обновляем отображение
                    noteElement.textContent = newText + '📌';

                    // Сохраняем изменения
                    await this.saveNotesToStorage();
                }

                input.remove();
                document.removeEventListener('keydown', handleKeyDown);
            }

            if (e.key === 'Escape') {
                input.remove();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };

        const handleBlur = () => {
            setTimeout(() => {
                if (document.activeElement !== input) {
                    input.remove();
                    document.removeEventListener('keydown', handleKeyDown);
                }
            }, 100);
        };

        document.addEventListener('keydown', handleKeyDown);
        input.addEventListener('blur', handleBlur);
    }

    /**
     * Настраивает слушатели изменений заметок
     */
    private setupNotesListeners(): void {
        // Слушатель для добавления заметок
        this._streamNotes.addListener('add', (note: any) => {
            if (note.visible) {
                this.renderNote(note);
            }
        });

        // Слушатель для обновления заметок
        this._streamNotes.addListener('update', (data: { oldNote: any, newNote: any }) => {
            const noteElement = document.getElementById(`note-${data.newNote.id}`);
            if (noteElement) {
                if (data.newNote.visible !== data.oldNote.visible) {
                    if (data.newNote.visible) {
                        this.renderNote(data.newNote);
                    } else {
                        noteElement.remove();
                    }
                } else if (data.newNote.visible) {
                    // Обновляем существующую заметку
                    noteElement.textContent = data.newNote.text;
                    noteElement.style.left = `${data.newNote.x}px`;
                    noteElement.style.top = `${data.newNote.y}px`;
                    noteElement.style.color = data.newNote.color;
                    noteElement.style.fontSize = `${data.newNote.fontSize}px`;
                }
            } else if (data.newNote.visible) {
                this.renderNote(data.newNote);
            }
        });

        // Слушатель для удаления заметок
        this._streamNotes.addListener('delete', (note: any) => {
            const noteElement = document.getElementById(`note-${note.id}`);
            if (noteElement) {
                noteElement.remove();
            }
        });

        // Слушатель для очистки всех заметок
        this._streamNotes.addListener('clear', () => {
            this._notesContainer.innerHTML = '';
        });
    }

    /**
     * Запускает автосохранение заметок
     */
    private startAutoSave(): void {
        //this._streamNotes.enableAutoSave(30000); // Каждые 30 секунд
        //console.log('Автосохранение заметок включено');
    }

    /**
     * Экспортирует все заметки в файл
     */
    public async exportNotes(): Promise<void> {
        this._streamNotes.exportToFile(`notes_export_${Date.now()}.json`);
    }

    /**
     * Импортирует заметки из файла
     */
    public async importNotes(file: File): Promise<void> {
        try {
            const importedNotes = await StreamUserNotes.importFromFile(file);

            // Добавляем все заметки из импортированного файла
            importedNotes.notesArray.forEach(note => {
                this._streamNotes.addNote(note);
            });

            // Перерисовываем все заметки
            await this.renderAllNotes();

            // Сохраняем в хранилище
            await this.saveNotesToStorage();

            console.log(`Импортировано ${importedNotes.count} заметок`);
        } catch (error) {
            console.error('Ошибка при импорте заметок:', error);
        }
    }

    /**
     * Очищает все заметки
     */
    public async clearAllNotes(): Promise<void> {
        if (confirm('Удалить все заметки? Это действие нельзя отменить.')) {
            this._streamNotes.clearNotesWithEvent();
            await this.saveNotesToStorage();
        }
    }

    /**
     * Показывает/скрывает все заметки
     */
    public toggleAllNotesVisibility(): void {
        const visibleNotes = this._streamNotes.visibleNotes;

        if (visibleNotes.length > 0) {
            this._streamNotes.hideAllNotes();
        } else {
            this._streamNotes.showAllNotes();
        }

        this.saveNotesToStorage();
    }

    // ========== СУЩЕСТВУЮЩИЕ МЕТОДЫ (с минимальными изменениями) ==========

    private switchStreams = () => {
        EventHandler.dispatchEvent(STREAM_SWITCHED);
        const stream: any = StreamProvider.getNextStream();
        if (!stream) {
            new HlsUtil();
        } else {
            const viewport = document.querySelector("video");
            viewport.srcObject = stream;
        }
    }

    private drawCanvasFromVideo(canvas: HTMLCanvasElement, video: any, source: string, data: any = null): HTMLCanvasElement {
        const w: number = canvas.width = video.getBoundingClientRect().width;
        const h: number = canvas.height = video.getBoundingClientRect().height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context?.clearRect(0, 0, w, h);
        context?.drawImage(video, 0, 0, w, h);
        Utils.addTimeStamp(canvas);
        Utils.addSourceStamp(canvas, source);
        Utils.addDataStamp(canvas, data);
        return canvas;
    };

    private createSnaphot = (source: HTMLCanvasElement, send: Boolean) => {
        if (this.playing) this._tween.stop();

        const x: number = (this._count % SNAP_COUNT) * VIDEO_WIDTH;
        const y: number = Math.floor(this._count / SNAP_COUNT) * VIDEO_HEIGHT;

        this._buffer.getContext('2d', { willReadFrequently: true }).drawImage(source, x, y, VIDEO_WIDTH, VIDEO_HEIGHT);

        this._snapsaver.style.setProperty('display', 'inline');
        this._snapsaver.width = this.w;
        this._snapsaver.height = this.h;
        this._snapsaver.getContext('2d', { willReadFrequently: true }).globalAlpha = SNAP_SAVER_OPACITY;
        this._snapsaver.getContext('2d').drawImage(source, 0, 0, this.w, this.h);

        this.startSaverTween(this.w, this.h);
    };

    private startSaverTween = (w: number, h: number) => {
        const ini = { scaleX: 1, scaleY: 1, x: 0, y: 0 };
        const end = {
            scaleX: SNAP_WIDTH / w,
            scaleY: SNAP_HEIGHT / h,
            x: this._viewport.getBoundingClientRect().left - this._viewport.offsetLeft - this._viewport.offsetParent.offsetLeft + (this.w - SNAP_WIDTH) / 2,
            y: -(h - SNAP_HEIGHT) / 2
        };

        this._tween = new TWEEN.Tween(ini)
            .to({ scaleX: end.scaleX, scaleY: end.scaleY, x: end.x, y: end.y }, 333)
            .easing(TWEEN.Easing.Linear.None)
            .onUpdate(() => this._snapsaver.style.setProperty('transform',
                'translate(' + ini.x + 'px,' + ini.y + 'px)' +
                'scale(' + ini.scaleX + ',' + ini.scaleY + ')'))
            .onComplete(() => this.onSaverTweenComplete())
            .onStop(() => this.onSaverTweenComplete())
            .start();
    }

    private onSaverTweenComplete = () => {
        this._snapshot.style.setProperty('transform',
            'translate(' +
            String(this._viewport.getBoundingClientRect().left - this._viewport.offsetLeft - this._viewport.offsetParent.offsetLeft + (this.w - SNAP_WIDTH) / 2) +
            'px,' +
            String(-(this.h - SNAP_HEIGHT) / 2) +
            'px)' +
            'scale(' + 1 + ',' + 1 + ')'
        );

        this._snapshot.getContext('2d', { willReadFrequently: true }).globalAlpha = 1;
        this._snapshot.getContext('2d').clearRect(0, 0, SNAP_WIDTH + 1, SNAP_HEIGHT + 1);
        this._snapshot.getContext('2d').drawImage(this._snapsaver, 0, 0, SNAP_WIDTH, SNAP_HEIGHT);
        this._snapshot.getContext('2d').beginPath();
        this._snapshot.getContext('2d').lineWidth = "1";
        this._snapshot.getContext('2d').strokeStyle = "black";
        this._snapshot.getContext('2d').rect(0, 0, SNAP_WIDTH, SNAP_HEIGHT);
        this._snapshot.getContext('2d').stroke();

        this._snapsaver.style.setProperty('transform', 'translate(' + 0 + 'px,' + 0 + 'px)' + 'scale(' + 1 + ',' + 1 + ')');
        this._snapsaver.style.setProperty('display', 'none');
        this._snapsaver.getContext('2d', { willReadFrequently: true }).clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

        document.getElementById("snaps-button").innerHTML = String(++this._count);

        if (this._count === SNAP_COUNT * SNAP_COUNT) this.flushBuffer();
    }

    public flushBuffer = () => {
        this.dispatchSendEvent();
        (this._buffer.getContext('2d', { willReadFrequently: true }) as any).clearRect(0, 0, VIDEO_WIDTH * SNAP_COUNT, VIDEO_HEIGHT * SNAP_COUNT);
        this._buffer.width = VIDEO_WIDTH * SNAP_COUNT;
        this._buffer.height = VIDEO_HEIGHT * SNAP_COUNT;
        document.getElementById("snaps-button").innerHTML = String(this._count = 0);
    };

    private viewSnapshotCollection = async () => {
        this.bufferToDataUrl((data: string) => {
            const tab: any = window.open();
            tab.document.body.style.width = tab.document.body.style.height = '100%';
            tab.document.body.style.overflow = 'hidden';
            tab.document.body.innerHTML =
                '<div width="100%" height="100%">' +
                '<img src="' + data + '" width="' + VIDEO_WIDTH + 'px" height="' + VIDEO_HEIGHT + 'px">' +
                '</div>';
        });
    }

    private bufferToDataUrl = (callback: Function): void => {
        (this._buffer as OffscreenCanvas).convertToBlob().then((value: Blob) => {
            if (Controls?.localSaveEnabled) {
                const name = new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0];
                FileSaver.saveAs(value, name.toString() + '.png');
            }

            const reader: FileReader = new FileReader();
            const file: File = new File([value], '_.png', { type: 'image/png' });

            reader.onload = (result: any) => callback(result?.target?.result);
            reader.readAsDataURL(file);
        });
    }

    private dispatchSendEvent = () => {
        this.bufferToDataUrl((data: string) => EventHandler.dispatchEvent(SNAPSHOT_SEND_HOMIE, data));
    }

    private tick = (time: number) => {
        requestAnimationFrame(this.tick);
        TWEEN.update(time);
    };
}

export default new Snaphots();