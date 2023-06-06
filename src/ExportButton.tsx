import React from 'react';
import { PREFIX, SUFFIX } from './useDropTarget';
import { State } from './App';

export function ExportButton({
    ref,
    state,
}: {
    ref: React.RefObject<SVGSVGElement>;
    state: State;
}) {
    return (
        <button
            onClick={() => {
                const svg = ref.current!.outerHTML;
                const blob = new Blob(
                    [svg + `\n${PREFIX}${JSON.stringify(state)}${SUFFIX}`],
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
