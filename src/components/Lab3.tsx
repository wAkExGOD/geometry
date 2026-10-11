import { useState, useRef, useEffect } from 'react';
import type { Point } from '../types/types';
import Graph from './Graph';
import {
   createMovingPoints,
   generateLab3Polygons,
   updateMovingPoint,
   updateMovingPointsSpeed,
   type MovingPoint
} from '../utils/lab3';

const Lab3 = () => {
   // Храним идентификатор текущего кадра, чтобы корректно остановить RAF.
   const animationFrameRef = useRef<number | undefined>(undefined);
   // Ограничиваем частоту обновления физики до одного шага примерно каждые 50 мс.
   const lastFrameTimeRef = useRef(0);

   // При первом рендере создаём пару полигонов для всей текущей сцены.
   const { outer: initialOuter, inner: initialInner } = generateLab3Polygons();

   // Выпуклый многоугольник Q (внешняя граница)
   const [convexPolygon, setConvexPolygon] = useState<Point[]>(initialOuter);

   // Простой многоугольник P (внутреннее препятствие)
   const [simplePolygon, setSimplePolygon] = useState<Point[]>(initialInner);

   // Движущиеся точки
   const [movingPoints, setMovingPoints] = useState<MovingPoint[]>([]);
   const [isAnimating, setIsAnimating] = useState(false);
   const [speed, setSpeed] = useState(0.1);
   const [pointCount, setPointCount] = useState(10);

   /** Создаёт точки между внешней границей Q и внутренним препятствием P. */
   const initializePoints = () => {
      setMovingPoints(
         createMovingPoints(convexPolygon, simplePolygon, pointCount, speed)
      );
   };

   /** Применяет один физический шаг к каждой ещё не остановившейся точке. */
   const updatePoints = () => {
      setMovingPoints(prevPoints =>
         prevPoints.map(point => updateMovingPoint(point, convexPolygon, simplePolygon))
      );
   };

   /** Планирует следующий кадр и обновляет физику только с заданным интервалом. */
   const animate = (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current >= 50) {
         lastFrameTimeRef.current = timestamp;
         updatePoints();
      }
      animationFrameRef.current = requestAnimationFrame(animate);
   };

   /** Переводит сцену в состояние, в котором RAF начинает обновлять точки. */
   const startAnimation = () => {
      if (!isAnimating) {
         setIsAnimating(true);
      }
   };

   /** Отменяет запланированный кадр и оставляет точки в текущих позициях. */
   const stopAnimation = () => {
      if (animationFrameRef.current) {
         cancelAnimationFrame(animationFrameRef.current);
      }
      setIsAnimating(false);
   };

   /** Останавливает движение и создаёт новый набор точек в той же сцене. */
   const resetAnimation = () => {
      stopAnimation();
      initializePoints();
   };

   /** Создаёт новую сцену и сразу инициализирует точки именно для её полигонов. */
   const regeneratePolygons = () => {
      stopAnimation();
      const { outer, inner } = generateLab3Polygons();
      setConvexPolygon(outer);
      setSimplePolygon(inner);
      setMovingPoints(createMovingPoints(outer, inner, pointCount, speed));
   };

   // Запускаем и очищаем requestAnimationFrame вместе с состоянием анимации.
   useEffect(() => {
      if (isAnimating) {
         animationFrameRef.current = requestAnimationFrame(animate);
      } else {
         if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
         }
      }

      return () => {
         if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
         }
      };
   }, [isAnimating, movingPoints]);

   // После монтирования полигон уже известен, поэтому можно создать точки.
   useEffect(() => {
      initializePoints();
   }, []);

   const formatPoint = (point: Point) => `(${point.x},${point.y})`;
   const formatEdge = (start: Point, end: Point) =>
      `${formatPoint(start)},${formatPoint(end)}`;

   const polygonEdges = (
      polygon: Point[],
      idPrefix: string,
      color: string
   ): Desmos.ExpressionState[] =>
      // Каждое ребро замыкается на следующую вершину, а последнее — на первую.
      polygon.map((point, index) => ({
         id: `${idPrefix}-edge-${index}`,
         latex: formatEdge(point, polygon[(index + 1) % polygon.length]),
         color,
         lines: true,
         lineWidth: 3
      }));

   // Синий Q, красный P и точки: цвет точки показывает, остановилась ли она.
   const expressions: Desmos.ExpressionState[] = [
      ...polygonEdges(convexPolygon, 'outer', Desmos.Colors.BLUE),
      ...polygonEdges(simplePolygon, 'inner', Desmos.Colors.RED),
      ...movingPoints.map((point, index) => ({
         id: `moving-point-${index}`,
         latex: formatPoint(point.position),
         color: point.stopped ? Desmos.Colors.RED : Desmos.Colors.GREEN,
         pointSize: 9
      }))
   ];

   return (
      <main className="lab-page">
         <section className="control-panel">
            <p className="eyebrow">Лабораторная работа 3</p>
            <h1>Анимация движения точек</h1>
            <p className="description">
               Анимация движения множества точек внутри выпуклого многоугольника Q с
               обнулением скорости при попадании внутрь простого многоугольника P.
            </p>

            <div className="result-box" aria-live="polite">
               <span>Статистика</span>
               <strong>
                  Точек: {movingPoints.length} | Остановлено:{' '}
                  {movingPoints.filter(p => p.stopped).length}
               </strong>
               <small>{isAnimating ? 'Анимация запущена' : 'Анимация остановлена'}</small>
            </div>

            <div className="control-group">
               <label htmlFor="point-count">Количество точек: {pointCount}</label>
               <input
                  id="point-count"
                  type="range"
                  min="5"
                  max="50"
                  value={pointCount}
                  onChange={e => setPointCount(Number(e.target.value))}
                  disabled={isAnimating}
               />
            </div>

            <div className="control-group">
               <label htmlFor="speed">Скорость: {speed.toFixed(2)}</label>
               <input
                  id="speed"
                  type="range"
                  min="0.05"
                  max="0.5"
                  step="0.05"
                  value={speed}
                  onChange={e => {
                     const nextSpeed = Number(e.target.value);
                     setSpeed(nextSpeed);
                     setMovingPoints(points =>
                        updateMovingPointsSpeed(points, nextSpeed)
                     );
                  }}
                  disabled={isAnimating}
               />
            </div>

            <div className="button-group">
               <button
                  type="button"
                  className="new-case-button"
                  onClick={startAnimation}
                  disabled={isAnimating}
               >
                  Запустить
               </button>
               <button
                  type="button"
                  className="new-case-button"
                  onClick={stopAnimation}
                  disabled={!isAnimating}
               >
                  Остановить
               </button>
               <button type="button" className="new-case-button" onClick={resetAnimation}>
                  Сбросить
               </button>
               <button
                  type="button"
                  className="new-case-button"
                  onClick={regeneratePolygons}
                  disabled={isAnimating}
               >
                  Новые многоугольники
               </button>
            </div>

            <div className="coordinates">
               <h3>Выпуклый многоугольник Q</h3>
               {convexPolygon.map((vertex, index) => (
                  <div key={`convex-${index}`}>
                     <span>q{index + 1}</span>
                     <b>
                        ({vertex.x}, {vertex.y})
                     </b>
                  </div>
               ))}
            </div>

            <div className="coordinates">
               <h3>Простой многоугольник P</h3>
               {simplePolygon.map((vertex, index) => (
                  <div key={`simple-${index}`}>
                     <span>p{index + 1}</span>
                     <b>
                        ({vertex.x}, {vertex.y})
                     </b>
                  </div>
               ))}
            </div>
         </section>

         <section className="graph-panel" aria-label="График анимации">
            <Graph expressions={expressions} scale={15} />
         </section>
      </main>
   );
};

export default Lab3;
