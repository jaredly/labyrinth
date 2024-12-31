import * as React from 'react';
import { Coord, Screen, State, calcBounds, pairKey } from './App2';
import { organizeLine } from './organizeLine';
import { calculateSingles } from './Edit';
import { Polar, calcLocation } from './sections';
import { angleBetween, calcPathPartsInner } from './calcPath';
import { useLocalStorage } from './reduceLocalStorage';
import { ScreenButtons } from './Game';

export type Mode = 'line' | 'dot' | 'steps' | 'slug';

function easeInOut(t: number) {
    return t > 0.5 ? 4 * Math.pow(t - 1, 3) + 1 : 4 * Math.pow(t, 3);
}

const Steps = ({ VW, pos, pathNode, pathWidth }: { pathWidth: number; VW: number; pos: number; pathNode: SVGPathElement }) => {
    const margin = VW / 100;

    const r = (pathWidth - margin) / 2;
    const d = r * 4;
    // const total = pathNode.getTotalLength()
    const mpos = Math.floor(pos / d) * d;
    const off = (mpos - pos) / d;
    const ppos = pathNode.getPointAtLength(mpos);
    const nextPos = pathNode.getPointAtLength(mpos + d);
    const uberNext = pathNode.getPointAtLength(mpos + d * 2);

    // const now = off + 0.5;
    // const next = 0.5 - off;
    const now = 1 + off;
    const next = -off;
    // const now = easeInOut(1 + off);
    // const next = easeInOut(-off);
    return (
        <>
            <circle cx={ppos.x} cy={ppos.y} r={r * (0.9 + now * 0.1)} fill="#77f" opacity={now} />
            <circle cx={nextPos.x} cy={nextPos.y} r={r} fill="#77f" opacity={1} />
            <circle cx={uberNext.x} cy={uberNext.y} r={r * (0.9 + next * 0.1)} fill="#77f" opacity={next} />
        </>
    );
};

const Dot = ({ VW, pos, pathNode }: { VW: number; pos: number; pathNode: SVGPathElement }) => {
    const ppos = pathNode.getPointAtLength(pos);
    return <circle cx={ppos.x} cy={ppos.y} r={VW / 80} fill="#77f" />;
};

const Slug = ({ pathString, length, pos, VW, pathWidth }: { pathWidth: number; VW: number; pathString: string; length: number; pos: number }) => {
    const margin = VW / 100;
    pos *= 2;
    let second = pos >= length;
    if (pos > length) {
        pos = length * 2 - pos;
    }
    const sep = (pathWidth - margin) * 1.8;
    if (pos < 0) pos = 0;

    if (pos > length - sep - 5) pos = length - sep - 5;

    return (
        <path
            d={pathString}
            strokeDasharray={length ? `1 ${sep} 1 ${length}` : undefined}
            strokeDashoffset={-pos}
            stroke={second ? '#fa7' : '#77f'}
            strokeLinecap="round"
            strokeWidth={pathWidth - margin}
            fill="none"
        />
    );
};

const Line = ({ pathString, length, pos, VW }: { VW: number; pathString: string; length: number; pos: number }) => {
    return (
        <path
            d={pathString}
            strokeDasharray={length ? `${pos} ${length - pos}` : undefined}
            stroke="#77f"
            strokeLinecap="round"
            strokeWidth={VW / 80}
            fill="none"
        />
    );
};

