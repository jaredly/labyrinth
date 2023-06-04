import React, { useReducer, useState } from 'react';
import { Size } from './Size';
import { calcPath } from './calcPath';

export type Coord = { x: number; y: number };

export type State = {
    size: { width: number; height: number };
    points: Coord[];
    selection: number[];
};

export const reduceLocalStorage = <T, A>(
    key: string,
    initial: () => T,
    reduce: (state: T, action: A) => T,
) => {
    const [state, dispatch] = React.useReducer(reduce, null, () =>
        localStorage[key] ? JSON.parse(localStorage[key]) : initial(),
    );
    React.useEffect(() => {
        if (state != null) {
            localStorage[key] = JSON.stringify(state);
        }
    }, [state]);
    return [state, dispatch] as const;
};

export const useLocalStorage = <T,>(key: string, initial: () => T) => {
    const [state, setState] = React.useState<T>(
        localStorage[key] ? JSON.parse(localStorage[key]) : initial(),
    );
    React.useEffect(() => {
        if (state != null) {
            localStorage[key] = JSON.stringify(state);
        }
    }, [state]);
    return [state, setState] as const;
};

const initialState: State = {
    size: { width: 10, height: 10 },
    points: [],
    selection: [],
};

export type Action =
    | { type: 'size'; size: { width: number; height: number } }
    | { type: 'click'; pos: Coord }
    | { type: 'clear' }
    | { type: 'undo' };

const reduce = (state: State, action: Action): State => {
    switch (action.type) {
        case 'undo':
            return { ...state, points: state.points.slice(0, -1) };
        case 'clear':
            return { ...state, points: [] };
        case 'size':
            return { ...state, size: action.size };
        case 'click':
            return { ...state, points: state.points.concat([action.pos]) };
    }
    return state;
};

export const W = 800 / 2;
export const H = 800 / 2;

const Grid = ({
    size,
    dx,
    dy,
}: {
    dx: number;
    dy: number;
    size: State['size'];
}) => {
    const points = [];
    for (let x = 0; x < size.width; x++) {
        for (let y = 0; y < size.height; y++) {
            points.push(
                <circle
                    key={`${x}:${y}`}
                    cx={dx * x}
                    cy={dy * y}
                    r={4}
                    fill="red"
                />,
            );
        }
    }
    return <g>{points}</g>;
};

type Mouse = { pos: Coord; drag?: Coord | null };

const snap = (m: number, dm: number) => Math.round(m / dm);
const snapPos = ({ x, y }: Coord, dx: number, dy: number): Coord => ({
    x: snap(x, dx),
    y: snap(y, dy),
});

export const App = () => {
    const [state, dispatch] = reduceLocalStorage(
        'labyrinth',
        () => initialState,
        reduce,
    );
    const [mouse, setMouse] = useState(null as Mouse | null);
    const mx = 30; //dx / 2;
    const my = 30; //dy / 2;
    const dx = (W - mx * 2) / state.size.width;
    const dy = (H - my * 2) / state.size.height;
    const [amt, setAmt] = useLocalStorage('lb-amt', () => 0.1);
    return (
        <div>
            <button onClick={() => dispatch({ type: 'clear' })}>Clear</button>
            <button onClick={() => dispatch({ type: 'undo' })}>Undo</button>
            <Size
                size={state.size}
                onChange={(size) => dispatch({ type: 'size', size })}
            />
            <div>
                <svg
                    onMouseLeave={() => setMouse(null)}
                    width={W}
                    height={H}
                    // viewBox={`-20 -20 1620 820`}
                    onMouseMove={(evt) => {
                        setMouse({ pos: mousePos(evt, mx, my) });
                    }}
                    onClick={(evt) => {
                        dispatch({
                            type: 'click',
                            pos: snapPos(mousePos(evt, mx, my), dx, dy),
                        });
                    }}
                >
                    <g transform={`translate(${mx}, ${my})`}>
                        <Grid size={state.size} dx={dx} dy={dy} />
                        {mouse ? (
                            <circle
                                cx={mouse.pos.x}
                                cy={mouse.pos.y}
                                r={10}
                                fill="#aaa"
                            />
                        ) : null}
                        <polyline
                            stroke="blue"
                            strokeWidth={10}
                            points={state.points
                                .concat(
                                    mouse ? [snapPos(mouse.pos, dx, dy)] : [],
                                )
                                .map((p) => `${p.x * dx},${p.y * dy}`)
                                .join(' ')}
                            fill="none"
                        />
                    </g>
                </svg>
                <svg height={H} width={W}>
                    <g transform={`translate(${mx}, ${my})`}>
                        <path
                            d={calcPath(
                                state.points.slice(
                                    0,
                                    state.points.length * amt,
                                ),
                                state.size,
                            )}
                            strokeWidth={5}
                            stroke="blue"
                            fill="none"
                        />
                    </g>
                </svg>
            </div>

            <input
                type="range"
                min="0"
                max="1"
                step={1 / state.points.length}
                value={amt}
                onChange={(evt) => setAmt(+evt.target.value)}
            />
            <div>
                {JSON.stringify(
                    state.points.slice(0, state.points.length * amt),
                )}
            </div>
            <button
                onClick={() => {
                    const blob = new Blob([JSON.stringify(state)], {
                        type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `labyrinth-${Date.now()}.json`;
                    a.click();
                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                    }, 100);
                }}
            >
                Export
            </button>
        </div>
    );
};

function mousePos(
    evt: React.MouseEvent<SVGSVGElement, MouseEvent>,
    mx: number,
    my: number,
) {
    const box = evt.currentTarget.getBoundingClientRect();
    const x = evt.clientX - box.left - mx;
    const y = evt.clientY - box.top - my;
    return { x, y };
}
