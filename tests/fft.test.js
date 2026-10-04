const assert = require('node:assert/strict');
const test = require('node:test');
const { loadScripts } = require('./helpers/load-script.cjs');

function close(actual, expected, tolerance = 1e-10) {
    assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
        `expected ${expected}, received ${actual}`);
}

function directDft(real, imag = new Array(real.length).fill(0)) {
    return Array.from({ length: real.length }, (_, k) => {
        let re = 0;
        let im = 0;
        for (let j = 0; j < real.length; j++) {
            const angle = -2 * Math.PI * k * j / real.length;
            re += real[j] * Math.cos(angle) - imag[j] * Math.sin(angle);
            im += real[j] * Math.sin(angle) + imag[j] * Math.cos(angle);
        }
        return { re, im };
    });
}

function windowReference(length, type) {
    return Array.from({ length }, (_, i) => {
        if (length <= 2 || type === 'rectangular') {
            return 1;
        }
        const angle = 2 * Math.PI * i / (length - 1);
        if (type === 'hanning' || type === 'hann') {
            return 0.5 - 0.5 * Math.cos(angle);
        }
        if (type === 'hamming') {
            return 0.54 - 0.46 * Math.cos(angle);
        }
        return 0.42 - 0.5 * Math.cos(angle) + 0.08 * Math.cos(2 * angle);
    });
}

test('FFT agrees with a direct complex DFT at power-of-two lengths', () => {
    const { FFT } = loadScripts('fft');
    for (const length of [1, 2, 4, 8, 16, 32]) {
        const real = Array.from({ length }, (_, i) => Math.sin(i * 1.7) + i / 7);
        const imag = Array.from({ length }, (_, i) => Math.cos(i * 0.3));
        const expected = directDft(real, imag);
        FFT.transform(real, imag);
        expected.forEach(({ re, im }, i) => {
            close(real[i], re);
            close(imag[i], im);
        });
    }
});

test('all windows agree with direct DFT scaling before and after zero padding', () => {
    const { FFT } = loadScripts('fft');
    for (const length of [15, 16]) {
        const data = Array.from({ length }, (_, i) => Math.sin(i * 1.4) + 0.3 * i);
        const original = [...data];
        for (const windowType of ['rectangular', 'hann', 'hanning', 'hamming', 'blackman']) {
            const coefficients = windowReference(length, windowType);
            const windowSum = coefficients.reduce((sum, value) => sum + value, 0);
            const padded = new Array(16).fill(0);
            data.forEach((value, i) => {
                padded[i] = value * coefficients[i];
            });
            const expected = directDft(padded);
            for (const normalize of [true, false]) {
                const spectrum = FFT.amplitudeSpectrum(data, 80, { windowType, normalize });
                assert.equal(spectrum.frequencies.length, 9);
                spectrum.amplitudes.forEach((amplitude, i) => {
                    const scale = normalize ? (i === 0 || i === 8 ? 1 : 2) / windowSum : 1;
                    close(amplitude, Math.hypot(expected[i].re, expected[i].im) * scale);
                    close(spectrum.frequencies[i], i * 5);
                });
            }
        }
        assert.deepEqual(data, original);
    }
});

test('known sinusoid peak amplitude survives padding and every supported window', () => {
    const { FFT } = loadScripts('fft');
    for (const length of [520, 1000, 1024]) {
        const data = Array.from({ length }, (_, i) => 2 * Math.sin(2 * Math.PI * i / 8));
        for (const windowType of ['rectangular', 'hanning', 'hamming', 'blackman']) {
            const { frequencies, amplitudes } = FFT.amplitudeSpectrum(data, 128, { windowType });
            const peak = FFT.findPeakFrequency(frequencies, amplitudes);
            close(peak.frequency, 16);
            close(peak.amplitude, 2, 1e-6);
        }
    }
});

test('DC and Nyquist amplitudes are not doubled', () => {
    const { FFT } = loadScripts('fft');
    for (const length of [1000, 1024]) {
        for (const windowType of ['rectangular', 'hanning', 'hamming', 'blackman']) {
            const constant = new Array(length).fill(3);
            const alternating = constant.map((value, i) => i % 2 === 0 ? value : -value);
            const dc = FFT.amplitudeSpectrum(constant, 100, { windowType });
            const nyquist = FFT.amplitudeSpectrum(alternating, 100, { windowType });
            close(dc.amplitudes[0], 3);
            close(nyquist.amplitudes.at(-1), 3);
            close(nyquist.frequencies.at(-1), 50);
        }
    }
});

test('one and two samples use a rectangular window with finite amplitudes', () => {
    const { FFT } = loadScripts('fft');
    for (const windowType of ['hanning', 'hann', 'hamming', 'blackman', 'rectangular']) {
        const one = FFT.amplitudeSpectrum([-3], 100, { windowType });
        assert.deepEqual(Array.from(one.frequencies), [0]);
        assert.deepEqual(Array.from(one.amplitudes), [3]);
        const two = FFT.amplitudeSpectrum([3, -1], 100, { windowType });
        assert.deepEqual(Array.from(two.frequencies), [0, 50]);
        assert.deepEqual(Array.from(two.amplitudes), [1, 2]);
    }
});

test('power spectrum retains the documented squared-peak-amplitude convention', () => {
    const { FFT } = loadScripts('fft');
    const data = Array.from({ length: 64 }, (_, i) => 3 * Math.sin(2 * Math.PI * i / 8));
    const spectrum = FFT.powerSpectrum(data, 64, { windowType: 'rectangular' });
    close(spectrum.powers[8], 9);
});

test('invalid data and sampling rates are rejected before calculation', () => {
    const { FFT } = loadScripts('fft');
    for (const data of [[], null, '123', [NaN], [Infinity], [-Infinity], ['1'], new Array(2)]) {
        assert.throws(() => FFT.amplitudeSpectrum(data, 100), /FFT/);
    }
    for (const rate of [0, -1, NaN, Infinity, -Infinity, '100', undefined]) {
        assert.throws(() => FFT.amplitudeSpectrum([1, 2], rate), /サンプリング/);
    }
});

test('peak search is finite when no eligible bin exists and ignores invalid amplitudes', () => {
    const { FFT } = loadScripts('fft');
    const empty = FFT.findPeakFrequency([0], [3]);
    assert.equal(empty.frequency, 0);
    assert.equal(empty.amplitude, 0);
    assert.equal(empty.index, -1);
    const peak = FFT.findPeakFrequency([1, 2, 3, 4, NaN, 5], [NaN, Infinity, -2, 0, 9, 2]);
    assert.equal(peak.frequency, 5);
    assert.equal(peak.amplitude, 2);
    assert.equal(peak.index, 5);
    assert.equal(FFT.findPeakFrequency([1, 2], [0, 0]).index, 0);
});
