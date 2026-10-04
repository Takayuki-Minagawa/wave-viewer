const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { loadScripts } = require('./helpers/load-script.cjs');

class Element {
    constructor(tagName = 'DIV') {
        this.tagName = tagName;
        this.textContent = '';
        this.value = '';
        this.disabled = false;
        this.checked = false;
        this.style = {};
        this.attributes = new Map();
        this.listeners = new Map();
        this.children = [];
        const classes = new Set();
        this.classList = {
            add: name => classes.add(name),
            remove: name => classes.delete(name),
            contains: name => classes.has(name),
            toggle(name, enabled) {
                if (enabled) {
                    classes.add(name);
                } else {
                    classes.delete(name);
                }
            }
        };
    }

    setAttribute(name, value) {
        this.attributes.set(name, value);
    }

    getAttribute(name) {
        return this.attributes.get(name);
    }

    addEventListener(name, listener) {
        if (!this.listeners.has(name)) {
            this.listeners.set(name, []);
        }
        this.listeners.get(name).push(listener);
    }

    emit(name, detail = {}) {
        return (this.listeners.get(name) || []).map(listener => listener({ target: this, ...detail }));
    }

    querySelector() {
        return this.span;
    }

    appendChild(child) {
        this.children.push(child);
    }

    removeChild(child) {
        this.children.splice(this.children.indexOf(child), 1);
    }

    click() {
        return this.emit('click');
    }
}

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

function responseResult() {
    return {
        periods: [0.1, 1],
        dampings: [0.05],
        acceleration: [[1, 2]],
        velocity: [[0.1, 0.2]],
        displacement: [[0.01, 0.02]]
    };
}

// The controls use real numerical and translation modules; only browser I/O is mocked.
function createApp() {
    const context = loadScripts('analysis', 'fft', 'i18n');
    const elements = new Map();
    const get = id => {
        if (!elements.has(id)) {
            elements.set(id, new Element());
        }
        return elements.get(id);
    };
    get('samplingRate').value = '8';
    get('skipHeader').value = '0';
    get('dataUnit').value = 'm/s2';
    get('windowType').value = 'hanning';
    get('analyzeBtn').span = new Element('SPAN');
    get('analyzeBtn').span.setAttribute('data-i18n', 'controls.analyzeBtn');
    get('fileName').setAttribute('data-i18n', 'controls.fileNotSelected');
    for (const id of ['chartsSection', 'statsSection', 'exportSection', 'cancelAnalysis']) {
        get(id).classList.add('hidden');
    }

    const downloads = [];
    const blobs = new Map();
    const alerts = [];
    const reads = [];
    const workers = [];
    const chartCalls = [];
    const computeCalls = [];
    const fftCalls = [];
    const integrationCalls = [];
    const storage = new Map();
    let initialize;
    const document = {
        addEventListener(name, listener) {
            assert.equal(name, 'DOMContentLoaded');
            initialize = listener;
        },
        getElementById: get,
        querySelectorAll: () => [get('fileName'), get('analyzeBtn').span],
        querySelector: () => null,
        documentElement: {},
        body: new Element('BODY'),
        createElement(tagName) {
            const element = new Element(tagName.toUpperCase());
            if (tagName === 'a') {
                element.addEventListener('click', () => {
                    downloads.push({
                        filename: element.getAttribute('download'),
                        blob: blobs.get(element.getAttribute('href'))
                    });
                });
            }
            return element;
        }
    };
    class Worker {
        constructor() {
            this.terminated = false;
            workers.push(this);
        }

        postMessage(message) {
            this.message = message;
        }

        terminate() {
            this.terminated = true;
        }

        succeed(result = responseResult()) {
            this.onmessage?.({ data: { ok: true, result } });
        }

        fail(message = 'worker failed') {
            this.onerror?.({ message });
        }
    }
    const charts = {};
    for (const method of [
        'createWaveformChart', 'createVelocityChart', 'createDisplacementChart',
        'createSpectrumChart', 'createResponseAccelerationChart',
        'createResponseVelocityChart', 'createResponseDisplacementChart',
        'updateSpectrumChart', 'resetWaveformZoom', 'resetVelocityZoom',
        'resetDisplacementZoom', 'resetSpectrumZoom', 'resetResponseAccelerationZoom',
        'resetResponseVelocityZoom', 'resetResponseDisplacementZoom'
    ]) {
        charts[method] = (...args) => chartCalls.push({ method, args });
    }
    const amplitudeSpectrum = context.FFT.amplitudeSpectrum;
    context.FFT.amplitudeSpectrum = function(...args) {
        fftCalls.push(args);
        return amplitudeSpectrum.apply(this, args);
    };
    const integrate = context.Analysis.computeVelocityAndDisplacement;
    context.Analysis.computeVelocityAndDisplacement = function(...args) {
        integrationCalls.push(args);
        return integrate.apply(this, args);
    };
    Object.assign(context, {
        document,
        Worker,
        DOMException,
        Blob,
        URL: {
            createObjectURL(blob) {
                const url = `blob:${blobs.size}`;
                blobs.set(url, blob);
                return url;
            },
            revokeObjectURL: url => blobs.delete(url)
        },
        localStorage: {
            getItem: key => storage.get(key),
            setItem: (key, value) => storage.set(key, value)
        },
        alert: message => alerts.push(message),
        console: { log() {}, warn() {}, error() {} },
        WaveformChart: charts,
        FileReaderModule: {
            isValidFileType: () => true,
            loadFile(file, options) {
                const read = { file, options, ...deferred() };
                reads.push(read);
                return read.promise;
            }
        },
        ResponseSpectrum: {
            compute(...args) {
                computeCalls.push(args);
                return responseResult();
            }
        }
    });
    const filename = path.join(__dirname, '../js/main.js');
    vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
    initialize();
    return {
        context, get, alerts, reads, workers, chartCalls, downloads, fftCalls,
        integrationCalls, computeCalls,
        choose(name) {
            get('fileInput').files = [{ name }];
            get('fileInput').emit('change');
            return reads.at(-1);
        }
    };
}

