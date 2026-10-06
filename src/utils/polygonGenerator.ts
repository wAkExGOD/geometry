import type { Point } from "../types/types";

/** Генерирует случайный выпуклый многоугольник методом сортировки точек по углу. */
export function generateRandomConvexPolygon(
    centerX: number,
    centerY: number,
    minRadius: number,
    maxRadius: number,
    vertexCount: number,
): Point[] {
    const points: Point[] = [];

    // Генерируем точки по окружности со случайными радиусами
    for (let i = 0; i < vertexCount; i++) {
        const angle = (i * 2 * Math.PI) / vertexCount + (Math.random() - 0.5) * 0.5;
        const radius = minRadius + Math.random() * (maxRadius - minRadius);

        points.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
        });
    }

    // Сортируем точки по углу относительно центра для обеспечения выпуклости
    points.sort((a, b) => {
        const angleA = Math.atan2(a.y - centerY, a.x - centerX);
        const angleB = Math.atan2(b.y - centerY, b.x - centerX);
        return angleA - angleB;
    });

    return points;
}

/** Проверяет, находится ли многоугольник inner полностью внутри outer. */
export function isPolygonInsidePolygon(inner: Point[], outer: Point[]): boolean {
    // Проверяем, что все вершины внутреннего многоугольника находятся внутри внешнего
    for (const point of inner) {
        if (!isPointInsideConvexPolygon(outer, point)) {
            return false;
        }
    }
    return true;
}

/** Простая проверка точки внутри выпуклого многоугольника. */
function isPointInsideConvexPolygon(polygon: Point[], point: Point): boolean {
    for (let i = 0; i < polygon.length; i++) {
        const v1 = polygon[i];
        const v2 = polygon[(i + 1) % polygon.length];

        const cross = (v2.x - v1.x) * (point.y - v1.y) - (v2.y - v1.y) * (point.x - v1.x);

        if (cross < 0) {
            return false;
        }
    }
    return true;
}
