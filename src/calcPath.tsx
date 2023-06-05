import { State, W, H, Coord } from './App';

const closeEnough = (a: number, b: number) => Math.abs(a - b) < 0.001;

export const calcPath = (
    points: State['points'],
    size: State['size'],
    sectionMap: { [pos: string]: { t: number; r: number } },
): string => {
    const polar = points
        // .map(({x,y}) => ({x: size.width + 1 - x, y: size.height + 1 - y}))
        .map(({ x, y }) => sectionMap[`${x},${y}`])
        .filter(Boolean);
    // polarPath(points, size);

    const mx = 30; //dx / 2;
    const my = 30; //dy / 2;

    const cx = (W - mx * 2) / 2;
    const cy = (H - my * 2) / 2;
    // const R = Math.min(cx, cy) * 0.8;

    return polar
        .map(({ t, r }, i) => {
            // const {t, r} = sectionMap[`${pos.x},${pos.y}`]
            const x = Math.cos(t) * r + cx;
            const y = Math.sin(t) * r + cy;
            // const { x, y } = cart(t, r, R, cx, cy);
            if (i == 0) {
                return `M${x} ${y}`;
            }
            if (closeEnough(points[i - 1].y, points[i].y)) {
                return `L${x} ${y}`;
            }
            const prev = polar[i - 1];
            // if (closeEnough(prev.t, t)) {
            //     return `L${x} ${y}`;
            // }
            const largeArcFlag = false; // Math.abs(t - prev.t) <= Math.PI;
            const sweepFlag = t < prev.t;
            return `A ${r} ${r} 0 ${largeArcFlag ? '1' : '0'} ${
                sweepFlag ? '1' : '0'
            } ${x} ${y}`;
        })
        .join(' ');
};

export function cart(t: number, r: number, R: number, cx: number, cy: number) {
    const x = cx + Math.cos(t) * r * R;
    const y = cy + Math.sin(t) * r * R;
    return { x, y };
}

export function polarPath(points: Coord[], size: State['size']) {
    return points
        .map(({ x, y }) => ({
            x: size.width - x,
            y: size.height - y,
        }))
        .map((p) => {
            const r = p.x / (size.width - 1);
            const t = (p.y / size.height - 1) * Math.PI * 2;
            return { t, r };
        });
}
