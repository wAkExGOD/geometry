import type { Point } from '../types/types';
import { getOrientation, isPointOnSegment } from './geometry';

/**
 * Возвращает октант вектора относительно начала координат.
 *
 * После переноса проверяемой точки P в начало координат плоскость
 * разбивается на восемь 45-градусных секторов. Номер сектора определяется
 * знаками x/y и тем, какая координата по модулю больше. Поэтому здесь не
 * используются atan2 или другие тригонометрические вычисления.
 */
function getOctant(vector: Point): number {
   // Номер сектора определяется знаками координат и сравнением их модулей.
   if (vector.x >= 0) {
      if (vector.y >= 0) return vector.x >= vector.y ? 0 : 1;
      return vector.x >= -vector.y ? 7 : 6;
   }

   if (vector.y >= 0) return -vector.x <= vector.y ? 2 : 3;
   return -vector.x >= -vector.y ? 4 : 5;
}

/**
 * Проверяет принадлежность точки простому многоугольнику октантным тестом.
 *
 * Для каждой вершины берётся вектор P -> V. При обходе контура направление
 * этого вектора меняется от вершины к вершине. Сумма этих изменений является
 * приближённым winding number: для внешней точки полный оборот не образуется,
 * а для внутренней сумма даёт один или несколько оборотов вокруг P.
 */
export function isPointInsidePolygonOctant(polygon: Point[], point: Point): boolean {
   if (polygon.length < 3) return false;

   let octantSum = 0;

   // Суммируем переходы направления от точки к соседним вершинам.
   for (let index = 0; index < polygon.length; index++) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      // Считаем P началом координат и выражаем относительно него концы ребра.
      const startVector = { x: start.x - point.x, y: start.y - point.y };
      const endVector = { x: end.x - point.x, y: end.y - point.y };
      // Граница считается частью многоугольника.
      if (isPointOnSegment(start, end, point)) {
         return true;
      }

      // Определяем только номера октантов, не вычисляя настоящие углы.
      const startOctant = getOctant(startVector);
      const endOctant = getOctant(endVector);
      let difference = endOctant - startOctant;
      // Знак cross нужен для неоднозначного перехода между противоположными октантами.
      const vectorCross = startVector.x * endVector.y - startVector.y * endVector.x;

      // Переход 7 -> 0 и 0 -> 7 должен быть коротким переходом через границу.
      if (difference > 4) difference -= 8;
      if (difference < -4) difference += 8;

      // Разница 4 не говорит, по какую сторону прошёл поворот. Это решает cross.
      if (difference === 4 || difference === -4) {
         difference = vectorCross >= 0 ? 4 : -4;
      }

      octantSum += difference;
   }

   // Ненулевой winding number означает, что контур сделал полный оборот вокруг P.
   return octantSum !== 0;
}

/**
 * Бинарный тест по треугольным секторам выпуклого многоугольника.
 *
 * Вершина polygon[0] используется как общий центр веера. Лучи от неё к
 * остальным вершинам делят выпуклый полигон на треугольники. Сначала точка
 * проверяется относительно крайних лучей, затем бинарный поиск выбирает
 * один треугольный сектор вместо последовательного просмотра всех рёбер.
 */
export function isPointInsideConvexPolygonBinary(
   polygon: Point[],
   point: Point
): boolean {
   if (polygon.length < 3) return false;

   // Для бинарного поиска вершины должны идти последовательно против часовой стрелки.
   const first = polygon[0];
   const firstEdgeCross = getOrientation(first, polygon[1], point);
   const lastEdgeCross = getOrientation(first, polygon[polygon.length - 1], point);

   // Граничные точки на двух крайних лучах сразу считаются принадлежащими полигону.
   if (isPointOnSegment(first, polygon[1], point)) return true;
   if (isPointOnSegment(first, polygon[polygon.length - 1], point)) return true;

   // Если точка вне веерного угла V0-V1-V(n-1), она точно снаружи.
   if (firstEdgeCross < 0 || lastEdgeCross > 0) {
      return false;
   }

   let left = 1;
   let right = polygon.length - 1;

   // На каждом шаге выбираем средний луч и отбрасываем половину секторов.
   while (right - left > 1) {
      const middle = Math.floor((left + right) / 2);

      if (getOrientation(first, polygon[middle], point) >= 0) {
         left = middle;
      } else {
         right = middle;
      }
   }

   // Остался один сектор V0-Vleft-Vright; проверяем его замыкающее ребро.
   return getOrientation(polygon[left], polygon[right], point) >= 0;
}
