import type { Point } from '../types/types';
import {
   isPointInsidePolygonOctant,
   isPointInsideConvexPolygonBinary
} from './pointInPolygon';
import { findCollisionEdge, findSegmentIntersection, reflectVelocity } from './geometry';
import { generateRandomConvexPolygon, isPolygonInsidePolygon } from './polygonGenerator';

export interface MovingPoint {
   position: Point;
   velocity: Point;
   stopped: boolean;
}

export function updateMovingPointsSpeed(
   points: MovingPoint[],
   speed: number
): MovingPoint[] {
   return points.map(point => {
      if (point.stopped) return point;

      const velocityLength = Math.hypot(point.velocity.x, point.velocity.y);
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
   const xCoords = convexPolygon.map(point => point.x);
   const yCoords = convexPolygon.map(point => point.y);
   const minX = Math.min(...xCoords);
   const maxX = Math.max(...xCoords);
   const minY = Math.min(...yCoords);
   const maxY = Math.max(...yCoords);

   for (let i = 0; i < pointCount; i++) {
      let position: Point;
      let attempts = 0;

      do {
         position = {
            x: minX + Math.random() * (maxX - minX),
            y: minY + Math.random() * (maxY - minY)
         };
         attempts++;

         const insideOuter = isPointInsideConvexPolygonBinary(convexPolygon, position);
         const insideInner = isPointInsidePolygonOctant(simplePolygon, position);

         if (insideOuter && !insideInner) {
            break;
         }
      } while (attempts < 500);

      if (
         attempts >= 500 ||
         !isPointInsideConvexPolygonBinary(convexPolygon, position) ||
         isPointInsidePolygonOctant(simplePolygon, position)
      ) {
         continue;
      }

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
   if (point.stopped) return point;

   const newPosition = {
      x: point.position.x + point.velocity.x,
      y: point.position.y + point.velocity.y
   };

   const obstacleCollision = findCollisionEdge(
      point.position,
      newPosition,
      simplePolygon
   );

   if (obstacleCollision !== null) {
      const edgeStart = simplePolygon[obstacleCollision];
      const edgeEnd = simplePolygon[(obstacleCollision + 1) % simplePolygon.length];
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

   if (isPointInsidePolygonOctant(simplePolygon, newPosition)) {
      return {
         ...point,
         stopped: true,
         velocity: { x: 0, y: 0 }
      };
   }

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