export const Animate = ({ state, setScreen }: { state: State; setScreen: (s: Screen) => void }) => {
    const bounds = calcBounds(state);

    const singles: { [key: string]: number } = calculateSingles(state.sections);
    const lines = organizeLine(state.rings, state.sections, singles);

    if (!lines || lines.length !== 1) {
        return (
            <div>
                <button onClick={() => setScreen('edit')}>Edit</button>
                No lines
                {lines?.length}
            </div>
        );
    }

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

    const line = lines[0];
    const polars = line.map((k) => {
        const [section, pos] = k.split(':');
        const [ring, row] = pos.split(',');
        const sectionTheta = (+section / state.sections.length) * Math.PI * 2 + Math.PI / 2;
        const y = +row;
        return calcLocation({
            pos: { x: bounds.width - +ring, y: y },
            sectionTheta,
            dr,
            r0,
            rows: state.sections[+section].rows,
            col: sectionCols[+section] + y,
            section: +section,
        });
    });

    const nodes: JSX.Element[] = [];
    const [rounded, setRounded] = React.useState(true);

    produceBorders(nodes, VW, totalCols, state, col, sectionCols, bounds, dr, r0);

    const pathString = React.useMemo(
        () =>
            calcPathPartsInner(
                polars,
                0,
                0,
                totalCols,
                rounded
                    ? {
                          dr,
                          r0,
                          sections: state.sections,
                      }
                    : undefined,
            ).join(' '),
        [state.sections, dr, r0, polars, totalCols],
    );
    const [mode, setMode] = React.useState('slug' as Mode);

    const pathNode = React.useMemo(() => {
        const node = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        node.setAttribute('d', pathString);
        // const length = node.getTotalLength();
        // console.log('d len', length);
        // node.getPointAtLength
        return node;
    }, [pathString]);

    // const [pos, setPos] = React.useState(0);
    // const [length, setLength] = React.useState(null as null | number);

    const [speed, setSpeed] = useLocalStorage('speed', () => ({
        speed: 10,
        run: false,
        pos: 0,
    }));
    const speedRef = React.useRef(speed);
    speedRef.current = speed;

    const length = pathNode.getTotalLength();

    // 100 / (timer * 60 * 50)
    React.useEffect(() => {
        if (!speed.run) return;

        let start = performance.now();

        const fn = (stamp: number) => {
            setSpeed((s) => {
                const d = ((stamp - start) / 1000) * s.speed;
                start = stamp;
                if (!s.run) {
                    return s;
                }
                if (s.speed > 0 && s.pos >= length) {
                    return { ...s, run: false };
                }
                if (s.speed < 0 && s.pos <= 0) {
                    return { ...s, run: false, pos: 0 };
                }
                // if (s.pos < length - d * 2) {
                //     const one = pathNode.getPointAtLength(s.pos);
                //     const two = pathNode.getPointAtLength(s.pos + d);
                //     const three = pathNode.getPointAtLength(s.pos + d * 2);
                //     const a1 = Math.atan2(one.y - two.y, one.x - two.x);
                //     const a2 = Math.atan2(three.y - two.y, three.x - two.x);
                //     const angle = angleBetween(a1, a2, true);
                //     const off = Math.abs(angle - Math.PI);
                //     // TODO: Slow more at higher curve, less at lower curve
                //     const max = Math.PI * 0.1;
                //     if (off > max) {
                //         const percent = 1 - (off - max) / Math.PI;
                //         return { ...s, pos: s.pos + d * percent };
                //     }
                // }

                return !s.run ? s : s.pos >= length ? { ...s, run: false } : { ...s, pos: s.pos + d };
            });
            id = requestAnimationFrame(fn);
        };

        let id = requestAnimationFrame(fn);

        // const iid = setInterval(() => {
        //     // setPos((p) => p >= 1 ? {...p} : p + speedRef.current.speed);
        // }, 20);
        // const to = setTimeout(() => {
        //     setRun(false)
        // }, timer * 60 * 1000);
        return () => {
            cancelAnimationFrame(id);
            // clearTimeout(id);
        };
    }, [speed.run, length]);

    const [{ scale, smooth, rotate }, setState] = useLocalStorage('animate-settings', () => ({
        scale: 8,
        smooth: 20,
        rotate: false,
    }));

    const amt = speed.pos;
    const ppos = pathNode.getPointAtLength(amt);
    const pnext = pathNode.getPointAtLength(amt + smooth);
    let t = !rotate ? -Math.PI / 2 : speed.pos >= length - 0.01 ? -Math.PI / 2 : Math.atan2(pnext.y - ppos.y, pnext.x - ppos.x);

    if (speed.speed < 0) {
        t += Math.PI;
    }

    const SCALE = scale;

    return (
        <div>
            <div>
                <ScreenButtons setScreen={setScreen} screen="animate" />
            </div>
            <svg width={VW + vm * 2} height={VW + vm * 2} style={{ backgroundColor: '#0a0a0a' }}>
                <g transform={`translate(${VW / 2}, ${VW / 2})`}>
                    <g
                        transform={`
                            rotate(${-(t / Math.PI) * 180 - 90})
                            scale(${SCALE} ${SCALE})
                        `}
                    >
                        <g transform={scale > 1 || rotate ? `translate(${-ppos.x} ${-ppos.y})` : ''}>
                            {nodes}
                            {mode === 'dot' ? (
                                // <circle cx={ppos.x} cy={ppos.y} r={VW / 80} fill="#77f" />
                                <Dot VW={VW} pathNode={pathNode} pos={speed.pos} />
                            ) : mode === 'steps' ? (
                                <Steps VW={VW} pathWidth={dr} pathNode={pathNode} pos={speed.pos} />
                            ) : mode === 'slug' ? (
                                <Slug VW={VW} pathWidth={dr} pathString={pathString} length={length} pos={speed.pos} />
                            ) : (
                                <Line VW={VW} pathString={pathString} length={length} pos={speed.pos} />
                            )}
                        </g>
                    </g>
                </g>
            </svg>
            <div>
                <div>
                    Scale:
                    <input
                        type="range"
                        min="1"
                        max="20"
                        step="0.1"
                        value={scale}
                        onChange={(evt) =>
                            setState((s) => ({
                                ...s,
                                scale: +evt.target.value,
                            }))
                        }
                    />
                    {scale}
                </div>
                <div>
                    <button onClick={() => setSpeed((s) => ({ ...s, speed: -s.speed }))}>Reverse</button>
                </div>
                <div>
                    Smooth:
                    <input
                        type="range"
                        min="1"
                        max="20"
                        step="1"
                        value={smooth}
                        onChange={(evt) =>
                            setState((s) => ({
                                ...s,
                                smooth: +evt.target.value,
                            }))
                        }
                    />
                    {smooth}
                </div>
                <div>
                    Speed
                    <input
                        type="range"
                        min="10"
                        max={400}
                        step={1}
                        value={speed.speed}
                        onChange={(evt) =>
                            setSpeed((s) => ({
                                ...s,
                                speed: +evt.target.value,
                            }))
                        }
                    />
                    {speed.speed.toFixed(2)}
                </div>

                <div>
                    Progress
                    <input
                        type="range"
                        min="0"
                        max={length}
                        step={1}
                        value={speed.pos}
                        onChange={(evt) => setSpeed((s) => ({ ...s, pos: +evt.target.value }))}
                    />
                    {speed.pos.toFixed(0)}
                </div>
                <button onClick={() => setState((s) => ({ ...s, rotate: !s.rotate }))}>{rotate ? 'Rotate' : 'Fixed'}</button>
                <button onClick={() => setSpeed((s) => ({ ...s, run: !s.run }))}>{speed.run ? 'Stop' : 'Run'}</button>
                <button onClick={() => setRounded(!rounded)}>{rounded ? 'Rounded' : 'Unrounded'}</button>
                <div>
                    <button
                        onClick={() =>
                            setSpeed((s) => ({
                                ...s,
                                speed: length / (10 * 60),
                                run: true,
                            }))
                        }
                    >
                        10 minute
                    </button>
                    <button
                        onClick={() =>
                            setSpeed((s) => ({
                                ...s,
                                speed: length / (5 * 60),
                                run: true,
                            }))
                        }
                    >
                        5 minute
                    </button>
                    <button
                        onClick={() =>
                            setSpeed((s) => ({
                                ...s,
                                speed: length / (1 * 60),
                                run: true,
                            }))
                        }
                    >
                        1 minute
                    </button>
                    <button
                        onClick={() =>
                            setSpeed((s) => ({
                                ...s,
                                speed: length / 30,
                                run: true,
                            }))
                        }
                    >
                        30 secs
                    </button>
                </div>
                <button disabled={mode === 'line'} onClick={() => setMode('line')}>
                    Line
                </button>
                <button disabled={mode === 'dot'} onClick={() => setMode('dot')}>
                    Dot
                </button>
                <button disabled={mode === 'steps'} onClick={() => setMode('steps')}>
                    Steps
                </button>
                <button disabled={mode === 'slug'} onClick={() => setMode('slug')}>
                    Slug
                </button>
            </div>
        </div>
    );
};

