import type { Point } from "../types/types";

/** Возвращает числовой результат ориентации третьей точки относительно прямой. */
export function getOrientation(
    first: Point,
    second: Point,
    third: Point,
): number {
    const lineVectorX = second.x - first.x;
    const lineVectorY = second.y - first.y;
    const pointVectorX = third.x - first.x;
    const pointVectorY = third.y - first.y;

    return lineVectorX * pointVectorY - lineVectorY * pointVectorX;
}

/** Проверяет, лежит ли точка на отрезке геометрически. */
export function isPointOnSegment(
    first: Point,
    second: Point,
    point: Point,
): boolean {
    if (getOrientation(first, second, point) !== 0) {
        return false;
    }

    return (
        Math.min(first.x, second.x) <= point.x &&
        point.x <= Math.max(first.x, second.x) &&
        Math.min(first.y, second.y) <= point.y &&
        point.y <= Math.max(first.y, second.y)
    );
}

/** Проверяет пересечение отрезков. */
export function segmentsIntersect(
    p1: Point,
    p2: Point,
    p3: Point,
    p4: Point,
): boolean {
    const d1 = direction(p3, p4, p1);
    const d2 = direction(p3, p4, p2);
    const d3 = direction(p1, p2, p3);
    const d4 = direction(p1, p2, p4);

    if (
        ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
    ) {
        return true;
    }

    return false;
}

/** Вычисляет направление поворота от p1->p2 к p1->p3. */
function direction(p1: Point, p2: Point, p3: Point): number {
    return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
}

/** Находит точку пересечения отрезка с ребром многоугольника и возвращает индекс ребра. */
export function findCollisionEdge(
    start: Point,
    end: Point,
    polygon: Point[],
): number | null {
    for (let i = 0; i < polygon.length; i++) {
        const v1 = polygon[i];
        const v2 = polygon[(i + 1) % polygon.length];

        if (segmentsIntersect(start, end, v1, v2)) {
            return i;
        }
    }

    return null;
}

/** Находит точку пересечения двух пересекающихся отрезков. */
export function findSegmentIntersection(
     start: Point,
     end: Point,
     edgeStart: Point,
     edgeEnd: Point,
): Point | null {
     const startToEnd = {
         x: end.x - start.x,
         y: end.y - start.y,
     };
     const edgeVector = {
         x: edgeEnd.x - edgeStart.x,
         y: edgeEnd.y - edgeStart.y,
     };
     const denominator =
         startToEnd.x * edgeVector.y - startToEnd.y * edgeVector.x;

     if (denominator === 0) return null;

     const edgeToStart = {
         x: edgeStart.x - start.x,
         y: edgeStart.y - start.y,
     };
     const segmentFactor =
         (edgeToStart.x * edgeVector.y - edgeToStart.y * edgeVector.x) /
         denominator;

     return {
         x: start.x + segmentFactor * startToEnd.x,
         y: start.y + segmentFactor * startToEnd.y,
     };
}

/** Отражает вектор скорости от ребра многоугольника. */
export function reflectVelocity(
    velocity: Point,
    edgeStart: Point,
    edgeEnd: Point,
): Point {
    // Вектор направляющей ребра Q
    const qx = edgeEnd.x - edgeStart.x;
    const qy = edgeEnd.y - edgeStart.y;

    // Скалярное произведение V · Q
    const dotVQ = velocity.x * qx + velocity.y * qy;

    // Скалярное произведение Q · Q
    const dotQQ = qx * qx + qy * qy;

    // Формула отражения: V' = 2 * (V·Q / Q·Q) * Q - V
    const factor = (2 * dotVQ) / dotQQ;

    return {
        x: factor * qx - velocity.x,
        y: factor * qy - velocity.y,
    };
}
