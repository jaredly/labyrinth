import { State, W, H } from './App';

const closeEnough = (a: number, b: number) => Math.abs(a - b) < 0.001;

export const calcPath = (points: State['points']): string => {
    const mx = points.reduce((n, p) => Math.max(n, p.x), 0);
    const my = points.reduce((n, p) => Math.max(n, p.y), 0);

    points = points.map(({ x, y }) => ({ x: mx - x, y: my - y }));

    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(cx, cy) * 0.8;

    const polar = points.map((p) => {
        const yt = p.x / mx;
        const xt = p.y / my;
        const r = yt;
        const t = xt * Math.PI * 2;
        return { t, r };
    });

    return polar
        .map(({ t, r }, i) => {
            const x = cx + Math.cos(t) * r * R;
            const y = cy + Math.sin(t) * r * R;
            if (i == 0) {
                return `M${x} ${y}`;
            }
            const prev = polar[i - 1];
            if (closeEnough(prev.t, t)) {
                return `L${x} ${y}`;
            }
            const largeArcFlag = Math.abs(t - prev.t) < Math.PI;
            const sweepFlag = t < prev.t;
            return `A ${r * R} ${r * R} 0 ${largeArcFlag ? '1' : '0'} ${
                sweepFlag ? '1' : '0'
            } ${x} ${y}`;
        })
        .join(' ');
};