// Drain promise continuations without introducing timing-sensitive sleeps.
function settle() {
    return new Promise(resolve => setImmediate(resolve));
}

const signal = [0, 2, 0, -2, 0, 2, 0, -2];

async function loadUntilWorker(app, name = 'signal.csv', data = signal, metadata = {}) {
    app.choose(name).resolve({ data, metadata });
    await settle();
    return app.workers.at(-1);
}

async function complete(app, name, data = signal) {
    const worker = await loadUntilWorker(app, name, data);
    worker.succeed();
    await settle();
    assert.equal(app.get('chartsSection').classList.contains('hidden'), false);
}

function assertNoResults(app) {
    for (const id of ['chartsSection', 'statsSection', 'exportSection']) {
        assert.equal(app.get(id).classList.contains('hidden'), true, `${id} must be hidden`);
    }
    const previousDownloads = app.downloads.length;
    app.get('exportAcceleration').click();
    app.get('exportFourier').click();
    app.get('exportResponseSpectra').click();
    assert.equal(app.downloads.length, previousDownloads);
}

test('out-of-order file reads render only the most recently selected file', async () => {
    const app = createApp();
    const first = app.choose('A.csv');
    const second = app.choose('B.csv');
    const secondSignal = signal.map(value => value * 3);
    second.resolve({ data: secondSignal, metadata: {} });
    await settle();
    app.workers[0].succeed();
    await settle();
    first.resolve({ data: signal, metadata: {} });
    await settle();
    const waveforms = app.chartCalls.filter(call => call.method === 'createWaveformChart');
    assert.equal(waveforms.length, 1);
    assert.deepEqual(waveforms[0].args[1], secondSignal);
    assert.equal(app.workers.length, 1);
    assert.equal(app.get('fileName').textContent, 'B.csv');
    assert.equal(app.get('analyzeBtn').disabled, false);
    app.get('exportAcceleration').click();
    assert.match(await app.downloads[0].blob.text(), /0.125000,6\n/);
});

