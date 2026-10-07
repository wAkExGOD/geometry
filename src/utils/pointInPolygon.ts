import type { Point } from '../types/types';
import { getOrientation, isPointOnSegment } from './geometry';

/** Возвращает октант вектора относительно начала координат. */
function getOctant(vector: Point): number {
   if (vector.x >= 0) {
      if (vector.y >= 0) return vector.x >= vector.y ? 0 : 1;
      return vector.x >= -vector.y ? 7 : 6;
   }

   if (vector.y >= 0) return -vector.x <= vector.y ? 2 : 3;
   return -vector.x >= -vector.y ? 4 : 5;
}

/** Проверяет принадлежность точки простому многоугольнику октантным тестом. */
export function isPointInsidePolygonOctant(polygon: Point[], point: Point): boolean {
   if (polygon.length < 3) return false;

   let octantSum = 0;

   for (let index = 0; index < polygon.length; index++) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      const startVector = { x: start.x - point.x, y: start.y - point.y };
      const endVector = { x: end.x - point.x, y: end.y - point.y };
      if (isPointOnSegment(start, end, point)) {
         return true;
      }

      const startOctant = getOctant(startVector);
      const endOctant = getOctant(endVector);
      let difference = endOctant - startOctant;

      if (difference > 4) difference -= 8;
      if (difference < -4) difference += 8;

      octantSum += difference;
   }

   return octantSum !== 0;
}

/** Бинарный тест по треугольным секторам выпуклого многоугольника. */
export function isPointInsideConvexPolygonBinary(
   polygon: Point[],
   point: Point
): boolean {
   if (polygon.length < 3) return false;

   const first = polygon[0];
   const firstEdgeCross = getOrientation(first, polygon[1], point);
   const lastEdgeCross = getOrientation(first, polygon[polygon.length - 1], point);

   if (isPointOnSegment(first, polygon[1], point)) return true;
   if (isPointOnSegment(first, polygon[polygon.length - 1], point)) return true;

   if (firstEdgeCross < 0 || lastEdgeCross > 0) {
      return false;
   }

   let left = 1;
   let right = polygon.length - 1;

   while (right - left > 1) {
      const middle = Math.floor((left + right) / 2);

      if (getOrientation(first, polygon[middle], point) >= 0) {
         left = middle;
      } else {
         right = middle;
      }
   }

   return getOrientation(polygon[left], polygon[right], point) >= 0;
}
