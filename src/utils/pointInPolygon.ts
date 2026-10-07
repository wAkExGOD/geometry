import type { Point } from '../types/types';

/** Проверяет принадлежность точки простому многоугольнику. */
export function isPointInsidePolygonOctant(polygon: Point[], point: Point): boolean {
   if (polygon.length < 3) return false;

   let inside = false;

   for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const current = polygon[i];
      const previous = polygon[j];
      const cross =
         (current.x - previous.x) * (point.y - previous.y) -
         (current.y - previous.y) * (point.x - previous.x);
      const withinX =
         point.x >= Math.min(previous.x, current.x) &&
         point.x <= Math.max(previous.x, current.x);
      const withinY =
         point.y >= Math.min(previous.y, current.y) &&
         point.y <= Math.max(previous.y, current.y);

      // Точка на границе считается частью препятствия.
      if (Math.abs(cross) < 1e-10 && withinX && withinY) return true;

      const crossesRay =
         (previous.y > point.y) !== (current.y > point.y);
      if (
         crossesRay &&
         point.x <
            ((current.x - previous.x) * (point.y - previous.y)) /
               (current.y - previous.y) +
               previous.x
      ) {
         inside = !inside;
      }
   }

   return inside;
}

/** Бинарный тест для выпуклого многоугольника. */
export function isPointInsideConvexPolygonBinary(
   polygon: Point[],
   point: Point
): boolean {
   if (polygon.length < 3) return false;

   // Проверяем, что точка находится с одной стороны от всех рёбер
   for (let i = 0; i < polygon.length; i++) {
      const v1 = polygon[i];
      const v2 = polygon[(i + 1) % polygon.length];

      // Векторное произведение для определения стороны
      const cross = (v2.x - v1.x) * (point.y - v1.y) - (v2.y - v1.y) * (point.x - v1.x);

      // Если точка снаружи хотя бы одного ребра, она снаружи многоугольника
      if (cross < 0) {
         return false;
      }
   }

   return true;
}