test('selecting another file cancels the old worker without fallback or stale results', async () => {
    const app = createApp();
    const oldWorker = await loadUntilWorker(app, 'A.csv');
    const second = app.choose('B.csv');
    await settle();
    assert.equal(oldWorker.terminated, true);
    assert.equal(oldWorker.onmessage, null);
    assert.equal(oldWorker.onerror, null);
    assert.equal(app.computeCalls.length, 0);
    assert.equal(app.chartCalls.length, 0);
    assert.equal(app.get('analyzeBtn').disabled, true);
    assertNoResults(app);
    second.resolve({ data: signal.map(value => value * 4), metadata: {} });
    await settle();
    app.workers[1].succeed();
    await settle();
    assert.equal(app.chartCalls.filter(call => call.method === 'createWaveformChart').length, 1);
    assert.equal(app.get('fileName').textContent, 'B.csv');
    assert.equal(app.computeCalls.length, 0);
});

test('explicit cancellation clears results, settles a worker, and permits reanalysis', async () => {
    const app = createApp();
    await complete(app, 'signal.csv');
    const [cancelledAnalysis] = app.get('analyzeBtn').click();
    app.reads.at(-1).resolve({ data: signal, metadata: {} });
    await settle();
    const pendingWorker = app.workers.at(-1);
    app.get('cancelAnalysis').click();
    await cancelledAnalysis;
    assert.equal(pendingWorker.terminated, true);
    assert.equal(pendingWorker.onmessage, null);
    assert.equal(app.get('analyzeBtn').disabled, false);
    assert.equal(app.get('windowType').disabled, false);
    assert.equal(app.get('cancelAnalysis').classList.contains('hidden'), true);
    assert.equal(app.get('chartsSection').getAttribute('aria-busy'), 'false');
    assertNoResults(app);
    const [reanalysis] = app.get('analyzeBtn').click();
    app.reads.at(-1).resolve({ data: signal, metadata: {} });
    await settle();
    app.workers.at(-1).succeed();
    await reanalysis;
    assert.equal(app.get('chartsSection').classList.contains('hidden'), false);
    app.get('exportAcceleration').click();
    assert.equal(app.downloads.length, 1);
});

test('cancelling an unfinished read ignores its late completion', async () => {
    const app = createApp();
    const pendingRead = app.choose('slow.csv');
    app.get('cancelAnalysis').click();
    pendingRead.resolve({ data: signal, metadata: {} });
    await settle();
    assert.equal(app.workers.length, 0);
    assert.equal(app.chartCalls.length, 0);
    assert.equal(app.get('analyzeBtn').disabled, false);
    assertNoResults(app);
});

test('read failures clear earlier exports and late failures cannot reset newer work', async () => {
    const app = createApp();
    await complete(app, 'good.csv');
    app.choose('bad.csv').reject(new Error('cannot read file'));
    await settle();
    assertNoResults(app);
    assert.equal(app.get('analyzeBtn').disabled, false);
    assert.ok(app.alerts.some(message => message.includes('cannot read file')));
    const lateRead = app.choose('late.csv');
    const nextRead = app.choose('next.csv');
    const alertCount = app.alerts.length;
    lateRead.reject(new Error('outdated failure'));
    await settle();
    assert.equal(app.get('analyzeBtn').disabled, true);
    assert.equal(app.get('fileName').textContent, 'next.csv');
    assert.equal(app.alerts.length, alertCount);
    nextRead.resolve({ data: signal, metadata: {} });
    await settle();
    app.workers.at(-1).succeed();
    await settle();
    assert.equal(app.get('chartsSection').classList.contains('hidden'), false);
});

test('worker failure uses current data for fallback and a failed fallback clears exports', async () => {
    const app = createApp();
    const firstWorker = await loadUntilWorker(app, 'fallback.csv');
    firstWorker.fail();
    await settle();
    assert.equal(firstWorker.terminated, true);
    assert.equal(app.computeCalls.length, 1);
    assert.deepEqual(app.computeCalls[0][0], signal);
    assert.equal(app.get('chartsSection').classList.contains('hidden'), false);
    app.context.ResponseSpectrum.compute = () => {
        throw new Error('fallback failed');
    };
    const nextWorker = await loadUntilWorker(app, 'bad-worker.csv');
    nextWorker.fail();
    await settle();
    assertNoResults(app);
    assert.equal(app.get('analyzeBtn').disabled, false);
    assert.ok(app.alerts.some(message => message.includes('fallback failed')));
});