export const addCircular = (
    dr: number,
    r0: number,
    width: number,
    state: State,
    section: number,
    p1: Coord,
    p2: Coord,
    col: number,
): [Polar, Polar] => {
    const sectionTheta = (section / state.sections.length) * Math.PI * 2 + Math.PI / 2;

    return [
        calcLocation({
            pos: { x: width - p1.x, y: p1.y },
            sectionTheta,
            dr,
            r0,
            rows: state.sections[section].rows,
            col: col + p1.y,
            section,
        }),
        calcLocation({
            pos: { x: width - p2.x, y: p2.y },
            sectionTheta,
            dr,
            r0,
            rows: state.sections[section].rows,
            col: col + p2.y,
            section,
        }),
    ];
};

const DASHW = window.innerWidth / 400;
const DASH = undefined; // `${DASHW / 4} ${DASHW * 2}`;
// const DCOLOR = 'white';
const DCOLOR = '#333';

function produceBorders(
    nodes: JSX.Element[],
    VW: number,
    totalCols: number,
    state: State,
    col: number,
    sectionCols: number[],
    bounds: { vwidth: number; width: number; mx: number; rowTotal: number },
    dr: number,
    r0: number,
) {
    produceBorders_(state, col, sectionCols, bounds, dr, r0).forEach((polar, i) => {
        nodes.push(
            <path
                key={i}
                d={calcPathPartsInner(polar, 0, 0, totalCols).join(' ')}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={DASH}
                stroke={DCOLOR}
                strokeWidth={DASHW}
            />,
        );
    });
}

