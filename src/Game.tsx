import * as React from 'react';
import { useReducer, useState } from 'react';
import { angleBetween } from './calcPath';

export type Coord = { x: number; y: number };

export type Line =
    | { type: 'straight'; p1: Coord; p2: Coord }
    | { type: 'arc'; center: Coord; t1: number; t2: number; r: number };

export type State = {
    ts: number;
    pos: Coord;
    size: number;
    heading: number;
    speed: number;
    lines: Line[];
    mod: number;
};

const initialState: () => State = (): State => ({
    ts: Date.now(),
    pos: { x: 0, y: 0 },
    heading: 0,
    speed: 0.5,
    size: 10,
    mod: 1,
    lines: [
        { type: 'arc', center: { x: 0, y: 0 }, t1: 0, t2: Math.PI, r: 200 },
        { type: 'straight', p1: { x: 20, y: -50 }, p2: { x: 20, y: -150 } },
        { type: 'straight', p1: { x: 50, y: -50 }, p2: { x: 100, y: -150 } },
        {
            type: 'arc',
            center: { x: 0, y: 0 },
            t1: 0,
            t2: (Math.PI * 3) / 2,
            r: 100,
        },
    ],
});

export type Action =
    | { type: 'tick'; ts: number; turn?: 'left' | 'right' }
    | {
          type: 'stop/start';
      };

const limit = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));

const loop = (n: number, min: number, max: number) =>
    n < min ? max : n > max ? min : n;

const tweak = {
    slow: 0.98,
    fast: 1.07,
    // slow: 0.98,
    // fast: 1.07,
    turn: 0.03,
    min: 0.7,
    // min: 0.1,
    limit: 0.5,
};

export const tick = (
    state: State,
    action: Extract<Action, { type: 'tick' }>,
): State => {
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
            -300,
            300,
        ),
        y: loop(
            Math.sin(heading) * (state.speed * mod) + state.pos.y,
            -300,
            300,
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
            const x0 = Math.min(line.p1.x, line.p2.x);
            const x1 = Math.max(line.p1.x, line.p2.x);
            const y0 = Math.min(line.p1.y, line.p2.y);
            const y1 = Math.max(line.p1.y, line.p2.y);
            const within =
                pos.x >= x0 - size &&
                pos.x <= x1 + size &&
                pos.y >= y0 - size &&
                pos.y <= y1 + size;
            if (!within) {
                return;
            }

            const endPoint = pickHit(
                dpos(line.p1, pos, size),
                dpos(line.p2, pos, size),
            );

            if (line.p1.x === line.p2.x) {
                // straight up & down
                return pickHit(endPoint, {
                    overlap: size - Math.abs(line.p1.x - pos.x),
                    direction: pos.x < line.p1.x ? Math.PI : 0, //Math.PI,
                });
            }

            const t = angleTo(line.p1, line.p2) + Math.PI / 2;
            const m = (line.p2.y - line.p1.y) / (line.p2.x - line.p1.x);
            // line.p2.y = m * line.p2.x + b
            const b = line.p2.y - m * line.p2.x;
            const m2 = -1 / m;
            const b2 = pos.y - m2 * pos.x;

            // m * x + b = m2 * x + b2
            // m * x - m2 * x = b2 - b
            // x (m - m2) = b2 - b
            // x = (b2 - b) / (m - m2)
            const x = (b2 - b) / (m - m2);
            const y = m * x + b;

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
        state.speed = tweak.limit;
        // console.log(closest);
    }
    return state;
};

const reducer = (state: State, action: Action) => {
    switch (action.type) {
        case 'tick':
            return tick(state, action);
        case 'stop/start':
            return { ...state, speed: state.speed ? 0 : 0.5 };
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

export const Game = () => {
    const [state, dispatch] = useReducer(reducer, undefined, initialState);

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

    return (
        <div>
            <svg width={600} height={600} viewBox="-300 -300 600 600">
                {state.lines.map((line, i) => (
                    <path
                        key={i}
                        stroke="red"
                        strokeWidth={3}
                        fill="none"
                        d={lineToPath(line)}
                    />
                ))}
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
