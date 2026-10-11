import type { Point } from '../types/types';

/** Возвращает числовой результат ориентации третьей точки относительно прямой. */
export function getOrientation(first: Point, second: Point, third: Point): number {
   // Знак определителя показывает, с какой стороны направленного ребра находится точка.
   const lineVectorX = second.x - first.x;
   const lineVectorY = second.y - first.y;
   const pointVectorX = third.x - first.x;
   const pointVectorY = third.y - first.y;

   return lineVectorX * pointVectorY - lineVectorY * pointVectorX;
}

/** Проверяет, лежит ли точка на отрезке геометрически. */
export function isPointOnSegment(first: Point, second: Point, point: Point): boolean {
   // Нулевая ориентация недостаточна: точка должна лежать между концами отрезка.
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
export function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
   // Проверяем обычное пересечение и отдельные случаи касания границы.
   const firstOrientation = getOrientation(p1, p2, p3);
   const secondOrientation = getOrientation(p1, p2, p4);
   const thirdOrientation = getOrientation(p3, p4, p1);
   const fourthOrientation = getOrientation(p3, p4, p2);

   if (firstOrientation === 0 && isPointOnSegment(p1, p2, p3)) return true;
   if (secondOrientation === 0 && isPointOnSegment(p1, p2, p4)) return true;
   if (thirdOrientation === 0 && isPointOnSegment(p3, p4, p1)) return true;
   if (fourthOrientation === 0 && isPointOnSegment(p3, p4, p2)) return true;

   return (
      firstOrientation > 0 !== secondOrientation > 0 &&
      thirdOrientation > 0 !== fourthOrientation > 0
   );
}

/** Находит точку пересечения отрезка с ребром многоугольника и возвращает индекс ребра. */
export function findCollisionEdge(
   start: Point,
   end: Point,
   polygon: Point[]
): number | null {
   // Возвращаем первое ребро полигона, пересечённое траекторией точки.
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
   edgeEnd: Point
): Point | null {
   // Параметрическое пересечение двух прямых позволяет получить точную позицию контакта.
   const startToEnd = {
      x: end.x - start.x,
      y: end.y - start.y
   };
   const edgeVector = {
      x: edgeEnd.x - edgeStart.x,
      y: edgeEnd.y - edgeStart.y
   };
   const denominator = startToEnd.x * edgeVector.y - startToEnd.y * edgeVector.x;

   if (denominator === 0) return null;

   const edgeToStart = {
      x: edgeStart.x - start.x,
      y: edgeStart.y - start.y
   };
   const segmentFactor =
      (edgeToStart.x * edgeVector.y - edgeToStart.y * edgeVector.x) / denominator;

   return {
      x: start.x + segmentFactor * startToEnd.x,
      y: start.y + segmentFactor * startToEnd.y
   };
}

/** Отражает вектор скорости от ребра многоугольника. */
export function reflectVelocity(
   velocity: Point,
   edgeStart: Point,
   edgeEnd: Point
): Point {
   // Проекция скорости на направление ребра сохраняется, нормальная компонента меняет знак.
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
      y: factor * qy - velocity.y
   };
}
