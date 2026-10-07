import type { Point } from '../types/types';

/** Генерирует случайный выпуклый многоугольник методом сортировки точек по углу. */
export function generateRandomConvexPolygon(
   centerX: number,
   centerY: number,
   minRadius: number,
   maxRadius: number,
   vertexCount: number
): Point[] {
   // Разные радиусы могут создать невыпуклый контур, поэтому варианты проверяются.
   for (let attempt = 0; attempt < 100; attempt++) {
      const points: Point[] = [];

      for (let i = 0; i < vertexCount; i++) {
         const angle = (i * 2 * Math.PI) / vertexCount + (Math.random() - 0.5) * 0.5;
         const radius = minRadius + Math.random() * (maxRadius - minRadius);

         points.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
         });
      }

      points.sort((a, b) => {
         const angleA = Math.atan2(a.y - centerY, a.x - centerX);
         const angleB = Math.atan2(b.y - centerY, b.x - centerX);
         return angleA - angleB;
      });

      // Только строго выпуклый контур подходит для бинарного теста Q.
      if (isStrictlyConvexPolygon(points)) {
         return points;
      }
   }

   // Надёжный fallback — правильный многоугольник с постоянным радиусом.
   return Array.from({ length: vertexCount }, (_, index) => {
      const angle = (index * 2 * Math.PI) / vertexCount;
      const radius = (minRadius + maxRadius) / 2;

      return {
         x: centerX + radius * Math.cos(angle),
         y: centerY + radius * Math.sin(angle)
      };
   });
}

function isStrictlyConvexPolygon(polygon: Point[]): boolean {
   if (polygon.length < 3) return false;

   let orientationSign = 0;

   // У выпуклого контура все последовательные повороты имеют один знак.
   for (let index = 0; index < polygon.length; index++) {
      const first = polygon[index];
      const second = polygon[(index + 1) % polygon.length];
      const third = polygon[(index + 2) % polygon.length];
      const cross =
         (second.x - first.x) * (third.y - second.y) -
         (second.y - first.y) * (third.x - second.x);

      if (cross === 0) return false;
      if (orientationSign === 0) orientationSign = Math.sign(cross);
      if (Math.sign(cross) !== orientationSign) return false;
   }

   return orientationSign > 0;
}

/** Проверяет, находится ли многоугольник inner полностью внутри outer. */
export function isPolygonInsidePolygon(inner: Point[], outer: Point[]): boolean {
   // Для выпуклого outer достаточно проверить каждую вершину inner.
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
   // Внутренняя проверка генератора: точка должна быть слева от каждого ребра CCW-контура.
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
