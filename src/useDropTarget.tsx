import React from 'react';
import { Coord } from './App';

export const useDropTarget = (
    onDrop: (file: File) => void,
): [
    boolean,
    {
        onDragOver: (evt: React.DragEvent) => void;
        onDrop: (evt: React.DragEvent) => void;
    },
] => {
    const [dragging, setDragging] = React.useState(false);

    const tid = React.useRef(null as null | number);

    const callbacks = {
        onDragOver: (evt: React.DragEvent) => {
            evt.stopPropagation();
            setDragging(true);
            evt.preventDefault();
            if (tid.current) {
                clearTimeout(tid.current);
                tid.current = null;
            }
            tid.current = setTimeout(() => {
                setDragging(false);
            }, 300);
        },
        onDrop: (evt: React.DragEvent) => {
            evt.stopPropagation();
            evt.preventDefault();
            setDragging(false);
            onDrop(evt.dataTransfer.files[0]);
        },
    };
    return [dragging, callbacks];
};

export const useDropStateTarget = <State,>(
    onDrop: (state: State | null) => void,
    migrateState: (state: State) => State,
) => {
    return useDropTarget((file) => {
        getStateFromFile<State>(
            file,
            (state) => {
                if (state) {
                    onDrop(migrateState(state));
                } else {
                    onDrop(null);
                }
            },
            null,
            (err) => {
                console.log(err);
                alert(err);
            },
        );
    });
};

// export const useDropStateOrAttachmentTarget = (
//     onDrop: (state: State) => void,
//     onDropAttachment: (name: string, src: string, w: number, h: number) => void,
// ) => {
//     return useDropTarget((file) => {
//         getStateFromFile(
//             file,
//             (state) => {
//                 if (state) {
//                     onDrop(migrateState(state));
//                 }
//             },
//             onDropAttachment,
//             (err) => {
//                 console.log(err);
//                 alert(err);
//             },
//         );
//     });
// };

export const PREFIX = '<!-- STATE: ';
export const SUFFIX = ' -->';

export const getStateFromFile = <State,>(
    file: File,
    done: (s: State | null) => void,
    attachment:
        | null
        | ((name: string, src: string, w: number, h: number) => void),
    err: (message: string) => void,
) => {
    if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = () => {
            const last = (reader.result as string)
                .split('\n')
                .slice(-1)[0]
                .trim();
            if (last.startsWith(PREFIX) && last.endsWith(SUFFIX)) {
                done(JSON.parse(last.slice(PREFIX.length, -SUFFIX.length)));
            } else {
                console.log('not last, bad news');
                console.log(last);
                done(null);
            }
        };
        reader.readAsText(file);
    }
    console.log('nopes', file.type);
};

export function parseAttachment(
    attachment: (name: string, src: string, w: number, h: number) => void,
    file: File,
    err: (message: string) => void,
) {
    const stringReader = new FileReader();
    stringReader.onload = () => {
        var base64data = stringReader.result as string;
        const image = new Image();
        image.src = base64data;
        image.onload = () => {
            attachment(
                file.name,
                base64data,
                image.naturalWidth,
                image.naturalHeight,
            );
        };
        image.onerror = () => {
            err('Unable to load base64 image');
        };
    };
    stringReader.onerror = () => {
        err('error');
    };
    stringReader.readAsDataURL(file);
}
