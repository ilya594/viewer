export class StreamUserNotes {
    private _notes: Map<string, UserNote>;
    private _streamId: string;
    private _lastUpdate: Date;

    constructor(streamId: string) {
        this._notes = new Map<string, UserNote>();
        this._streamId = streamId;
        this._lastUpdate = new Date();
    }

    // Геттеры
    public get streamId(): string {
        return this._streamId;
    }

    public get notes(): Map<string, UserNote> {
        return new Map(this._notes); // Возвращаем копию для иммутабельности
    }

    public get notesArray(): UserNote[] {
        return Array.from(this._notes.values());
    }

    public get count(): number {
        return this._notes.size;
    }

    public get lastUpdate(): Date {
        return this._lastUpdate;
    }

    public get visibleNotes(): UserNote[] {
        return this.notesArray.filter(note => note.visible);
    }

    public get hiddenNotes(): UserNote[] {
        return this.notesArray.filter(note => !note.visible);
    }

    // Основные CRUD операции
    public addNote(note: UserNote): boolean {
        if (this._notes.has(note.id)) {
            console.warn(`Note with id ${note.id} already exists`);
            return false;
        }
        
        this._notes.set(note.id, note);
        this._lastUpdate = new Date();
        return true;
    }

    public createNote(text: string, x: number, y: number, color?: string, fontSize?: number): UserNote {
        const note = new UserNote(
            text,
            x,
            y,
            undefined,
            color,
            fontSize
        );
        
        this.addNote(note);
        return note;
    }

    public getNote(id: string): UserNote | undefined {
        return this._notes.get(id);
    }

    public updateNote(id: string, updates: Partial<{
        text: string,
        x: number,
        y: number,
        color: string,
        fontSize: number,
        visible: boolean
    }>): boolean {
        const note = this._notes.get(id);
        if (!note) {
            console.warn(`Note with id ${id} not found`);
            return false;
        }

        let updated = false;

        if (updates.text !== undefined) {
            note.setText(updates.text);
            updated = true;
        }

        if (updates.x !== undefined && updates.y !== undefined) {
            note.setPosition(updates.x, updates.y);
            updated = true;
        } else if (updates.x !== undefined) {
            note.setPosition(updates.x, note.y);
            updated = true;
        } else if (updates.y !== undefined) {
            note.setPosition(note.x, updates.y);
            updated = true;
        }

        if (updates.color !== undefined) {
            note.setColor(updates.color);
            updated = true;
        }

        if (updates.fontSize !== undefined) {
            note.setFontSize(updates.fontSize);
            updated = true;
        }

        if (updates.visible !== undefined) {
            note.setVisible(updates.visible);
            updated = true;
        }

        if (updated) {
            this._lastUpdate = new Date();
        }

        return updated;
    }

    public deleteNote(id: string): boolean {
        const deleted = this._notes.delete(id);
        if (deleted) {
            this._lastUpdate = new Date();
        }
        return deleted;
    }

    public clearNotes(): void {
        this._notes.clear();
        this._lastUpdate = new Date();
    }

    // Поиск и фильтрация
    public findNotesByText(searchText: string, caseSensitive: boolean = false): UserNote[] {
        const text = caseSensitive ? searchText : searchText.toLowerCase();
        return this.notesArray.filter(note => {
            const noteText = caseSensitive ? note.text : note.text.toLowerCase();
            return noteText.includes(text);
        });
    }

    public findNotesInArea(x1: number, y1: number, x2: number, y2: number): UserNote[] {
        return this.notesArray.filter(note => {
            return note.x >= x1 && note.x <= x2 && note.y >= y1 && note.y <= y2;
        });
    }

    public findNoteAtPosition(x: number, y: number, tolerance: number = 5): UserNote | undefined {
        return this.notesArray.find(note => {
            const distance = Math.sqrt(
                Math.pow(note.x - x, 2) + Math.pow(note.y - y, 2)
            );
            return distance <= tolerance;
        });
    }

    // Групповые операции
    public showAllNotes(): void {
        this.notesArray.forEach(note => note.setVisible(true));
        this._lastUpdate = new Date();
    }

    public hideAllNotes(): void {
        this.notesArray.forEach(note => note.setVisible(false));
        this._lastUpdate = new Date();
    }

    public deleteAllHiddenNotes(): number {
        let deletedCount = 0;
        
        this.notesArray.forEach(note => {
            if (!note.visible) {
                this._notes.delete(note.id);
                deletedCount++;
            }
        });
        
        if (deletedCount > 0) {
            this._lastUpdate = new Date();
        }
        
        return deletedCount;
    }

    public moveAllNotes(dx: number, dy: number): void {
        this.notesArray.forEach(note => {
            note.setPosition(note.x + dx, note.y + dy);
        });
        this._lastUpdate = new Date();
    }

    // Сериализация/десериализация
    public toJSON(): object {
        return {
            streamId: this._streamId,
            notes: this.notesArray.map(note => note.toJSON()),
            lastUpdate: this._lastUpdate.toISOString(),
            count: this.count
        };
    }

    public static fromJSON(data: any): StreamUserNotes {
        const notesManager = new StreamUserNotes(data.streamId);
        
        if (data.notes && Array.isArray(data.notes)) {
            data.notes.forEach((noteData: any) => {
                const note = UserNote.fromJSON(noteData);
                notesManager.addNote(note);
            });
        }
        
        if (data.lastUpdate) {
            notesManager._lastUpdate = new Date(data.lastUpdate);
        }
        
        return notesManager;
    }

    // Экспорт/импорт
    public exportToFile(filename: string = `notes_${this._streamId}_${Date.now()}.json`): void {
        const data = JSON.stringify(this.toJSON(), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    public static async importFromFile(file: File): Promise<StreamUserNotes> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target?.result as string);
                    const notesManager = StreamUserNotes.fromJSON(data);
                    resolve(notesManager);
                } catch (error) {
                    reject(new Error('Failed to parse notes file'));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read notes file'));
            };
            
            reader.readAsText(file);
        });
    }

    // Статистика
    public getStats(): {
        total: number,
        visible: number,
        hidden: number,
        avgTextLength: number,
        oldestNote: Date | null,
        newestNote: Date | null
    } {
        const notesArray = this.notesArray;
        
        if (notesArray.length === 0) {
            return {
                total: 0,
                visible: 0,
                hidden: 0,
                avgTextLength: 0,
                oldestNote: null,
                newestNote: null
            };
        }
        
        const visibleNotes = notesArray.filter(note => note.visible);
        const totalTextLength = notesArray.reduce((sum, note) => sum + note.text.length, 0);
        const dates = notesArray.map(note => note.createdAt);
        
        return {
            total: notesArray.length,
            visible: visibleNotes.length,
            hidden: notesArray.length - visibleNotes.length,
            avgTextLength: Math.round(totalTextLength / notesArray.length),
            oldestNote: new Date(Math.min(...dates.map(d => d.getTime()))),
            newestNote: new Date(Math.max(...dates.map(d => d.getTime())))
        };
    }

    // Валидация всех заметок
    public validateAll(): { valid: UserNote[], invalid: UserNote[] } {
        const valid: UserNote[] = [];
        const invalid: UserNote[] = [];
        
        this.notesArray.forEach(note => {
            if (note.isValid()) {
                valid.push(note);
            } else {
                invalid.push(note);
            }
        });
        
        return { valid, invalid };
    }

    // Очистка невалидных заметок
    public cleanupInvalidNotes(): number {
        const invalidNotes = this.validateAll().invalid;
        let removedCount = 0;
        
        invalidNotes.forEach(note => {
            if (this.deleteNote(note.id)) {
                removedCount++;
            }
        });
        
        return removedCount;
    }

    // Подписка на изменения
    private _listeners: Map<string, Function[]> = new Map();

    public addListener(event: 'add' | 'update' | 'delete' | 'clear', callback: Function): void {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event)?.push(callback);
    }

    public removeListener(event: 'add' | 'update' | 'delete' | 'clear', callback: Function): void {
        const listeners = this._listeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    private _emit(event: 'add' | 'update' | 'delete' | 'clear', data?: any): void {
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} listener:`, error);
                }
            });
        }
    }

    // Обновленные CRUD методы с событиями
    public addNoteWithEvent(note: UserNote): boolean {
        const success = this.addNote(note);
        if (success) {
            this._emit('add', note);
        }
        return success;
    }

    public updateNoteWithEvent(id: string, updates: any): boolean {
        const oldNote = this.getNote(id)?.clone();
        const success = this.updateNote(id, updates);
        
        if (success && oldNote) {
            const newNote = this.getNote(id);
            this._emit('update', { oldNote, newNote });
        }
        
        return success;
    }

    public deleteNoteWithEvent(id: string): boolean {
        const note = this.getNote(id);
        const success = this.deleteNote(id);
        
        if (success && note) {
            this._emit('delete', note);
        }
        
        return success;
    }

    public clearNotesWithEvent(): void {
        const notes = this.notesArray;
        this.clearNotes();
        this._emit('clear', notes);
    }

    // Утилиты
    public toString(): string {
        return `StreamUserNotes[${this._streamId}]: ${this.count} notes`;
    }

    public printSummary(): void {
        const stats = this.getStats();
        console.log(`
        Stream Notes Summary:
        =====================
        Stream ID: ${this._streamId}
        Total Notes: ${stats.total}
        Visible: ${stats.visible}
        Hidden: ${stats.hidden}
        Average Text Length: ${stats.avgTextLength} chars
        Last Update: ${this._lastUpdate.toLocaleString()}
        `);
    }
}

export class UserNote {
    private _id: string;
    private _text: string;
    private _x: number;
    private _y: number;
    private _color: string;
    private _fontSize: number;
    private _createdAt: Date;
    private _updatedAt: Date;
    private _visible: boolean;

    constructor(
        text: string,
        x: number,
        y: number,
        id?: string,
        color: string = '#ffffff',
        fontSize: number = 14,
        visible: boolean = true
    ) {
        this._id = id || this.generateId();
        this._text = text;
        this._x = x;
        this._y = y;
        this._color = color;
        this._fontSize = fontSize;
        this._createdAt = new Date();
        this._updatedAt = new Date();
        this._visible = visible;
    }

    // Генерация уникального ID
    private generateId(): string {
        return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Геттеры
    public get id(): string {
        return this._id;
    }

    public get text(): string {
        return this._text;
    }

    public get x(): number {
        return this._x;
    }

    public get y(): number {
        return this._y;
    }

    public get color(): string {
        return this._color;
    }

    public get fontSize(): number {
        return this._fontSize;
    }

    public get createdAt(): Date {
        return this._createdAt;
    }

    public get updatedAt(): Date {
        return this._updatedAt;
    }

    public get visible(): boolean {
        return this._visible;
    }

    public get position(): { x: number; y: number } {
        return { x: this._x, y: this._y };
    }

    public get style(): string {
        return `
            color: ${this._color};
            font-size: ${this._fontSize}px;
            position: absolute;
            left: ${this._x}px;
            top: ${this._y}px;
            display: ${this._visible ? 'block' : 'none'};
        `;
    }

    // Сеттеры с обновлением времени
    public setText(text: string): this {
        this._text = text;
        this._updatedAt = new Date();
        return this;
    }

    public setPosition(x: number, y: number): this {
        this._x = x;
        this._y = y;
        this._updatedAt = new Date();
        return this;
    }

    public setColor(color: string): this {
        this._color = color;
        this._updatedAt = new Date();
        return this;
    }

    public setFontSize(fontSize: number): this {
        this._fontSize = fontSize;
        this._updatedAt = new Date();
        return this;
    }

    public setVisible(visible: boolean): this {
        this._visible = visible;
        this._updatedAt = new Date();
        return this;
    }

    // Методы для сериализации/десериализации
    public toJSON(): object {
        return {
            id: this._id,
            text: this._text,
            x: this._x,
            y: this._y,
            color: this._color,
            fontSize: this._fontSize,
            createdAt: this._createdAt.toISOString(),
            updatedAt: this._updatedAt.toISOString(),
            visible: this._visible
        };
    }

    public static fromJSON(data: any): UserNote {
        const note = new UserNote(
            data.text,
            data.x,
            data.y,
            data.id,
            data.color || '#ffffff',
            data.fontSize || 14,
            data.visible !== undefined ? data.visible : true
        );
        
        // Восстанавливаем даты
        if (data.createdAt) {
            note._createdAt = new Date(data.createdAt);
        }
        if (data.updatedAt) {
            note._updatedAt = new Date(data.updatedAt);
        }
        
        return note;
    }

    // Метод для клонирования
    public clone(): UserNote {
        return new UserNote(
            this._text,
            this._x,
            this._y,
            this._id,
            this._color,
            this._fontSize,
            this._visible
        );
    }

    // Проверка на равенство
    public equals(other: UserNote): boolean {
        return this._id === other._id &&
               this._text === other._text &&
               this._x === other._x &&
               this._y === other._y &&
               this._color === other._color &&
               this._fontSize === other._fontSize &&
               this._visible === other._visible;
    }

    // Валидация заметки
    public isValid(): boolean {
        return this._text.trim().length > 0 &&
               this._x >= 0 &&
               this._y >= 0 &&
               this._fontSize > 0 &&
               this._fontSize <= 72;
    }

    // Получение информации о заметке
    public getInfo(): string {
        return `Note "${this._text.substring(0, 20)}${this._text.length > 20 ? '...' : ''}" at (${this._x}, ${this._y})`;
    }
}