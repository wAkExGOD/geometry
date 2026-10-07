import { useState, useEffect, useCallback, useMemo } from "react";
import Graph from "./Graph";
import type { Point } from "../types/types";

// ============================================================================
// ТИПЫ ДАННЫХ
// ============================================================================

export type GrahamStep = {
    stack: Point[];
    currentPoint: Point | null;
    action: "init" | "push" | "pop" | "finish";
    description: string;
};

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

function getOrientation(p: Point, q: Point, r: Point): number {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (Math.abs(val) < 1e-9) return 0;
    if (val > 0) return 1;
    return 2;
}

function getDistanceSquared(p1: Point, p2: Point): number {
    return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
}

function formatPoint(p: Point): string {
    return `(${p.x}, ${p.y})`;
}

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

// ============================================================================
// АЛГОРИТМ ГРЕХЭМА
// ============================================================================

function generateGrahamSteps(points: Point[]): GrahamStep[] {
    const steps: GrahamStep[] = [];
    if (points.length < 3) {
        steps.push({ stack: [...points], currentPoint: null, action: "finish", description: "Точек меньше 3." });
        return steps;
    }

    let pivot = points[0];
    for (let i = 1; i < points.length; i++) {
        if (points[i].y < pivot.y || (points[i].y === pivot.y && points[i].x < pivot.x)) {
            pivot = points[i];
        }
    }

    const sortedPoints = [...points].sort((a, b) => {
        const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
        const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
        if (Math.abs(angleA - angleB) < 1e-9) {
            return getDistanceSquared(pivot, a) - getDistanceSquared(pivot, b);
        }
        return angleA - angleB;
    });

    steps.push({ stack: [pivot], currentPoint: null, action: "init", description: `Опорная точка: (${pivot.x.toFixed(2)}, ${pivot.y.toFixed(2)}).` });

    const stack: Point[] = [sortedPoints[0], sortedPoints[1]];
    steps.push({ stack: [...stack], currentPoint: sortedPoints[1], action: "push", description: `Добавляем вторую точку в стек.` });

    for (let i = 2; i < sortedPoints.length; i++) {
        const current = sortedPoints[i];
        while (stack.length >= 2 && getOrientation(stack[stack.length - 2], stack[stack.length - 1], current) !== 2) {
            const popped = stack.pop();
            steps.push({ stack: [...stack], currentPoint: current, action: "pop", description: `Удаляем точку (${popped?.x.toFixed(2)}, ${popped?.y.toFixed(2)}).` });
        }
        stack.push(current);
        steps.push({ stack: [...stack], currentPoint: current, action: "push", description: `Добавляем точку (${current.x.toFixed(2)}, ${current.y.toFixed(2)}).` });
    }

    steps.push({ stack: [...stack, stack[0]], currentPoint: null, action: "finish", description: "Выпуклая оболочка построена и замкнута." });
    return steps;
}

// ============================================================================
// КОМПОНЕНТ LAB4
// ============================================================================

