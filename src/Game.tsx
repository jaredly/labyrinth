import * as React from 'react';
import { useReducer, useState } from 'react';
import { angleBetween, isClockwise } from './calcPath';
import { State as AppState, Screen, calcBounds } from './App2';
import { organizeLine } from './organizeLine';
import { calculateSingles } from './Edit';
import { calcLocation } from './sections';
import { produceBorders_ } from './Animate';

export type Coord = { x: number; y: number };

export type Line =
    | { type: 'straight'; p1: Coord; p2: Coord; ann?: string }
    | { type: 'arc'; center: Coord; t1: number; t2: number; r: number };

export type State = {
    ts: number;
    pos: Coord;
    size: number;
    heading: number;
    speed: number;
    lines: Line[];
    mod: number;
    float: boolean;
    width: number;
    height: number;
};

const TEST_STRAIGHT = false;

const tweak = {
    slow: 0.98,
    fast: 1.07,
    // slow: 0.98,
    // fast: 1.07,
    turn: 0.03,
    min: 0.7,
    // min: 0.1,
    limit: 1,
    // limit: 0.5,
};

const makeLines = (
    state: AppState,
): { lines: Line[]; width: number; height: number } => {
    if (TEST_STRAIGHT) {
        const lines: Line[] = [];
        for (let i = 0; i < 10; i++) {
            const t1 = (Math.PI / 5) * i;
            const t2 = (Math.PI / 5) * (i + 1);
            const p1 = push({ x: 0, y: 0 }, t1, 100);
            const p2 = push({ x: 0, y: 0 }, t2, 100);
            lines.push({
                type: 'straight',
                p1,
                p2,
                ann: `${(p2.y - p1.y).toFixed(0)} : ${(p2.x - p1.x).toFixed(
                    0,
                )}`,
            });
        }
        return { lines, width: 700, height: 700 };
    }
    const bounds = calcBounds(state);

    const vm = 5;
    const VW = Math.min(window.innerWidth, window.innerHeight, 800) - vm * 2;

    const R = VW / 2;
    const dr = R / (bounds.width + (state.inner ?? 1) + 1);
    const r0 = -1;

    const sectionCols: number[] = [];
    let col = 0;
    state.sections.forEach(({ pairs, rows }, i) => {
        sectionCols.push(col);
        col += rows;
    });
    const totalCols = col;

    const lines = produceBorders_(state, col, sectionCols, bounds, dr, r0)
        .map(([p1, p2]): Line => {
            // Radial Line
            if (p1.y === p2.y) {
                return {
                    type: 'straight',
                    p1: { x: p1.rx, y: p1.ry },
                    p2: { x: p2.rx, y: p2.ry },
                    // ann: `${p2.ry} : ${p1.ry}`,
                    // ann: `${(p2.ry - p1.ry).toFixed(0)} : ${(
                    //     p2.rx - p1.rx
                    // ).toFixed(0)}`,
                };
            }

            const cw = !isClockwise(p1, p2, totalCols);

            return {
                type: 'arc',
                center: { x: 0, y: 0 },
                r: p1.r,
                t1: cw ? p1.t : p2.t,
                t2: cw ? p2.t : p1.t,
            };
        })
        .filter(Boolean);
    console.log(lines);
    return { lines, width: VW + vm * 2, height: VW + vm * 2 };
};

const initialState: (appstate: AppState) => State = (appstate): State => ({
    ts: Date.now(),
    pos: { x: 0, y: 0 },
    heading: Math.PI / 2,
    speed: tweak.limit,
    size: 10,
    float: false,
    mod: 1,
    ...makeLines(appstate),
    //  ?? [
    //     { type: 'arc', center: { x: 0, y: 0 }, t1: 0, t2: Math.PI, r: 200 },
    //     { type: 'straight', p1: { x: 20, y: -50 }, p2: { x: 20, y: -150 } },
    //     { type: 'straight', p1: { x: 50, y: -50 }, p2: { x: 100, y: -150 } },
    //     {
    //         type: 'arc',
    //         center: { x: 0, y: 0 },
    //         t1: 0,
    //         t2: (Math.PI * 3) / 2,
    //         r: 100,
    //     },
    // ],
});

