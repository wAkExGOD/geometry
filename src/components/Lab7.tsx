import { useCallback, useEffect, useMemo, useState } from 'react';
import Graph from './Graph';
import {
   DynamicConvexHull,
   generateRandomPoint,
   calculatePerimeter
} from '../utils/lab7';
import type { Point } from '../types/types';

const Lab7 = () => {
   // Параметры: количество точек для генерации и скорость добавления (мс)
   const [totalPoints, setTotalPoints] = useState(20);
   const [addSpeed, setAddSpeed] = useState(500);

   // Состояние анимации
   const [isAnimating, setIsAnimating] = useState(false);
   const [currentStep, setCurrentStep] = useState(0);

   // Все сгенерированные точки (для повторного воспроизведения)
   const [allPoints, setAllPoints] = useState<Point[]>([]);

   // Текущее состояние оболочки
   const [hull, setHull] = useState<DynamicConvexHull<Point>>(new DynamicConvexHull());
   const [addedPoints, setAddedPoints] = useState<Point[]>([]);

   // Статистика
   const [removedCount, setRemovedCount] = useState(0);

   // Вычисляем текущую оболочку и периметр
   const currentHull = useMemo(() => hull.getHull(), [hull]);
   const perimeter = useMemo(() => calculatePerimeter(currentHull), [currentHull]);

   // Генерация нового набора точек
   const generateNewSet = useCallback((count: number) => {
      const points: Point[] = [];
      for (let i = 0; i < count; i++) {
         points.push(generateRandomPoint());
      }
      setAllPoints(points);
      setHull(new DynamicConvexHull());
      setAddedPoints([]);
      setCurrentStep(0);
      setRemovedCount(0);
      setIsAnimating(false);
   }, []);

   // Инициализация при монтировании
   useEffect(() => {
      generateNewSet(totalPoints);
   }, []);

   // Добавление одной точки
   const addNextPoint = useCallback(() => {
      if (currentStep >= allPoints.length) {
         setIsAnimating(false);
         return;
      }

      const nextPoint = allPoints[currentStep];
      const newHull = new DynamicConvexHull<Point>();

      // Восстанавливаем все предыдущие точки
      let totalRemoved = 0;
      for (let i = 0; i <= currentStep; i++) {
         const removed = newHull.addPoint(allPoints[i]);
         totalRemoved += removed.length;
      }

      setHull(newHull);
      setAddedPoints([...addedPoints, nextPoint]);
      setCurrentStep(currentStep + 1);
      setRemovedCount(totalRemoved);
   }, [currentStep, allPoints, addedPoints]);

   // Автоматическая анимация
   useEffect(() => {
      if (!isAnimating) return;

      if (currentStep >= allPoints.length) {
         setIsAnimating(false);
         return;
      }

      const timer = setTimeout(() => {
         addNextPoint();
      }, addSpeed);

      return () => clearTimeout(timer);
   }, [isAnimating, currentStep, allPoints.length, addSpeed, addNextPoint]);

   // Запуск анимации
   const startAnimation = () => {
      if (currentStep >= allPoints.length) {
         // Если уже все точки добавлены, начинаем заново
         setHull(new DynamicConvexHull());
         setAddedPoints([]);
         setCurrentStep(0);
         setRemovedCount(0);
      }
      setIsAnimating(true);
   };

   // Сброс
   const reset = () => {
      setIsAnimating(false);
      generateNewSet(totalPoints);
   };

   // Формирование выражений для графика
   const expressions = useMemo<Desmos.ExpressionState[]>(() => {
      const result: Desmos.ExpressionState[] = [];

      // Рисуем рёбра оболочки
      if (currentHull.length > 1) {
         const edges = currentHull.map((point, index) => {
            const next = currentHull[(index + 1) % currentHull.length];
            return {
               id: `hull-edge-${index}`,
               latex: `(${point.x}+(${next.x - point.x})t,${point.y}+(${next.y - point.y})t)`,
               parametricDomain: { min: '0', max: '1' },
               color: Desmos.Colors.BLUE,
               lineWidth: 3
            };
         });
         result.push(...edges);
      }

      // Рисуем уже добавленные точки
      const hullSet = new Set(currentHull.map(p => `${p.x},${p.y}`));
      const addedExprs = addedPoints.map((point, index) => ({
         id: `added-point-${index}`,
         latex: `(${point.x},${point.y})`,
         color: hullSet.has(`${point.x},${point.y}`)
            ? Desmos.Colors.BLUE
            : Desmos.Colors.GREEN,
         pointSize: 9,
         label: `${index + 1}`,
         showLabel: true
      }));
      result.push(...addedExprs);

      return result;
   }, [currentHull, addedPoints, allPoints, currentStep]);

   return (
      <main className="lab-page lab7-page">
         <section className="control-panel">
            <p className="eyebrow">Лабораторная работа 7</p>
            <h1>Динамическая выпуклая оболочка</h1>
            <p className="description">
               Точки добавляются последовательно. Алгоритм динамической выпуклой оболочки
               поддерживает выпуклую оболочку
            </p>

            <div className="result-box">
               <span>Периметр оболочки</span>
               <strong>{perimeter.toFixed(2)}</strong>
               <small>
                  Добавлено точек: {currentStep} из {allPoints.length}
               </small>
            </div>

            <div className="control-group">
               <label htmlFor="lab7-point-count">Количество точек: {totalPoints}</label>
               <input
                  id="lab7-point-count"
                  type="range"
                  min="5"
                  max="50"
                  value={totalPoints}
                  disabled={isAnimating}
                  onChange={event => {
                     const value = Number(event.target.value);
                     setTotalPoints(value);
                  }}
               />
            </div>

            <div className="control-group">
               <label htmlFor="lab7-speed">Скорость добавления: {addSpeed} мс</label>
               <input
                  id="lab7-speed"
                  type="range"
                  min="100"
                  max="2000"
                  step="100"
                  value={addSpeed}
                  onChange={event => setAddSpeed(Number(event.target.value))}
               />
            </div>

            <div className="button-group">
               <button
                  type="button"
                  className="new-case-button"
                  disabled={isAnimating}
                  onClick={startAnimation}
               >
                  {currentStep >= allPoints.length ? 'Начать заново' : 'Запустить'}
               </button>
               <button
                  type="button"
                  className="new-case-button"
                  disabled={!isAnimating}
                  onClick={() => setIsAnimating(false)}
               >
                  Остановить
               </button>
               <button type="button" className="new-case-button" onClick={reset}>
                  Новый набор
               </button>
            </div>

            <div className="coordinates">
               <div>
                  <span>Вершин оболочки</span>
                  <b>{currentHull.length}</b>
               </div>
               <div>
                  <span>Внутренних точек</span>
                  <b>{Math.max(0, currentStep - currentHull.length)}</b>
               </div>
               <div>
                  <span>Удалено при добавлении</span>
                  <b>{removedCount}</b>
               </div>
            </div>

            <p className="description">
               Синие точки — вершины оболочки, зелёные — внутренние точки. Номера
               показывают порядок добавления.
            </p>
         </section>

         <section className="graph-panel" aria-label="Динамическая выпуклая оболочка">
            <Graph expressions={expressions} scale={12} />
         </section>
      </main>
   );
};

export default Lab7;
