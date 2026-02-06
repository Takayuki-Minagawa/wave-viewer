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
        dropZone: document.getElementById('dropZone'),
        chartsSection: document.getElementById('chartsSection'),
        statsSection: document.getElementById('statsSection'),
        waveformCanvas: document.getElementById('waveformChart'),
        spectrumCanvas: document.getElementById('spectrumChart'),
        resetZoomWaveform: document.getElementById('resetZoomWaveform'),
        resetZoomSpectrum: document.getElementById('resetZoomSpectrum'),
        logScale: document.getElementById('logScale'),
        powerSpectrum: document.getElementById('powerSpectrum'),
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
        metadata: null,
        frequencies: null,
        amplitudes: null,
        powers: null
    };

    /**
     * 初期化
     */
    function init() {
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

        // ドラッグ&ドロップ
        elements.dropZone.addEventListener('dragover', handleDragOver);
        elements.dropZone.addEventListener('dragleave', handleDragLeave);
        elements.dropZone.addEventListener('drop', handleDrop);

        // ズームリセット
        elements.resetZoomWaveform.addEventListener('click', () => {
            WaveformChart.resetWaveformZoom();
        });
        elements.resetZoomSpectrum.addEventListener('click', () => {
            WaveformChart.resetSpectrumZoom();
        });

        // スペクトル表示オプション
        elements.logScale.addEventListener('change', updateSpectrumDisplay);
        elements.powerSpectrum.addEventListener('change', updateSpectrumDisplay);
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
            alert('対応していないファイル形式です。\nCSV, TXT, DAT ファイルを選択してください。');
            return;
        }

        state.currentFile = file;
        elements.fileName.textContent = file.name;
        elements.analyzeBtn.disabled = false;

        // 自動解析
        await runAnalysis();
    }

    /**
     * 解析を実行
     */
    async function runAnalysis() {
        if (!state.currentFile) {
            alert('ファイルを選択してください。');
            return;
        }

        try {
            // ローディング表示
            elements.analyzeBtn.disabled = true;
            elements.analyzeBtn.textContent = '解析中...';

            // パラメータ取得
            let samplingRate = parseFloat(elements.samplingRate.value) || 100;
            const skipHeader = parseInt(elements.skipHeader.value) || 0;
            let unit = elements.dataUnit.value;

            // ファイル読み込み
            const result = await FileReaderModule.loadFile(state.currentFile, {
                skipHeader: skipHeader
            });

            state.data = result.data;
            state.metadata = result.metadata;

            // K-netフォーマットの場合、メタデータから設定を自動取得
            if (state.metadata.isKnet) {
                if (state.metadata.samplingRate) {
                    samplingRate = state.metadata.samplingRate;
                    elements.samplingRate.value = samplingRate;
                    console.log(`サンプリング周波数を自動設定: ${samplingRate} Hz`);
                }

                // K-netデータは常にgal単位
                unit = 'gal';
                elements.dataUnit.value = unit;

                // ヘッダースキップは不要（自動処理される）
                elements.skipHeader.value = 0;

                // メタデータ情報を表示
                if (state.metadata.stationCode) {
                    console.log(`観測点: ${state.metadata.stationCode}`);
                }
                if (state.metadata.direction) {
                    console.log(`方向: ${state.metadata.direction}`);
                }
            }

            if (state.data.length < 2) {
                throw new Error('データが不足しています（2点以上必要）');
            }

            // FFT 解析
            const spectrumResult = FFT.amplitudeSpectrum(state.data, samplingRate);
            state.frequencies = spectrumResult.frequencies;
            state.amplitudes = spectrumResult.amplitudes;

            const powerResult = FFT.powerSpectrum(state.data, samplingRate);
            state.powers = powerResult.powers;

            // 統計計算
            const stats = Analysis.computeAll(state.data, samplingRate);
            const peak = FFT.findPeakFrequency(state.frequencies, state.amplitudes);

            // チャート表示
            WaveformChart.createWaveformChart(
                elements.waveformCanvas,
                state.data,
                samplingRate,
                unit
            );

            const isPowerSpectrum = elements.powerSpectrum.checked;
            const logScale = elements.logScale.checked;

            WaveformChart.createSpectrumChart(
                elements.spectrumCanvas,
                state.frequencies,
                isPowerSpectrum ? state.powers : state.amplitudes,
                { logScale, isPowerSpectrum, unit }
            );

            // 統計情報表示
            updateStats(stats, peak, unit);

            // セクション表示
            elements.chartsSection.classList.remove('hidden');
            elements.statsSection.classList.remove('hidden');
            elements.dropZone.classList.add('hidden');

        } catch (error) {
            console.error('解析エラー:', error);
            alert('解析エラー: ' + error.message);
        } finally {
            elements.analyzeBtn.disabled = false;
            elements.analyzeBtn.innerHTML = '<span>🔍 解析実行</span>';
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
        if (!state.frequencies || !state.amplitudes) {
            return;
        }

        const isPowerSpectrum = elements.powerSpectrum.checked;
        const logScale = elements.logScale.checked;
        const unit = elements.dataUnit.value;

        WaveformChart.updateSpectrumChart(
            state.frequencies,
            isPowerSpectrum ? state.powers : state.amplitudes,
            { logScale, isPowerSpectrum, unit }
        );
    }

    // アプリケーション開始
    init();
});
