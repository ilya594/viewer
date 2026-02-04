export function getRgb(bitmap: any) {
    let offset: number = 4;

    let r = 0;
    let g = 0;
    let b = 0;
    let j = 0;

    for (let i = 0; i < bitmap.data.length - offset; i = i + offset) {
        r += bitmap.data[i];
        g += bitmap.data[i + 1];
        b += bitmap.data[i + 2];
        j++;
    }
    let R = r / j;
    let G = g / j;
    let B = b / j;
    return { r: R, g: G, b: B };
};

export function rbgToHsv({ r, g, b }: any) {
    r /= 255;
    g /= 255;
    b /= 255;
    let maxc = Math.max(r, g, b)
    let minc = Math.min(r, g, b)
    let v = maxc;
    if (minc === maxc) {
        return { h: 0.0, s: 0.0, v: v };
    }

    let s = (maxc - minc) / maxc
    let rc = (maxc - r) / (maxc - minc)
    let gc = (maxc - g) / (maxc - minc)
    let bc = (maxc - b) / (maxc - minc)
    let h;
    if (r == maxc)
        h = 0.0 + bc - gc
    else if (g == maxc)
        h = 2.0 + rc - bc
    else h = 4.0 + gc - rc;

    h = (h / 6.0) % 1.0
    return { h: h * 360, s: s * 100, v: v * 100 };
};

export function rgbToHex({ r, g, b }: any) {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

function getContrastingColor({ r, g, b }: any) {

    // Применяем формулу для получения контрастного цвета
    r = (255 - r);
    g = (255 - g);
    b = (255 - b);

    return rgbToHex({ r, g, b });
}

export function addTimeStamp(canvas: HTMLCanvasElement, date = new Date()): HTMLCanvasElement {
    const dateStr = '[time]    : ' + date.toISOString().split('T')[0] +
        ' ' + date.toTimeString().split(' ')[0] +
        '.' + String(date.getMilliseconds());
    return drawChunks(canvas, dateStr, { x: 30, y: 30 });

}

function getAverageColor(imageData: any) {
    const length = imageData.length;
    let r = 0, g = 0, b = 0, count = 0;

    for (let i = 0; i < length; i += 4) {
        r += imageData[i];       // Красный
        g += imageData[i + 1];   // Зеленый
        b += imageData[i + 2];   // Синий
        count++;
    }

    // Вычисляем средний цвет
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    return { r, g, b };
}

export function addSourceStamp(canvas: HTMLCanvasElement, source: string): HTMLCanvasElement {
    //@ts-ignore
    source = ('[trigger] : ' + source + ' ' + (navigator?.userAgentData?.platform || 'ዘiㄨyяc૯Б૯!') + ' ' + (navigator?.userAgentData?.mobile ? 'ෲ?ய౦?' : 'кудахтер'));
    return drawChunks(canvas, source, { x: 30, y: 70 });
}

function drawChunks(canvas: HTMLCanvasElement, source: string, delta: { x: number, y: number }) {
    const context = canvas.getContext('2d', { alpha: true, desynchronized: false, colorSpace: 'srgb', willReadFrequently: false });
    source.concat(' ␦ᔆ').toUpperCase().split('').forEach((symbol: any, index: number) => {
        context.font = 'bold 36px Courier New';
        context.fillStyle = getContrastingColor(getAverageColor(context.getImageData(delta.x + index * 26, delta.y, 42, 42)?.data));
        context.fillText(symbol, delta.x + index * 26, delta.y);
    });
    return canvas;
}

export function addDataStamp(canvas: HTMLCanvasElement, data: { h: number, s: number, v: number } = null): HTMLCanvasElement {
    if (!data) return;
    const source = '[viewdata] : h[' + data.h.toFixed(1) + '] s[' + data.s.toFixed(1) + '] v[' + data.v.toFixed(1) + ']';
    return drawChunks(canvas, source, { x: 30, y: 110 })
}

export function tryResizeWindow() {

    if (window.screen?.availWidth > 3000) {
        // debugger;
        window.resizeTo(window.screen.availWidth / 4, window.screen.availHeight / 4);
    }
}

export function generateSortableFileName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

export async function bufferToDataUrl(buffer: any, fileSaver: any, localSave: boolean): Promise<string> {
    try {
        let blob: Blob;

        if (buffer instanceof OffscreenCanvas) {
            blob = await buffer.convertToBlob();
        } else {
            blob = await new Promise<Blob>((resolve, reject) => {
                buffer.toBlob((blob: any) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Failed to convert canvas to blob'));
                }, 'image/png');
            });
        }

        if (localSave) {
            const name = new Date().toISOString().split('T')[0] + ' ' +
                new Date().toTimeString().split(' ')[0];
            fileSaver.saveAs(blob, name.toString() + '.png');
        }

        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read blob'));
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error in bufferToDataUrl:', error);
        throw error;
    }
}

