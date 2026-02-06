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
        exportSection: document.getElementById('exportSection'),
        waveformCanvas: document.getElementById('waveformChart'),
        velocityCanvas: document.getElementById('velocityChart'),
        displacementCanvas: document.getElementById('displacementChart'),
        spectrumCanvas: document.getElementById('spectrumChart'),
        resetZoomWaveform: document.getElementById('resetZoomWaveform'),
        resetZoomVelocity: document.getElementById('resetZoomVelocity'),
        resetZoomDisplacement: document.getElementById('resetZoomDisplacement'),
        resetZoomSpectrum: document.getElementById('resetZoomSpectrum'),
        logScale: document.getElementById('logScale'),
        powerSpectrum: document.getElementById('powerSpectrum'),
        // エクスポートボタン
        exportAcceleration: document.getElementById('exportAcceleration'),
        exportVelocity: document.getElementById('exportVelocity'),
        exportDisplacement: document.getElementById('exportDisplacement'),
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
        samplingRate: null,
        unit: null
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
        elements.resetZoomVelocity.addEventListener('click', () => {
            WaveformChart.resetVelocityZoom();
        });
        elements.resetZoomDisplacement.addEventListener('click', () => {
            WaveformChart.resetDisplacementZoom();
        });
        elements.resetZoomSpectrum.addEventListener('click', () => {
            WaveformChart.resetSpectrumZoom();
        });

        // スペクトル表示オプション
        elements.logScale.addEventListener('change', updateSpectrumDisplay);
        elements.powerSpectrum.addEventListener('change', updateSpectrumDisplay);

        // エクスポートボタン
        elements.exportAcceleration.addEventListener('click', () => exportData('acceleration'));
        elements.exportVelocity.addEventListener('click', () => exportData('velocity'));
        elements.exportDisplacement.addEventListener('click', () => exportData('displacement'));
        elements.exportAll.addEventListener('click', () => exportData('all'));
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

            // 状態を保存
            state.samplingRate = samplingRate;
            state.unit = unit;

            // 速度と変位を計算
            const { velocity, displacement } = Analysis.computeVelocityAndDisplacement(
                state.data,
                samplingRate,
                unit
            );
            state.velocity = velocity;
            state.displacement = displacement;

            console.log(`速度最大値: ${Analysis.max(velocity).toExponential(4)} m/s`);
            console.log(`変位最大値: ${(Analysis.max(displacement) * 100).toFixed(4)} cm`);

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

            WaveformChart.createVelocityChart(
                elements.velocityCanvas,
                state.velocity,
                samplingRate
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

            // 統計情報表示
            updateStats(stats, peak, unit);

            // セクション表示
            elements.chartsSection.classList.remove('hidden');
            elements.statsSection.classList.remove('hidden');
            elements.exportSection.classList.remove('hidden');
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

    /**
     * データをCSV形式でエクスポート
     * @param {string} type - データタイプ（acceleration, velocity, displacement, all）
     */
    function exportData(type) {
        if (!state.data) {
            alert('データがありません。まずファイルを読み込んで解析を実行してください。');
            return;
        }

        let csvContent = '';
        let filename = '';

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
            csvContent = 'Time(s),Velocity(m/s)\n';
            for (let i = 0; i < state.velocity.length; i++) {
                csvContent += `${time[i].toFixed(6)},${state.velocity[i]}\n`;
            }
            filename = 'velocity.csv';
        } else if (type === 'displacement') {
            // 変位データのみ
            csvContent = 'Time(s),Displacement(m)\n';
            for (let i = 0; i < state.displacement.length; i++) {
                csvContent += `${time[i].toFixed(6)},${state.displacement[i]}\n`;
            }
            filename = 'displacement.csv';
        } else if (type === 'all') {
            // 全データ
            csvContent = `Time(s),Acceleration(${state.unit}),Velocity(m/s),Displacement(m)\n`;
            for (let i = 0; i < state.data.length; i++) {
                csvContent += `${time[i].toFixed(6)},${state.data[i]},${state.velocity[i]},${state.displacement[i]}\n`;
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

        console.log(`エクスポート完了: ${filename}`);
    }

    // アプリケーション開始
    init();
});
