import { Coord, State } from './App';

export const sectionMap = (
    sections: number[],
    size: State['size'],
    dr: number,
) => {
    const mapping: { [pos: string]: Coord } = {};
    for (let x = 0; x < size.width; x++) {
        for (let y = 0; y < size.height; y++) {}
    }
};