const Lab4 = () => {
    const [points, setPoints] = useState<Point[]>([]);
    const [steps, setSteps] = useState<GrahamStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const generateNewCase = useCallback(() => {
        const count = Math.floor(Math.random() * 7) + 6;
        const newPoints: Point[] = [];
        for (let i = 0; i < count; i++) {
            newPoints.push({
                x: Number((Math.random() * 10 - 5).toFixed(1)),
                y: Number((Math.random() * 10 - 5).toFixed(1)),
            });
        }
        setPoints(newPoints);
        setSteps(generateGrahamSteps(newPoints));
        setCurrentStepIndex(0);
        setIsPlaying(false);
    }, []);

    useEffect(() => {
        generateNewCase();
    }, [generateNewCase]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        if (isPlaying) {
            intervalId = setInterval(() => {
                setCurrentStepIndex((prev) => {
                    if (prev >= steps.length - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 800);
        }
        return () => { if (intervalId) clearInterval(intervalId); };
    }, [isPlaying, steps.length]);

    // Вычисляем границы ОДИН РАЗ для текущего набора точек
    const mathBounds = useMemo(() => {
        if (points.length === 0) return { left: -6, right: 6, bottom: -6, top: 6 };
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const paddingX = Math.max((maxX - minX) * 0.25, 1.5);
        const paddingY = Math.max((maxY - minY) * 0.25, 1.5);
        return { left: minX - paddingX, right: maxX + paddingX, bottom: minY - paddingY, top: maxY + paddingY };
    }, [points]);

    const currentStep = steps[currentStepIndex] || { stack: [], currentPoint: null, action: "init", description: "" };

    const expressions: any[] = [
        ...points.map((p, i) => ({ id: `point-all-${i}`, latex: formatPoint(p), color: "gray" })),
        ...currentStep.stack.map((_, i) => {
            if (i < currentStep.stack.length - 1) {
                return { id: `edge-stack-${i}`, latex: formatEdge(currentStep.stack[i], currentStep.stack[i + 1]), color: "red" };
            }
            return null;
        }).filter(Boolean),
        ...currentStep.stack.map((p, i) => ({ id: `point-stack-${i}`, latex: formatPoint(p), color: "red" })),
        ...(currentStep.currentPoint ? [{ id: "point-current", latex: formatPoint(currentStep.currentPoint), color: "orange", label: "Проверяется", showLabel: true }] : []),
    ];

    return (
        <main className="lab-page" style={{ display: "flex", gap: "20px", padding: "20px", fontFamily: "sans-serif" }}>
            <section className="control-panel" style={{ width: "350px", display: "flex", flexDirection: "column" }}>
                <p className="eyebrow" style={{ color: "#666", fontSize: "0.9em", margin: 0 }}>Лабораторная работа 4</p>
                <h1 style={{ margin: "5px 0 15px 0" }}>Алгоритм Грехэма</h1>
                <p className="description" style={{ fontSize: "0.95em", color: "#444", lineHeight: "1.4" }}>
                    Построение выпуклой оболочки. Вы можете свободно перетаскивать и масштабировать график, анимация не собьёт ваш обзор.
                </p>

                <div className="result-box" style={{ backgroundColor: "#f0f4f8", padding: "15px", borderRadius: "8px", marginBottom: "15px", border: "1px solid #d1d9e6" }}>
                    <span style={{ display: "block", fontSize: "0.85em", color: "#666", marginBottom: "5px", textTransform: "uppercase" }}>
                        Шаг {currentStepIndex + 1} из {steps.length}
                    </span>
                    <strong style={{ display: "block", color: "#2c3e50", lineHeight: "1.4", fontSize: "1.05em" }}>
                        {currentStep.description}
                    </strong>
                    <small style={{ display: "block", marginTop: "10px", color: "#7f8c8d", fontWeight: "bold" }}>
                        Размер стека: {currentStep.stack.length}
                    </small>
                </div>

                <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
                    <button disabled={currentStepIndex === 0} onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))} style={{ flex: 1, padding: "10px", cursor: currentStepIndex === 0 ? "not-allowed" : "pointer", opacity: currentStepIndex === 0 ? 0.5 : 1, borderRadius: "4px", border: "1px solid #ccc", backgroundColor: "#fff" }}>◀</button>
                    <button onClick={() => setIsPlaying(!isPlaying)} style={{ flex: 1, padding: "10px", backgroundColor: isPlaying ? "#e74c3c" : "#2ecc71", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>{isPlaying ? "⏸" : "▶"}</button>
                    <button disabled={currentStepIndex >= steps.length - 1} onClick={() => setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1))} style={{ flex: 1, padding: "10px", cursor: currentStepIndex >= steps.length - 1 ? "not-allowed" : "pointer", opacity: currentStepIndex >= steps.length - 1 ? 0.5 : 1, borderRadius: "4px", border: "1px solid #ccc", backgroundColor: "#fff" }}>▶</button>
                </div>

                <button onClick={generateNewCase} style={{ width: "100%", padding: "12px", marginBottom: "10px", backgroundColor: "#3498db", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>🔄 Новые точки</button>
                
                {/* Кнопка сброса вида, если пользователь ушёл далеко в сторону */}
                <button onClick={() => {
                    // Трюк: меняем ключ, чтобы заставить Graph пересоздаться и применить mathBounds заново
                    setPoints([...points]); 
                }} style={{ width: "100%", padding: "8px", marginBottom: "15px", backgroundColor: "#95a5a6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>🎯 Сбросить масштаб графика</button>

                <div className="coordinates" style={{ flex: 1, overflowY: "auto", fontSize: "0.9em", border: "1px solid #eee", borderRadius: "4px", padding: "10px" }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "#555" }}>Исходные точки P:</h4>
                    {points.map((vertex, index) => (
                        <div key={`coordinate-${index}`} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
                            <span style={{ color: "#7f8c8d" }}>p{index + 1}</span>
                            <b style={{ color: "#2c3e50" }}>({vertex.x}, {vertex.y})</b>
                        </div>
                    ))}
                </div>
            </section>

            <section className="graph-panel" style={{ flex: 1, minHeight: "600px", backgroundColor: "#fff", borderRadius: "8px", overflow: "hidden", border: "1px solid #ddd", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
                {/* 
                    КЛЮЧЕВОЙ МОМЕНТ: ключ (key) зависит только от points. 
                    При смене currentStepIndex ключ НЕ меняется, поэтому React не пересоздаёт компонент Graph, 
                    а наш Graph.tsx обновляет только выражения, сохраняя ваш ручной pan/zoom.
                */}
                <Graph 
                    key={`desmos-graph-${points.length}-${points[0]?.x}-${points[0]?.y}`} 
                    expressions={expressions} 
                    mathBounds={mathBounds} 
                />
            </section>
        </main>
    );
};

export default Lab4;