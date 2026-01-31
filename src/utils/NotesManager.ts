import { StreamUserNotes } from '../utils/Notes';
import EventHandler, { STREAM_RECEIVED } from '../utils/Events';

class NotesManager {
    private static instance: NotesManager;
    private _streamNotes: StreamUserNotes;
    private _notesContainer: HTMLElement | null = null;
    private _isDrawingNotes: boolean = false;
    private _parentContainer: HTMLElement | null = null;
    private _dragState: {
        isDragging: boolean;
        noteId: string | null;
        startX: number;
        startY: number;
        initialX: number;
        initialY: number;
    } = {
        isDragging: false,
        noteId: null,
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0
    };

    private constructor() {
        this._streamNotes = new StreamUserNotes('main-stream');
        this.setupEventListeners();
    }

    public static getInstance(): NotesManager {
        if (!NotesManager.instance) {
            NotesManager.instance = new NotesManager();
        }
        return NotesManager.instance;
    }

    /**
     * Инициализация менеджера заметок
     */
    public async initialize(parentContainerId: string = 'view-page'): Promise<void> {
        this._parentContainer = document.getElementById(parentContainerId);
        if (!this._parentContainer) {
            console.error(`Контейнер с id "${parentContainerId}" не найден`);
            return;
        }

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
        this._parentContainer.appendChild(this._notesContainer);

        // Загружаем заметки из хранилища
        await this.loadNotesFromStorage();

        // Настраиваем глобальные обработчики перетаскивания
        this.setupGlobalDragListeners();
    }

    /**
     * Настройка слушателей событий
     */
    private setupEventListeners(): void {
        EventHandler.addEventListener(STREAM_RECEIVED, async () => {
            await this.loadNotesFromStorage();
            await this.renderAllNotes();
            this.setupNotesListeners();
        });
    }

    /**
     * Создание новой заметки
     */
    public async createNote(event: MouseEvent): Promise<void> {
        if (!this._parentContainer) return;

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

        const handleKeyDown = async (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                const text = input.value.trim();
                if (text && this._parentContainer) {
                    const containerRect = this._parentContainer.getBoundingClientRect();
                    const x = event.clientX - containerRect.left;
                    const y = event.clientY - containerRect.top;

                    const note = this._streamNotes.createNote(text + '📌', x, y, '#ffff00');
                    this.renderNote(note);
                    await this.saveNotesToStorage();
                }

                this.cleanupInput(input, handleKeyDown, handleBlur);
            }

            if (e.key === 'Escape') {
                this.cleanupInput(input, handleKeyDown, handleBlur);
            }
        };

        const handleBlur = () => {
            setTimeout(() => {
                if (document.activeElement !== input) {
                    this.cleanupInput(input, handleKeyDown, handleBlur);
                }
            }, 100);
        };

