const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadScripts } = require('./helpers/load-script.cjs');

const { FileReaderModule: reader } = loadScripts('fileReader');
const knetSample = fs.readFileSync(path.join(__dirname, '../sample/K-net.EW'), 'utf8');

function values(text, options) {
    return Array.from(reader.parseData(text, options));
}

test('single-column data tolerates BOM, indentation, comments and blank physical lines', () => {
    assert.deepEqual(values('\uFEFF  1.25\r\n\r\n# explanation\r\n -2e-3\r\n// note\r\n .5  '), [1.25, -0.002, 0.5]);
});

test('header skip counts physical lines before filtering blanks or comments', () => {
    assert.deepEqual(values('header\n\n# note\n1\n2', { skipHeader: 3 }), [1, 2]);
    assert.throws(() => values('header\n\nbad\n1', { skipHeader: 2 }), /3行目/);
});

test('malformed values fail on their physical line instead of shortening the signal', () => {
    for (const bad of ['2abc', 'NaN', 'Infinity', '1e999', '1e', '--2', '0x10']) {
        assert.throws(() => values(`1\n\n${bad}\n3`), /3行目/);
    }
});

test('complete numeric parsing supports scientific notation and valid thousands grouping', () => {
    for (const [token, expected] of [['+1.2E+2', 120], ['.25', 0.25], ['1,234.56', 1234.56], ['-12,345,678e-2', -123456.78]]) {
        assert.equal(reader.parseNumber(token), expected);
    }
    for (const invalid of ['', '12,34', '1234,567', '1,000junk', '2e+', 'Infinity']) {
        assert.ok(Number.isNaN(reader.parseNumber(invalid)), invalid);
    }
    assert.deepEqual(values('1,234.56\n-2,345.67'), [1234.56, -2345.67]);
});

test('explicit column selection disambiguates numeric CSV and trims whitespace', () => {
    assert.deepEqual(values(' 0,123\n 1,456', { columnIndex: 1 }), [123, 456]);
    assert.deepEqual(values('0,123\n1,456', { delimiter: ',' }), [0, 1]);
    assert.deepEqual(values(' 0    1.5\n 1   2.5', { columnIndex: 1 }), [1.5, 2.5]);
    assert.deepEqual(values('0\t1.5\n1\t2.5', { columnIndex: 1 }), [1.5, 2.5]);
    assert.deepEqual(values('0;1.5\n1;2.5', { columnIndex: 1 }), [1.5, 2.5]);
});

test('quoted CSV numeric fields preserve internal grouping commas', () => {
    assert.deepEqual(values('"1,234.56"\n"2,345.67"'), [1234.56, 2345.67]);
    assert.deepEqual(values('0,"1,234.56"\n1,"2,345.67"', { columnIndex: 1 }), [1234.56, 2345.67]);
    assert.throws(() => values('0,"1,234.56\n1,2', { columnIndex: 1 }), /1行目/);
});

test('missing cells and invalid parser options are rejected', () => {
    assert.throws(() => values('0,1\n1,\n2,3', { columnIndex: 1 }), /2行目、2列目/);
    assert.throws(() => values('0,1\n1', { columnIndex: 1 }), /2行目、2列目/);
    for (const skipHeader of [-1, 0.5, NaN]) {
        assert.throws(() => values('1\n2', { skipHeader }), /整数/);
    }
    assert.throws(() => values('1\n2', { columnIndex: -1 }), /整数/);
    assert.throws(() => values('1\n2', { delimiter: '||' }), /1文字/);
    assert.throws(() => values('# only comments\n\n'), /見つかりません/);
});

test('bundled one-column sample is unchanged', () => {
    const sample = fs.readFileSync(path.join(__dirname, '../sample/sample_data.csv'), 'utf8');
    const expected = sample.trim().split(/\r?\n/).map(Number);
    assert.deepEqual(values(sample), expected);
});

test('bundled K-net record parses all samples with validated metadata and scale', () => {
    const { data, metadata } = reader.parse(knetSample);
    assert.equal(data.length, 6000);
    assert.equal(metadata.isKnet, true);
    assert.equal(metadata.samplingRate, 100);
    assert.equal(metadata.scaleFactor, 7845 / 8223790);
    assert.equal(metadata.duration, 60);
    assert.equal(metadata.stationCode, 'KGS031');
    assert.equal(metadata.direction, 'E-W');
    assert.equal(data[0], -734 * (7845 / 8223790));
    assert.ok(data.every(Number.isFinite));
});

test('short K-net files are detected without requiring three rows of samples', () => {
    const short = knetSample.split(/\r?\n/).slice(0, 18).join('\n');
    assert.equal(reader.isKnetFormat(short), true);
    assert.equal(reader.parseData(short).length, 8);
});

test('K-net rejects missing, zero, negative and nonfinite sampling rates', () => {
    for (const rate of ['0', '-100', 'Infinity', '1e999', 'bad']) {
        assert.throws(() => reader.parseData(knetSample.replace('100Hz', `${rate}Hz`)), /サンプリング周波数/);
    }
    assert.throws(() => reader.parseData(knetSample.replace('Sampling Freq(Hz) 100Hz', 'Missing sampling rate')), /サンプリング周波数/);
});

test('K-net rejects missing and invalid scale factors rather than using unit scale', () => {
    for (const scale of ['7845(gal)/0', '-1(gal)/2', '0(gal)/2', '1e309(gal)/2', '1e308(gal)/1e-308', '1(gal)/1e999', 'broken']) {
        assert.throws(() => reader.parseData(knetSample.replace('7845(gal)/8223790', scale)), /スケールファクター/);
    }
    assert.throws(() => reader.parseData(knetSample.replace('Scale Factor      7845(gal)/8223790', 'Missing scale factor')), /スケールファクター/);
});

test('K-net rejects invalid sample tokens and scaling overflow', () => {
    assert.throws(() => reader.parseData(knetSample.replace('-734', '-734bad')), /18行目/);
    const overflow = knetSample.replace('7845(gal)/8223790', '1e308(gal)/1');
    assert.throws(() => reader.parseData(overflow), /18行目/);
});

test('loadFile reads and parses the record once and preserves ordinary metadata shape', async () => {
    const { FileReaderModule: isolatedReader } = loadScripts('fileReader');
    let reads = 0;
    isolatedReader.readAsText = async () => {
        reads++;
        return '1\n2';
    };
    const result = await isolatedReader.loadFile({ name: 'record.csv' });
    assert.equal(reads, 1);
    assert.deepEqual(Array.from(result.data), [1, 2]);
    assert.equal(result.metadata.isKnet, false);
    assert.equal(result.metadata.samplingRate, null);
});
