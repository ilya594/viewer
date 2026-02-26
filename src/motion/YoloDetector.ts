import { AutoModel, AutoProcessor, RawImage } from '@xenova/transformers';
import EventHandler, { MOTION_DETECTION_STARTED } from '../utils/Events';
import { MOTION_DETECT_DELAY } from '../utils/Constants';

class YoloDetector {
    private model: any = null;
    private processor: any = null;
    private isInitialized: boolean = false;
    private onDetection: (detections: any[]) => void;
    private frameSkip: number = 5;
    private frameCounter: number = 0;
    private timout: any = null;

    constructor(options?: {
        onDetection?: (detections: any[]) => void,
        frameSkip?: number
    }) {
        this.onDetection = options?.onDetection || console.log;
        this.frameSkip = options?.frameSkip || 5;
    }

    public initialize = async (): Promise<void> => {
        console.log('🔄 Initializing YOLO detector...');
        try {
            // Загружаем модель и процессор
            this.model = await AutoModel.from_pretrained('onnx-community/yolov10n', {
                quantized: true, // Используем квантизированную версию для скорости
            });

            this.processor = await AutoProcessor.from_pretrained('onnx-community/yolov10n');

            this.isInitialized = true;
            this.startDetection(document.querySelector("video"));
            console.log('✅ YOLO detector initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize detector:', error);
            throw error;
        }
    }

    public detect = async (track: MediaStreamTrack): Promise<any[]> => {
        if (this.timout) {
            console.log('⏳ Detection skipped due to cooldown');
            return [];
        }
        if (!this.isInitialized) {
            throw new Error('Detector not initialized. Call initialize() first.');
        }

        this.frameCounter++;
        if (this.frameCounter % this.frameSkip !== 0) {
            return []; // Пропускаем кадры для производительности
        }

        try {
            // Захватываем кадр с видеотрека
            const imageCapture = new ImageCapture(track);
            const bitmap = await imageCapture.grabFrame();

            // Конвертируем ImageBitmap в canvas, затем в data URL для RawImage
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            ctx!.drawImage(bitmap, 0, 0);

            // Получаем данные как ImageData
            const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);

            // Создаем RawImage из данных
            // Формат: new RawImage(data, width, height, channels)
            const image = new RawImage(imageData.data, canvas.width, canvas.height, 4);

            // Обрабатываем изображение через процессор
            const { pixel_values, original_sizes } = await this.processor(image, { device: "webgpu" });

            // Запускаем детекцию
            const startTime = performance.now();
            const { output0 } = await this.model({ images: pixel_values });
            const inferenceTime = performance.now() - startTime;

            // Получаем предсказания
            const predictions = output0.tolist()[0];

            // Фильтруем по порогу и форматируем результаты
            const threshold = 0.5;
            const detections = [];

            for (const [xmin, ymin, xmax, ymax, score, classId] of predictions) {
                if (score < threshold) continue;

                const detection = {
                    bbox: [xmin, ymin, xmax, ymax],
                    score: score,
                    classId: classId,
                    className: this.model.config.id2label[classId] || `class_${classId}`,
                    inferenceTime: inferenceTime
                };

                detections.push(detection);

                console.log(`🔍 Found "${detection.className}" at [${xmin.toFixed(0)}, ${ymin.toFixed(0)}, ${xmax.toFixed(0)}, ${ymax.toFixed(0)}] with score ${score.toFixed(2)} (${inferenceTime.toFixed(0)}ms)`);
            }

            // Вызываем колбэк с результатами
            if (detections.length > 0) {
                const now = new Date();
                const hours = now.getHours();
                const minutes = now.getMinutes();
                console.log('[', hours + ':' + minutes + '] ' + detections);

                this.timout = setTimeout(() => {this.timout = null;}, MOTION_DETECT_DELAY);
                EventHandler.dispatchEvent(MOTION_DETECTION_STARTED, { detections });
            }
            return detections;

        } catch (error) {
            console.error('❌ Detection error:', error);
            return [];
        }
    }

    // Асинхронная обработка с использованием requestAnimationFrame
    public startDetection = (videoElement: HTMLVideoElement): { stop: () => void } => {
        if (!this.isInitialized) {
            throw new Error('Detector not initialized');
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        let isRunning = true;
        let animationId: number;

        const processFrame = async () => {
            if (!isRunning) return;

            if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                // Устанавливаем размер canvas под видео
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;

                // Рисуем текущий кадр на canvas
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

                // Получаем трек с canvas (для совместимости с ImageCapture)
                const stream = canvas.captureStream(30); // 30 FPS
                const track = stream.getVideoTracks()[0];

                // Запускаем детекцию
                const detections = await this.detect(track);
                track.stop();
            }

            animationId = requestAnimationFrame(processFrame);
        };

        processFrame();

        return {
            stop: () => {
                isRunning = false;
                cancelAnimationFrame(animationId);
            }
        };
    }


    public getStatus(): boolean {
        return this.isInitialized;
    }
}

export default new YoloDetector();