export type Action =
    | { type: 'tick'; ts: number; turn?: 'left' | 'right' }
    | {
          type: 'stop/start';
      }
    | { type: 'float' };

const limit = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));

const loop = (n: number, min: number, max: number) =>
    n < min ? max : n > max ? min : n;

export const tick = (
    state: State,
    action: Extract<Action, { type: 'tick' }>,
): State => {
    if (state.speed === 0) {
        return state;
    }
    const heading =
        state.heading +
        (action.turn === 'left' ? -1 : action.turn === 'right' ? 1 : 0) *
            tweak.turn;
    const mod = limit(
        state.mod * (action.turn ? tweak.slow : tweak.fast),
        tweak.min,
        1.0,
    );
    const pos = {
        x: loop(
            Math.cos(heading) * (state.speed * mod) + state.pos.x,
            -state.width / 2,
            state.width / 2,
        ),
        y: loop(
            Math.sin(heading) * (state.speed * mod) + state.pos.y,
            -state.width / 2,
            state.width / 2,
        ),
    };
    return bounce({ ...state, heading, pos, mod });
};

const dist = (one: Coord, two: Coord) => {
    const dx = one.x - two.x;
    const dy = one.y - two.y;
    return Math.sqrt(dx * dx + dy * dy);
};

type Hit = {
    overlap: number;
    direction: number;
};

export const angleTo = (one: Coord, two: Coord) =>
    Math.atan2(two.y - one.y, two.x - one.x);

export const dpos = (to: Coord, pos: Coord, size: number): void | Hit => {
    const d = dist(to, pos);
    if (d <= size) {
        return { overlap: size - d, direction: angleTo(to, pos) };
    }
};

export const push = (orig: Coord, theta: number, dist: number) => ({
    x: orig.x + Math.cos(theta) * dist,
    y: orig.y + Math.sin(theta) * dist,
});

export const pickHit = (one: void | Hit, two: void | Hit) => {
    if (one && two) {
        return one.overlap > two.overlap ? one : two;
    }
    return one ?? two;
};

const epsilon = 0.00001;
const closeEnough = (one: number, two: number) => Math.abs(one - two) < epsilon;

