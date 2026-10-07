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
   const animationFrameRef = useRef<number | undefined>(undefined);
   const lastFrameTimeRef = useRef(0);

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

   /** Инициализирует движущиеся точки. */
   const initializePoints = () => {
      setMovingPoints(
         createMovingPoints(convexPolygon, simplePolygon, pointCount, speed)
      );
   };

   /** Обновляет позиции точек. */
   const updatePoints = () => {
      setMovingPoints(prevPoints =>
         prevPoints.map(point => updateMovingPoint(point, convexPolygon, simplePolygon))
      );
   };

   /** Цикл анимации. */
   const animate = (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current >= 50) {
         lastFrameTimeRef.current = timestamp;
         updatePoints();
      }
      animationFrameRef.current = requestAnimationFrame(animate);
   };

   /** Запускает анимацию. */
   const startAnimation = () => {
      if (!isAnimating) {
         setIsAnimating(true);
      }
   };

   /** Останавливает анимацию. */
   const stopAnimation = () => {
      if (animationFrameRef.current) {
         cancelAnimationFrame(animationFrameRef.current);
      }
      setIsAnimating(false);
   };

   /** Сбрасывает анимацию. */
   const resetAnimation = () => {
      stopAnimation();
      initializePoints();
   };

   /** Генерирует новые многоугольники. */
   const regeneratePolygons = () => {
      stopAnimation();
      const { outer, inner } = generateLab3Polygons();
      setConvexPolygon(outer);
      setSimplePolygon(inner);
      // Инициализируем точки после установки новых многоугольников
      setTimeout(() => initializePoints(), 0);
   };

   // Эффект для управления анимацией
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

   // Инициализация при монтировании
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
      polygon.map((point, index) => ({
         id: `${idPrefix}-edge-${index}`,
         latex: formatEdge(point, polygon[(index + 1) % polygon.length]),
         color,
         lines: true,
         lineWidth: 3
      }));

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
