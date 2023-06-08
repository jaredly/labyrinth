import React from 'react';
import {
    Mouse,
    Coord,
    Action,
    State,
    mx,
    W,
    H,
    mousePos,
    my,
    snapPos,
    Grid,
} from './App';
import { rainbow } from './calcPath';

export function CartesianEdits({
    setMouse,
    mode,
    moving,
    dx,
    dy,
    setMoving,
    dispatch,
    state,
    mouse,
    movedPoints,
    cref,
    color,
}: {
    setMouse: React.Dispatch<React.SetStateAction<Mouse | null>>;
    cref: React.RefObject<SVGSVGElement>;
    mode: string;
    color: boolean;
    moving: { i: number; from: Coord; to: Coord } | null;
    dx: number;
    dy: number;
    setMoving: React.Dispatch<
        React.SetStateAction<{ i: number; from: Coord; to: Coord } | null>
    >;
    dispatch: React.Dispatch<Action>;
    state: State;
    mouse: Mouse | null;
    movedPoints: Coord[];
}) {
    const crossLines: JSX.Element[] = [];
    state.sections.forEach((s, i) => {
        s = state.size.height - 1 - s;
        if (i % 2 === 1) {
            for (let x = 0; x < state.size.width; x++) {
                crossLines.push(
                    <line
                        key={`${i}:${x}`}
                        x1={x * dx}
                        x2={x * dx}
                        y1={(s - 0.5) * dy}
                        y2={(s + 0.5) * dy}
                        stroke="gray"
                        strokeWidth={2}
                    />,
                );
            }
        }
    });

    const sectionDots = [];
    for (let i = -0.5; i < state.size.height + 0.5; i += 1) {
        const idx = state.sections.indexOf(i);
        sectionDots.push(
            <circle
                key={i}
                cx={-mx / 2}
                cy={dy * (state.size.height - 1 - i)}
                r={4}
                fill={idx !== -1 ? (idx % 2 === 0 ? 'red' : 'blue') : 'gray'}
                onClick={(evt) => {
                    evt.stopPropagation();
                    evt.preventDefault();
                    let s = state.sections.slice();
                    if (s.includes(i)) {
                        s = s.filter((n) => n !== i);
                    } else {
                        s.push(i);
                        s.sort((a, b) => a - b);
                    }
                    dispatch({ type: 'sections', sections: s });
                }}
                style={{ cursor: 'pointer' }}
            />,
        );
    }

    return (
        <svg
            style={{ border: '1px solid magenta' }}
            onMouseLeave={() => setMouse(null)}
            width={W}
            height={H}
            onMouseMove={(evt) => {
                if (mode === 'add') {
                    setMouse({ pos: mousePos(evt, mx, my) });
                } else if (moving) {
                    const pos = snapPos(mousePos(evt, mx, my), dx, dy);
                    // console.log('moved', pos);
                    // const current = state.points[moving.i];
                    // if (pos.x !== current.x || pos.y !== current.y) {
                    //     dispatch({ type: 'move', i: moving.i, pos });
                    // }
                    setMoving((m) => (m ? { ...m, to: pos } : m));
                }
            }}
            onMouseUp={() => {
                if (moving) {
                    setMoving(null);
                    dispatch({
                        type: 'move',
                        from: moving.from,
                        to: moving.to,
                    });
                }
            }}
            onClick={(evt) => {
                if (mode === 'add') {
                    dispatch({
                        type: 'click',
                        pos: snapPos(mousePos(evt, mx, my), dx, dy),
                    });
                }
            }}
        >
            <g transform={`translate(${mx}, ${my})`}>
                {crossLines}
                <Grid size={state.size} dx={dx} dy={dy} />
                {sectionDots}
            </g>
            <g transform={`translate(${mx}, ${my})`} ref={cref}>
                {color
                    ? movedPoints.map((p, i) =>
                          i === 0 ? null : (
                              <line
                                  x1={movedPoints[i - 1].x * dx}
                                  y1={movedPoints[i - 1].y * dy}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  x2={p.x * dx}
                                  y2={p.y * dy}
                                  stroke={rainbow(i / movedPoints.length)}
                                  strokeWidth={8}
                              />
                          ),
                      )
                    : null}
                <polyline
                    stroke="blue"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={color ? 2 : 5}
                    points={movedPoints
                        .map((p) => `${p.x * dx},${p.y * dy}`)
                        .join(' ')}
                    fill="none"
                />
                {movedPoints.length ? (
                    <rect
                        x={movedPoints[0].x * dx - 8}
                        y={movedPoints[0].y * dy - 8}
                        width={16}
                        height={16}
                        fill="blue"
                    />
                ) : null}
                {movedPoints.length ? (
                    <circle
                        cx={movedPoints[movedPoints.length - 1].x * dx}
                        cy={movedPoints[movedPoints.length - 1].y * dy}
                        r={8}
                        fill="blue"
                    />
                ) : null}
            </g>
            <g transform={`translate(${mx}, ${my})`}>
                {state.sections.map((s, i) => (
                    <line
                        key={i}
                        x1={0}
                        x2={(state.size.width - 1) * dx}
                        y1={(state.size.height - 1 - s) * dy}
                        y2={(state.size.height - 1 - s) * dy}
                        stroke={i % 2 === 0 ? 'red' : 'blue'}
                        strokeDasharray={i % 2 === 0 ? '' : '4 4'}
                        strokeWidth={2}
                    />
                ))}
                {mode === 'move' ? (
                    <g>
                        {movedPoints.map(({ x, y }, i) => (
                            <circle
                                key={i}
                                cx={x * dx}
                                cy={y * dy}
                                r={4}
                                fill={
                                    state.selection.includes(i)
                                        ? 'green'
                                        : 'blue'
                                }
                                onMouseDown={(evt) => {
                                    if (!state.selection.includes(i)) {
                                        dispatch({
                                            type: 'select',
                                            selection: evt.shiftKey
                                                ? state.selection.concat([i])
                                                : [i],
                                        });
                                    } else if (evt.shiftKey) {
                                        dispatch({
                                            type: 'select',
                                            selection: state.selection.filter(
                                                (s) => s !== i,
                                            ),
                                        });
                                    }
                                    const pos = { x, y };
                                    setMoving({
                                        i,
                                        from: pos,
                                        to: pos,
                                    });
                                }}
                                onClick={(evt) => {
                                    if (!evt.shiftKey) {
                                        dispatch({
                                            type: 'select',
                                            selection: [i],
                                        });
                                    }
                                    // if (evt.shiftKey) {
                                    //     dispatch({
                                    //         type: 'select',
                                    //         selection: state.selection.includes(
                                    //             i,
                                    //         )
                                    //             ? state.selection.filter(
                                    //                   (s) => s !== i,
                                    //               )
                                    //             : state.selection.concat([i]),
                                    //     });
                                    // } else {
                                    //     dispatch({
                                    //         type: 'select',
                                    //         selection: [i],
                                    //     });
                                    // }
                                }}
                            />
                        ))}
                    </g>
                ) : null}
            </g>
        </svg>
    );
}
