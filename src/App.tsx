import React, { useReducer, useState } from 'react';

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

const W = 800 / 2;
const H = 800 / 2;

const Grid = ({ size }: { size: State['size'] }) => {
    const points = [];
    const dx = W / size.width;
    const dy = H / size.height;
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

const Size = ({
    size,
    onChange,
}: {
    size: State['size'];
    onChange: (s: State['size']) => void;
}) => {
    const [width, setWidth] = useState(null as null | number);
    const [height, setHeight] = useState(null as null | number);
    return (
        <div>
            <input
                value={width ?? size.width}
                onChange={(evt) => setWidth(+evt.target.value)}
            />
            <input
                value={height ?? size.height}
                onChange={(evt) => setHeight(+evt.target.value)}
            />
            <button
                onClick={() =>
                    onChange({
                        width: width ?? size.width,
                        height: height ?? size.height,
                    })
                }
            >
                Ok
            </button>
        </div>
    );
};

export const App = () => {
    const [state, dispatch] = reduceLocalStorage(
        'labyrinth',
        () => initialState,
        reduce,
    );
    const [mouse, setMouse] = useState(null as Mouse | null);
    const dx = W / state.size.width;
    const dy = H / state.size.height;
    const mx = dx / 2;
    const my = dy / 2;
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
                        <Grid size={state.size} />
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
                            d={calcPath(state)}
                            strokeWidth={5}
                            stroke="blue"
                            fill="none"
                        />
                    </g>
                </svg>
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

export const calcPath = (state: State): string => {
    const mw = state.points.reduce((n, p) => Math.max(n, p.x), 0) + 1;
    const mh = state.points.reduce((n, p) => Math.max(n, p.y), 0) + 1;

    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(cx, cy) * 0.8;

    return state.points
        .map((p, i) => {
            const yt = p.x / mw + 0.1;
            const xt = p.y / mh;
            const r = yt * R;
            const t = xt * Math.PI * 2;
            return {
                x: cx + Math.cos(t) * r,
                y: cy + Math.sin(t) * r,
            };
        })
        .map((p, i) => {
            if (i == 0) {
                return `M${p.x} ${p.y}`;
            }
            return `L${p.x} ${p.y}`;
        })
        .join(' ');
};
