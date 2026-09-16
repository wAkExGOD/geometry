import { useState } from "react";
import Graph from "./Graph";
import { isPointOnSegment } from "./Lab12";
import type {
    Point,
    PointCase,
    PolygonPointPosition,
    RayIntersection,
} from "../types/types";

/** Проверяет первый этап лучевого теста: попадание точки в габаритный прямоугольник. */
function isInsideBoundingBox(polygon: Point[], point: Point): boolean {
    const xCoordinates = polygon.map(({ x }) => x);
    const yCoordinates = polygon.map(({ y }) => y);

    return (
        point.x >= Math.min(...xCoordinates) &&
        point.x <= Math.max(...xCoordinates) &&
        point.y >= Math.min(...yCoordinates) &&
        point.y <= Math.max(...yCoordinates)
    );
}

/** Возвращает точки пересечения горизонтального луча с рёбрами справа от p0. */
function getRayIntersections(
    polygon: Point[],
    point: Point,
): RayIntersection[] {
    const intersections: RayIntersection[] = [];

    for (let index = 0; index < polygon.length; index += 1) {
        const first = polygon[index];
        const second = polygon[(index + 1) % polygon.length];

        // Горизонтальное ребро не пересекает луч в одной точке.
        if (first.y === second.y) {
            continue;
        }

        // Полуоткрытый диапазон: нижняя вершина включается, верхняя нет.
        // Поэтому вершина с двумя соседними рёбрами считается один раз.
        const crossesRay =
            (first.y <= point.y && point.y < second.y) ||
            (second.y <= point.y && point.y < first.y);

        if (!crossesRay) {
            continue;
        }

        const intersectionX =
            first.x +
            ((point.y - first.y) * (second.x - first.x)) / (second.y - first.y);

        if (intersectionX > point.x) {
            intersections.push({
                point: { x: intersectionX, y: point.y },
                edge: index,
            });
        }
    }

    return intersections;
}

/** Определяет положение точки габаритным и лучевым тестами. */
export function getPointPosition(
    polygon: Point[],
    point: Point,
): PolygonPointPosition {
    if (
        polygon.some((_, index) =>
            isPointOnSegment(
                polygon[index],
                polygon[(index + 1) % polygon.length],
                point,
            ),
        )
    ) {
        return "boundary";
    }

    if (!isInsideBoundingBox(polygon, point)) {
        return "outside";
    }

    return getRayIntersections(polygon, point).length % 2 === 1
        ? "inside"
        : "outside";
}

/** Создаёт выпуклый многоугольник с вершинами в порядке обхода. */
function createPolygon(): Point[] {
    const radius = 4 + Math.floor(Math.random() * 3);
    const centerX = Math.floor(Math.random() * 5) - 2;
    const centerY = Math.floor(Math.random() * 5) - 2;

    return [
        { x: centerX - radius, y: centerY - 2 },
        { x: centerX - 2, y: centerY - radius },
        { x: centerX + radius - 1, y: centerY - radius + 1 },
        { x: centerX + radius, y: centerY + 2 },
        { x: centerX + 2, y: centerY + radius },
        { x: centerX - radius + 1, y: centerY + radius - 1 },
    ];
}

