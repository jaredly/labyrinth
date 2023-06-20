import { Section, parsePairs } from './App2';

export const organizeLine = (
    rings: number,
    sections: Section[],
    singles: { [key: string]: number },
) => {
    // const withConnectors = { ...singles };
    const connected: { [key: string]: string[] } = {};
    const connect = (k1: string, k2: string) => {
        if (!connected[k1]) {
            connected[k1] = [k2];
        } else {
            connected[k1].push(k2);
        }
        if (!connected[k2]) {
            connected[k2] = [k1];
        } else {
            connected[k2].push(k1);
        }
    };

    sections.forEach(({ pairs, rows }, i) => {
        for (let ring = 0; ring < rings; ring++) {
            const k = `${i}:${ring},${rows - 1}`;
            const sn = (i + 1) % sections.length;
            const k2 = `${sn}:${ring},${0}`;
            if (singles[k] || singles[k2]) {
                connect(k, k2);
            }
        }

        parsePairs(pairs).forEach(([p1, p2]) => {
            connect(`${i}:${p1.x},${p1.y}`, `${i}:${p2.x},${p2.y}`);
        });
    });

    const next = () => {
        return Object.entries(connected)
            .filter(([_, v]) => v.length === 1)
            .map(([k, v]) => ({ k, ring: +k.split(':')[1].split(',')[0] }))
            .sort((a, b) => a.ring - b.ring)[0]?.k;
    };
    const first = next();
    if (!first) {
        return null;
    }
    const lines: string[][] = [[first]];

    while (true) {
        const line = lines[lines.length - 1];
        const last = line[line.length - 1];
        if (connected[last].length !== 1) {
            const first = next();
            if (!first) {
                break;
            }
            delete connected[last];
            lines.push([first]);
            continue;
        }
        const got = connected[last][0];
        delete connected[last];
        connected[got] = connected[got].filter((k) => k !== last);
        line.push(got);
    }

    Object.keys(connected).forEach((k) => lines.push([k]));

    return lines;
};
