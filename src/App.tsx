import React, { useReducer, useRef, useState } from 'react';
import { Size } from './Size';
import { calcPath, cart, polarPath } from './calcPath';
import equal from 'fast-deep-equal';
import { SectionMap, sectionMap } from './sections';

export type Coord = { x: number; y: number };

export type State = {
    size: { width: number; height: number };
    points: Coord[];
    selection: number[];
    sections: number[];
    inner?: number;
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
    sections: [],
};

export type Action =
    | { type: 'sections'; sections: number[] }
    | { type: 'size'; size: { width: number; height: number } }
    | { type: 'click'; pos: Coord }
    | { type: 'clear' }
    | { type: 'inner'; inner: number }
    | { type: 'undo' };

const reduce = (state: State, action: Action): State => {
    switch (action.type) {
        case 'undo':
            return { ...state, points: state.points.slice(0, -1) };
        case 'clear':
            return { ...state, points: [] };
        case 'inner':
            return { ...state, inner: action.inner };
        case 'size':
            return { ...state, size: action.size };
        case 'click':
            return { ...state, points: state.points.concat([action.pos]) };
        case 'sections':
            return { ...state, sections: action.sections };
    }
    const _: never = action;
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

    let [mouse, setMouse] = useState(null as Mouse | null);
    const mx = 60; //dx / 2;
    const my = 60; //dy / 2;
    const dx = (W - mx * 2) / (state.size.width - 1);
    const dy = (H - my * 2) / (state.size.height - 1);
    const [amt, setAmt] = useLocalStorage('lb-amt', () => 0.1);

    state.inner = state.inner ?? 3;

    const sectionDots = [];
    for (let i = -0.5; i < state.size.height + 0.5; i += 0.5) {
        const idx = state.sections.indexOf(i);
        sectionDots.push(
            <circle
                key={i}
                cx={-mx / 2}
                cy={dy * (state.size.height - 1 - i)}
                r={10}
                fill={idx !== -1 ? (idx % 2 === 0 ? 'red' : 'blue') : 'gray'}
                onClick={(evt) => {
                    evt.stopPropagation();
                    evt.preventDefault();
                    let s = state.sections.slice();
                    if (s.includes(i)) {
                        s = s.filter((n) => n !== i);
                    } else {
                        s.push(i);
                        s.sort();
                    }
                    dispatch({ type: 'sections', sections: s });
                }}
                style={{ cursor: 'pointer' }}
            />,
        );
    }
    if ((mouse?.pos.x ?? 0) < 0) {
        mouse = null;
    }

    const R = Math.min(W - mx, H - my) / 2;

    const gr2 = [];
    const sm = sectionMap(
        state.sections,
        state.size,
        R / (state.size.width + state.inner),
        state.inner,
    );
    for (let y = 0; y < state.size.height; y++) {
        for (let x = 0; x < state.size.width; x++) {
            const { t, r } = sm[`${x},${y}`];
            gr2.push(
                <circle
                    key={`${x},${y}`}
                    cx={Math.cos(t) * r + W / 2}
                    cy={Math.sin(t) * r + H / 2}
                    r={5}
                    fill="red"
                />,
            );
        }
    }

    // const mx = 30; //dx / 2;
    // const my = 30; //dy / 2;

    const cx = (W - mx * 2) / 2;
    const cy = (H - my * 2) / 2;

    const ms = mouse ? snapPos(mouse.pos, dx, dy) : null;
    const mp = ms ? sm[`${ms.x},${ms.y}`] : null;
    const showPoints = state.points.slice(0, state.points.length * amt);
    // console.log(mp, mouse);

    const ref = useRef<SVGSVGElement>(null);

    return (
        <div>
            <button onClick={() => dispatch({ type: 'clear' })}>Clear</button>
            <button onClick={() => dispatch({ type: 'undo' })}>Undo</button>
            <Size
                size={state.size}
                onChange={(size) => dispatch({ type: 'size', size })}
            />
            <SectionsInput state={state} dispatch={dispatch} />
            <div style={{ padding: 8 }}>
                <svg
                    style={{ border: '1px solid magenta' }}
                    onMouseLeave={() => setMouse(null)}
                    width={W}
                    height={H}
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
                        {sectionDots}
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
                        {state.sections.map((s, i) => (
                            <line
                                key={i}
                                x1={0}
                                x2={(state.size.width - 1) * dx}
                                y1={(state.size.height - 1 - s) * dy}
                                y2={(state.size.height - 1 - s) * dy}
                                stroke={i % 2 === 0 ? 'red' : 'blue'}
                                strokeDasharray={i % 2 === 0 ? '' : '4 4'}
                                strokeWidth={2}
                            />
                        ))}
                    </g>
                </svg>
                <svg
                    height={H}
                    width={W}
                    style={{ border: '1px solid magenta', marginLeft: 8 }}
                    ref={ref}
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* {gr2} */}
                    <g transform={`translate(${mx}, ${my})`}>
                        <path
                            d={calcPath(showPoints, state.size, sm, mx, my)}
                            strokeWidth={5}
                            stroke="blue"
                            fill="none"
                        />
                        {mp ? (
                            <circle
                                cx={Math.cos(mp.t) * mp.r + cx}
                                cy={Math.sin(mp.t) * mp.r + cy}
                                r={5}
                                fill="orange"
                            />
                        ) : null}
                        {/* {debugPoints(showPoints, sm, cx, cy)} */}
                    </g>
                </svg>
            </div>

            <div>
                <input
                    type="range"
                    min="1"
                    max="10"
                    step={0.5}
                    value={state.inner}
                    onChange={(evt) =>
                        dispatch({ type: 'inner', inner: +evt.target.value })
                    }
                />
            </div>

            <input
                type="range"
                min="0"
                max="1"
                step={1 / state.points.length}
                value={amt}
                onChange={(evt) => setAmt(+evt.target.value)}
            />
            <div>{JSON.stringify(showPoints)}</div>
            <button
                onClick={() => {
                    const svg = ref.current!.outerHTML;
                    const blob = new Blob(
                        [svg + `\n<!-- STATE: ${JSON.stringify(state)} -->`],
                        {
                            type: 'image/svg+xml',
                        },
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `labyrinth-${Date.now()}.svg`;
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

function debugPoints(
    showPoints: Coord[],
    sm: SectionMap,
    cx: number,
    cy: number,
): React.ReactNode {
    return showPoints.map((pos, i) => {
        if (i === 0) {
            return;
        }
        const prev = sm[`${showPoints[i - 1].x},${showPoints[i - 1].y}`];
        const { t, r } = sm[`${pos.x},${pos.y}`];
        // if (prev.r !== r) {
        //     return;
        // }
        const x = Math.cos(t) * r + cx;
        const y = Math.sin(t) * r + cy;
        const text = `${t.toFixed(2)}`;
        return (
            <React.Fragment key={i}>
                <text x={x} y={y} strokeWidth={3} fill="white" stroke="white">
                    {text}
                </text>
                <text x={x} y={y}>
                    {text}
                </text>
            </React.Fragment>
        );
    });
}

function SectionsInput({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
}) {
    const [v, setV] = useState(state.sections!.map((m) => m + '').join(' '));
    let parsed = null as null | number[];
    const values = v.split(' ').map((m) => parseFloat(m));
    if (values.length && values.every((m) => !isNaN(m))) {
        parsed = values;
    }
    return (
        <div>
            <input value={v} onChange={(evt) => setV(evt.target.value)} />
            <button
                disabled={!parsed || equal(parsed, state.sections)}
                onClick={() =>
                    dispatch({ type: 'sections', sections: parsed! })
                }
            >
                Set
            </button>
        </div>
    );
}

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
