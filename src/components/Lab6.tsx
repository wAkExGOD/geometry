import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Graph from "./Graph";
import { advancePoints, createPoints, hullPerimeter, quickHull } from "../utils/lab6";

// Один шаг моделирования соответствует 1/60 секунды движения.
// Этот интервал фиксирован, независимо от частоты кадров браузера.
const STEP_SECONDS = 1 / 60;

const Lab6 = () => {
    // Параметры набора: число точек, модуль их скорости и порог периметра S.
    const [pointCount, setPointCount] = useState(12);
    const [speed, setSpeed] = useState(2);
    const [threshold, setThreshold] = useState(40);
    // Ленивая инициализация: случайный набор создаётся при создании
    // компонента, а не при каждом последующем рендере.
    const [points, setPoints] = useState(() => createPoints(12, 2));
    // Флаг запуска, число шагов и число событий разворота всех вершин.
    // reversals считает события, а не количество отдельных развёрнутых точек.
    const [isAnimating, setIsAnimating] = useState(false);
    const [step, setStep] = useState(0);
    const [reversals, setReversals] = useState(0);
    // State нужен для обновления интерфейса, а ref — для немедленного
    // доступа к последним координатам внутри цикла анимации.
    // Несколько шагов могут пройти до следующего рендера React;
    // ref не даёт им повторно использовать одно и то же старое состояние.
    const pointsRef = useRef(points);
    // Эти значения описывают текущий отображаемый набор.
    // useMemo пересчитывает их только при изменении зависимостей.
    // В advancePoints оболочка вычисляется отдельно для каждого шага модели.
    const hull = useMemo(() => quickHull(points), [points]);
    const perimeter = useMemo(() => hullPerimeter(hull), [hull]);

    // Общая операция для автоматической анимации и кнопки «Один шаг».
    // useCallback сохраняет функцию между рендерами, пока S не изменится,
    // чтобы эффект анимации не перезапускался на каждом новом кадре.
    const advance = useCallback(() => {
        const next = advancePoints(pointsRef.current, threshold, STEP_SECONDS);
        // Сначала немедленно сохраняем результат для следующего шага,
        // затем передаём его в React для отображения.
        pointsRef.current = next.points;
        setPoints(next.points);
        // Функциональная форма обновления учитывает все шаги, даже если
        // React объединит несколько обновлений состояния в один рендер.
        setStep((value) => value + 1);
        if (next.reversed) setReversals((value) => value + 1);
    }, [threshold]);

    useEffect(() => {
        // На паузе новый цикл requestAnimationFrame не создаём.
        if (!isAnimating) return;
        // frame — идентификатор запланированного кадра для его отмены.
        // previousTime хранит время предыдущего кадра в миллисекундах.
        // accumulated хранит ещё не обработанное время в секундах.
        let frame: number;
        let previousTime: number | null = null;
        let accumulated = 0;
        const animate = (time: number) => {
            // Первый кадр только запоминает время: предыдущего кадра ещё нет.
            if (previousTime !== null) {
                // Переводим прошедшее время из миллисекунд в секунды.
                // Ограничение 0.1 не даёт выполнять тысячи шагов после
                // долгой паузы браузера или возврата на скрытую вкладку.
                accumulated += Math.min((time - previousTime) / 1000, 0.1);
                // Если кадры приходят редко, выполняем несколько шагов;
                // если часто — ждём накопления полного интервала.
                // Остаток времени сохраняем для следующего кадра.
                while (accumulated >= STEP_SECONDS) {
                    advance();
                    accumulated -= STEP_SECONDS;
                }
            }
            previousTime = time;
            // requestAnimationFrame выполняет callback один раз,
            // поэтому следующий кадр нужно запрашивать явно.
            frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        // При остановке, удалении компонента или смене advance отменяем
        // ожидающий кадр, чтобы не оставлять параллельные циклы анимации.
        return () => cancelAnimationFrame(frame);
    }, [isAnimating, advance]);

    // Останавливаем движение и создаём новый набор с текущей скоростью.
    // Явный count позволяет сразу передать новое число из ползунка,
    // не дожидаясь, пока setPointCount обновит состояние React.
    const reset = (count = pointCount) => {
        setIsAnimating(false);
        const next = createPoints(count, speed);
        // Ref и state всегда должны описывать один и тот же набор.
        pointsRef.current = next;
        setPoints(next);
        // Для нового набора начинаем статистику заново.
        setStep(0);
        setReversals(0);
    };

    // Ползунок скорости меняет модуль скорости уже существующих точек,
    // сохраняя их координаты и направления движения.
    const changeSpeed = (value: number) => {
        setSpeed(value);
        const next = pointsRef.current.map((point) => {
            // Делим вектор на его длину, получая единичный вектор,
            // затем умножаем его на новый модуль скорости value.
            // Деление безопасно: ползунок и генератор задают скорость > 0,
            // а разворот не меняет её модуль.
            const magnitude = Math.hypot(point.vx, point.vy);
            return { ...point, vx: point.vx * value / magnitude, vy: point.vy * value / magnitude };
        });
        pointsRef.current = next;
        setPoints(next);
    };

    const expressions = useMemo<Desmos.ExpressionState[]>(() => {
        const vertices = new Set(hull);
        const edges = hull.length > 1 ? hull.slice(0, hull.length === 2 ? 1 : hull.length).map((point, index) => {
            const next = hull[(index + 1) % hull.length];
            return {
                id: `hull-edge-${index}`,
                // Параметрический отрезок корректен и для вертикальных рёбер.
                latex: `(${point.x}+(${next.x - point.x})t,${point.y}+(${next.y - point.y})t)`,
                parametricDomain: { min: "0", max: "1" },
                color: perimeter > threshold ? Desmos.Colors.RED : Desmos.Colors.BLUE,
                lineWidth: 3,
            };
        }) : [];
        return [
            ...edges,
            ...points.map((point, index) => ({
                id: `point-${index}`,
                latex: `(${point.x},${point.y})`,
                color: vertices.has(point) ? Desmos.Colors.BLUE : Desmos.Colors.GREEN,
                pointSize: 9,
            })),
        ];
    }, [points, hull, perimeter, threshold]);

    return (
        <main className="lab-page lab6-page">
            <section className="control-panel">
                <p className="eyebrow">Лабораторная работа 6</p>
                <h1>Периметр выпуклой оболочки</h1>
                <p className="description">
                    Точки движутся прямолинейно с постоянными скоростями.
                    На каждом шаге алгоритм Quick Hull строит выпуклую оболочку.
                    Если её периметр больше S, скорости всех её вершин меняются
                    на противоположные: (vx, vy) → (−vx, −vy).
                </p>

                <div className="result-box">
                    <span>Текущий периметр</span>
                    <strong>{perimeter.toFixed(2)}</strong>
                    <small>Порог S = {threshold}: {perimeter > threshold ? "превышен" : "не превышен"}</small>
                </div>

                <div className="control-group">
                    <label htmlFor="lab6-point-count">Количество точек: {pointCount}</label>
                    <input id="lab6-point-count" type="range" min="3" max="60" value={pointCount}
                        disabled={isAnimating} onChange={(event) => {
                            const value = Number(event.target.value);
                            setPointCount(value);
                            reset(value);
                        }} />
                </div>
                <div className="control-group">
                    <label htmlFor="lab6-speed">Скорость: {speed.toFixed(1)} ед./с</label>
                    <input id="lab6-speed" type="range" min="0.5" max="5" step="0.1" value={speed}
                        disabled={isAnimating} onChange={(event) => changeSpeed(Number(event.target.value))} />
                </div>
                <div className="control-group">
                    <label htmlFor="lab6-threshold">S: {threshold.toFixed(1)}</label>
                    <input id="lab6-threshold" type="range" min="5" max="100" step="0.5" value={threshold}
                        disabled={isAnimating} onChange={(event) => setThreshold(Number(event.target.value))} />
                </div>

                <div className="button-group">
                    <button type="button" className="new-case-button" disabled={isAnimating}
                        onClick={() => setIsAnimating(true)}>Запустить</button>
                    <button type="button" className="new-case-button" disabled={!isAnimating}
                        onClick={() => setIsAnimating(false)}>Остановить</button>
                    <button type="button" className="new-case-button" disabled={isAnimating}
                        onClick={advance}>Один шаг</button>
                    <button type="button" className="new-case-button" onClick={() => reset()}>Новый набор</button>
                </div>

                <div className="coordinates">
                    <div><span>Шаг анимации</span><b>{step}</b></div>
                    <div><span>Вершин оболочки</span><b>{hull.length}</b></div>
                    <div><span>Разворотов</span><b>{reversals}</b></div>
                </div>
                <p className="description">Синие точки — вершины оболочки, зелёные — внутренние точки.</p>
            </section>
            <section className="graph-panel" aria-label="Анимация выпуклой оболочки Quick Hull">
                <Graph expressions={expressions} scale={18} />
            </section>
        </main>
    );
};

export default Lab6;
