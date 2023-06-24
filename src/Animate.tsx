import * as React from 'react';
import { Coord, Screen, State, calcBounds, pairKey } from './App2';
import { organizeLine } from './organizeLine';
import { calculateSingles } from './Edit';
import { Polar, calcLocation } from './sections';
import { angleBetween, calcPathPartsInner } from './calcPath';

export const Animate = ({
    state,
    setScreen,
}: {
    state: State;
    setScreen: (s: Screen) => void;
}) => {
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

    const VW = 800;
    const vm = 5;

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
        const sectionTheta =
            (+section / state.sections.length) * Math.PI * 2 + Math.PI / 2;
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

    produceBorders(
        nodes,
        VW,
        totalCols,
        state,
        col,
        sectionCols,
        bounds,
        dr,
        r0,
    );

    const pathString = React.useMemo(
        () =>
            calcPathPartsInner(polars, 0, 0, totalCols, {
                dr,
                r0,
                sections: state.sections,
            }).join(' '),
        [state.sections, dr, r0, polars, totalCols],
    );
    const [mode, setMode] = React.useState('line' as 'line' | 'dot');

    const pathNode = React.useMemo(() => {
        const node = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'path',
        );
        node.setAttribute('d', pathString);
        // const length = node.getTotalLength();
        // console.log('d len', length);
        // node.getPointAtLength
        return node;
    }, [pathString]);

    const [pos, setPos] = React.useState(50);
    const [length, setLength] = React.useState(null as null | number);
    const [timer, setTimer] = React.useState(null as null | number);

    React.useEffect(() => {
        if (timer == null) return;
        setPos(0);
        const iid = setInterval(() => {
            setPos((p) => p + 100 / (timer * 60 * 50));
        }, 20);
        const to = setTimeout(() => {
            setTimer(null);
        }, timer * 60 * 1000);
        return () => {
            clearInterval(iid);
            clearTimeout(to);
        };
    }, [timer]);

    const amt = (pos / 100) * pathNode.getTotalLength();
    const ppos = pathNode.getPointAtLength(amt);
    const pnext = pathNode.getPointAtLength(amt + 20);
    const t =
        pos >= 100 - 0.01
            ? -Math.PI / 2
            : Math.atan2(pnext.y - ppos.y, pnext.x - ppos.x);

    const SCALE = 8;

    const c = VW / 2;
    // rotate(${-(t / Math.PI) * 180})
    // rotate(${-(t / Math.PI) * 180})
    return (
        <div>
            <div>
                <button onClick={() => setScreen('edit')}>Edit</button>
            </div>
            <svg
                width={VW + vm * 2}
                height={VW + vm * 2}
                style={{ marginTop: 50 - vm, backgroundColor: '#0a0a0a' }}
            >
                <g transform={`translate(${VW / 2}, ${VW / 2})`}>
                    <g
                        transform={`
                            rotate(${-(t / Math.PI) * 180 - 90})
                            scale(${SCALE} ${SCALE})
                        `}
                    >
                        <g transform={`translate(${-ppos.x} ${-ppos.y})`}>
                            {nodes}
                            <path
                                ref={(node) => {
                                    if (node && length == null) {
                                        setLength(node.getTotalLength());
                                    }
                                }}
                                d={pathString}
                                strokeDasharray={
                                    length
                                        ? mode === 'line'
                                            ? `${(pos / 100) * length} ${
                                                  (1 - pos / 100) * length
                                              }`
                                            : `1 1000000`
                                        : undefined
                                }
                                strokeDashoffset={
                                    length && mode === 'dot'
                                        ? `-${(pos / 100) * length}`
                                        : undefined
                                }
                                stroke="#77f"
                                strokeLinecap="round"
                                strokeWidth={mode === 'dot' ? 20 : 10}
                                fill="none"
                            />
                        </g>
                    </g>
                </g>
            </svg>
            <div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={pos}
                    onChange={(evt) => setPos(+evt.target.value)}
                />
                <span style={{ marginRight: 8 }} />
                {length?.toFixed(0)}
                <span style={{ marginRight: 8 }} />
                <button onClick={() => setTimer(timer === 10 ? null : 10)}>
                    10 minute
                </button>
                <button onClick={() => setTimer(timer === 5 ? null : 5)}>
                    5 minute
                </button>
                <button onClick={() => setTimer(timer === 1 ? null : 1)}>
                    1 minute
                </button>
                <button
                    onClick={() => setMode(mode === 'line' ? 'dot' : 'line')}
                >
                    Line / Dot
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
) => {
    const sectionTheta =
        (section / state.sections.length) * Math.PI * 2 + Math.PI / 2;

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

const DASH = '1 8';
const DASHW = 4;

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
    function addPolar(polar: Polar[], key: string) {
        nodes.push(
            <path
                key={key}
                d={calcPathPartsInner(polar, 0, 0, totalCols).join(' ')}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={DASH}
                stroke={'white'}
                strokeWidth={DASHW}
            />,
        );
    }

    state.sections.forEach(({ pairs, rows }, i) => {
        col = sectionCols[i];
        for (let x = 0; x < bounds.width - 1; x++) {
            for (let y = 0; y < rows; y++) {
                const p1 = pairKey({ x, y }, { x: x - 1, y });
                if (!pairs[p1]) {
                    addPolar(
                        addCircular(
                            dr,
                            r0,
                            bounds.width,
                            state,
                            i,
                            { x: x - 0.5, y: y - 0.5 },
                            { x: x - 0.5, y: y + 0.5 },
                            col,
                        ),
                        p1 + `- ${x} ${y} ${i}`,
                    );
                }
                const p2 = pairKey({ x, y }, { x, y: y + 1 });
                if (x < bounds.width - 2 && y < rows - 1 && !pairs[p2]) {
                    addPolar(
                        addCircular(
                            dr,
                            r0,
                            bounds.width,
                            state,
                            i,
                            { x: x - 0.5, y: y + 0.5 },
                            { x: x + 0.5, y: y + 0.5 },
                            col,
                        ),
                        p2 + `- ${x} ${y} ${i}`,
                    );
                }
            }
        }

        const sectionTheta =
            (i / state.sections.length) * Math.PI * 2 + Math.PI / 2;
        const nsectionTheta =
            ((i + 1) / state.sections.length) * Math.PI * 2 + Math.PI / 2;

        for (let x = 0; x < bounds.width - 1; x++) {
            const k1 = `${i}:${x},${rows - 1}`;
            const k2 = `${(i + 1) % state.sections.length}:${x},${0}`;
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

            nodes.push(
                <path
                    key={`${i} ${x} - connector 2`}
                    data-info={`${p1.t.toFixed(2)} ${p2.t.toFixed(2)} ${(
                        (ang / Math.PI) *
                        180
                    ).toFixed(0)}`}
                    d={calcPathPartsInner([p1, p2], 0, 0, totalCols).join(' ')}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={DASH}
                    stroke={'white'}
                    strokeWidth={DASHW}
                />,
            );
        }
    });
}