export function produceBorders_(
    state: State,
    col: number,
    sectionCols: number[],
    bounds: { vwidth: number; width: number; mx: number; rowTotal: number },
    dr: number,
    r0: number,
) {
    const paths: [Polar, Polar][] = [];

    state.sections.forEach(({ pairs, rows }, i) => {
        col = sectionCols[i];
        for (let x = 0; x < bounds.width - 1; x++) {
            for (let y = 0; y < rows; y++) {
                const p1 = pairKey({ x, y }, { x: x - 1, y });
                if (!pairs[p1]) {
                    paths.push(addCircular(dr, r0, bounds.width, state, i, { x: x - 0.5, y: y - 0.5 }, { x: x - 0.5, y: y + 0.5 }, col));
                }
                const p2 = pairKey({ x, y }, { x, y: y + 1 });
                if (x < bounds.width - 2 && y < rows - 1 && !pairs[p2]) {
                    paths.push(addCircular(dr, r0, bounds.width, state, i, { x: x - 0.5, y: y + 0.5 }, { x: x + 0.5, y: y + 0.5 }, col));
                }
            }
        }

        const sectionTheta = (i / state.sections.length) * Math.PI * 2 + Math.PI / 2;
        const nsectionTheta = ((i + 1) / state.sections.length) * Math.PI * 2 + Math.PI / 2;

        for (let x = 0; x < bounds.width - 1; x++) {
            // const k1 = `${i}:${x},${rows - 1}`;
            // const k2 = `${(i + 1) % state.sections.length}:${x},${0}`;
            const nsi = (i + 1) % state.sections.length;

            const p1 = calcLocation({
                pos: {
                    x: bounds.width - x + 0.5,
                    y: rows - 0.5,
                },
                sectionTheta,
                dr,
                r0,
                rows: state.sections[i].rows,
                col: 0,
                section: i,
            });
            const p2 = calcLocation({
                pos: { x: bounds.width - x + 0.5, y: -0.5 },
                sectionTheta: nsectionTheta,
                dr,
                r0,
                rows: state.sections[nsi].rows,
                col: 1,
                section: nsi,
            });

            const ang = angleBetween(p1.t, p2.t, true);
            if (ang > Math.PI) {
                continue;
            }

            paths.push([p1, p2]);
        }
    });

    return paths;
}