function getRandomInteger(minimum: number, maximum: number): number {
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function createExamplePolygon(): Point[] {
    const left = getRandomInteger(-5, -2);
    const right = getRandomInteger(3, 6);
    const bottom = getRandomInteger(-5, -2);
    const top = getRandomInteger(3, 6);

    return [
        { x: left, y: bottom },
        { x: right, y: bottom },
        { x: right, y: top },
        { x: left, y: top },
    ];
}

/** Создаёт случайный случай и отдельные учебные edge cases. */
function createPointCases(): PointCase[] {
    const polygon = createPolygon();
    const examplePolygon = createExamplePolygon();
    const minX = Math.min(...polygon.map(({ x }) => x));
    const maxX = Math.max(...polygon.map(({ x }) => x));
    const exampleLeft = examplePolygon[0].x;
    const topY = Math.max(...examplePolygon.map(({ y }) => y));

    return [
        {
            polygon,
            point: {
                x: getRandomInteger(-8, 8),
                y: getRandomInteger(-7, 7),
            },
            title: "Случайная точка",
            rayStartX: -9,
        },
        {
            polygon: examplePolygon,
            point: {
                x: getRandomInteger(-8, exampleLeft - 1),
                y: getRandomInteger(-4, 4),
            },
            title: "Луч пересекает многоугольник два раза",
            rayStartX: -9,
        },
        {
            polygon: examplePolygon,
            point: {
                x: getRandomInteger(-8, -6),
                y: topY,
            },
            title: "Луч проходит по верхнему ребру",
            rayStartX: -9,
        },
        {
            polygon: [
                { x: minX, y: -3 },
                { x: maxX, y: 1 },
                { x: minX, y: 5 },
            ],
            point: { x: getRandomInteger(-8, minX - 1), y: 1 },
            title: "Луч проходит через вершину",
            rayStartX: -9,
        },
        {
            polygon: examplePolygon,
            point: {
                x: getRandomInteger(
                    examplePolygon[0].x + 1,
                    examplePolygon[1].x - 1,
                ),
                y: getRandomInteger(examplePolygon[0].y + 1, topY - 1),
            },
            title: "Случайная точка внутри",
            rayStartX: -9,
        },
        {
            polygon: examplePolygon,
            point: {
                x: getRandomInteger(7, 9),
                y: getRandomInteger(-4, 4),
            },
            title: "Случайная точка справа",
            rayStartX: -9,
        },
    ];
}

function formatPoint(point: Point): string {
    return `(${point.x},${point.y})`;
}

/** Создаёт конечное ребро между двумя соседними вершинами. */
function formatEdge(first: Point, second: Point): string {
    if (first.x === second.x) {
        const minY = Math.min(first.y, second.y);
        const maxY = Math.max(first.y, second.y);

        return `x=${first.x}\\{${minY}\\le y\\le ${maxY}\\}`;
    }

    const slope = (second.y - first.y) / (second.x - first.x);
    const minX = Math.min(first.x, second.x);
    const maxX = Math.max(first.x, second.x);

    return `y=(${slope})*(x-(${first.x}))+(${first.y})\\{${minX}\\le x\\le ${maxX}\\}`;
}

/** Создаёт горизонтальный луч из фиксированной точки через p0 вправо. */
function formatRay(point: Point, startX: number): string {
    return `y=${point.y}\\{x\\ge ${startX}\\}`;
}

const positionText: Record<PolygonPointPosition, string> = {
    inside: "точка внутри многоугольника",
    outside: "точка вне многоугольника",
    boundary: "точка на границе многоугольника",
};

const Lab2 = () => {
    const [caseIndex, setCaseIndex] = useState(0);
    const [pointCases, setPointCases] = useState(createPointCases);
    const pointCase = pointCases[caseIndex];
    const { polygon, point, rayStartX } = pointCase;
    const position = getPointPosition(polygon, point);
    const rayIntersections = getRayIntersections(polygon, point);
    const expressions: Desmos.ExpressionState[] = [
        ...polygon.map((vertex, index) => ({
            id: `edge-${index}`,
            latex: formatEdge(vertex, polygon[(index + 1) % polygon.length]),
            color: Desmos.Colors.BLUE,
        })),
        ...polygon.map((vertex, index) => ({
            id: `vertex-${index}`,
            latex: formatPoint(vertex),
            label: `p${index + 1} ${formatPoint(vertex)}`,
            showLabel: true,
            color: Desmos.Colors.BLUE,
        })),
        {
            id: "point-0",
            latex: formatPoint(point),
            label: `p0 ${formatPoint(point)}`,
            showLabel: true,
            color: Desmos.Colors.RED,
        },
        {
            id: "ray",
            latex: formatRay(point, rayStartX),
            color: Desmos.Colors.RED,
        },
        ...rayIntersections.map(({ point: intersection, edge }) => ({
            id: `intersection-${edge}`,
            latex: formatPoint(intersection),
            label: `пересечение с ребром ${edge + 1}`,
            showLabel: true,
            color: Desmos.Colors.ORANGE,
        })),
    ];

    return (
        <main className="lab-page">
            <section className="control-panel">
                <p className="eyebrow">Лабораторная работа 2</p>
                <h1>Положение точки</h1>
                <p className="description">
                    Определяем положение точки p0 относительно простого
                    многоугольника лучевым тестом.
                </p>
                <p className="description">Кейс: {pointCase.title}</p>

                <div className="result-box" aria-live="polite">
                    <span>Результат</span>
                    <strong>{positionText[position]}</strong>
                    <small>Пересечений луча: {rayIntersections.length}</small>
                </div>

                <div className="coordinates">
                    {polygon.map((vertex, index) => (
                        <div key={`coordinate-${index}`}>
                            <span>p{index + 1}</span>
                            <b>{formatPoint(vertex)}</b>
                        </div>
                    ))}
                    <div>
                        <span>p0</span>
                        <b>{formatPoint(point)}</b>
                    </div>
                </div>

                <button
                    type="button"
                    className="new-case-button"
                    onClick={() => {
                        setPointCases(createPointCases());
                        setCaseIndex(0);
                    }}
                >
                    Создать новый случай
                </button>
            </section>

            <section
                className="graph-panel"
                aria-label="График точки и многоугольника"
            >
                <Graph
                    expressions={expressions}
                    mathBounds={{
                        left: -10,
                        right: 10,
                        bottom: -10,
                        top: 10,
                    }}
                />
            </section>
        </main>
    );
};

export default Lab2;
