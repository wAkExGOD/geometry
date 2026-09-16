import { useState } from "react";
import Graph from "./Graph";
import type { GeometryCase, Point, PointPosition } from "../types/types";
import { formatPoint } from "../utils/formatPoint";

/**
 * Возвращает числовой результат ориентации третьей точки относительно прямой.
 * Это общий расчёт, который используется в Lab11 и Lab12.
 */
export function getOrientation(
    first: Point,
    second: Point,
    third: Point,
): number {
    // Считаем вектор направления прямой: от первой точки ко второй.
    const lineVectorX = second.x - first.x;
    const lineVectorY = second.y - first.y;

    // Считаем вектор от первой точки к проверяемой третьей точке.
    const pointVectorX = third.x - first.x;
    const pointVectorY = third.y - first.y;

    // Возвращаем определитель двух векторов.
    return lineVectorX * pointVectorY - lineVectorY * pointVectorX;
}

/**
 * Определяет положение p0 относительно направленной прямой p1 -> p2.
 * Число ориентации переводится в понятный текстовый результат.
 */
export function getPointPosition({ p1, p2, p0 }: GeometryCase): PointPosition {
    // Получаем число, показывающее сторону точки относительно прямой.
    const orientation = getOrientation(p1, p2, p0);

    if (orientation === 0) {
        return "на прямой";
    }

    return orientation > 0 ? "левее" : "правее";
}

const Lab11 = () => {
    /** Создаёт целое число в заданном диапазоне. */
    function getRandomCoordinate(): number {
        return Math.floor(Math.random() * 17) - 8;
    }

    /** Создаёт новый случай и гарантирует, что p1 и p2 задают прямую. */
    function createGeometryCase(): GeometryCase {
        const p1 = { x: getRandomCoordinate(), y: getRandomCoordinate() };
        let p2 = { x: getRandomCoordinate(), y: getRandomCoordinate() };

        while (p1.x === p2.x && p1.y === p2.y) {
            p2 = { x: getRandomCoordinate(), y: getRandomCoordinate() };
        }

        return {
            p1,
            p2,
            p0: { x: getRandomCoordinate(), y: getRandomCoordinate() },
        };
    }

    const [geometryCase, setGeometryCase] = useState(createGeometryCase);
    const position = getPointPosition(geometryCase);
    const expressions: Desmos.ExpressionState[] = (() => {
        const { p1, p2, p0 } = geometryCase;
        const directionX = p2.x - p1.x;
        const directionY = p2.y - p1.y;
        const lineLatex =
            directionX === 0
                ? `x=${p1.x}`
                : `y=${directionY / directionX}x+${p1.y - (directionY / directionX) * p1.x}`;

        return [
            {
                id: "line",
                latex: lineLatex,
                color: Desmos.Colors.BLUE,
            },
            {
                id: "p1",
                latex: formatPoint(p1),
                label: `p1 ${formatPoint(p1)}`,
                showLabel: true,
                color: Desmos.Colors.BLUE,
            },
            {
                id: "p2",
                latex: formatPoint(p2),
                label: `p2 ${formatPoint(p2)}`,
                showLabel: true,
                color: Desmos.Colors.BLUE,
            },
            {
                id: "p0",
                latex: formatPoint(p0),
                label: `p0 ${formatPoint(p0)}`,
                showLabel: true,
                color: Desmos.Colors.RED,
            },
        ];
    })();

    return (
        <main className="lab-page">
            <section className="control-panel">
                <p className="eyebrow">Лабораторная работа 1</p>
                <h1>Положение точки относительно прямой</h1>
                <p className="description">
                    Направление прямой: от p1 к p2. Положение p0 определяется
                    относительно этого направления.
                </p>

                <div className="result-box" aria-live="polite">
                    <span>Результат</span>
                    <strong>{position}</strong>
                </div>

                <div className="coordinates">
                    <div>
                        <span>p1</span>
                        <b>{formatPoint(geometryCase.p1)}</b>
                    </div>
                    <div>
                        <span>p2</span>
                        <b>{formatPoint(geometryCase.p2)}</b>
                    </div>
                    <div>
                        <span>p0</span>
                        <b>{formatPoint(geometryCase.p0)}</b>
                    </div>
                </div>

                <button
                    type="button"
                    className="new-case-button"
                    onClick={() => setGeometryCase(createGeometryCase())}
                >
                    Создать новый случай
                </button>
            </section>

            <section
                className="graph-panel"
                aria-label="График геометрического случая"
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

export default Lab11;
