import { useState } from "react";
import Graph from "./Graph";
import { doSegmentsIntersect } from "./Lab12";
import type { Point } from "../types/types";

/** Определяет, является ли замкнутый многоугольник простым. */
export function isSimplePolygon(points: Point[]): boolean {
    // Многоугольник с двумя вершинами или одной вершиной невозможен.
    if (points.length < 3) {
        return false;
    }

    // Берём каждое ребро многоугольника по очереди.
    for (
        let firstEdgeIndex = 0;
        firstEdgeIndex < points.length;
        firstEdgeIndex += 1
    ) {
        // Ребро начинается в текущей вершине.
        const firstEdgeStart = points[firstEdgeIndex];

        // Ребро заканчивается в следующей вершине.
        // Остаток от деления замыкает последнее ребро на первую вершину.
        const firstEdgeEnd = points[(firstEdgeIndex + 1) % points.length];

        // Сравниваем выбранное ребро со всеми рёбрами после него.
        for (
            let secondEdgeIndex = firstEdgeIndex + 1;
            secondEdgeIndex < points.length;
            secondEdgeIndex += 1
        ) {
            // Два ребра являются соседними, если у них есть общая вершина.
            const areNextToEachOther = secondEdgeIndex === firstEdgeIndex + 1;
            const areFirstAndLastEdges =
                firstEdgeIndex === 0 && secondEdgeIndex === points.length - 1;

            // Соседние рёбра обязаны пересекаться в общей вершине,
            // поэтому такое пересечение не делает многоугольник непростым.
            if (areNextToEachOther || areFirstAndLastEdges) {
                continue;
            }

            // Получаем начало второго ребра.
            const secondEdgeStart = points[secondEdgeIndex];

            // Получаем конец второго ребра.
            // Последнее ребро также замыкается на первую вершину.
            const secondEdgeEnd = points[(secondEdgeIndex + 1) % points.length];

            // Если два несоседних ребра пересекаются,
            // граница многоугольника сама пересекает себя.
            if (
                doSegmentsIntersect({
                    p1: firstEdgeStart,
                    p2: firstEdgeEnd,
                    p3: secondEdgeStart,
                    p4: secondEdgeEnd,
                })
            ) {
                return false;
            }
        }
    }

    // После проверки рёбер убеждаемся, что вершины не повторяются.
    return points.every((point, pointIndex) => {
        // Находим первое место, где встречается такая же точка.
        const firstOccurrenceIndex = points.findIndex(
            (otherPoint) =>
                otherPoint.x === point.x && otherPoint.y === point.y,
        );

        // Точка уникальна, если её первое вхождение находится на её месте.
        return firstOccurrenceIndex === pointIndex;
    });
}

function getRandomCoordinate(): number {
    return Math.floor(Math.random() * 17) - 8;
}

/** Создаёт новый многоугольник с неповторяющимися вершинами. */
function createPolygon(): Point[] {
    const points: Point[] = [];

    while (points.length < 6) {
        const point = { x: getRandomCoordinate(), y: getRandomCoordinate() };
        const isDuplicate = points.some(
            (savedPoint) =>
                savedPoint.x === point.x && savedPoint.y === point.y,
        );

        if (!isDuplicate) {
            points.push(point);
        }
    }

    return points;
}

function formatPoint(point: Point): string {
    return `(${point.x},${point.y})`;
}

/** Создаёт конечный отрезок между двумя соседними вершинами. */
function formatEdge(first: Point, second: Point): string {
    const x = `(1-t)*${first.x}+t*${second.x}`;
    const y = `(1-t)*${first.y}+t*${second.y}`;

    return `(${x},${y})\\{0\\le t\\le 1\\}`;
}

const Lab13 = () => {
    const [points, setPoints] = useState(createPolygon);
    const isSimple = isSimplePolygon(points);
    const expressions: Desmos.ExpressionState[] = points.flatMap(
        (point, index) => {
            const nextPoint = points[(index + 1) % points.length];

            return [
                {
                    id: `edge-${index}`,
                    latex: formatEdge(point, nextPoint),
                    color: Desmos.Colors.BLUE,
                },
            ];
        },
    );

    expressions.push(
        ...points.map((point, index) => ({
            id: `point-${index}`,
            latex: formatPoint(point),
            label: `p${index + 1} (${point.x}, ${point.y})`,
            showLabel: true,
            color: Desmos.Colors.RED,
        })),
    );

    return (
        <main className="lab-page">
            <section className="control-panel">
                <p className="eyebrow">Лабораторная работа 3</p>
                <h1>Простой многоугольник</h1>
                <p className="description">
                    Проверяем, пересекаются ли несоседние рёбра многоугольника.
                </p>

                <div className="result-box" aria-live="polite">
                    <span>Результат</span>
                    <strong>
                        {isSimple
                            ? "многоугольник простой"
                            : "многоугольник непростой"}
                    </strong>
                </div>

                <div className="coordinates">
                    {points.map((point, index) => (
                        <div key={`coordinate-${index}`}>
                            <span>p{index + 1}</span>
                            <b>
                                ({point.x}, {point.y})
                            </b>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    className="new-case-button"
                    onClick={() => setPoints(createPolygon())}
                >
                    Создать новый случай
                </button>
            </section>

            <section className="graph-panel" aria-label="График многоугольника">
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

export default Lab13;
