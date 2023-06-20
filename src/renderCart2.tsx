import React, { useState } from 'react';
import {
    State,
    Slide,
    Section,
    Action,
    Grouped,
    Coord,
    pairKey,
    ungroup,
} from './App2';
import { AddRing, Addliness } from './Addliness';

const sectionPairKey = (section: number, ring: number, row: number) =>
    `${section}:${ring},${row}`;
export type GridPoint = { ring: number; row: number; section: number };

export function renderCart2(
    ref: React.RefObject<SVGSVGElement>,
    state: State,
    grid: GridPoint[][],
    setSlide: React.Dispatch<React.SetStateAction<Slide | null>>,
    sections: Section[],
    {
        vwidth,
        width,
        rowTotal,
    }: { vwidth: number; width: number; rowTotal: number },
    slide: Slide | null,
    singles: { [key: string]: number },
    dispatch: React.Dispatch<Action>,
    hoverPoint: null | GridPoint,
    setHoverPoint: (p: GridPoint | null) => void,
) {
    const cartesian: Grouped = { slop: [], back: [], mid: [], front: [] };

    const m = 50;

    const cr = 0;

    const W = 800;
    const H = W / (grid.length / grid[0].length);
    const scale = H / vwidth;

    const lineMe = (c1: Coord, c2: Coord, key: string) => {
        const p1 = grid[c1.x]?.[c1.y];
        const p2 = grid[c2.x]?.[c2.y];
        if (!p1 || !p2) {
            return;
        }
        if (p1.section !== p2.section) {
            const needed =
                singles[`${p1.section}:${p1.ring},${p1.row}`] ||
                singles[`${p2.section}:${p2.ring},${p2.row}`];
            cartesian.back.push(
                <path
                    key={key}
                    d={`M${(c1.x + cr) * scale} ${c1.y * scale}L${
                        (c2.x - cr) * scale
                    } ${c2.y * scale}`}
                    // d={`M${(c1.x + cr) * scale} ${c1.y * scale}A${(
                    //     scale * 2
                    // ).toFixed(2)} ${(scale * 2).toFixed(2)} 0 0 0 ${(
                    //     (c2.x - cr) *
                    //     scale
                    // ).toFixed(2)} ${(c2.y * scale).toFixed(2)}`}
                    strokeWidth={5}
                    stroke={needed ? '#f55' : '#009'}
                    strokeDasharray="10 5"
                />,
            );
            return;
        }
        const pk = pairKey(
            { x: p1.ring, y: p1.row },
            { x: p2.ring, y: p2.row },
        );
        const present = sections[p1.section].pairs[pk];
        const xr = c1.x === c2.x ? 0 : cr;
        const yr = c1.y === c2.y ? 0 : cr;

        cartesian.back.push(
            <line
                key={key}
                x1={(c1.x + xr) * scale}
                y1={(c1.y + yr) * scale}
                x2={(c2.x - xr) * scale}
                y2={(c2.y - yr) * scale}
                strokeWidth={5}
                style={{ cursor: 'pointer' }}
                stroke={present ? 'red' : '#222'}
                onClick={() => {
                    dispatch({ type: 'toggle', section: p1.section, pair: pk });
                }}
            />,
        );
    };

    grid.forEach((items, gx) => {
        items.forEach((_, gy) => {
            const self = { x: gx, y: gy };
            const down = { x: gx, y: gy + 1 };
            const right = { x: gx + 1, y: gy };
            lineMe(self, right, `${gx}:${gy}:r`);
            lineMe(self, down, `${gx}:${gy}:d`);
        });
    });

    grid.forEach((items, gx) => {
        const rows = sections[items[0].section].rows;
        if (items[0].row === ((rows / 2) | 0)) {
            const off = rows / 2 - ((rows / 2) | 0);
            cartesian.back.push(
                <text
                    key={'text' + gx}
                    x={(gx - off + 0.5) * scale}
                    y={(items.length - 0.5) * scale}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                    fill="white"
                    textAnchor="middle"
                    fontFamily="monospace"
                    fontSize={20}
                >
                    {items[0].section + 1}
                </text>,
            );
        }
        items.forEach((point, gy) => {
            const needed =
                singles[`${point.section}:${point.ring},${point.row}`];
            const slid =
                slide?.type === 'add2' &&
                slide.items.some((s) => s.x === gx && s.y === gy);
            cartesian.front.push(
                <circle
                    key={`show-${gx}-${gy}`}
                    cx={gx * scale}
                    cy={gy * scale}
                    r={0.07 * scale}
                    fill={slid ? 'green' : needed ? 'red' : '#222'}
                />,
                <circle
                    key={`touch-${gx}-${gy}`}
                    cx={gx * scale}
                    cy={gy * scale}
                    r={0.2 * scale}
                    fill={'transparent'}
                    style={{
                        ...(hoverPoint &&
                        hoverPoint.ring === point.ring &&
                        hoverPoint.row === point.row &&
                        hoverPoint.section === point.section
                            ? {
                                  fill: 'red',
                              }
                            : {}),
                        cursor: 'pointer',
                        transition: 'fill 0.3s ease',
                    }}
                    onMouseEnter={() => setHoverPoint(point)}
                    onMouseLeave={() => setHoverPoint(null)}
                    onMouseDown={(evt) => {
                        evt.preventDefault();
                        setSlide({ type: 'add2', items: [{ x: gx, y: gy }] });
                    }}
                />,
            );
        });
    });

    return (
        <svg
            ref={ref}
            width={W + m * 2}
            height={H + m * 2}
            onMouseUp={(evt) => {
                if (slide?.type === 'add2') {
                    setSlide(null);
                    dispatch({
                        type: 'slide',
                        slide: slide.items.map(({ x, y }) => {
                            const { ring, row, section } = grid[x][y];
                            return { section, x: ring, y: row };
                        }),
                    });
                }
            }}
            onMouseMove={(evt) => {
                evt.preventDefault();
                const box = evt.currentTarget.getBoundingClientRect();
                const x = evt.clientX - box.left - m;
                const y = evt.clientY - box.top - m;
                if (slide?.type !== 'add2') {
                    return;
                }
                const last = slide.items[slide.items.length - 1];
                if (!last) {
                    return;
                }
                const dirs = [
                    { x: 0, y: 0 },
                    { x: 0, y: -1 },
                    { x: 0, y: 1 },
                    { x: -1, y: 0 },
                    { x: 1, y: 0 },
                ];
                let best = null as null | {
                    diff: number;
                    x: number;
                    y: number;
                };
                dirs.forEach((d) => {
                    if (
                        last.x + d.x < 0 ||
                        last.x + d.x >= grid.length ||
                        last.y + d.y < 0 ||
                        last.y + d.y >= vwidth
                    ) {
                        return;
                    }
                    const dx = (last.x + d.x) * scale - x;
                    const dy = (last.y + d.y) * scale - y;
                    const diff = Math.sqrt(dx * dx + dy * dy);
                    if (!best || best.diff > diff) {
                        best = { diff, x: d.x, y: d.y };
                    }
                });
                if (!best || (best.x === 0 && best.y === 0)) {
                    return;
                }
                const at = slide.items.findIndex(
                    (s) => s.x == last.x + best!.x && s.y === last.y + best!.y,
                );
                if (at !== -1) {
                    setSlide({
                        type: 'add2',
                        items: slide.items.slice(0, at + 1),
                    });
                } else {
                    setSlide({
                        type: 'add2',
                        items: [
                            ...slide.items,
                            { x: last.x + best.x, y: last.y + best.y },
                        ],
                    });
                }
            }}
        >
            <g transform={`translate(${m},${m})`}>
                {slide ? null : (
                    <>
                        <AddRing
                            dispatch={dispatch}
                            state={state}
                            grid={grid}
                            scale={scale}
                        />
                        <Addliness
                            dispatch={dispatch}
                            state={state}
                            grid={grid}
                            scale={scale}
                        />
                    </>
                )}
                {ungroup(cartesian)}
            </g>
        </svg>
    );
}
export function buildGrid(sections: Section[], vwidth: number) {
    const grid: GridPoint[][] = [];

    sections.forEach(({ rows }, i) => {
        for (let row = 0; row < rows; row++) {
            const items: GridPoint[] = [];
            for (let ring = 0; ring < vwidth; ring++) {
                items.unshift({ ring, row, section: i });
            }
            grid.unshift(items);
        }
    });

    grid.unshift(...grid.slice(-2));
    grid.push(...grid.slice(2, 4));
    return grid;
}
