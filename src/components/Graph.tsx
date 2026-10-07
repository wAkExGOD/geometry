import { GraphingCalculator } from "desmos-react";
import { useEffect, useRef, useState } from "react";
import type { GraphProps } from "../types/types";

const Graph = ({ expressions, mathBounds, scale }: GraphProps) => {
    // Ссылка на экземпляр калькулятора Desmos
    const [calculator, setCalculator] = useState<Desmos.Calculator | null>(null);
    
    // Храним ID всех выражений, чтобы корректно удалять устаревшие
    const expressionIdsRef = useRef<string[]>([]);
    
    // Флаг, чтобы установить границы ТОЛЬКО ОДИН РАЗ при первом создании калькулятора
    // или при явной смене mathBounds/scale (но НЕ при каждом обновлении expressions)
    const boundsAppliedRef = useRef(false);

    // =========================================================================
    // ЭФФЕКТ 1: Обновление выражений
    // Срабатывает при каждом изменении массива expressions (каждый кадр анимации).
    // ВАЖНО: НЕ трогает viewport (масштаб и положение камеры)!
    // =========================================================================
    useEffect(() => {
        if (!calculator) return;

        // Собираем ID всех текущих выражений в Set для быстрого поиска
        const nextIds = new Set(
            expressions
                .map(({ id }) => id)
                .filter((id): id is string => Boolean(id)),
        );

        // Удаляем выражения, которых больше нет в новом массиве
        // (например, когда точка исчезает из стека)
        expressionIdsRef.current
            .filter((id) => !nextIds.has(id))
            .forEach((id) => calculator.removeExpression({ id }));

        // Добавляем/обновляем выражения. 
        // Этот метод НЕ меняет viewport, только математику на графике.
        calculator.setExpressions(expressions);
        
        // Сохраняем актуальный список ID для следующей итерации
        expressionIdsRef.current = [...nextIds];
        
        // 🔑 КЛЮЧЕВОЕ: Зависимости ТОЛЬКО от calculator и expressions.
        // mathBounds и scale НАМЕРЕННО отсутствуют здесь!
    }, [calculator, expressions]);

    // =========================================================================
    // ЭФФЕКТ 2: Установка границ видимой области (viewport)
    // Срабатывает ТОЛЬКО при изменении mathBounds или scale.
    // Благодаря тому, что в Lab4.tsx мы используем useMemo для mathBounds,
    // этот эффект сработает ТОЛЬКО при генерации новых точек, а не при каждом кадре.
    // =========================================================================
    useEffect(() => {
        if (!calculator) return;

        // Устанавливаем границы, если они заданы
        if (mathBounds) {
            calculator.setMathBounds(mathBounds);
        } else if (scale && scale > 0) {
            // Альтернативный способ задания границ через единый scale
            calculator.setMathBounds({
                left: -scale,
                right: scale,
                bottom: -scale,
                top: scale,
            });
        }
        
        // Помечаем, что границы применены (для возможной будущей логики)
        boundsAppliedRef.current = true;
        
        // 🔑 КЛЮЧЕВОЕ: Зависимости ТОЛЬКО от calculator, mathBounds и scale.
        // expressions НАМЕРЕННО отсутствуют здесь!
        // Это гарантирует, что при смене кадра анимации границы НЕ будут пересчитываться.
    }, [calculator, mathBounds, scale]);

    // Рендерим компонент GraphingCalculator из библиотеки desmos-react
    return (
        <GraphingCalculator
            ref={setCalculator}
            keypad={false}           // Скрываем клавиатуру
            settingsMenu={false}     // Скрываем меню настроек
            zoomButtons={true}       // Оставляем кнопки зума для удобства
            expressions={false}      // Скрываем боковую панель выражений
            attributes={{ className: "calculator" }}
        />
    );
};

export default Graph;