import type { Point } from "../types/types";

export function formatPoint(point: Point): string {
    return `(${point.x}, ${point.y})`;
}