export const distanceTo = (
    line: Line,
    pos: Coord,
    size: number,
): void | Hit => {
    switch (line.type) {
        case 'arc': {
            const d = dist(line.center, pos) - line.r;
            if (Math.abs(d) > size) {
                return;
            }
            const angle = angleTo(line.center, pos);
            const first = angleBetween(line.t1, angle, true);
            const second = angleBetween(line.t1, line.t2, true);
            const hit: Hit | void =
                first < second
                    ? {
                          overlap: size - Math.abs(d),
                          direction: d > 0 ? angle : angle + Math.PI,
                      }
                    : undefined;
            return pickHit(
                hit,
                pickHit(
                    dpos(push(line.center, line.t1, line.r), pos, size),
                    dpos(push(line.center, line.t2, line.r), pos, size),
                ),
            );
        }
        case 'straight': {
            let { p1, p2 } = line;
            if (p1.y < p2.y) {
                [p1, p2] = [p2, p1];
            }
            const x0 = Math.min(p1.x, p2.x);
            const x1 = Math.max(p1.x, p2.x);
            const y0 = Math.min(p1.y, p2.y);
            const y1 = Math.max(p1.y, p2.y);
            const within =
                pos.x >= x0 - size &&
                pos.x <= x1 + size &&
                pos.y >= y0 - size &&
                pos.y <= y1 + size;
            if (!within) {
                return;
            }

            const endPoint = pickHit(dpos(p1, pos, size), dpos(p2, pos, size));

            if (closeEnough(p1.x, p2.x)) {
                if (pos.y < y0 || pos.y > y1) {
                    return endPoint;
                }
                // straight up & down
                return pickHit(endPoint, {
                    overlap: size - Math.abs(p1.x - pos.x),
                    direction: pos.x < p1.x ? Math.PI : 0, //Math.PI,
                });
            }

            if (closeEnough(p1.y, p2.y)) {
                if (pos.x < x0 || pos.x > x1) {
                    return endPoint;
                }
                const d = Math.abs(p1.y - pos.y);
                if (d > size) {
                    return endPoint;
                }
                return pickHit(endPoint, {
                    overlap: size - d,
                    direction: pos.y < p1.y ? -Math.PI / 2 : Math.PI / 2,
                });
            }

            const t = angleTo(p1, p2) + Math.PI / 2;
            const m = (p2.y - p1.y) / (p2.x - p1.x);
            // p2.y = m * p2.x + b
            const b = p2.y - m * p2.x;
            const m2 = -1 / m;
            const b2 = pos.y - m2 * pos.x;

            // m * x + b = m2 * x + b2
            // m * x - m2 * x = b2 - b
            // x (m - m2) = b2 - b
            // x = (b2 - b) / (m - m2)

            const x = (b2 - b) / (m - m2);
            const y = m * x + b;

            if (x < x0 || x > x1 || y < y0 || y > y1) {
                return endPoint;
            }

            const dt = dist(pos, { x, y });

            return pickHit(
                endPoint,
                dt <= size
                    ? {
                          overlap: size - dt,
                          direction: t + (pos.x < x ? Math.PI : 0),
                      }
                    : undefined,
            );
        }
    }
};

const add = (t1: number, m1: number, t2: number, m2: number) => {
    const x1 = Math.cos(t1) * m1;
    const y1 = Math.sin(t1) * m1;
    const x2 = Math.cos(t2) * m2;
    const y2 = Math.sin(t2) * m2;
    const pos = { x: x1 + x2, y: y1 + y2 };
    return {
        heading: angleTo({ x: 0, y: 0 }, pos),
        speed: dist({ x: 0, y: 0 }, pos),
    };
};

const bounce = (state: State): State => {
    if (state.float) {
        return state;
    }
    let closest = null as null | [Hit, Line];
    for (let line of state.lines) {
        const dist = distanceTo(line, state.pos, state.size);
        if (dist != null && (!closest || closest[0].overlap < dist.overlap)) {
            closest = [dist, line];
        }
    }
    if (closest) {
        state = {
            ...state,
            ...add(
                state.heading,
                state.speed,
                closest[0].direction,
                closest[0].overlap / 30,
            ),
        };
        // Slide along! gotta
        state.pos = push(state.pos, closest[0].direction, closest[0].overlap);
        state.speed = Math.min(tweak.limit, state.speed * 1.1);
        // state.speed = tweak.limit;
        // console.log(closest);
    }
    return state;
};

const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'tick':
            return tick(state, action);
        case 'stop/start':
            return { ...state, speed: state.speed ? 0 : 0.5 };
        case 'float':
            return { ...state, float: !state.float };
    }
};

export const lineToPath = (line: State['lines'][0]) => {
    switch (line.type) {
        case 'straight':
            return `M${line.p1.x} ${line.p1.y} L${line.p2.x} ${line.p2.y}`;
        case 'arc': {
            const p1 = {
                x: Math.cos(line.t1) * line.r + line.center.x,
                y: Math.sin(line.t1) * line.r + line.center.y,
            };
            const p2 = {
                x: Math.cos(line.t2) * line.r + line.center.x,
                y: Math.sin(line.t2) * line.r + line.center.y,
            };
            const delta = angleBetween(line.t1, line.t2, true);
            const largeArcFlag = delta > Math.PI;
            return `M${p1.x} ${p1.y} A${line.r} ${line.r} 0 ${
                largeArcFlag ? '1' : '0'
            } 1 ${p2.x} ${p2.y}`;
        }
    }
};

