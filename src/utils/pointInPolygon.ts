import type { Point } from '../types/types';

/** Угловой тест через октаны для простого многоугольника. */
export function isPointInsidePolygonOctant(polygon: Point[], point: Point): boolean {
   let windingNumber = 0;

   for (let i = 0; i < polygon.length; i++) {
      const v1 = polygon[i];
      const v2 = polygon[(i + 1) % polygon.length];

      // Вычисляем октанты для вершин относительно точки
      const octant1 = getOctant(v1.x - point.x, v1.y - point.y);
      const octant2 = getOctant(v2.x - point.x, v2.y - point.y);

      let delta = octant2 - octant1;

      // Нормализуем дельту в диапазон [-4, 4]
      if (delta > 4) delta -= 8;
      if (delta < -4) delta += 8;

      // Корректируем для граничных случаев
      if (delta === 4 || delta === -4) {
         const cross =
            (v2.x - point.x) * (v1.y - point.y) - (v1.x - point.x) * (v2.y - point.y);
         if (cross > 0) {
            delta = 4;
         } else {
            delta = -4;
         }
      }

      windingNumber += delta;
   }

   // Если winding number не равен 0, точка внутри
   return windingNumber !== 0;
}

/** Определяет октант для вектора (dx, dy). */
function getOctant(dx: number, dy: number): number {
   if (dx === 0 && dy === 0) return 0;

   const angle = Math.atan2(dy, dx);
   const octant = Math.floor((angle + Math.PI) / (Math.PI / 4));

   return octant % 8;
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
