import RestService from "../network/RestService";

interface DetectionFile {
  name: string;           // имя файла без расширения (timestamp_...)
  jpgPath: string;        // ./detections/xxx.jpg
  jsonPath: string;       // ./detections/xxx.json
  timestamp?: string;     // для отображения
}

export class SnapshotViewer {
  private container: HTMLElement;
  private detectionsPath: string;
  private fileList: DetectionFile[] = [];
  private currentView: 'list' | 'detail' = 'list';
  private wrapper: HTMLElement | null = null;

  constructor() {
    const containerId: string = 'fullscreen-overlay';
    const detectionsPath: string = './../var/www/detections';
    const el = document.getElementById(containerId);
//    if (!el) {
    //  throw new Error(`Container with id "${containerId}" not found`);
 //   }
    this.container = el;
    this.detectionsPath = detectionsPath.endsWith('/') 
      ? detectionsPath 
      : detectionsPath + '/';

    this.renderList = this.renderList.bind(this);
    this.showDetail = this.showDetail.bind(this);
    this.goBack = this.goBack.bind(this);

    //this.init();
  }

  public async initialize() {
    try {
      await this.loadFiles();
      this.render();
    } catch (err) {
      console.error('Failed to initialize SnapshotViewer:', err);
      this.container.innerHTML = `<div class="error">Ошибка загрузки: ${err.message}</div>`;
    }
  }

  private async loadFiles(): Promise<void> {
    // Получаем список файлов через серверный эндпоинт
    // (предполагаем, что у тебя есть API /api/detections/list)
    const response = await RestService.getSnapshotsList();//fetch('/detections');
//return;
    //if (!response.ok) {
    //  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    //}

    const files: string[] = await response.json();

    // Группируем jpg + json по имени без расширения
    const map = new Map<string, DetectionFile>();

    for (const file of files) {
      if (!file.endsWith('.jpg') && !file.endsWith('.json')) continue;

      const baseName = file.replace(/\.(jpg|json)$/, '');
      if (!map.has(baseName)) {
        map.set(baseName, {
          name: baseName,
          jpgPath: '',
          jsonPath: ''
        });
      }

      const entry = map.get(baseName)!;
      if (file.endsWith('.jpg')) {
        entry.jpgPath = this.detectionsPath + file;
      } else if (file.endsWith('.json')) {
        entry.jsonPath = this.detectionsPath + file;
      }
    }

    this.fileList = Array.from(map.values())
      .filter(f => f.jpgPath) // только те, где есть картинка
      .sort((a, b) => b.name.localeCompare(a.name)); // новые сверху
  }

  private render() {
    this.container.innerHTML = '';

    if (this.currentView === 'list') {
      this.renderList();
    } else {
      this.renderDetail();
    }
  }

  private renderList() {
    const wrapper = document.createElement('div');
    wrapper.className = 'snapshot-list';

    if (this.fileList.length === 0) {
      wrapper.innerHTML = '<p class="empty">Снимки не найдены</p>';
    } else {
      const ul = document.createElement('ul');
      this.fileList.forEach(file => {
        const li = document.createElement('li');
        li.className = 'snapshot-item';
        li.dataset.base = file.name;

     //   const thumb = document.createElement('img');
     //   thumb.src = file.jpgPath;
     //   thumb.alt = file.name;
     ////   thumb.loading = 'lazy';
     //   thumb.width = 120;
     //   thumb.height = 80;

        const name = document.createElement('span');
        name.textContent = file.name.replace(/-/g, ':').slice(0, 19); // читаемый timestamp

     //   li.appendChild(thumb);
        li.appendChild(name);

        li.addEventListener('click', () => this.showDetail(file));

        ul.appendChild(li);
      });
      wrapper.appendChild(ul);
      this.wrapper = wrapper;
    }

    this.container.appendChild(wrapper);
  }

  public showhide = () => {
    this.wrapper.style.display = this.wrapper.style.display === 'none' ? 'block' : 'none';
  }

  private async renderDetail() {
    const file = this.fileList.find(f => f.name === this.currentFileName);
    if (!file) {
      this.goBack();
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'snapshot-detail';

    // Кнопка назад
   // const backBtn = document.createElement('button');
    //backBtn.textContent = '← Назад к списку';
   // backBtn.className = 'back-btn';
   // backBtn.addEventListener('click', this.goBack);

    // Изображение
    const img = document.createElement('img');
    img.src = file.jpgPath;
    img.alt = file.name;
    img.className = 'detail-image';

    // JSON информация
    const infoDiv = document.createElement('div');
    infoDiv.className = 'detail-info';

    try {
      const res = await fetch(file.jsonPath);
      if (res.ok) {
        const json = await res.json();
        infoDiv.innerHTML = `
          <h3>${file.name}</h3>
          <p><strong>Время:</strong> ${json.startTime || file.name}</p>
          <p><strong>Длительность:</strong> ${json.duration?.toFixed(1) || '?'} с</p>
          <p><strong>Объектов:</strong> ${json.totalDetections || 0}</p>
          <pre>${JSON.stringify(json.detections || [], null, 2)}</pre>
        `;
      } else {
        infoDiv.textContent = 'Не удалось загрузить метаданные';
      }
    } catch (err) {
      infoDiv.textContent = `Ошибка: ${err.message}`;
    }

   // wrapper.appendChild(backBtn);
    wrapper.appendChild(img);
    wrapper.appendChild(infoDiv);

    this.container.appendChild(wrapper);
  }

  private currentFileName: string | null = null;

  private showDetail(file: DetectionFile) {

    this.currentFileName = file.name;
    this.currentView = 'detail';
  //  this.render();

    window.open('https://stairs.live/detections/' + file.name + '.jpg', '_blank', 'noopener,noreferrer');
        //file.jpgPath, '_blank', 'noopener,noreferrer');
  }

  private goBack() {
    this.currentFileName = null;
    this.currentView = 'list';
    this.render();
  }
}

export default new SnapshotViewer();