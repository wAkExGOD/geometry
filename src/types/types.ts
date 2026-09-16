export type Point = {
    x: number;
    y: number;
};

export type PointPosition = "на прямой" | "левее" | "правее";

export type GeometryCase = {
    p1: Point;
    p2: Point;
    p0: Point;
};

export type SegmentCase = {
    p1: Point;
    p2: Point;
    p3: Point;
    p4: Point;
};

export type PolygonPointPosition = "inside" | "outside" | "boundary";

export type PointCase = {
    polygon: Point[];
    point: Point;
    title: string;
    rayStartX: number;
};

export type RayIntersection = {
    point: Point;
    edge: number;
};

export type MathBounds = {
    left: number;
    right: number;
    bottom: number;
    top: number;
};

export type GraphProps = {
    expressions: Desmos.ExpressionState[];
    mathBounds?: MathBounds;
};
