export class ColorsCurves {

    private _graphic: any;
    private _width: number;
    private _height: number;


    constructor(graphic: any, width: number, height: number) {
        this._graphic = graphic;
        this._width = width;
        this._height = height;
    }

    public drawDeltaGraphics = (
        values: any,
        color: string,
        clear: boolean = true,
        adjust: number = 0,
        fillArea: boolean = false,
        smoothCurve: boolean = true // Enable bezier smoothing
    ) => {
        const ctx = this._graphic.getContext('2d', { willReadFrequently: true });

        if (clear) {
            ctx.clearRect(0, 0, this._width, this._height);
        }

        if (!values?.cached || values.cached.length < 2) {
            return;
        }

        const BOTTOM_Y = 1000;
        const points = values.cached.map((y: number, x: number) => ({ x, y: y + adjust }));

        // Draw filled area
        if (fillArea) {
            ctx.fillStyle = this.getColorWithAlpha(color, 0.01);
            ctx.beginPath();

            if (smoothCurve && points.length > 2) {
                // Draw smooth curve for fill
                this.drawSmoothCurve(ctx, points);
            } else {
                // Draw straight lines
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
            }

            // Close the path to create fill area
            ctx.lineTo(points[points.length - 1].x, BOTTOM_Y);
            ctx.lineTo(points[0].x, BOTTOM_Y);
            ctx.closePath();
            ctx.fill();
        }

        // Draw the curve line
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;
        ctx.beginPath();

        if (smoothCurve && points.length > 2) {
            // Draw smooth curve
            this.drawSmoothCurve(ctx, points);
        } else {
            // Draw straight lines
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
        }

        ctx.stroke();
    }

    // Helper for drawing smooth bezier curves
    private drawSmoothCurve = (ctx: CanvasRenderingContext2D, points: Array<{ x: number, y: number }>) => {
        if (points.length < 2) return;

        // Move to first point
        ctx.moveTo(points[0].x, points[0].y);

        if (points.length === 2) {
            // Just draw a line if only 2 points
            ctx.lineTo(points[1].x, points[1].y);
            return;
        }

        // Draw bezier curves for smoother line
        for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;

            // Quadratic bezier curve
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }

        // Curve through the last two points
        ctx.quadraticCurveTo(
            points[points.length - 1].x,
            points[points.length - 1].y,
            points[points.length - 1].x,
            points[points.length - 1].y
        );
    }

    private getColorWithAlpha = (color: string, alpha: number = 1): string => {
        // If color is already in rgba format, extract and modify alpha
        if (color.startsWith('rgba')) {
            const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
            if (match) {
                const [_, r, g, b, a] = match;
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
        }

        // If color is in rgb format, convert to rgba
        if (color.startsWith('rgb')) {
            const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                const [_, r, g, b] = match;
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
        }

        // If color is hex, convert to rgba
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        // If color is a named color, use a default
        const defaultColors: Record<string, string> = {
            'red': `rgba(255, 0, 0, ${alpha})`,
            'green': `rgba(0, 255, 0, ${alpha})`,
            'blue': `rgba(0, 0, 255, ${alpha})`,
            'yellow': `rgba(255, 255, 0, ${alpha})`,
            'purple': `rgba(128, 0, 128, ${alpha})`,
            'cyan': `rgba(0, 255, 255, ${alpha})`,
            'orange': `rgba(255, 165, 0, ${alpha})`,
            'pink': `rgba(255, 192, 203, ${alpha})`,
        };

        const lowerColor = color.toLowerCase();
        if (defaultColors[lowerColor]) {
            return defaultColors[lowerColor];
        }

        // Default fallback
        return `rgba(100, 100, 100, ${alpha})`;
    }
}
export default ColorsCurves;