export const Game = ({
    appstate,
    setScreen,
}: {
    appstate: AppState;
    setScreen: (screen: Screen) => void;
}) => {
    const [state, dispatch] = useReducer(reducer, appstate, initialState);

    const key = React.useRef(undefined as undefined | 'left' | 'right');

    React.useEffect(() => {
        const fn = () => {
            dispatch({ type: 'tick', ts: Date.now(), turn: key.current });
            af = requestAnimationFrame(fn);
        };
        let af = requestAnimationFrame(fn);

        const kfn = (evt: KeyboardEvent) => {
            if (evt.key === 'ArrowLeft') {
                key.current = 'left';
            }
            if (evt.key === 'ArrowRight') {
                key.current = 'right';
            }
            if (process.env.NODE_ENV === 'development') {
                if (evt.key === 'f') {
                    dispatch({ type: 'float' });
                }
            }
            if (evt.key === ' ') {
                dispatch({ type: 'stop/start' });
            }
        };
        const ufn = (evt: KeyboardEvent) => {
            if (evt.key === 'ArrowLeft') {
                if (key.current === 'left') {
                    key.current = undefined;
                }
            }
            if (evt.key === 'ArrowRight') {
                if (key.current === 'right') {
                    key.current = undefined;
                }
            }
        };

        document.addEventListener('keydown', kfn);
        document.addEventListener('keyup', ufn);

        return () => {
            cancelAnimationFrame(af);
            document.removeEventListener('keydown', kfn);
            document.removeEventListener('keyup', kfn);
        };
    }, []);

    const vm = 5;
    const VW = Math.min(window.innerWidth, window.innerHeight, 800) - vm * 2;

    return (
        <div>
            <ScreenButtons setScreen={setScreen} screen="game" />
            <svg
                width={state.width}
                height={state.height}
                // width={VW + vm * 2}
                // height={VW + vm * 2}
                viewBox={`-${state.width / 2} -${state.height / 2} ${
                    state.width
                } ${state.height}`}
            >
                {state.lines.map((line, i) => (
                    <path
                        key={i}
                        stroke="#333"
                        strokeWidth={3}
                        fill="none"
                        d={lineToPath(line)}
                    />
                ))}
                {state.lines.map((line, i) =>
                    line.type === 'straight' && line.ann ? (
                        <text
                            key={i}
                            x={(line.p1.x + line.p2.x) / 2}
                            y={(line.p1.y + line.p2.y) / 2}
                            fill="white"
                        >
                            {line.ann}
                        </text>
                    ) : null,
                )}
                <circle
                    cx={state.pos.x}
                    cy={state.pos.y}
                    r={state.size}
                    fill="green"
                />
                <circle
                    cx={
                        state.pos.x + Math.cos(state.heading) * (state.size - 4)
                    }
                    cy={
                        state.pos.y + Math.sin(state.heading) * (state.size - 4)
                    }
                    r={3}
                    fill="white"
                />
                {/* <path
                    stroke="white"
                    strokeWidth={1}
                    fill="none"
                    d={`M${state.pos.x} ${state.pos.y} l${
                        Math.cos(state.heading) * state.size
                    } ${Math.sin(state.heading) * state.size}`}
                /> */}
            </svg>
        </div>
    );
};

export function ScreenButtons({
    setScreen,
    screen,
}: {
    setScreen: (screen: Screen) => void;
    screen: Screen;
}) {
    return (
        <div>
            <button
                onClick={() => setScreen('edit')}
                disabled={screen === 'edit'}
            >
                Edit
            </button>
            <button
                onClick={() => setScreen('animate')}
                disabled={screen === 'animate'}
            >
                Animate
            </button>
            <button
                onClick={() => setScreen('game')}
                disabled={screen === 'game'}
            >
                Play
            </button>
        </div>
    );
}
