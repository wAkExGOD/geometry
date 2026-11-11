import type { Point } from '../types/types';

/**
 * Вычисляет ориентацию тройки точек (косое произведение).
 * > 0: поворот влево (против часовой)
 * < 0: поворот вправо (по часовой)
 * = 0: коллинеарны
 */
function orientation(p1: Point, p2: Point, p3: Point): number {
   return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
}

/**
 * Динамическая выпуклая оболочка.
 * Последовательное добавление точек с перестроением оболочки.
 */
export class DynamicConvexHull<T extends Point> {
   private hull: T[] = [];

   /**
    * Добавляет точку в динамическую выпуклую оболочку.
    * Возвращает массив удалённых точек (ставших внутренними).
    */
   addPoint(point: T): T[] {
      const removed: T[] = [];

      // Шаг 1: Первая точка
      if (this.hull.length === 0) {
         this.hull.push(point);
         return removed;
      }

      // Шаг 2: Вторая точка
      if (this.hull.length === 1) {
         this.hull.push(point);
         return removed;
      }

      // Шаг 3: Третья точка - проверяем коллинеарность
      if (this.hull.length === 2) {
         const orient = orientation(this.hull[0], this.hull[1], point);
         if (orient === 0) {
            // Коллинеарны - оставляем отрезок как есть
            return removed;
         }
         // Строим треугольник (против часовой стрелки)
         if (orient > 0) {
            this.hull.push(point);
         } else {
            this.hull = [this.hull[0], point, this.hull[1]];
         }
         return removed;
      }

      // Шаги 4-n: Проверяем положение точки относительно оболочки
      // Обходим все рёбра против часовой стрелки
      let isInside = true;
      for (let i = 0; i < this.hull.length; i++) {
         const v1 = this.hull[i];
         const v2 = this.hull[(i + 1) % this.hull.length];
         const orient = orientation(v1, v2, point);

         // Если точка справа хотя бы от одного ребра - она внешняя
         if (orient < 0) {
            isInside = false;
            break;
         }
      }

      // Если точка внутри - ничего не делаем
      if (isInside) {
         return removed;
      }

      // Точка внешняя - перестраиваем оболочку
      // Находим все видимые рёбра (для которых точка справа)
      const visible: number[] = [];
      for (let i = 0; i < this.hull.length; i++) {
         const v1 = this.hull[i];
         const v2 = this.hull[(i + 1) % this.hull.length];
         const orient = orientation(v1, v2, point);

         if (orient < 0) {
            visible.push(i);
         }
      }

      if (visible.length === 0) {
         // Не должно случиться, но на всякий случай
         return removed;
      }

      // Находим точки касания - крайние вершины удалённой цепочки
      // visible содержит индексы рёбер, видимых из point
      const firstVisibleEdge = visible[0];
      const lastVisibleEdge = visible[visible.length - 1];

      // Точки касания:
      // leftTangent - начало первого видимого ребра
      // rightTangent - конец последнего видимого ребра
      const leftTangentIndex = firstVisibleEdge;
      const rightTangentIndex = (lastVisibleEdge + 1) % this.hull.length;

      // Сохраняем удалённые точки
      // Удаляем все вершины между точками касания (кроме самих точек касания)
      if (visible.length === this.hull.length) {
         // Все рёбра видимы - это не должно случиться для выпуклой оболочки
         // Но на всякий случай обрабатываем
         removed.push(...this.hull);
         this.hull = [point];
         return removed;
      }

      // Строим новую оболочку
      const newHull: T[] = [];

      // Если видимые рёбра образуют непрерывную цепочку без перехода через 0
      if (lastVisibleEdge >= firstVisibleEdge) {
         // Добавляем точки от rightTangent до leftTangent (в порядке обхода)
         for (
            let i = rightTangentIndex;
            i !== leftTangentIndex;
            i = (i + 1) % this.hull.length
         ) {
            newHull.push(this.hull[i]);
            if ((i + 1) % this.hull.length === leftTangentIndex) break;
         }
         newHull.push(this.hull[leftTangentIndex]);
         newHull.push(point);

         // Удалённые вершины
         for (
            let i = (leftTangentIndex + 1) % this.hull.length;
            i !== rightTangentIndex;
            i = (i + 1) % this.hull.length
         ) {
            removed.push(this.hull[i]);
            if ((i + 1) % this.hull.length === rightTangentIndex) break;
         }
      } else {
         // Видимые рёбра переходят через индекс 0
         // Сохраняем точки от rightTangent до leftTangent
         for (let i = rightTangentIndex; i <= leftTangentIndex; i++) {
            newHull.push(this.hull[i]);
         }
         newHull.push(point);

         // Удалённые вершины
         for (let i = leftTangentIndex + 1; i < this.hull.length; i++) {
            removed.push(this.hull[i]);
         }
         for (let i = 0; i < rightTangentIndex; i++) {
            removed.push(this.hull[i]);
         }
      }

      this.hull = newHull;
      return removed;
   }

   /**
    * Возвращает текущую выпуклую оболочку как массив точек в порядке обхода.
    */
   getHull(): T[] {
      return [...this.hull];
   }

   /**
    * Возвращает все добавленные точки.
    */
   getAllPoints(): T[] {
      return [...this.hull];
   }
}

/**
 * Генерирует случайную точку внутри круга радиуса 8 с центром (0, 0).
 */
export function generateRandomPoint(): Point {
   const angle = Math.random() * 2 * Math.PI;
   const radius = Math.sqrt(Math.random()) * 8;
   return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
   };
}

/**
 * Вычисляет периметр выпуклой оболочки.
 */
export function calculatePerimeter(hull: readonly Point[]): number {
   if (hull.length < 2) return 0;

   return hull.reduce((sum, point, index) => {
      const next = hull[(index + 1) % hull.length];
      return sum + Math.hypot(next.x - point.x, next.y - point.y);
   }, 0);
}
