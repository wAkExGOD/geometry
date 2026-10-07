import { useState, useRef, useEffect } from 'react';
import type { Point } from '../types/types';
import {
   isPointInsidePolygonOctant,
   isPointInsideConvexPolygonBinary
} from '../utils/pointInPolygon';
import {
   findCollisionEdge,
   findSegmentIntersection,
   reflectVelocity
} from '../utils/geometry';
import {
   generateRandomConvexPolygon,
   isPolygonInsidePolygon
} from '../utils/polygonGenerator';

interface MovingPoint {
   position: Point;
   velocity: Point;
   stopped: boolean;
}

const Lab3 = () => {
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const animationFrameRef = useRef<number | undefined>(undefined);

   // Генерируем случайные многоугольники
   const generatePolygons = () => {
      let outer: Point[];
      let inner: Point[];
      let attempts = 0;

      // Генерируем до тех пор, пока внутренний многоугольник не будет полностью внутри внешнего
      do {
         outer = generateRandomConvexPolygon(
            0,
            0,
            6,
            9,
            6 + Math.floor(Math.random() * 3)
         );
         inner = generateRandomConvexPolygon(
            0,
            0,
            1.5,
            3,
            4 + Math.floor(Math.random() * 3)
         );
         attempts++;
      } while (!isPolygonInsidePolygon(inner, outer) && attempts < 50);

      return { outer, inner };
   };

   const { outer: initialOuter, inner: initialInner } = generatePolygons();

   // Выпуклый многоугольник Q (внешняя граница)
   const [convexPolygon, setConvexPolygon] = useState<Point[]>(initialOuter);

   // Простой многоугольник P (внутреннее препятствие)
   const [simplePolygon, setSimplePolygon] = useState<Point[]>(initialInner);

   // Движущиеся точки
   const [movingPoints, setMovingPoints] = useState<MovingPoint[]>([]);
   const [isAnimating, setIsAnimating] = useState(false);
   const [speed, setSpeed] = useState(0.1);
   const [pointCount, setPointCount] = useState(10);

   // Размеры canvas
   const canvasWidth = 800;
   const canvasHeight = 600;
   const scale = 30; // пикселей на единицу координат
   const centerX = canvasWidth / 2;
   const centerY = canvasHeight / 2;

   /** Преобразует математические координаты в координаты canvas. */
   const toCanvasX = (x: number) => centerX + x * scale;
   const toCanvasY = (y: number) => centerY - y * scale;

   /** Инициализирует движущиеся точки. */
   const initializePoints = () => {
      const points: MovingPoint[] = [];

      // Вычисляем bounding box внешнего многоугольника
      const xCoords = convexPolygon.map(p => p.x);
      const yCoords = convexPolygon.map(p => p.y);
      const minX = Math.min(...xCoords);
      const maxX = Math.max(...xCoords);
      const minY = Math.min(...yCoords);
      const maxY = Math.max(...yCoords);

      for (let i = 0; i < pointCount; i++) {
         let position: Point;
         let attempts = 0;

         // Генерируем точку между многоугольниками
         do {
            position = {
               x: minX + Math.random() * (maxX - minX),
               y: minY + Math.random() * (maxY - minY)
            };
            attempts++;

            // Проверяем: точка должна быть внутри внешнего и вне внутреннего многоугольника
            const insideOuter = isPointInsideConvexPolygonBinary(convexPolygon, position);
            const insideInner = isPointInsidePolygonOctant(simplePolygon, position);

            if (insideOuter && !insideInner) {
               break;
            }
         } while (attempts < 500);

         // Если не удалось найти подходящую точку, пропускаем
         if (attempts >= 500) continue;

         // Случайное направление
         const angle = Math.random() * 2 * Math.PI;
         const velocity = {
            x: speed * Math.cos(angle),
            y: speed * Math.sin(angle)
         };

         points.push({
            position,
            velocity,
            stopped: false
         });
      }

      setMovingPoints(points);
   };

   /** Обновляет позиции точек. */
   const updatePoints = () => {
      setMovingPoints(prevPoints =>
         prevPoints.map(point => {
            if (point.stopped) return point;

            // Новая позиция
            const newPosition = {
               x: point.position.x + point.velocity.x,
               y: point.position.y + point.velocity.y
            };

            // Сначала проверяем столкновение с внутренним многоугольником (препятствием)
            const obstacleCollision = findCollisionEdge(
               point.position,
               newPosition,
               simplePolygon
            );

            // Если траектория пересекает препятствие - останавливаем
            if (obstacleCollision !== null) {
               const edgeStart = simplePolygon[obstacleCollision];
               const edgeEnd =
                  simplePolygon[(obstacleCollision + 1) % simplePolygon.length];
               const collisionPosition = findSegmentIntersection(
                  point.position,
                  newPosition,
                  edgeStart,
                  edgeEnd
               );

               return {
                  ...point,
                  position: collisionPosition ?? newPosition,
                  stopped: true,
                  velocity: { x: 0, y: 0 }
               };
            }

            // Проверяем, не окажется ли точка внутри препятствия
            if (isPointInsidePolygonOctant(simplePolygon, newPosition)) {
               return {
                  ...point,
                  stopped: true,
                  velocity: { x: 0, y: 0 }
               };
            }

            // Проверяем столкновение с границей внешнего многоугольника Q
            const boundaryCollision = findCollisionEdge(
               point.position,
               newPosition,
               convexPolygon
            );

            if (boundaryCollision !== null) {
               const edgeStart = convexPolygon[boundaryCollision];
               const edgeEnd =
                  convexPolygon[(boundaryCollision + 1) % convexPolygon.length];

               const newVelocity = reflectVelocity(point.velocity, edgeStart, edgeEnd);

               return {
                  ...point,
                  velocity: newVelocity
               };
            }

            // Дополнительная проверка: точка не должна выйти за внешний многоугольник
            if (!isPointInsideConvexPolygonBinary(convexPolygon, newPosition)) {
               // Отражаем скорость (fallback на случай пропуска коллизии)
               return {
                  ...point,
                  velocity: { x: -point.velocity.x, y: -point.velocity.y }
               };
            }

            // Обновляем позицию
            return {
               ...point,
               position: newPosition
            };
         })
      );
   };

   /** Рисует сцену на canvas. */
   const drawScene = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Очищаем canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Рисуем сетку
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      for (let x = 0; x <= canvasWidth; x += scale) {
         ctx.beginPath();
         ctx.moveTo(x, 0);
         ctx.lineTo(x, canvasHeight);
         ctx.stroke();
      }
      for (let y = 0; y <= canvasHeight; y += scale) {
         ctx.beginPath();
         ctx.moveTo(0, y);
         ctx.lineTo(canvasWidth, y);
         ctx.stroke();
      }

      // Оси координат
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(canvasWidth, centerY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, canvasHeight);
      ctx.stroke();

      // Рисуем выпуклый многоугольник Q (синий)
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toCanvasX(convexPolygon[0].x), toCanvasY(convexPolygon[0].y));
      for (let i = 1; i < convexPolygon.length; i++) {
         ctx.lineTo(toCanvasX(convexPolygon[i].x), toCanvasY(convexPolygon[i].y));
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Рисуем простой многоугольник P (красный)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toCanvasX(simplePolygon[0].x), toCanvasY(simplePolygon[0].y));
      for (let i = 1; i < simplePolygon.length; i++) {
         ctx.lineTo(toCanvasX(simplePolygon[i].x), toCanvasY(simplePolygon[i].y));
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Рисуем движущиеся точки
      for (const point of movingPoints) {
         ctx.fillStyle = point.stopped ? '#ef4444' : '#10b981';
         ctx.beginPath();
         ctx.arc(
            toCanvasX(point.position.x),
            toCanvasY(point.position.y),
            5,
            0,
            2 * Math.PI
         );
         ctx.fill();
      }
   };

   /** Цикл анимации. */
   const animate = () => {
      updatePoints();
      drawScene();
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
      const { outer, inner } = generatePolygons();
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

   // Перерисовка при изменении точек
   useEffect(() => {
      drawScene();
   }, [movingPoints]);

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
                  onChange={e => setSpeed(Number(e.target.value))}
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

         <section className="graph-panel" aria-label="Canvas анимации">
            <canvas
               ref={canvasRef}
               width={canvasWidth}
               height={canvasHeight}
               style={{
                  border: '2px solid #1e40af',
                  borderRadius: '8px',
                  background: '#ffffff'
               }}
            />
         </section>
      </main>
   );
};

export default Lab3;
