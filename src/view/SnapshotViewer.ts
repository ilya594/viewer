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
    //const response = await RestService.getSnapshotsList();//fetch('/detections');
//return;
    //if (!response.ok) {
    //  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    //}

    const files: string[] = [
    "2026-02-28T06-25-29-342Z_frame12755_person.jpg",
    "2026-02-28T06-25-29-342Z_frame12755_person.json",
    "2026-02-28T06-25-29-769Z_frame12761_person.jpg",
    "2026-02-28T06-25-29-769Z_frame12761_person.json",
    "2026-02-28T06-25-34-144Z_frame12830_umbrella.jpg",
    "2026-02-28T06-25-34-144Z_frame12830_umbrella.json",
    "2026-02-28T06-30-12-491Z_frame17406_person.jpg",
    "2026-02-28T06-30-12-491Z_frame17406_person.json",
    "2026-02-28T06-30-12-817Z_frame17410_person.jpg",
    "2026-02-28T06-30-12-817Z_frame17410_person.json",
    "2026-02-28T06-30-16-053Z_frame17461_person.jpg",
    "2026-02-28T06-30-16-053Z_frame17461_person.json",
    "2026-02-28T06-30-19-099Z_frame17511_person.jpg",
    "2026-02-28T06-30-19-099Z_frame17511_person.json",
    "2026-02-28T06-30-22-112Z_frame17561_person.jpg",
    "2026-02-28T06-30-22-112Z_frame17561_person.json",
    "2026-02-28T06-30-25-193Z_frame17611_person.jpg",
    "2026-02-28T06-30-25-193Z_frame17611_person.json",
    "2026-02-28T06-36-39-848Z_frame23716_person.jpg",
    "2026-02-28T06-36-39-848Z_frame23716_person.json",
    "2026-02-28T06-36-42-853Z_frame23765_person.jpg",
    "2026-02-28T06-36-42-853Z_frame23765_person.json",
    "2026-02-28T06-36-46-092Z_frame23821_person.jpg",
    "2026-02-28T06-36-46-092Z_frame23821_person.json",
    "2026-02-28T06-40-20-400Z_frame27341_person.jpg",
    "2026-02-28T06-40-20-400Z_frame27341_person.json",
    "2026-02-28T06-40-23-555Z_frame27390_person.jpg",
    "2026-02-28T06-40-23-555Z_frame27390_person.json",
    "2026-02-28T06-40-26-672Z_frame27441_person.jpg",
    "2026-02-28T06-40-26-672Z_frame27441_person.json",
    "2026-02-28T06-40-26-982Z_frame27445_person.jpg",
    "2026-02-28T06-40-26-982Z_frame27445_person.json",
    "2026-02-28T06-40-31-638Z_frame27521_person.jpg",
    "2026-02-28T06-40-31-638Z_frame27521_person.json",
    "2026-02-28T06-40-31-951Z_frame27526_person.jpg",
    "2026-02-28T06-40-31-951Z_frame27526_person.json",
    "2026-02-28T06-49-09-655Z_frame35990_person.jpg",
    "2026-02-28T06-49-09-655Z_frame35990_person.json",
    "2026-02-28T06-49-14-971Z_frame36076_person.jpg",
    "2026-02-28T06-49-14-971Z_frame36076_person.json",
    "2026-02-28T06-49-18-129Z_frame36125_person.jpg",
    "2026-02-28T06-49-18-129Z_frame36125_person.json",
    "2026-02-28T06-59-29-289Z_frame46176_person.jpg",
    "2026-02-28T06-59-29-289Z_frame46176_person.json",
    "2026-02-28T07-05-28-500Z_frame52061_person.jpg",
    "2026-02-28T07-05-28-500Z_frame52061_person.json",
    "2026-02-28T07-06-08-703Z_frame52725_person.jpg",
    "2026-02-28T07-06-08-703Z_frame52725_person.json",
    "2026-02-28T07-06-11-786Z_frame52775_person.jpg",
    "2026-02-28T07-06-11-786Z_frame52775_person.json",
    "2026-02-28T07-06-15-012Z_frame52831_person.jpg",
    "2026-02-28T07-06-15-012Z_frame52831_person.json",
    "2026-02-28T07-06-15-347Z_frame52835_person.jpg",
    "2026-02-28T07-06-15-347Z_frame52835_person.json",
    "2026-02-28T07-10-16-968Z_frame56806_person.jpg",
    "2026-02-28T07-10-16-968Z_frame56806_person.json",
    "2026-02-28T07-12-26-014Z_frame58925_person.jpg",
    "2026-02-28T07-12-26-014Z_frame58925_person.json",
    "2026-02-28T07-12-29-051Z_frame58975_person.jpg",
    "2026-02-28T07-12-29-051Z_frame58975_person.json",
    "2026-02-28T07-12-32-334Z_frame59031_person.jpg",
    "2026-02-28T07-12-32-334Z_frame59031_person.json",
    "2026-02-28T07-12-32-667Z_frame59035_person.jpg",
    "2026-02-28T07-12-32-667Z_frame59035_person.json",
    "2026-02-28T07-45-16-876Z_frame91201_person.jpg",
    "2026-02-28T07-45-16-876Z_frame91201_person.json",
    "2026-02-28T07-45-17-172Z_frame91205_person.jpg",
    "2026-02-28T07-45-17-172Z_frame91205_person.json",
    "2026-02-28T07-45-20-428Z_frame91260_person.jpg",
    "2026-02-28T07-45-20-428Z_frame91260_person.json",
    "2026-02-28T07-45-23-510Z_frame91311_person.jpg",
    "2026-02-28T07-45-23-510Z_frame91311_person.json",
    "2026-02-28T07-45-23-825Z_frame91315_person.jpg",
    "2026-02-28T07-45-23-825Z_frame91315_person.json",
    "2026-02-28T08-23-41-157Z_frame129191_person.jpg",
    "2026-02-28T08-23-41-157Z_frame129191_person.json",
    "2026-02-28T08-23-41-499Z_frame129195_person.jpg",
    "2026-02-28T08-23-41-499Z_frame129195_person.json",
    "2026-02-28T08-23-48-542Z_frame129310_person.jpg",
    "2026-02-28T08-23-48-542Z_frame129310_person.json",
    "2026-02-28T08-34-49-234Z_frame140156_person.jpg",
    "2026-02-28T08-34-49-234Z_frame140156_person.json",
    "2026-02-28T08-34-49-571Z_frame140160_person.jpg",
    "2026-02-28T08-34-49-571Z_frame140160_person.json",
    "2026-02-28T08-34-52-592Z_frame140210_person.jpg",
    "2026-02-28T08-34-52-592Z_frame140210_person.json",
    "2026-02-28T08-34-52-915Z_frame140216_person.jpg",
    "2026-02-28T08-34-52-915Z_frame140216_person.json",
    "2026-02-28T08-34-56-106Z_frame140271_person.jpg",
    "2026-02-28T08-34-56-106Z_frame140271_person.json",
    "2026-02-28T08-34-56-403Z_frame140275_person.jpg",
    "2026-02-28T08-34-56-403Z_frame140275_person.json",
    "2026-02-28T08-34-59-674Z_frame140331_person.jpg",
    "2026-02-28T08-34-59-674Z_frame140331_person.json",
    "2026-02-28T08-35-00-011Z_frame140335_person.jpg",
    "2026-02-28T08-35-00-011Z_frame140335_person.json",
    "2026-02-28T08-50-00-380Z_frame154751_person.jpg",
    "2026-02-28T08-50-00-380Z_frame154751_person.json",
    "2026-02-28T08-50-00-723Z_frame154755_person.jpg",
    "2026-02-28T08-50-00-723Z_frame154755_person.json",
    "2026-02-28T08-50-03-797Z_frame154805_person.jpg",
    "2026-02-28T08-50-03-797Z_frame154805_person.json",
    "2026-02-28T08-50-07-017Z_frame154861_person.jpg",
    "2026-02-28T08-50-07-017Z_frame154861_person.json",
    "2026-02-28T08-50-24-680Z_frame155150_person.jpg",
    "2026-02-28T08-50-24-680Z_frame155150_person.json",
    "2026-02-28T08-50-27-946Z_frame155206_person.jpg",
    "2026-02-28T08-50-27-946Z_frame155206_person.json",
    "2026-02-28T08-50-28-268Z_frame155210_person.jpg",
    "2026-02-28T08-50-28-268Z_frame155210_person.json",
    "2026-02-28T08-50-31-292Z_frame155260_person.jpg",
    "2026-02-28T08-50-31-292Z_frame155260_person.json",
    "2026-02-28T09-36-15-124Z_frame200281_umbrella.jpg",
    "2026-02-28T09-36-15-124Z_frame200281_umbrella.json",
    "2026-02-28T09-38-32-244Z_frame202546_umbrella.jpg",
    "2026-02-28T09-38-32-244Z_frame202546_umbrella.json",
    "2026-02-28T09-39-42-973Z_frame203720_umbrella.jpg",
    "2026-02-28T09-39-42-973Z_frame203720_umbrella.json",
    "2026-02-28T09-41-00-879Z_frame205020_umbrella.jpg",
    "2026-02-28T09-41-00-879Z_frame205020_umbrella.json",
    "2026-02-28T09-43-07-942Z_frame207116_umbrella.jpg",
    "2026-02-28T09-43-07-942Z_frame207116_umbrella.json",
    "2026-02-28T09-45-38-010Z_frame209591_bird.jpg",
    "2026-02-28T09-45-38-010Z_frame209591_bird.json",
    "2026-02-28T09-45-41-065Z_frame209640_person.jpg",
    "2026-02-28T09-45-41-065Z_frame209640_person.json",
    "2026-02-28T09-45-44-182Z_frame209690_person.jpg",
    "2026-02-28T09-45-44-182Z_frame209690_person.json",
    "2026-02-28T09-45-47-316Z_frame209740_person.jpg",
    "2026-02-28T09-45-47-316Z_frame209740_person.json",
    "2026-02-28T09-45-50-317Z_frame209790_person.jpg",
    "2026-02-28T09-45-50-317Z_frame209790_person.json",
    "2026-02-28T09-45-53-537Z_frame209846_person.jpg",
    "2026-02-28T09-45-53-537Z_frame209846_person.json",
    "2026-02-28T09-45-53-864Z_frame209850_person.jpg",
    "2026-02-28T09-45-53-864Z_frame209850_person.json",
    "2026-02-28T09-45-59-859Z_frame209950_umbrella.jpg",
    "2026-02-28T09-45-59-859Z_frame209950_umbrella.json",
    "2026-02-28T09-46-02-928Z_frame210001_umbrella.jpg",
    "2026-02-28T09-46-02-928Z_frame210001_umbrella.json",
    "2026-02-28T09-46-03-251Z_frame210005_umbrella.jpg",
    "2026-02-28T09-46-03-251Z_frame210005_umbrella.json",
    "2026-02-28T09-46-06-614Z_frame210060_umbrella.jpg",
    "2026-02-28T09-46-06-614Z_frame210060_umbrella.json",
    "2026-02-28T09-46-51-146Z_frame210800_umbrella.jpg",
    "2026-02-28T09-46-51-146Z_frame210800_umbrella.json",
    "2026-02-28T09-47-11-818Z_frame211145_umbrella.jpg",
    "2026-02-28T09-47-11-818Z_frame211145_umbrella.json",
    "2026-02-28T09-47-24-396Z_frame211351_umbrella.jpg",
    "2026-02-28T09-47-24-396Z_frame211351_umbrella.json",
    "2026-02-28T09-48-10-272Z_frame212105_umbrella.jpg",
    "2026-02-28T09-48-10-272Z_frame212105_umbrella.json",
    "2026-02-28T09-48-44-649Z_frame212665_person.jpg",
    "2026-02-28T09-48-44-649Z_frame212665_person.json",
    "2026-02-28T09-48-47-663Z_frame212711_person.jpg",
    "2026-02-28T09-48-47-663Z_frame212711_person.json",
    "2026-02-28T09-48-50-756Z_frame212761_person.jpg",
    "2026-02-28T09-48-50-756Z_frame212761_person.json",
    "2026-02-28T09-48-53-803Z_frame212811_person.jpg",
    "2026-02-28T09-48-53-803Z_frame212811_person.json",
    "2026-02-28T09-48-56-839Z_frame212861_person.jpg",
    "2026-02-28T09-48-56-839Z_frame212861_person.json",
    "2026-02-28T09-48-59-895Z_frame212911_person.jpg",
    "2026-02-28T09-48-59-895Z_frame212911_person.json",
    "2026-02-28T09-49-00-193Z_frame212915_person.jpg",
    "2026-02-28T09-49-00-193Z_frame212915_person.json",
    "2026-02-28T09-49-03-954Z_frame212975_umbrella.jpg",
    "2026-02-28T09-49-03-954Z_frame212975_umbrella.json",
    "2026-02-28T09-49-04-283Z_frame212980_umbrella.jpg",
    "2026-02-28T09-49-04-283Z_frame212980_umbrella.json",
    "2026-02-28T09-49-08-000Z_frame213040_umbrella.jpg",
    "2026-02-28T09-49-08-000Z_frame213040_umbrella.json",
    "2026-02-28T09-57-32-728Z_frame221335_umbrella.jpg",
    "2026-02-28T09-57-32-728Z_frame221335_umbrella.json",
    "2026-02-28T09-57-50-391Z_frame221625_person.jpg",
    "2026-02-28T09-57-50-391Z_frame221625_person.json",
    "2026-02-28T09-57-53-551Z_frame221676_person_umbrella.jpg",
    "2026-02-28T09-57-53-551Z_frame221676_person_umbrella.json",
    "2026-02-28T09-57-56-610Z_frame221725_person_umbrella.jpg",
    "2026-02-28T09-57-56-610Z_frame221725_person_umbrella.json",
    "2026-02-28T09-57-59-801Z_frame221775_person.jpg",
    "2026-02-28T09-57-59-801Z_frame221775_person.json",
    "2026-02-28T09-58-02-857Z_frame221825_person_umbrella.jpg",
    "2026-02-28T09-58-02-857Z_frame221825_person_umbrella.json",
    "2026-02-28T09-58-05-905Z_frame221875_person.jpg",
    "2026-02-28T09-58-05-905Z_frame221875_person.json",
    "2026-02-28T09-58-09-043Z_frame221926_person.jpg",
    "2026-02-28T09-58-09-043Z_frame221926_person.json",
    "2026-02-28T09-58-09-369Z_frame221930_person.jpg",
    "2026-02-28T09-58-09-369Z_frame221930_person.json",
    "2026-02-28T09-58-12-625Z_frame221985_person.jpg",
    "2026-02-28T09-58-12-625Z_frame221985_person.json",
    "2026-02-28T09-58-12-966Z_frame221991_person.jpg",
    "2026-02-28T09-58-12-966Z_frame221991_person.json",
    "2026-02-28T10-10-42-731Z_frame234426_person.jpg",
    "2026-02-28T10-10-42-731Z_frame234426_person.json",
    "2026-02-28T10-10-45-790Z_frame234475_person.jpg",
    "2026-02-28T10-10-45-790Z_frame234475_person.json",
    "2026-02-28T10-10-46-128Z_frame234481_person.jpg",
    "2026-02-28T10-10-46-128Z_frame234481_person.json",
    "2026-02-28T10-11-05-515Z_frame234796_person.jpg",
    "2026-02-28T10-11-05-515Z_frame234796_person.json",
    "2026-02-28T10-11-05-831Z_frame234800_person.jpg",
    "2026-02-28T10-11-05-831Z_frame234800_person.json",
    "2026-02-28T10-11-09-029Z_frame234856_person.jpg",
    "2026-02-28T10-11-09-029Z_frame234856_person.json",
    "2026-02-28T10-11-09-351Z_frame234860_person.jpg",
    "2026-02-28T10-11-09-351Z_frame234860_person.json",
    "2026-02-28T10-11-12-514Z_frame234915_person.jpg",
    "2026-02-28T10-11-12-514Z_frame234915_person.json",
    "2026-02-28T10-12-50-916Z_frame236546_person.jpg",
    "2026-02-28T10-12-50-916Z_frame236546_person.json",
    "2026-02-28T10-12-51-244Z_frame236550_person.jpg",
    "2026-02-28T10-12-51-244Z_frame236550_person.json",
    "2026-02-28T10-29-01-379Z_frame252570_person.jpg",
    "2026-02-28T10-29-01-379Z_frame252570_person.json",
    "2026-02-28T10-29-04-713Z_frame252625_person.jpg",
    "2026-02-28T10-29-04-713Z_frame252625_person.json",
    "2026-02-28T10-36-41-998Z_frame260215_person.jpg",
    "2026-02-28T10-36-41-998Z_frame260215_person.json",
    "2026-02-28T10-38-21-233Z_frame261865_person.jpg",
    "2026-02-28T10-38-21-233Z_frame261865_person.json",
    "2026-02-28T10-38-24-234Z_frame261915_person_handbag.jpg",
    "2026-02-28T10-38-24-234Z_frame261915_person_handbag.json",
    "2026-02-28T10-38-27-262Z_frame261966_person_handbag.jpg",
    "2026-02-28T10-38-27-262Z_frame261966_person_handbag.json",
    "2026-02-28T10-38-27-577Z_frame261970_person_handbag.jpg",
    "2026-02-28T10-38-27-577Z_frame261970_person_handbag.json",
    "2026-02-28T10-38-30-816Z_frame262026_person_handbag.jpg",
    "2026-02-28T10-38-30-816Z_frame262026_person_handbag.json",
    "2026-02-28T10-38-31-141Z_frame262031_person_handbag.jpg",
    "2026-02-28T10-38-31-141Z_frame262031_person_handbag.json",
    "2026-02-28T10-38-34-206Z_frame262081_umbrella.jpg",
    "2026-02-28T10-38-34-206Z_frame262081_umbrella.json",
    "2026-02-28T10-50-26-470Z_frame273896_umbrella.jpg",
    "2026-02-28T10-50-26-470Z_frame273896_umbrella.json",
    "2026-02-28T10-50-45-675Z_frame274215_umbrella.jpg",
    "2026-02-28T10-50-45-675Z_frame274215_umbrella.json",
    "2026-02-28T10-51-36-131Z_frame275055_umbrella.jpg",
    "2026-02-28T10-51-36-131Z_frame275055_umbrella.json",
    "2026-02-28T10-54-19-390Z_frame277771_umbrella.jpg",
    "2026-02-28T10-54-19-390Z_frame277771_umbrella.json",
    "2026-02-28T10-54-22-626Z_frame277821_person.jpg",
    "2026-02-28T10-54-22-626Z_frame277821_person.json",
    "2026-02-28T10-54-28-432Z_frame277916_person.jpg",
    "2026-02-28T10-54-28-432Z_frame277916_person.json",
    "2026-02-28T10-54-31-566Z_frame277966_person.jpg",
    "2026-02-28T10-54-31-566Z_frame277966_person.json",
    "2026-02-28T10-54-34-578Z_frame278016_person.jpg",
    "2026-02-28T10-54-34-578Z_frame278016_person.json",
    "2026-02-28T10-54-34-893Z_frame278020_person.jpg",
    "2026-02-28T10-54-34-893Z_frame278020_person.json",
    "2026-02-28T10-54-38-147Z_frame278076_person.jpg",
    "2026-02-28T10-54-38-147Z_frame278076_person.json",
    "2026-02-28T10-54-38-478Z_frame278080_person.jpg",
    "2026-02-28T10-54-38-478Z_frame278080_person.json",
    "2026-02-28T10-56-34-517Z_frame279996_person.jpg",
    "2026-02-28T10-56-34-517Z_frame279996_person.json",
    "2026-02-28T11-00-27-146Z_frame283836_person.jpg",
    "2026-02-28T11-00-27-146Z_frame283836_person.json",
    "2026-02-28T11-00-30-345Z_frame283886_person.jpg",
    "2026-02-28T11-00-30-345Z_frame283886_person.json",
    "2026-02-28T11-00-33-398Z_frame283936_person.jpg",
    "2026-02-28T11-00-33-398Z_frame283936_person.json",
    "2026-02-28T11-00-33-718Z_frame283940_person.jpg",
    "2026-02-28T11-00-33-718Z_frame283940_person.json",
    "2026-02-28T11-00-39-506Z_frame284035_person.jpg",
    "2026-02-28T11-00-39-506Z_frame284035_person.json",
    "2026-02-28T11-00-42-596Z_frame284086_person.jpg",
    "2026-02-28T11-00-42-596Z_frame284086_person.json",
    "2026-02-28T11-04-57-205Z_frame288270_person.jpg",
    "2026-02-28T11-04-57-205Z_frame288270_person.json",
    "2026-02-28T11-05-00-305Z_frame288320_person.jpg",
    "2026-02-28T11-05-00-305Z_frame288320_person.json",
    "2026-02-28T11-05-03-449Z_frame288371_person.jpg",
    "2026-02-28T11-05-03-449Z_frame288371_person.json",
    "2026-02-28T11-05-03-789Z_frame288375_person.jpg",
    "2026-02-28T11-05-03-789Z_frame288375_person.json",
    "2026-02-28T11-05-07-069Z_frame288431_person.jpg",
    "2026-02-28T11-05-07-069Z_frame288431_person.json",
    "2026-02-28T11-05-10-093Z_frame288481_person.jpg",
    "2026-02-28T11-05-10-093Z_frame288481_person.json",
    "2026-02-28T11-05-10-444Z_frame288485_person.jpg",
    "2026-02-28T11-05-10-444Z_frame288485_person.json",
    "2026-02-28T11-05-13-545Z_frame288536_person.jpg",
    "2026-02-28T11-05-13-545Z_frame288536_person.json",
    "2026-02-28T11-05-16-631Z_frame288586_person.jpg",
    "2026-02-28T11-05-16-631Z_frame288586_person.json",
    "2026-02-28T11-05-16-978Z_frame288590_person.jpg",
    "2026-02-28T11-05-16-978Z_frame288590_person.json",
    "2026-02-28T11-05-20-196Z_frame288645_person.jpg",
    "2026-02-28T11-05-20-196Z_frame288645_person.json",
    "2026-02-28T11-05-53-874Z_frame289201_umbrella_person.jpg",
    "2026-02-28T11-05-53-874Z_frame289201_umbrella_person.json",
    "2026-02-28T11-05-54-199Z_frame289205_person.jpg",
    "2026-02-28T11-05-54-199Z_frame289205_person.json",
    "2026-02-28T11-05-57-359Z_frame289256_person.jpg",
    "2026-02-28T11-05-57-359Z_frame289256_person.json",
    "2026-02-28T11-07-18-320Z_frame290595_person.jpg",
    "2026-02-28T11-07-18-320Z_frame290595_person.json",
    "2026-02-28T11-22-46-822Z_frame305770_person.jpg",
    "2026-02-28T11-22-46-822Z_frame305770_person.json",
    "2026-02-28T11-22-49-889Z_frame305820_person.jpg",
    "2026-02-28T11-22-49-889Z_frame305820_person.json",
    "2026-02-28T11-22-53-031Z_frame305871_person.jpg",
    "2026-02-28T11-22-53-031Z_frame305871_person.json",
    "2026-02-28T11-22-56-102Z_frame305921_person.jpg",
    "2026-02-28T11-22-56-102Z_frame305921_person.json",
    "2026-02-28T11-22-59-204Z_frame305971_person.jpg",
    "2026-02-28T11-22-59-204Z_frame305971_person.json",
    "2026-02-28T11-23-02-284Z_frame306021_person.jpg",
    "2026-02-28T11-23-02-284Z_frame306021_person.json",
    "2026-02-28T11-23-05-380Z_frame306071_person.jpg",
    "2026-02-28T11-23-05-380Z_frame306071_person.json",
    "2026-02-28T11-24-05-013Z_frame307036_person.jpg",
    "2026-02-28T11-24-05-013Z_frame307036_person.json",
    "2026-02-28T11-24-08-243Z_frame307086_person.jpg",
    "2026-02-28T11-24-08-243Z_frame307086_person.json",
    "2026-02-28T11-30-46-432Z_frame313545_person.jpg",
    "2026-02-28T11-30-46-432Z_frame313545_person.json",
    "2026-02-28T11-30-49-541Z_frame313595_person.jpg",
    "2026-02-28T11-30-49-541Z_frame313595_person.json",
    "2026-02-28T11-30-52-586Z_frame313646_person.jpg",
    "2026-02-28T11-30-52-586Z_frame313646_person.json",
    "2026-02-28T11-30-55-805Z_frame313696_person.jpg",
    "2026-02-28T11-30-55-805Z_frame313696_person.json",
    "2026-02-28T11-30-59-086Z_frame313751_person.jpg",
    "2026-02-28T11-30-59-086Z_frame313751_person.json",
    "2026-02-28T11-31-02-139Z_frame313801_person.jpg",
    "2026-02-28T11-31-02-139Z_frame313801_person.json",
    "2026-02-28T11-31-02-446Z_frame313805_person.jpg",
    "2026-02-28T11-31-02-446Z_frame313805_person.json"
];//await response.json();

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