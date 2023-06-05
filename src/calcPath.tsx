import { State, W, H, Coord } from './App';
import { SectionMap } from './sections';

const closeEnough = (a: number, b: number) => Math.abs(a - b) < 0.001;

export const calcPath = (
    points: State['points'],
    size: State['size'],
    sectionMap: SectionMap,
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
        .map((pos, i) => {
            // const {t, r} = sectionMap[`${pos.x},${pos.y}`]
            const x = Math.cos(pos.t) * pos.r + cx;
            const y = Math.sin(pos.t) * pos.r + cy;
            // const { x, y } = cart(t, r, R, cx, cy);
            if (i == 0) {
                return `M${x} ${y}`;
            }
            const prev = polar[i - 1];
            if (prev.y === pos.y) {
                return `L${x} ${y}`;
            }
            const cw = pos.y > prev.y;

            const delta = angleBetween(pos.t, prev.t, cw);

            const largeArcFlag = Math.abs(delta) < Math.PI;
            const sweepFlag = cw; // t < prev.t;
            return `A ${pos.r} ${pos.r} 0 ${largeArcFlag ? '1' : '0'} ${
                sweepFlag ? '1' : '0'
            } ${x} ${y}`;
        })
        .join(' ');
};

export const epsilon = 0.000001;

export const normalizeAngle = (angle: number): number => {
    if (angle > Math.PI) {
        return normalizeAngle(angle - Math.PI * 2);
    }
    if (angle < -Math.PI) {
        return normalizeAngle(angle + Math.PI * 2);
    }
    return angle;
};

/**
 * Calculate the difference between two angles.
 *
 * The result will always be positive, in $[0,2\pi]$
 */
export const angleBetween = (
    // the 'starting' angle, must be in $[-\pi,\pi]$
    left: number,
    // end 'ending' angle, must be in $[-\pi,\pi]$
    right: number,
    // which direction to travel around the circle, `true` for clockwise
    clockwise: boolean,
) => {
    if (!clockwise) {
        [left, right] = [right, left];
    }
    if (Math.abs(right - left) < epsilon) {
        return 0;
    }
    if (right >= left) {
        return right - left;
    }
    const res = right + Math.PI * 2 - left;
    if (res < 0) {
        return res + Math.PI * 2;
    }
    return res;
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
