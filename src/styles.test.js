/**
 * Keeps the bubble style defined once: its colours live only in the --chip-* theme variables (index.css), and
 * every bubble uses the .pm-chip class instead of a look of its own.
 */
const fs = require('fs');
const path = require('path');

const filesUnder = (dir, ext) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(full, ext);
    return full.endsWith(ext) ? [full] : [];
});

const src = __dirname;
const cssFiles = filesUnder(src, '.css');
const jsFiles = filesUnder(src, '.js').filter(f => !f.endsWith('.test.js'));
const read = (file) => fs.readFileSync(file, 'utf8');

test('bubble colours are defined once, as theme variables', () => {
    const bubbleColour = /217,\s*86,\s*22|#E9A07A|#F2B28E/i;
    const offenders = [...cssFiles, ...jsFiles].flatMap(file => read(file).split('\n')
        .map((line, i) => ({ file: path.relative(src, file), line: i + 1, text: line.trim() }))
        .filter(({ text }) => bubbleColour.test(text) && !/^--chip-[a-z-]+:/.test(text)));

    expect(offenders).toEqual([]);
});

test('there is exactly one bubble rule and one person pill rule', () => {
    const bubbles = cssFiles.flatMap(file => read(file).match(/^\.pm-chip\s*\{/gm) || []);
    const pills = cssFiles.flatMap(file => read(file).match(/^\.person-pill\s*\{/gm) || []);
    expect(bubbles).toHaveLength(1);
    expect(pills).toHaveLength(1);
});

test('no component brings back a bubble look of its own', () => {
    const retired = /feed-friend-badge|feed-hosting-pill|profile-friend-badge|chipStyle|tagChipStyle/;
    const offenders = [...cssFiles, ...jsFiles].filter(file => retired.test(read(file))).map(f => path.relative(src, f));
    expect(offenders).toEqual([]);
});
