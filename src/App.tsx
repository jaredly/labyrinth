import React, { useEffect, useReducer, useRef, useState } from 'react';
import { Size } from './Size';
import { calcPath, cart, polarPath, showColor } from './calcPath';
import { SectionMap, sectionMap } from './sections';
import { useDropStateTarget } from './useDropTarget';
import { SectionsInput } from './SectionsInput';
import { CartesianEdits } from './CartesianEdits';
import { ExportButton } from './ExportButton';

export type Coord = { x: number; y: number };

export type State = {
    size: { width: number; height: number };
    points: Coord[];
    selection: number[];
    sections: number[];
    inner?: number;
    circle?: number;
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
    | { type: 'flip'; x: boolean }
    | { type: 'size'; size: { width: number; height: number } }
    | { type: 'click'; pos: Coord }
    | { type: 'circle'; circle: number }
    | { type: 'clear' }
    | { type: 'delete' }
    | { type: 'move'; from: Coord; to: Coord }
    | { type: 'reset'; state: State }
    | { type: 'inner'; inner: number }
    | { type: 'select'; selection: number[] }
    | { type: 'undo' };

const flip = (points: Coord[], size: State['size'], x: boolean) => {
    if (x) {
        return points.map(({ x, y }) => ({ x: size.width - 1 - x, y }));
    } else {
        return points.map(({ x, y }) => ({ y: size.height - 1 - y, x }));
    }
};

const reduce = (state: State, action: Action): State => {
    switch (action.type) {
        case 'undo': {
            const at = state.selection.length
                ? Math.max(...state.selection)
                : state.selection.length;
            const points = state.points.slice();
            points.splice(at, 1);
            return { ...state, points, selection: [at - 1] };
        }
        case 'select':
            return { ...state, selection: action.selection };
        case 'clear':
            return { ...state, points: [] };
        case 'inner':
            return { ...state, inner: action.inner };
        case 'size':
            return { ...state, size: action.size };
        case 'reset':
            return action.state;
        case 'click': {
            const at = state.selection.length
                ? Math.max(...state.selection)
                : state.selection.length;
            const points = state.points.slice();
            points.splice(at + 1, 0, action.pos);
            return { ...state, points, selection: [at + 1] };
        }
        case 'sections':
            return { ...state, sections: action.sections };
        case 'delete':
            return {
                ...state,
                selection: [Math.max(0, Math.min(...state.selection) - 1)],
                points: state.points.filter(
                    (_, i) => !state.selection.includes(i),
                ),
            };
        case 'move': {
            const diff: Coord = {
                x: action.to.x - action.from.x,
                y: action.to.y - action.from.y,
            };
            console.log('diff', diff, action.from, action.to);
            // return state;
            return {
                ...state,
                points: state.points.map(({ x, y }, i) =>
                    state.selection.includes(i)
                        ? { x: x + diff.x, y: y + diff.y }
                        : { x, y },
                ),
            };
        }
        case 'flip':
            return {
                ...state,
                points: flip(state.points, state.size, action.x),
            };
        case 'circle':
            return { ...state, circle: action.circle };
    }
    const _: never = action;
    return state;
};

export const W = 800 / 2;
export const H = 800 / 2;

export const Grid = ({
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

export type Mouse = { pos: Coord; drag?: Coord | null };

const snap = (m: number, dm: number) => Math.round(m / dm);
export const snapPos = ({ x, y }: Coord, dx: number, dy: number): Coord => ({
    x: snap(x, dx),
    y: snap(y, dy),
});

export const mx = 60; //dx / 2;
export const my = 60; //dy / 2;
const cx = (W - mx * 2) / 2;
const cy = (H - my * 2) / 2;

export const App = () => {
    const [state, dispatch] = reduceLocalStorage(
        'labyrinth',
        () => initialState,
        reduce,
    );

    const [color, setColor] = useState(false);

    let [mouse, setMouse] = useState(null as Mouse | null);
    const [amt, setAmt] = useLocalStorage('lb-amt', () => 0.1);

    state.inner = state.inner ?? 3;
    const dx = (W - mx * 2) / (state.size.width - 1);
    const dy = (H - my * 2) / (state.size.height - 1);

    const [mode, setMode] = useState('add' as 'add' | 'move');

    if ((mouse?.pos.x ?? 0) < 0) {
        mouse = null;
    }

    const R = Math.min(W - mx, H - my) / 2;
    const dr = R / (state.size.width + state.inner);

    const sm = sectionMap(state.sections, state.size, dr, state.inner);
    const gr2 = [];
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

    const [moving, setMoving] = useState(
        null as null | { i: number; from: Coord; to: Coord },
    );

    const movedPoints = moving
        ? state.points.map((p, i) =>
              state.selection.includes(i)
                  ? {
                        x: moving!.to.x - moving!.from.x + p.x,
                        y: moving!.to.y - moving!.from.y + p.y,
                    }
                  : p,
          )
        : state.points.slice();

    const ms = mouse ? snapPos(mouse.pos, dx, dy) : null;
    const mp = ms ? sm[`${state.size.width - 1 - ms.x},${ms.y}`] : null;
    const showPoints =
        amt >= 0.9
            ? movedPoints
            : movedPoints.slice(0, movedPoints.length * amt);

    if (mode === 'add' && mouse) {
        const at = state.selection.length
            ? Math.max(...state.selection)
            : state.selection.length;
        showPoints.splice(at + 1, 0, snapPos(mouse.pos, dx, dy));
    }

    const ref = useRef<SVGSVGElement>(null);
    const cref = useRef<SVGSVGElement>(null);

    const [dragging, callbacks] = useDropStateTarget((state) => {
        if (state) {
            dispatch({ type: 'reset', state });
        }
    });

    const st = React.useRef(state);
    st.current = state;

    useEffect(() => {
        const fn = (evt: KeyboardEvent) => {
            const state = st.current;
            if (evt.key === 'Delete' || evt.key === 'Backspace') {
                dispatch({ type: 'delete' });
            }
            if (evt.key === 'Escape') {
                setMode('move');
            }
            if (evt.key === 'z' && (evt.ctrlKey || evt.metaKey)) {
                dispatch({ type: 'undo' });
            }
            if (evt.key === 'a') {
                if (evt.metaKey) {
                    evt.preventDefault();
                    const all = st.current.points.map((p, i) => i);
                    dispatch({ type: 'select', selection: all });
                } else {
                    setMode('add');
                }
            }
        };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, []);

    return (
        <div {...callbacks}>
            <button disabled={mode === 'move'} onClick={() => setMode('move')}>
                Move
            </button>
            <button disabled={mode === 'add'} onClick={() => setMode('add')}>
                Add
            </button>
            <button onClick={() => dispatch({ type: 'clear' })}>Clear</button>
            <button onClick={() => dispatch({ type: 'undo' })}>Undo</button>
            <button onClick={() => dispatch({ type: 'flip', x: true })}>
                Flip X
            </button>
            <button onClick={() => dispatch({ type: 'flip', x: false })}>
                Flip Y
            </button>
            <button onClick={() => setColor(!color)}>
                {color ? 'Hide Color' : 'Show Color'}
            </button>
            <Size
                size={state.size}
                onChange={(size) => dispatch({ type: 'size', size })}
            />
            <div>
                <button
                    onClick={() =>
                        dispatch({
                            type: 'circle',
                            circle: (state.circle ?? 0) - 0.5,
                        })
                    }
                >
                    -
                </button>
                circle {state.circle ?? 0}
                <button
                    onClick={() =>
                        dispatch({
                            type: 'circle',
                            circle: (state.circle ?? 0) + 0.5,
                        })
                    }
                >
                    +
                </button>
            </div>
            <SectionsInput state={state} dispatch={dispatch} />
            <div style={{ padding: 8 }}>
                <CartesianEdits
                    dx={dx}
                    dy={dy}
                    mode={mode}
                    moving={moving}
                    setMouse={setMouse}
                    setMoving={setMoving}
                    movedPoints={movedPoints}
                    dispatch={dispatch}
                    state={state}
                    mouse={mouse}
                    cref={cref}
                    color={color}
                />
                <svg
                    height={H}
                    width={W}
                    style={{ border: '1px solid magenta', marginLeft: 8 }}
                    ref={ref}
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* {gr2} */}
                    <g transform={`translate(${mx}, ${my})`}>
                        {color
                            ? showColor(showPoints, state.size, sm, mx, my)
                            : null}
                        <path
                            d={calcPath(showPoints, state.size, sm, mx, my)}
                            strokeWidth={color ? 2 : 5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            stroke="blue"
                            // opacity={color ? 0.2 : 1}
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
                        {state.circle ? (
                            <circle
                                cx={cx}
                                cy={cy}
                                r={dr * (state.circle + state.inner - 1)}
                                fill="blue"
                                stroke="blue"
                                strokeWidth={5}
                            />
                        ) : null}
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
            <ExportButton csvg={cref} svg={ref} state={state} />
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

export function mousePos(
    evt: React.MouseEvent<any, MouseEvent>,
    mx: number,
    my: number,
) {
    const box = evt.currentTarget.getBoundingClientRect();
    const x = evt.clientX - box.left - mx;
    const y = evt.clientY - box.top - my;
    return { x, y };
}
