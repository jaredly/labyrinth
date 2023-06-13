import React from 'react';
import { State, W, H, Coord } from './App';
import { SectionMap } from './sections';

const closeEnough = (a: number, b: number) => Math.abs(a - b) < 0.001;

export const showColor = (
    points: Coord[],
    size: State['size'],
    sectionMap: SectionMap,
    mx: number,
    my: number,
    dists: number[],
    dr: number,
) => {
    const { paths, polar } = calcPathParts(points, size, sectionMap, mx, my);

    const cx = (W - mx * 2) / 2;
    const cy = (H - my * 2) / 2;
    const max = dists[dists.length - 1];

    return paths.map((item, i): JSX.Element | null => {
        if (i === 0) {
            return null;
        }
        const pos = polar[i - 1];
        const x = Math.cos(pos.t) * pos.r + cx;
        const y = Math.sin(pos.t) * pos.r + cy;
        return (
            <path
                d={`M${x} ${y} ${item}`}
                strokeWidth={dr}
                strokeLinecap="round"
                strokeLinejoin="round"
                stroke={rainbow(dists[i] / max)}
                fill="none"
            />
        );
    });
};

export const calcPath = (
    pairs: State['pairs'],
    size: State['size'],
    sectionMap: SectionMap,
    mx: number,
    my: number,
): string => {
    return pairs
        .map((pair) =>
            calcPathParts(pair, size, sectionMap, mx, my).paths.join(' '),
        )
        .join(' ');
};

export const calcPathParts = (
    points: Coord[],
    size: State['size'],
    sectionMap: SectionMap,
    mx: number,
    my: number,
): { paths: string[]; polar: (typeof sectionMap)[''][] } => {
    const polar = points
        .map(({ x, y }) => ({ x: size.width - 1 - x, y }))
        .map(({ x, y }) => sectionMap[`${x},${y}`])
        .filter(Boolean);

    const cx = (W - mx * 2) / 2;
    const cy = (H - my * 2) / 2;

    const paths = polar.map((pos, i) => {
        const x = Math.cos(pos.t) * pos.r + cx;
        const y = Math.sin(pos.t) * pos.r + cy;
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
        const sweepFlag = cw;
        return `A ${pos.r} ${pos.r} 0 ${largeArcFlag ? '1' : '0'} ${
            sweepFlag ? '1' : '0'
        } ${x} ${y}`;
    });
    return { polar, paths };
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

export function rainbow(percent: number): string | undefined {
    return `hsl(${(percent * 180).toFixed(0)}, 100%, 50%)`;
}

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
