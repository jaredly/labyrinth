import React from 'react';
import { PREFIX, SUFFIX } from './useDropTarget';
import hash from 'object-hash';

export function ExportButton({
    svg,
    csvg,
    state,
}: {
    svg: React.RefObject<SVGSVGElement>;
    csvg: React.RefObject<SVGSVGElement>;
    state: any;
}) {
    return (
        <button
            onClick={() => {
                const theHash = hash(JSON.stringify(state));
                const blob = new Blob(
                    [
                        `<svg height="${Math.max(
                            +csvg.current?.getAttribute('height')!,
                            +svg.current?.getAttribute('height')!,
                        )}" width="${
                            +csvg.current!.getAttribute('width')! +
                            +svg.current!.getAttribute('width')!
                        }" xmlns="http://www.w3.org/2000/svg" style="background: black">
                    ${svg.current!.innerHTML}
                    <g transform="translate(${svg.current!.getAttribute(
                        'width',
                    )} 0)">
                    ${csvg.current!.outerHTML}
                    </g>
                    </svg>\n${PREFIX}${JSON.stringify(state)}${SUFFIX}`,
                    ],
                    {
                        type: 'image/svg+xml',
                    },
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `labyrinth-${theHash}.svg`;
                a.click();
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 100);
            }}
        >
            Export
        </button>
    );
}

export function ExportJSONButton({ state }: { state: any }) {
    return (
        <button
            onClick={() => {
                const theHash = hash(JSON.stringify(state));
                const blob = new Blob([JSON.stringify(state, null, 2)], {
                    type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `labyrinth-${theHash}.json`;
                a.click();
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 100);
            }}
        >
            Export JSON
        </button>
    );
}
