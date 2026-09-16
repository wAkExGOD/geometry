import { GraphingCalculator } from "desmos-react";
import { useEffect, useRef } from "react";
import type { GraphProps } from "../types/types";

const Graph = ({ expressions, mathBounds }: GraphProps) => {
    const calculatorRef = useRef<Desmos.Calculator | null>(null);
    const expressionIdsRef = useRef<string[]>([]);

    useEffect(() => {
        const calculator = calculatorRef.current;
        if (!calculator) {
            return;
        }

        expressionIdsRef.current.forEach((id) => {
            calculator.removeExpression({ id });
        });
        calculator.setExpressions(expressions);
        expressionIdsRef.current = expressions
            .map(({ id }) => id)
            .filter((id): id is string => Boolean(id));

        if (mathBounds) {
            calculator.setMathBounds(mathBounds);
        }
    }, [expressions, mathBounds]);

    return (
        <GraphingCalculator
            ref={calculatorRef}
            keypad={false}
            settingsMenu={false}
            zoomButtons={true}
            expressions={false}
            attributes={{ className: "calculator" }}
        />
    );
};

export default Graph;
