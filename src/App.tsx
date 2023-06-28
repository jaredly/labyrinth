import React from 'react';

export type Coord = { x: number; y: number };

export type State = {
    version: 1;
    size: { width: number; height: number };
    // points: Coord[];
    pairs: [Coord, Coord][];
    selection: number[];
    sections: number[];
    inner?: number;
    circle?: number;
};

export const migrateState = (state: State) => {
    if (!state.version) {
        if ('points' in state) {
            const pts = state.points as Coord[];
            state.pairs = [];
            for (let i = 1; i < pts.length; i++) {
                state.pairs.push([pts[i - 1], pts[i]]);
            }
        }
        state.version = 1;
    }
    return state;
};

export const initialState: State = {
    version: 1,
    size: { width: 10, height: 10 },
    pairs: [],
    selection: [],
    sections: [],
};

export type Action =
    | { type: 'sections'; sections: number[] }
    // | { type: 'flip'; x: boolean }
    | { type: 'size'; size: { width: number; height: number } }
    // | { type: 'click'; pos: Coord }
    | { type: 'circle'; circle: number }
    | { type: 'clear' }
    // | { type: 'delete' }
    // | { type: 'move'; from: Coord; to: Coord }
    | { type: 'reset'; state: State }
    | { type: 'inner'; inner: number }
    | { type: 'select'; selection: number[] };
// | { type: 'undo' };

const flip = (points: Coord[], size: State['size'], x: boolean) => {
    if (x) {
        return points.map(({ x, y }) => ({ x: size.width - 1 - x, y }));
    } else {
        return points.map(({ x, y }) => ({ y: size.height - 1 - y, x }));
    }
};

export const W = 800 / 2;
export const H = 800 / 2;

export type Mouse = { pos: Coord; drag?: Coord | null };

const snap = (m: number, dm: number) => Math.round(m / dm);
export const snapPos = ({ x, y }: Coord, dx: number, dy: number): Coord => ({
    x: snap(x, dx),
    y: snap(y, dy),
});

export const mx = 60; //dx / 2;
export const my = 60; //dy / 2;

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