test('language changes retain the selected filename and the active busy state', async () => {
    const app = createApp();
    const pendingRead = app.choose('観測.csv');
    app.get('langEn').click();
    assert.equal(app.context.document.documentElement.lang, 'en');
    assert.equal(app.get('fileName').textContent, '観測.csv');
    assert.equal(app.get('analyzeBtn').span.textContent, app.context.I18n.t('controls.analyzing'));
    assert.equal(app.get('analyzeBtn').disabled, true);
    assert.equal(app.get('cancelAnalysis').classList.contains('hidden'), false);
    assert.equal(app.get('chartsSection').getAttribute('aria-busy'), 'true');
    pendingRead.resolve({ data: signal, metadata: {} });
    await settle();
    app.workers[0].succeed();
    await settle();
    app.get('langJa').click();
    assert.equal(app.get('fileName').textContent, '観測.csv');
    assert.equal(app.get('analyzeBtn').span.textContent, app.context.I18n.t('controls.analyzeBtn'));
    assert.equal(app.get('analyzeBtn').disabled, false);
});

test('spectrum display and exports use the completed analysis unit after controls are edited', async () => {
    const app = createApp();
    app.get('dataUnit').value = 'cm/s2';
    await complete(app, 'gal.csv');
    app.get('dataUnit').value = 'g';
    app.get('samplingRate').value = '1000';
    app.get('powerSpectrum').checked = true;
    app.get('logScale').checked = true;
    app.get('powerSpectrum').emit('change');
    const display = app.chartCalls.at(-1);
    assert.equal(display.method, 'updateSpectrumChart');
    assert.equal(display.args[2].unit, 'cm/s2');
    assert.equal(display.args[2].isPowerSpectrum, true);
    assert.equal(display.args[2].logScale, true);
    app.get('exportAcceleration').click();
    const csv = await app.downloads[0].blob.text();
    assert.match(csv, /^Time\(s\),Acceleration\(cm\/s2\)/);
    assert.match(csv, /0.125000,2\n/);
    assert.equal(app.fftCalls.length, 1);
});

test('changing the window recomputes only FFT and Fourier CSV matches the selected window', async () => {
    const app = createApp();
    await complete(app, 'sine.csv');
    const timeChartCalls = app.chartCalls.filter(call => call.method.startsWith('create')).length;
    app.get('windowType').value = 'rectangular';
    app.get('windowType').emit('change');
    assert.equal(app.fftCalls.length, 2);
    assert.equal(app.fftCalls[1][2].windowType, 'rectangular');
    assert.equal(app.integrationCalls.length, 1);
    assert.equal(app.workers.length, 1);
    assert.equal(app.computeCalls.length, 0);
    assert.equal(app.chartCalls.filter(call => call.method.startsWith('create')).length, timeChartCalls);
    assert.equal(Number(app.get('statPeakFreq').textContent), 2);
    app.get('exportFourier').click();
    assert.equal(app.downloads[0].filename, 'fourier_spectrum.csv');
    const csv = await app.downloads[0].blob.text();
    const [header, ...rows] = csv.trim().split('\n');
    assert.equal(header, 'Frequency(Hz),Amplitude(m/s2),SquaredAmplitude((m/s2)^2),Window');
    assert.equal(rows.length, 5);
    const expectedAmplitudes = [0, 0, 2, 0, 0];
    rows.forEach((row, index) => {
        const [frequency, amplitude, squared, windowType] = row.split(',');
        assert.equal(Number(frequency), index);
        assert.ok(Math.abs(Number(amplitude) - expectedAmplitudes[index]) < 1e-12);
        assert.ok(Math.abs(Number(squared) - expectedAmplitudes[index] ** 2) < 1e-12);
        assert.equal(windowType, 'rectangular');
    });
});