        document.addEventListener('keydown', handleKeyDown);
        input.addEventListener('blur', handleBlur);
    }

    /**
     * Очистка поля ввода
     */
    private cleanupInput(input: HTMLInputElement, keydownHandler: (e: KeyboardEvent) => void, blurHandler: () => void): void {
        input.remove();
        document.removeEventListener('keydown', keydownHandler);
        input.removeEventListener('blur', blurHandler);
    }

    /**
     * Загрузка заметок из хранилища
     */
    private async loadNotesFromStorage(): Promise<void> {
        try {
            console.log('Загрузка заметок из хранилища...');
            const notes = await StreamUserNotes.loadFromStorage('main-stream');
            this._streamNotes = notes;
            console.log(`Загружено ${notes.count} заметок`);
        } catch (error) {
            console.error('Ошибка при загрузке заметок:', error);
        }
    }

    /**
     * Сохранение заметок в хранилище
     */
    public async saveNotesToStorage(): Promise<boolean> {
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
     * Отрисовка всех заметок
     */
    private async renderAllNotes(): Promise<void> {
        if (this._isDrawingNotes || !this._notesContainer) return;
        
        this._isDrawingNotes = true;

        try {
            this._notesContainer.innerHTML = '';
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
     * Отрисовка одной заметки
     */
    private renderNote(note: any): HTMLElement | null {
        if (!this._notesContainer) return null;

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

        // Обработчики для заметки
        noteEl.addEventListener('mousedown', (e) => this.startDragging(e, note.id));
        noteEl.addEventListener('dblclick', () => this.editNote(note.id));

        this._notesContainer.appendChild(noteEl);
        return noteEl;
    }

    /**
     * Начало перетаскивания заметки
     */
    private startDragging(event: MouseEvent, noteId: string): void {
        if (!this._notesContainer) return;

        event.preventDefault();
        const element = event.target as HTMLElement;

        this._dragState = {
            isDragging: true,
            noteId,
            startX: event.clientX,
            startY: event.clientY,
            initialX: element.offsetLeft,
            initialY: element.offsetTop
        };

        element.style.zIndex = '10000';
        element.style.boxShadow = '0 0 20px rgba(255, 255, 0, 0.7)';
        element.style.transform = 'scale(1.05)';
    }

    /**
     * Глобальные обработчики перетаскивания
     */
    private setupGlobalDragListeners(): void {
        const onMouseMove = (e: MouseEvent) => {
            if (!this._dragState.isDragging || !this._dragState.noteId || !this._notesContainer) return;

            const element = document.getElementById(`note-${this._dragState.noteId}`);
            if (!element) return;

            const dx = e.clientX - this._dragState.startX;
            const dy = e.clientY - this._dragState.startY;

            element.style.left = `${this._dragState.initialX + dx}px`;
            element.style.top = `${this._dragState.initialY + dy}px`;
        };

        const onMouseUp = async (e: MouseEvent) => {
            if (!this._dragState.isDragging || !this._dragState.noteId || !this._parentContainer) return;

            const element = document.getElementById(`note-${this._dragState.noteId}`);
            if (element) {
                element.style.zIndex = '9999';
                element.style.boxShadow = 'none';
                element.style.transform = 'scale(1)';

                const containerRect = this._parentContainer.getBoundingClientRect();
                const elementRect = element.getBoundingClientRect();

                const newX = elementRect.left - containerRect.left;
                const newY = elementRect.top - containerRect.top;

                this._streamNotes.updateNote(this._dragState.noteId, { x: newX, y: newY });
                await this.saveNotesToStorage();
            }

            this._dragState.isDragging = false;
            this._dragState.noteId = null;
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    /**
     * Редактирование заметки
     */
    private async editNote(noteId: string): Promise<void> {
        const note = this._streamNotes.getNote(noteId);
        if (!note) return;

        const noteElement = document.getElementById(`note-${noteId}`);
        if (!noteElement) return;

        const rect = noteElement.getBoundingClientRect();

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
                    this._streamNotes.updateNote(noteId, {
                        text: newText + '📌'
                    });
                    noteElement.textContent = newText + '📌';
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
     * Настройка слушателей для заметок
     */
    private setupNotesListeners(): void {
        this._streamNotes.addListener('add', (note: any) => {
            if (note.visible) {
                this.renderNote(note);
            }
        });

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

        this._streamNotes.addListener('delete', (note: any) => {
            const noteElement = document.getElementById(`note-${note.id}`);
            if (noteElement) {
                noteElement.remove();
            }
        });

        this._streamNotes.addListener('clear', () => {
            if (this._notesContainer) {
                this._notesContainer.innerHTML = '';
            }
        });
    }

    /**
     * Публичные методы для управления заметками
     */
    public async exportNotes(): Promise<void> {
        this._streamNotes.exportToFile(`notes_export_${Date.now()}.json`);
    }

    public async importNotes(file: File): Promise<void> {
        try {
            const importedNotes = await StreamUserNotes.importFromFile(file);
            importedNotes.notesArray.forEach(note => {
                this._streamNotes.addNote(note);
            });
            await this.renderAllNotes();
            await this.saveNotesToStorage();
            console.log(`Импортировано ${importedNotes.count} заметок`);
        } catch (error) {
            console.error('Ошибка при импорте заметок:', error);
        }
    }

    public async clearAllNotes(): Promise<void> {
        if (confirm('Удалить все заметки? Это действие нельзя отменить.')) {
            this._streamNotes.clearNotesWithEvent();
            await this.saveNotesToStorage();
        }
    }

    public toggleAllNotesVisibility(): void {
        const visibleNotes = this._streamNotes.visibleNotes;
        if (visibleNotes.length > 0) {
            this._streamNotes.hideAllNotes();
        } else {
            this._streamNotes.showAllNotes();
        }
        this.saveNotesToStorage();
    }

    public getNotesCount(): number {
        return this._streamNotes.count;
    }

    public getVisibleNotesCount(): number {
        return this._streamNotes.visibleNotes.length;
    }
}

export default NotesManager.getInstance();