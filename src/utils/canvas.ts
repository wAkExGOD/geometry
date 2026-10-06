import type { Point } from "../types/types";

/** Создает правильный многоугольник с заданным количеством вершин. */
export function createRegularPolygon(
    sides: number,
    radius: number,
    center: Point,
): Point[] {
    const vertices: Point[] = [];
    const angleStep = (2 * Math.PI) / sides;

    for (let i = 0; i < sides; i++) {
        const angle = i * angleStep - Math.PI / 2; // Начинаем сверху
        vertices.push({
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle),
        });
    }

    return vertices;
}

/** Создает звезду с заданным количеством лучей. */
export function createStar(
    points: number,
    outerRadius: number,
    innerRadius: number,
    center: Point,
): Point[] {
    const vertices: Point[] = [];
    const angleStep = Math.PI / points;

    for (let i = 0; i < points * 2; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        vertices.push({
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle),
        });
    }

    return vertices;
}

/** Преобразует координаты из математической системы в canvas. */
export function toCanvasCoords(
    point: Point,
    centerX: number,
    centerY: number,
): Point {
    return {
        x: point.x + centerX,
        y: centerY - point.y, // Инвертируем Y для математической системы координат
    };
}

/** Рисует сетку на canvas. */
export function drawGrid(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    centerX: number,
    centerY: number,
    gridStep: number = 40,
) {
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;

    // Вертикальные линии
    for (let x = 0; x <= canvasWidth; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
    }

    // Горизонтальные линии
    for (let y = 0; y <= canvasHeight; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    }

    // Оси координат
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 2;

    // Ось X
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvasWidth, centerY);
    ctx.stroke();

    // Ось Y
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvasHeight);
    ctx.stroke();
}

/** Рисует многоугольник на canvas. */
export function drawPolygon(
    ctx: CanvasRenderingContext2D,
    vertices: Point[],
    fillColor: string,
    strokeColor: string,
    centerX: number,
    centerY: number,
) {
    if (vertices.length === 0) return;

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    const firstPoint = toCanvasCoords(vertices[0], centerX, centerY);
    ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let i = 1; i < vertices.length; i++) {
        const point = toCanvasCoords(vertices[i], centerX, centerY);
        ctx.lineTo(point.x, point.y);
    }

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Рисуем вершины
    ctx.fillStyle = strokeColor;
    for (const vertex of vertices) {
        const point = toCanvasCoords(vertex, centerX, centerY);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.fill();
    }
}
