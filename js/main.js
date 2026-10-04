/**
 * Wave Viewer - メインアプリケーション
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const elements = {
        fileInput: document.getElementById('fileInput'),
        fileName: document.getElementById('fileName'),
        samplingRate: document.getElementById('samplingRate'),
        skipHeader: document.getElementById('skipHeader'),
        dataUnit: document.getElementById('dataUnit'),
        analyzeBtn: document.getElementById('analyzeBtn'),
        cancelAnalysis: document.getElementById('cancelAnalysis'),
        windowType: document.getElementById('windowType'),
        dropZone: document.getElementById('dropZone'),
        chartsSection: document.getElementById('chartsSection'),
        statsSection: document.getElementById('statsSection'),
        exportSection: document.getElementById('exportSection'),
        waveformCanvas: document.getElementById('waveformChart'),
        velocityCanvas: document.getElementById('velocityChart'),
        displacementCanvas: document.getElementById('displacementChart'),
        spectrumCanvas: document.getElementById('spectrumChart'),
        responseAccelerationCanvas: document.getElementById('responseAccelerationChart'),
        responseVelocityCanvas: document.getElementById('responseVelocityChart'),
        responseDisplacementCanvas: document.getElementById('responseDisplacementChart'),
        resetZoomWaveform: document.getElementById('resetZoomWaveform'),
        resetZoomVelocity: document.getElementById('resetZoomVelocity'),
        resetZoomDisplacement: document.getElementById('resetZoomDisplacement'),
        resetZoomSpectrum: document.getElementById('resetZoomSpectrum'),
        resetZoomResponseAcceleration: document.getElementById('resetZoomResponseAcceleration'),
        resetZoomResponseVelocity: document.getElementById('resetZoomResponseVelocity'),
        resetZoomResponseDisplacement: document.getElementById('resetZoomResponseDisplacement'),
        logScale: document.getElementById('logScale'),
        powerSpectrum: document.getElementById('powerSpectrum'),
        // エクスポートボタン
        exportAcceleration: document.getElementById('exportAcceleration'),
        exportVelocity: document.getElementById('exportVelocity'),
        exportDisplacement: document.getElementById('exportDisplacement'),
        exportResponseSpectra: document.getElementById('exportResponseSpectra'),
        exportFourier: document.getElementById('exportFourier'),
        exportAll: document.getElementById('exportAll'),
        // 統計情報
        statCount: document.getElementById('statCount'),
        statDuration: document.getElementById('statDuration'),
        statMax: document.getElementById('statMax'),
        statMin: document.getElementById('statMin'),
        statMean: document.getElementById('statMean'),
        statStd: document.getElementById('statStd'),
        statRMS: document.getElementById('statRMS'),
        statPeakFreq: document.getElementById('statPeakFreq'),
        statMaxUnit: document.getElementById('statMaxUnit'),
        statMinUnit: document.getElementById('statMinUnit'),
        statMeanUnit: document.getElementById('statMeanUnit'),
        statStdUnit: document.getElementById('statStdUnit'),
        statRMSUnit: document.getElementById('statRMSUnit')
    };

    // アプリケーション状態
    const state = {
        currentFile: null,
        data: null,
        velocity: null,
        displacement: null,
        metadata: null,
        frequencies: null,
        amplitudes: null,
        powers: null,
        responseSpectrum: null,
        responseWorker: null,
        analysisId: 0,
        busy: false,
        windowType: 'hanning',
        samplingRate: null,
        unit: null
    };

    /**
     * 初期化
     */
    function init() {
        // 言語設定を読み込み
        I18n.loadLangFromStorage();
        updateLanguage();
        setupEventListeners();
    }

    /**
     * イベントリスナーの設定
     */
    function setupEventListeners() {
        // ファイル選択
        elements.fileInput.addEventListener('change', handleFileSelect);

        // 解析ボタン
        elements.analyzeBtn.addEventListener('click', runAnalysis);
        elements.cancelAnalysis.addEventListener('click', cancelAnalysis);
        elements.windowType.addEventListener('change', updateWindow);

        // ドラッグ&ドロップ
        elements.dropZone.addEventListener('dragover', handleDragOver);
        elements.dropZone.addEventListener('dragleave', handleDragLeave);
        elements.dropZone.addEventListener('drop', handleDrop);

        // ズームリセット
        elements.resetZoomWaveform.addEventListener('click', () => {
            WaveformChart.resetWaveformZoom();
        });
        elements.resetZoomVelocity.addEventListener('click', () => {
            WaveformChart.resetVelocityZoom();
        });
        elements.resetZoomDisplacement.addEventListener('click', () => {
            WaveformChart.resetDisplacementZoom();
        });
        elements.resetZoomSpectrum.addEventListener('click', () => {
            WaveformChart.resetSpectrumZoom();
        });
        elements.resetZoomResponseAcceleration.addEventListener('click', () => {
            WaveformChart.resetResponseAccelerationZoom();
        });
        elements.resetZoomResponseVelocity.addEventListener('click', () => {
            WaveformChart.resetResponseVelocityZoom();
        });
        elements.resetZoomResponseDisplacement.addEventListener('click', () => {
            WaveformChart.resetResponseDisplacementZoom();
        });

        // スペクトル表示オプション
        elements.logScale.addEventListener('change', updateSpectrumDisplay);
        elements.powerSpectrum.addEventListener('change', updateSpectrumDisplay);

        // エクスポートボタン
        elements.exportAcceleration.addEventListener('click', () => exportData('acceleration'));
        elements.exportVelocity.addEventListener('click', () => exportData('velocity'));
        elements.exportDisplacement.addEventListener('click', () => exportData('displacement'));
        elements.exportResponseSpectra.addEventListener('click', () => exportData('responseSpectra'));
        elements.exportFourier.addEventListener('click', () => exportData('fourier'));
        elements.exportAll.addEventListener('click', () => exportData('all'));

        // 言語切り替えボタン
        document.getElementById('langJa').addEventListener('click', () => {
            I18n.setLang('ja');
            updateLanguage();
        });
        document.getElementById('langEn').addEventListener('click', () => {
            I18n.setLang('en');
            updateLanguage();
        });
    }

    /**
     * ファイル選択ハンドラ
     */
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            loadFile(file);
        }
    }

    /**
     * ドラッグオーバーハンドラ
     */
    function handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        elements.dropZone.classList.add('drag-over');
    }

    /**
     * ドラッグリーブハンドラ
     */
    function handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        elements.dropZone.classList.remove('drag-over');
    }

    /**
     * ドロップハンドラ
     */
    function handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        elements.dropZone.classList.remove('drag-over');

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            loadFile(files[0]);
        }
    }

    /**
     * ファイルを読み込む
     */
    async function loadFile(file) {
        // ファイル形式チェック
        if (!FileReaderModule.isValidFileType(file)) {
            alert(I18n.t('messages.fileTypeError'));
            return;
        }

        state.currentFile = file;
        elements.fileName.textContent = file.name;
        elements.analyzeBtn.disabled = false;

        // 自動解析
        await runAnalysis();
    }

    function setBusy(busy) {
        state.busy = busy;
        elements.analyzeBtn.disabled = busy || !state.currentFile;
        elements.analyzeBtn.querySelector('span').textContent = I18n.t(
            busy ? 'controls.analyzing' : 'controls.analyzeBtn'
        );
        elements.cancelAnalysis.classList.toggle('hidden', !busy);
        elements.windowType.disabled = busy;
        elements.chartsSection.setAttribute('aria-busy', String(busy));
    }

    function hideResults() {
        elements.chartsSection.classList.add('hidden');
        elements.statsSection.classList.add('hidden');
        elements.exportSection.classList.add('hidden');
        elements.dropZone.classList.remove('hidden');
        state.data = null;
        state.responseSpectrum = null;
    }

    function terminateResponseWorker() {
        if (state.responseWorker) {
            state.responseWorker.cancel();
        }
    }

    function cancelAnalysis() {
        state.analysisId++;
        terminateResponseWorker();
        hideResults();
        setBusy(false);
    }

    /** Workerの停止時にもPromiseを完了させ、古い解析を残さない。 */
    function computeResponseSpectrumAsync(acceleration, samplingRate, unit, config) {
        if (typeof Worker === 'undefined') {
            return Promise.resolve(ResponseSpectrum.compute(acceleration, samplingRate, unit, config));
        }

        return new Promise((resolve, reject) => {
            const worker = new Worker('js/responseSpectrumWorker.js');
            const finish = (error, result) => {
                worker.onmessage = null;
                worker.onerror = null;
                worker.onmessageerror = null;
                worker.terminate();
                if (state.responseWorker === task) {
                    state.responseWorker = null;
                }
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            };
            const task = {
                cancel: () => finish(new DOMException('Analysis cancelled', 'AbortError'))
            };
            state.responseWorker = task;
            worker.onmessage = ({ data }) => {
                finish(data?.ok ? null : new Error(data?.error || 'Response spectrum failed'), data?.result);
            };
            worker.onerror = (event) => finish(new Error(event.message || 'Response worker failed'));
            worker.onmessageerror = () => finish(new Error('Invalid response worker message'));
            try {
                worker.postMessage({ acceleration, samplingRate, unit, config });
            } catch (error) {
                finish(error);
            }
        });
    }

    /**
     * 解析を実行
     */
    async function runAnalysis() {
        if (!state.currentFile) {
            alert(I18n.t('messages.noFileError'));
            return;
        }

        const analysisId = ++state.analysisId;
        const file = state.currentFile;
        const windowType = elements.windowType.value;
        terminateResponseWorker();
        hideResults();
        setBusy(true);

        try {
            // パラメータ取得
            let samplingRate = Number(elements.samplingRate.value);
            const skipHeader = Number(elements.skipHeader.value);
            if (!Number.isInteger(skipHeader) || skipHeader < 0) {
                throw new Error(I18n.t('messages.invalidSkipHeader'));
            }
            let unit = elements.dataUnit.value;

            // ファイル読み込み
            const result = await FileReaderModule.loadFile(file, {
                skipHeader: skipHeader
            });

            if (analysisId !== state.analysisId) {
                return;
            }
            const next = { data: result.data, metadata: result.metadata, windowType };

            // K-netフォーマットの場合、メタデータから設定を自動取得
            if (next.metadata.isKnet) {
                if (next.metadata.samplingRate) {
                    samplingRate = next.metadata.samplingRate;
                    elements.samplingRate.value = samplingRate;
                    console.log(`サンプリング周波数を自動設定: ${samplingRate} Hz`);
                }

                // K-netデータは常にcm/s2（= gal）単位
                unit = 'cm/s2';
                elements.dataUnit.value = unit;

                // ヘッダースキップは不要（自動処理される）
                elements.skipHeader.value = 0;

                // メタデータ情報を表示
                if (next.metadata.stationCode) {
                    console.log(`観測点: ${next.metadata.stationCode}`);
                }
                if (next.metadata.direction) {
                    console.log(`方向: ${next.metadata.direction}`);
                }
            }

            if (!Number.isFinite(samplingRate) || samplingRate <= 0) {
                throw new Error(I18n.t('messages.invalidSamplingRate'));
            }

            if (next.data.length < 2) {
                throw new Error('データが不足しています（2点以上必要）');
            }

            // 状態を保存
            next.samplingRate = samplingRate;
            next.unit = unit;

            // 速度と変位を計算
            const { velocity, displacement } = Analysis.computeVelocityAndDisplacement(
                next.data,
                samplingRate,
                unit
            );
            next.velocity = velocity;
            next.displacement = displacement;

            const velocityUnit = getVelocityUnit(unit);
            const velocityValues = convertVelocityFromMps(velocity, velocityUnit);
            console.log(`速度最大値: ${Analysis.max(velocityValues).toExponential(4)} ${velocityUnit}`);
            console.log(`変位最大値: ${(Analysis.max(displacement) * 100).toFixed(4)} cm`);

            // FFT 解析
            const spectrumResult = FFT.amplitudeSpectrum(next.data, samplingRate, { windowType });
            next.frequencies = spectrumResult.frequencies;
            next.amplitudes = spectrumResult.amplitudes;

            next.powers = next.amplitudes.map(value => value * value);

            // 応答スペクトル解析（周期0.02-10s、200分割、h=2/3/5%）
            const responseConfig = {
                periodMin: 0.02,
                periodMax: 10.0,
                periodDivisions: 200,
                dampings: [0.02, 0.03, 0.05]
            };
            try {
                next.responseSpectrum = await computeResponseSpectrumAsync(
                    next.data,
                    samplingRate,
                    unit,
                    responseConfig
                );
            } catch (workerError) {
                if (analysisId !== state.analysisId || workerError.name === 'AbortError') {
                    return;
                }
                console.warn('応答スペクトルワーカーに失敗したため同期計算にフォールバックします', workerError);
                next.responseSpectrum = ResponseSpectrum.compute(
                    next.data,
                    samplingRate,
                    unit,
                    responseConfig
                );
            }

            // 統計計算
            const stats = Analysis.computeAll(next.data, samplingRate);
            const peak = FFT.findPeakFrequency(next.frequencies, next.amplitudes);

            if (analysisId !== state.analysisId) {
                return;
            }
            Object.assign(state, next);

            // チャート表示
            WaveformChart.createWaveformChart(
                elements.waveformCanvas,
                state.data,
                samplingRate,
                unit
            );

            WaveformChart.createVelocityChart(
                elements.velocityCanvas,
                state.velocity,
                samplingRate,
                velocityUnit
            );

            WaveformChart.createDisplacementChart(
                elements.displacementCanvas,
                state.displacement,
                samplingRate
            );

            const isPowerSpectrum = elements.powerSpectrum.checked;
            const logScale = elements.logScale.checked;

            WaveformChart.createSpectrumChart(
                elements.spectrumCanvas,
                state.frequencies,
                isPowerSpectrum ? state.powers : state.amplitudes,
                { logScale, isPowerSpectrum, unit }
            );

            WaveformChart.createResponseAccelerationChart(
                elements.responseAccelerationCanvas,
                state.responseSpectrum,
                unit
            );

            WaveformChart.createResponseVelocityChart(
                elements.responseVelocityCanvas,
                state.responseSpectrum,
                velocityUnit
            );

            WaveformChart.createResponseDisplacementChart(
                elements.responseDisplacementCanvas,
                state.responseSpectrum
            );

            // 統計情報表示
            updateStats(stats, peak, unit);

            // セクション表示
            elements.chartsSection.classList.remove('hidden');
            elements.statsSection.classList.remove('hidden');
            elements.exportSection.classList.remove('hidden');
            elements.dropZone.classList.add('hidden');

        } catch (error) {
            if (analysisId !== state.analysisId) {
                return;
            }
            hideResults();
            console.error(I18n.t('messages.analysisError'), error);
            alert(I18n.t('messages.analysisError') + error.message);
        } finally {
            if (analysisId === state.analysisId) {
                terminateResponseWorker();
                setBusy(false);
            }
        }
    }

    /**
     * 統計情報を更新
     */
    function updateStats(stats, peak, unit) {
        elements.statCount.textContent = stats.count.toLocaleString();
        elements.statDuration.textContent = Analysis.formatNumber(stats.duration, 3);
        elements.statMax.textContent = Analysis.formatNumber(stats.max);
        elements.statMin.textContent = Analysis.formatNumber(stats.min);
        elements.statMean.textContent = Analysis.formatNumber(stats.mean);
        elements.statStd.textContent = Analysis.formatNumber(stats.std);
        elements.statRMS.textContent = Analysis.formatNumber(stats.rms);
        elements.statPeakFreq.textContent = Analysis.formatNumber(peak.frequency, 2);

        // 単位を設定
        elements.statMaxUnit.textContent = unit;
        elements.statMinUnit.textContent = unit;
        elements.statMeanUnit.textContent = unit;
        elements.statStdUnit.textContent = unit;
        elements.statRMSUnit.textContent = unit;
    }

    /**
     * スペクトル表示を更新
     */
    function updateSpectrumDisplay() {
        if (!state.data || state.busy || !state.frequencies || !state.amplitudes) {
            return;
        }

        const isPowerSpectrum = elements.powerSpectrum.checked;
        const logScale = elements.logScale.checked;
        const unit = state.unit;

        WaveformChart.updateSpectrumChart(
            state.frequencies,
            isPowerSpectrum ? state.powers : state.amplitudes,
            { logScale, isPowerSpectrum, unit }
        );
    }

    /** 窓の変更はFFTだけを再計算し、時間波形と応答スペクトルを保持する。 */
    function updateWindow() {
        if (!state.data || state.busy) {
            return;
        }
        const windowType = elements.windowType.value;
        const { frequencies, amplitudes } = FFT.amplitudeSpectrum(
            state.data, state.samplingRate, { windowType }
        );
        Object.assign(state, {
            frequencies, amplitudes, windowType,
            powers: amplitudes.map(value => value * value)
        });
        updateSpectrumDisplay();
        const peak = FFT.findPeakFrequency(frequencies, amplitudes);
        elements.statPeakFreq.textContent = Analysis.formatNumber(peak.frequency, 2);
    }

    /**
     * 加速度単位に応じた速度の表示単位を取得
     * @param {string} accelerationUnit - 加速度単位
     * @returns {string} - 速度単位（m/s or cm/s）
     */
    function getVelocityUnit(accelerationUnit) {
        return Analysis.isCmPerSec2Unit(accelerationUnit) ? 'cm/s' : 'm/s';
    }

    /**
     * 速度データを m/s から指定単位へ変換
     * @param {number[]} velocityMps - 速度データ[m/s]
     * @param {string} velocityUnit - 変換先速度単位
     * @returns {number[]} - 変換後の速度データ
     */
    function convertVelocityFromMps(velocityMps, velocityUnit) {
        if (velocityUnit === 'cm/s') {
            return velocityMps.map(value => value * 100);
        }
        return [...velocityMps];
    }

    /**
     * 応答スペクトルをCSVに変換
     * @param {Object} responseSpectrum - 応答スペクトル
     * @param {string} accelerationUnit - 加速度単位
     * @param {string} velocityUnit - 速度単位
     * @returns {string}
     */
    function buildResponseSpectrumCsv(responseSpectrum, accelerationUnit, velocityUnit) {
        const saByDamping = responseSpectrum.acceleration.map(series =>
            Analysis.convertAccelerationFromMps2(series, accelerationUnit)
        );
        const svByDamping = responseSpectrum.velocity.map(series =>
            convertVelocityFromMps(series, velocityUnit)
        );
        const sdByDamping = responseSpectrum.displacement.map(series =>
            series.map(value => value * 100)
        );

        const dampingLabels = responseSpectrum.dampings.map(h => `h${(h * 100).toFixed(0)}pct`);
        const header = ['Period(s)'];

        dampingLabels.forEach(label => header.push(`Sa_${label}(${accelerationUnit})`));
        dampingLabels.forEach(label => header.push(`Sv_${label}(${velocityUnit})`));
        dampingLabels.forEach(label => header.push(`Sd_${label}(cm)`));

        const lines = [header.join(',')];

        for (let i = 0; i < responseSpectrum.periods.length; i++) {
            const row = [responseSpectrum.periods[i].toFixed(6)];

            for (let j = 0; j < dampingLabels.length; j++) {
                row.push(saByDamping[j][i].toString());
            }
            for (let j = 0; j < dampingLabels.length; j++) {
                row.push(svByDamping[j][i].toString());
            }
            for (let j = 0; j < dampingLabels.length; j++) {
                row.push(sdByDamping[j][i].toString());
            }

            lines.push(row.join(','));
        }

        return lines.join('\n') + '\n';
    }

    /**
     * データをCSV形式でエクスポート
     * @param {string} type - データタイプ（acceleration, velocity, displacement, responseSpectra, all）
     */
    function exportData(type) {
        if (!state.data || state.busy) {
            alert(I18n.t('messages.noDataError'));
            return;
        }

        let csvContent = '';
        let filename = '';

        const velocityUnit = getVelocityUnit(state.unit);
        const velocityValues = convertVelocityFromMps(state.velocity, velocityUnit);
        const time = state.data.map((_, index) => index / state.samplingRate);

        if (type === 'acceleration') {
            // 加速度データのみ
            csvContent = 'Time(s),Acceleration(' + state.unit + ')\n';
            for (let i = 0; i < state.data.length; i++) {
                csvContent += `${time[i].toFixed(6)},${state.data[i]}\n`;
            }
            filename = 'acceleration.csv';
        } else if (type === 'velocity') {
            // 速度データのみ
            csvContent = `Time(s),Velocity(${velocityUnit})\n`;
            for (let i = 0; i < velocityValues.length; i++) {
                csvContent += `${time[i].toFixed(6)},${velocityValues[i]}\n`;
            }
            filename = 'velocity.csv';
        } else if (type === 'displacement') {
            // 変位データのみ
            csvContent = 'Time(s),Displacement(m)\n';
            for (let i = 0; i < state.displacement.length; i++) {
                csvContent += `${time[i].toFixed(6)},${state.displacement[i]}\n`;
            }
            filename = 'displacement.csv';
        } else if (type === 'responseSpectra') {
            if (!state.responseSpectrum) {
                alert(I18n.t('messages.noDataError'));
                return;
            }
            csvContent = buildResponseSpectrumCsv(state.responseSpectrum, state.unit, velocityUnit);
            filename = 'response_spectra.csv';
        } else if (type === 'fourier') {
            const rows = [`Frequency(Hz),Amplitude(${state.unit}),SquaredAmplitude((${state.unit})^2),Window`];
            for (let i = 0; i < state.frequencies.length; i++) {
                rows.push([state.frequencies[i], state.amplitudes[i], state.powers[i], state.windowType].join(','));
            }
            csvContent = rows.join('\n') + '\n';
            filename = 'fourier_spectrum.csv';
        } else if (type === 'all') {
            // 全データ
            csvContent = `Time(s),Acceleration(${state.unit}),Velocity(${velocityUnit}),Displacement(m)\n`;
            for (let i = 0; i < state.data.length; i++) {
                csvContent += `${time[i].toFixed(6)},${state.data[i]},${velocityValues[i]},${state.displacement[i]}\n`;
            }
            filename = 'all_data.csv';
        }

        // BOMを追加（Excel対応）
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

        // ダウンロードリンクを作成
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log(I18n.t('messages.exportComplete') + filename);
    }

    /**
     * 言語表示を更新
     */
    function updateLanguage() {
        const lang = I18n.getCurrentLang();
        document.documentElement.lang = lang;

        // 言語ボタンのアクティブ状態を更新
        document.getElementById('langJa').classList.toggle('active', lang === 'ja');
        document.getElementById('langEn').classList.toggle('active', lang === 'en');

        // data-i18n属性を持つ要素のテキストを更新
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const text = I18n.t(key);

            if (element.tagName === 'INPUT' && element.type === 'button') {
                element.value = text;
            } else {
                element.textContent = text;
            }
        });

        elements.fileName.textContent = state.currentFile?.name || I18n.t('controls.fileNotSelected');
        setBusy(state.busy);

        // 単位表示の更新
        const unitElement = document.querySelector('[data-i18n-unit="lines"]');
        if (unitElement) {
            unitElement.textContent = lang === 'ja' ? '行' : 'lines';
        }

        // マニュアルのリスト項目を更新
        updateManualLists();

        // チャートのラベルを更新（既にチャートが表示されている場合）
        if (state.data && state.unit) {
            updateChartLabels();
        }
    }

    /**
     * マニュアルのリスト項目を更新
     */
    function updateManualLists() {
        // クイックスタート
        const quickStartList = document.getElementById('quickStartList');
        quickStartList.innerHTML = '';
        I18n.t('manual.quickStartContent').forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            quickStartList.appendChild(li);
        });

        // データ形式
        const dataFormatList = document.getElementById('dataFormatList');
        dataFormatList.innerHTML = '';
        I18n.t('manual.dataFormatContent').forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            dataFormatList.appendChild(li);
        });

        // 主な機能
        const featuresList = document.getElementById('featuresList');
        featuresList.innerHTML = '';
        I18n.t('manual.featuresContent').forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            featuresList.appendChild(li);
        });

        // 操作方法
        const operationsList = document.getElementById('operationsList');
        operationsList.innerHTML = '';
        I18n.t('manual.operationsContent').forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            operationsList.appendChild(li);
        });

        // 注意事項
        const notesList = document.getElementById('notesList');
        notesList.innerHTML = '';
        I18n.t('manual.notesContent').forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            notesList.appendChild(li);
        });
    }

    /**
     * チャートのラベルを更新
     */
    function updateChartLabels() {
        const unit = state.unit;
        const velocityUnit = getVelocityUnit(unit);

        // 加速度チャート
        if (WaveformChart.waveformChart) {
            WaveformChart.waveformChart.options.scales.x.title.text =
                `${I18n.t('charts.time')} [sec]`;
            WaveformChart.waveformChart.options.scales.y.title.text =
                `${I18n.t('charts.acceleration')} [${unit}]`;
            WaveformChart.waveformChart.update();
        }

        // 速度チャート
        if (WaveformChart.velocityChart) {
            WaveformChart.velocityChart.options.scales.x.title.text =
                `${I18n.t('charts.time')} [sec]`;
            WaveformChart.velocityChart.options.scales.y.title.text =
                `${I18n.t('charts.velocity')} [${velocityUnit}]`;
            WaveformChart.velocityChart.update();
        }

        // 変位チャート
        if (WaveformChart.displacementChart) {
            WaveformChart.displacementChart.options.scales.x.title.text =
                `${I18n.t('charts.time')} [sec]`;
            WaveformChart.displacementChart.options.scales.y.title.text =
                `${I18n.t('charts.displacement')} [cm]`;
            WaveformChart.displacementChart.update();
        }

        // スペクトルチャート
        if (WaveformChart.spectrumChart) {
            WaveformChart.spectrumChart.options.scales.x.title.text =
                `${I18n.t('charts.frequency')} [Hz]`;
            updateSpectrumDisplay();
        }

        // 加速度応答スペクトル
        if (WaveformChart.responseAccelerationChart) {
            WaveformChart.responseAccelerationChart.options.scales.x.title.text =
                `${I18n.t('charts.period')} [sec]`;
            WaveformChart.responseAccelerationChart.options.scales.y.title.text =
                `Sa [${unit}]`;
            WaveformChart.responseAccelerationChart.update();
        }

        // 速度応答スペクトル
        if (WaveformChart.responseVelocityChart) {
            WaveformChart.responseVelocityChart.options.scales.x.title.text =
                `${I18n.t('charts.period')} [sec]`;
            WaveformChart.responseVelocityChart.options.scales.y.title.text =
                `Sv [${velocityUnit}]`;
            WaveformChart.responseVelocityChart.update();
        }

        // 変位応答スペクトル
        if (WaveformChart.responseDisplacementChart) {
            WaveformChart.responseDisplacementChart.options.scales.x.title.text =
                `${I18n.t('charts.period')} [sec]`;
            WaveformChart.responseDisplacementChart.options.scales.y.title.text =
                'Sd [cm]';
            WaveformChart.responseDisplacementChart.update();
        }
    }

    // アプリケーション開始
    init();
});
