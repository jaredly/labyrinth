import React from 'react';
import {
    State,
    SlideT,
    Section,
    Action,
    Grouped,
    Coord,
    pairKey,
    missing,
    svgPos,
    closest,
    relPos,
    neighboring,
    ungroup,
} from './App2';

export function renderCartesian(
    state: State,
    setSlide: React.Dispatch<React.SetStateAction<SlideT | null>>,
    sections: Section[],
    {
        vwidth,
        width,
        height,
    }: { vwidth: number; width: number; height: number },
    slide: SlideT | null,
    singles: { [key: string]: boolean },
    W: number,
    dispatch: React.Dispatch<Action>,
) {
    const shrink = 0.1;

    const cartesian: Grouped = { slop: [], back: [], mid: [], front: [] };
    const addLine = (
        section: number,
        yoff: number,
        p1: Coord,
        p2: Coord,
        pairs: State['sections'][0]['pairs'],
    ) => {
        const sectionTheta =
            (section / state.sections.length) * Math.PI * 2 + Math.PI / 2;

        const pk = pairKey(p1, p2);
        const pos = pairs[pk] ? 'front' : 'back';
        const xs = p1.x === p2.x ? 0 : shrink;
        const ys = p1.y === p2.y ? 0 : shrink;
        cartesian[pos].push(
            <line
                key={`${section} ${pk}`}
                data-pk={pk}
                x1={p1.x + xs}
                x2={p2.x - xs}
                y1={p1.y + yoff + ys}
                y2={p2.y + yoff - ys}
                strokeLinecap="round"
                stroke={pairs[pk] ? 'blue' : missing}
                strokeWidth={0.1}
                onMouseDown={(evt) => {
                    if (evt.shiftKey) {
                        setSlide({
                            type: 'remove',
                            pairs: [{ section, pair: pk }],
                        });
                    }
                }}
                onMouseMove={() => {
                    setSlide((slide) =>
                        slide?.type === 'remove' &&
                        !slide.pairs.find(
                            (p) => p.section === section && p.pair === pk,
                        )
                            ? {
                                  ...slide,
                                  pairs: [
                                      ...slide.pairs,
                                      { section, pair: pk },
                                  ],
                              }
                            : slide,
                    );
                }}
                style={{ cursor: 'pointer' }}
            />,
        );
    };

    const rects: { section: number; top: number; bottom: number }[] = [];
    let yoff = 0;

    sections.forEach(({ pairs, rows }, i) => {
        for (let x = 0; x < vwidth; x++) {
            for (let y = 0; y < rows; y++) {
                if (y < rows - 1) {
                    addLine(i, yoff, { x, y }, { x, y: y + 1 }, pairs);
                }
                if (x < vwidth - 1) {
                    addLine(i, yoff, { x, y }, { x: x + 1, y }, pairs);
                }
            }
        }
        if (
            slide?.type === 'add' &&
            slide.items[slide.items.length - 1].section === i
        ) {
            cartesian.front.push(
                <circle
                    cx={slide.items[slide.items.length - 1].x}
                    cy={slide.items[slide.items.length - 1].y + yoff}
                    r={0.2}
                    fill="red"
                    key="slide"
                />,
            );
        }
        const between = 0.4;

        const oldYoff = yoff;
        yoff += rows - 1 + between;

        rects.push({
            section: i,
            top: oldYoff,
            bottom: yoff - between,
        });

        for (let x = 0; x < width; x++) {
            const k1 = `${i}:${x},${rows - 1}`;
            const k2 = `${(i + 1) % sections.length}:${x},${0}`;
            const needed = singles[k1] || singles[k2];

            cartesian.mid.push(
                <line
                    key={`${i} ${x} - connector`}
                    x1={x}
                    x2={x}
                    y1={rows - 1 + oldYoff}
                    y2={yoff}
                    strokeLinecap="round"
                    stroke={needed ? '#007' : '#500'}
                    strokeWidth={needed ? 0.1 : 0.05}
                />,
            );
        }
    });

    const aspect = vwidth / height;
    const H = W / aspect;
    const m = 100;

    const scale = W / vwidth;

    const mouseHandlers = {
        onMouseDown(evt: React.MouseEvent<SVGSVGElement>) {
            if (evt.shiftKey) {
                setSlide({ type: 'remove', pairs: [] });
            } else {
                const pos = svgPos(evt);
                if (pos.x >= m) {
                    const found = closest(relPos(pos, m, scale), rects);
                    setSlide(found ? { type: 'add', items: [found] } : null);
                }
            }
        },
        onMouseMove(evt: React.MouseEvent<SVGSVGElement>) {
            const pos = svgPos(evt);
            if (pos.x >= m) {
                setSlide((slide) => {
                    if (!slide || slide.type !== 'add') return slide;
                    const found = closest(relPos(pos, m, scale), rects);
                    if (!found) return slide;
                    const at = slide.items.findIndex(
                        (s) =>
                            s.section === found.section &&
                            s.x === found.x &&
                            s.y === found.y,
                    );
                    if (at === slide.items.length - 1) {
                        return slide;
                    }
                    if (at !== -1) {
                        return {
                            type: 'add',
                            items: slide.items.slice(0, at + 1),
                        };
                    }
                    const last = slide.items[slide.items.length - 1];
                    if (neighboring(last, found, state.sections)) {
                        return {
                            type: 'add',
                            items: [...slide.items, found],
                        };
                    }
                    return slide;
                });
            }
        },
        onMouseUp() {
            if (slide?.type === 'add') {
                dispatch({
                    type: 'slide',
                    slide: slide.items,
                });
            } else if (slide?.type === 'remove') {
                dispatch({
                    type: 'remove',
                    pairs: slide.pairs,
                });
            }
            setSlide(null);
        },
    };

    return (
        <svg width={W + m * 2} height={H + m * 2} {...mouseHandlers}>
            <g transform={`translate(${m},${m})`}>
                <g transform={`scale(${scale})`}>{ungroup(cartesian)}</g>
            </g>
        </svg>
    );
}
