import type { Point } from '../types/types';
import {
   isPointInsidePolygonOctant,
   isPointInsideConvexPolygonBinary
} from './pointInPolygon';
import { findCollisionEdge, findSegmentIntersection, reflectVelocity } from './geometry';
import { generateRandomConvexPolygon, isPolygonInsidePolygon } from './polygonGenerator';

export interface MovingPoint {
   /** Текущее положение точки в координатах графика. */
   position: Point;
   /** Вектор перемещения за один физический шаг. */
   velocity: Point;
   /** После столкновения точка больше не участвует в движении. */
   stopped: boolean;
}

/** Меняет длину скорости, сохраняя направление незавершённого движения. */
export function updateMovingPointsSpeed(
   points: MovingPoint[],
   speed: number
): MovingPoint[] {
   return points.map(point => {
      // Остановившиеся точки не должны снова начать двигаться при смене скорости.
      if (point.stopped) return point;

      const velocityLength = Math.hypot(point.velocity.x, point.velocity.y);
      // Защита от деления на ноль для точки с нулевой скоростью.
      if (velocityLength === 0) return point;

      return {
         ...point,
         velocity: {
            x: (point.velocity.x / velocityLength) * speed,
            y: (point.velocity.y / velocityLength) * speed
         }
      };
   });
}

export function generateLab3Polygons(): { outer: Point[]; inner: Point[] } {
   let outer: Point[];
   let inner: Point[];
   let attempts = 0;

   // Повторяем генерацию, пока все вершины P не окажутся внутри Q.
   do {
      outer = generateRandomConvexPolygon(0, 0, 6, 9, 6 + Math.floor(Math.random() * 3));
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
}

export function createMovingPoints(
   convexPolygon: Point[],
   simplePolygon: Point[],
   pointCount: number,
   speed: number
): MovingPoint[] {
   const points: MovingPoint[] = [];
   // Bounding box Q задаёт область, в которой выгодно искать стартовые точки.
   const xCoords = convexPolygon.map(point => point.x);
   const yCoords = convexPolygon.map(point => point.y);
   const minX = Math.min(...xCoords);
   const maxX = Math.max(...xCoords);
   const minY = Math.min(...yCoords);
   const maxY = Math.max(...yCoords);

   for (let i = 0; i < pointCount; i++) {
      let position: Point;
      let attempts = 0;

      // Случайная точка принимается только между Q и P.
      do {
         position = {
            x: minX + Math.random() * (maxX - minX),
            y: minY + Math.random() * (maxY - minY)
         };
         attempts++;

         // Для выпуклой Q используется бинарный тест, для простого P — октантный.
         const insideOuter = isPointInsideConvexPolygonBinary(convexPolygon, position);
         const insideInner = isPointInsidePolygonOctant(simplePolygon, position);

         if (insideOuter && !insideInner) {
            break;
         }
      } while (attempts < 500);

      // После лимита попыток и перед добавлением повторно подтверждаем оба условия.
      if (
         attempts >= 500 ||
         !isPointInsideConvexPolygonBinary(convexPolygon, position) ||
         isPointInsidePolygonOctant(simplePolygon, position)
      ) {
         continue;
      }

      // Направление выбирается случайно, а длина вектора равна заданной скорости.
      const angle = Math.random() * 2 * Math.PI;
      points.push({
         position,
         velocity: {
            x: speed * Math.cos(angle),
            y: speed * Math.sin(angle)
         },
         stopped: false
      });
   }

   return points;
}

export function updateMovingPoint(
   point: MovingPoint,
   convexPolygon: Point[],
   simplePolygon: Point[]
): MovingPoint {
   // Остановившаяся точка не должна изменяться последующими кадрами.
   if (point.stopped) return point;

   // Проверяем положение, в которое точка попадёт за один шаг.
   const newPosition = {
      x: point.position.x + point.velocity.x,
      y: point.position.y + point.velocity.y
   };

   // Октантный тест определяет попадание внутрь препятствия P.
   if (isPointInsidePolygonOctant(simplePolygon, newPosition)) {
      const obstacleCollision = findCollisionEdge(
         point.position,
         newPosition,
         simplePolygon
      );

      // Если траектория пересекла ребро, фиксируем точку на границе, а не внутри.
      const collisionPosition =
         obstacleCollision === null
            ? null
            : findSegmentIntersection(
                 point.position,
                 newPosition,
                 simplePolygon[obstacleCollision],
                 simplePolygon[(obstacleCollision + 1) % simplePolygon.length]
              );

      return {
         ...point,
         position: collisionPosition ?? newPosition,
         stopped: true,
         velocity: { x: 0, y: 0 }
      };
   }

   // Сначала ищем точное пересечение с границей Q и отражаем скорость от её ребра.
   const boundaryCollision = findCollisionEdge(
      point.position,
      newPosition,
      convexPolygon
   );

   if (boundaryCollision !== null) {
      const edgeStart = convexPolygon[boundaryCollision];
      const edgeEnd = convexPolygon[(boundaryCollision + 1) % convexPolygon.length];

      return {
         ...point,
         velocity: reflectVelocity(point.velocity, edgeStart, edgeEnd)
      };
   }

   // Запасная защита: точка не должна оказаться за пределами выпуклого Q.
   if (!isPointInsideConvexPolygonBinary(convexPolygon, newPosition)) {
      return {
         ...point,
         velocity: {
            x: -point.velocity.x,
            y: -point.velocity.y
         }
      };
   }

   return {
      ...point,
      position: newPosition
   };
}
