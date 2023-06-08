import React from 'react';
import { PREFIX, SUFFIX } from './useDropTarget';
import { H, State, W } from './App';

export function ExportButton({
    svg,
    csvg,
    state,
}: {
    svg: React.RefObject<SVGSVGElement>;
    csvg: React.RefObject<SVGSVGElement>;
    state: State;
}) {
    return (
        <button
            onClick={() => {
                const svgText = svg.current!.outerHTML;
                const blob = new Blob(
                    [
                        `<svg height="${H}" width="${
                            W * 2
                        }" xmlns="http://www.w3.org/2000/svg">
                    ${svg.current!.innerHTML}
                    <g transform="translate(${W} 0)">
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
                a.download = `labyrinth-${Date.now()}.svg`;
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
