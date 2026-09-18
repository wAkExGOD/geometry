import { useState } from "react";
import Graph from "./Graph";
import { getPointPosition, getRayIntersections } from "./Lab2";
import type { Point, PolygonPointPosition } from "../types/types";
import { formatPoint } from "../utils/formatPoint";

type PolygonCase = {
    title: string;
    polygon: Point[];
    point: Point;
};

const polygonCases: PolygonCase[] = [
    {
        title: "Пример 1",
        polygon: [
            { x: 0, y: 0 },
            { x: 0, y: 6 },
            { x: 3, y: 9 },
            { x: 5, y: 6 },
            { x: 12, y: 6 },
            { x: 14, y: 0 },
        ],
        point: { x: 2, y: 6 },
    },
    {
        title: "Пример 2",
        polygon: [
            { x: 2, y: 0 },
            { x: 0, y: 10 },
            { x: 3, y: 6 },
            { x: 8, y: 6 },
            { x: 10, y: 11 },
            { x: 12, y: 6 },
            { x: 12, y: 0 },
        ],
        point: { x: 2, y: 6 },
    },
];

const positionText: Record<PolygonPointPosition, string> = {
    inside: "точка внутри многоугольника",
    outside: "точка вне многоугольника",
    boundary: "точка на границе многоугольника",
};

function formatEdge(first: Point, second: Point): string {
    if (first.x === second.x) {
        return `x=${first.x}\\{${Math.min(first.y, second.y)}\\le y\\le ${Math.max(first.y, second.y)}\\}`;
    }

    const slope = (second.y - first.y) / (second.x - first.x);
    const minX = Math.min(first.x, second.x);
    const maxX = Math.max(first.x, second.x);

    return `y=(${slope})*(x-(${first.x}))+(${first.y})\\{${minX}\\le x\\le ${maxX}\\}`;
}

function formatRay(point: Point): string {
    return `y=${point.y}\\{x\\ge ${point.x}\\}`;
}

const Lab21 = () => {
    const [caseIndex, setCaseIndex] = useState(0);
    const currentCase = polygonCases[caseIndex];
    const { polygon, point } = currentCase;
    const position = getPointPosition(polygon, point);
    const intersections = getRayIntersections(polygon, point);

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
            latex: formatRay(point),
            color: Desmos.Colors.RED,
        },
        ...intersections.map(({ point: intersection, edge }) => ({
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
                <p className="eyebrow">Проверка алгоритма Lab2</p>
                <h1>{currentCase.title}</h1>
                <p className="description">
                    Тестируем тот же лучевой алгоритм на многоугольнике с
                    фотографии.
                </p>

                <div className="result-box" aria-live="polite">
                    <span>Результат</span>
                    <strong>{positionText[position]}</strong>
                    <small>
                        Пересечений справа от p0: {intersections.length}
                    </small>
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
                    onClick={() =>
                        setCaseIndex(
                            (index) => (index + 1) % polygonCases.length,
                        )
                    }
                >
                    Следующий пример
                </button>
            </section>

            <section
                className="graph-panel"
                aria-label="Проверка многоугольника лучевым тестом"
            >
                <Graph
                    expressions={expressions}
                    mathBounds={{ left: -2, right: 14, bottom: -2, top: 13 }}
                />
            </section>
        </main>
    );
};

export default Lab21;
