import React from 'react';
import { calcLocation } from './sections';
import { calcPathPartsInner } from './calcPath';
import {
    State,
    Action,
    Section,
    Grouped,
    Coord,
    pairKey,
    missing,
    ungroup,
} from './App2';

export function renderCircular(
    state: State,
    width: number,
    dispatch: React.Dispatch<Action>,
    sections: Section[],
    singles: { [key: string]: boolean },
) {
    const VW = 300;
    const vm = 5;

    const R = VW / 2;
    const dr = R / (width + (state.inner ?? 1) + 1);
    const r0 = state.inner ?? 1;

    const circular: Grouped = { slop: [], back: [], mid: [], front: [] };
    const addCircular = (
        section: number,
        p1: Coord,
        p2: Coord,
        pairs: State['sections'][0]['pairs'],
    ) => {
        const sectionTheta =
            (section / state.sections.length) * Math.PI * 2 + Math.PI / 2;

        const pk = pairKey(p1, p2);
        const pos = pairs[pk] ? 'front' : 'back';

        // console.log(sm);
        circular[pos].push(
            <path
                key={`${section} ${pk}`}
                data-pk={pk}
                d={calcPathPartsInner(
                    [
                        calcLocation({
                            pos: { x: width - p1.x, y: p1.y },
                            sectionTheta,
                            dr,
                            r0,
                            rows: state.sections[section].rows,
                        }),
                        calcLocation({
                            pos: { x: width - p2.x, y: p2.y },
                            sectionTheta,
                            dr,
                            r0,
                            rows: state.sections[section].rows,
                        }),
                    ],
                    VW / 2,
                    VW / 2,
                ).paths.join(' ')}
                strokeLinecap="round"
                fill="none"
                stroke={pairs[pk] ? 'blue' : missing}
                strokeWidth={3}
                onClick={() =>
                    dispatch({
                        type: 'toggle',
                        pair: pk,
                        section,
                    })
                }
                style={{ cursor: 'pointer' }}
            />,
        );
    };

    sections.forEach(({ pairs, rows }, i) => {
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < rows; y++) {
                if (y < rows - 1) {
                    addCircular(i, { x, y }, { x, y: y + 1 }, pairs);
                }
                if (x < width - 1) {
                    addCircular(i, { x, y }, { x: x + 1, y }, pairs);
                }
            }
        }

        const sectionTheta = (i / sections.length) * Math.PI * 2 + Math.PI / 2;
        const nsectionTheta =
            ((i + 1) / sections.length) * Math.PI * 2 + Math.PI / 2;
        // console.log(singles);
        for (let x = 0; x < width; x++) {
            const k1 = `${i}:${x},${rows - 1}`;
            const k2 = `${(i + 1) % sections.length}:${x},${0}`;
            const needed = singles[k1] || singles[k2];
            // console.log(k1, k2, singles[k1], singles[k2]);
            // if (!needed) continue;
            circular.mid.push(
                <path
                    key={`${i} ${x} - connector`}
                    d={calcPathPartsInner(
                        [
                            calcLocation({
                                pos: { x: width - x, y: rows - 1 },
                                sectionTheta,
                                dr,
                                r0,
                                rows: sections[i].rows,
                            }),
                            calcLocation({
                                pos: { x: width - x, y: 0 },
                                sectionTheta: nsectionTheta,
                                dr,
                                r0,
                                rows: sections[(i + 1) % sections.length].rows,
                            }),
                        ],
                        VW / 2,
                        VW / 2,
                        true,
                    ).paths.join(' ')}
                    strokeLinecap="round"
                    fill="none"
                    stroke={needed ? 'blue' : '#300'}
                    strokeWidth={3}
                />,
            );
        }
    });

    return (
        <svg
            width={VW + vm * 2}
            height={VW + vm * 2}
            style={{ marginTop: 50 - vm, backgroundColor: '#0a0a0a' }}
        >
            <g transform={`translate(${vm},${vm})`}>{ungroup(circular)}</g>
        </svg>
    );
}
