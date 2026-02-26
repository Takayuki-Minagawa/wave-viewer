/**
 * 波形描画モジュール
 */

const WaveformChart = {
    waveformChart: null,
    velocityChart: null,
    displacementChart: null,
    spectrumChart: null,
    responseAccelerationChart: null,
    responseVelocityChart: null,
    responseDisplacementChart: null,

    /**
     * Chart.js のデフォルト設定
     */
    defaultOptions: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 500
        },
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                display: false
            },
            zoom: {
                pan: {
                    enabled: true,
                    mode: 'xy'
                },
                zoom: {
                    wheel: {
                        enabled: true
                    },
                    pinch: {
                        enabled: true
                    },
                    mode: 'xy'
                }
            }
        }
    },

    /**
     * 時系列波形チャートを作成
     * @param {HTMLCanvasElement} canvas - キャンバス要素
     * @param {number[]} data - 時系列データ
     * @param {number} samplingRate - サンプリング周波数
     * @param {string} unit - データ単位
     */
    createWaveformChart(canvas, data, samplingRate, unit) {
        // 既存のチャートを破棄
        if (this.waveformChart) {
            this.waveformChart.destroy();
        }

        // 時間軸を生成
        const timeData = data.map((_, index) => index / samplingRate);

        // データポイントが多い場合はダウンサンプリング
        const { labels, values } = this.downsample(timeData, data, 2000);

        this.waveformChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '加速度',
                    data: values,
                    borderColor: 'rgba(74, 144, 217, 1)',
                    backgroundColor: 'rgba(74, 144, 217, 0.1)',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: true,
                    tension: 0
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: `${I18n.t('charts.time')} [sec]`
                        },
                        ticks: {
                            callback: (value) => value.toFixed(2)
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: `${I18n.t('charts.acceleration')} [${unit}]`
                        }
                    }
                },
                plugins: {
                    ...this.defaultOptions.plugins,
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.parsed.y.toFixed(4)} ${unit}`;
                            },
                            title: (tooltipItems) => {
                                return `${I18n.t('charts.time')}: ${tooltipItems[0].parsed.x.toFixed(4)} sec`;
                            }
                        }
                    }
                }
            }
        });

        return this.waveformChart;
    },

    /**
     * 速度波形チャートを作成
     * @param {HTMLCanvasElement} canvas - キャンバス要素
     * @param {number[]} data - 速度データ（m/s）
     * @param {number} samplingRate - サンプリング周波数
     * @param {string} velocityUnit - 速度表示単位（m/s or cm/s）
     */
    createVelocityChart(canvas, data, samplingRate, velocityUnit = 'm/s') {
        // 既存のチャートを破棄
        if (this.velocityChart) {
            this.velocityChart.destroy();
        }

        // 時間軸を生成
        const timeData = data.map((_, index) => index / samplingRate);

        // 表示単位に変換
        const displayData = velocityUnit === 'cm/s'
            ? data.map(value => value * 100)
            : data;

        // データポイントが多い場合はダウンサンプリング
        const { labels, values } = this.downsample(timeData, displayData, 2000);

        this.velocityChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '速度',
                    data: values,
                    borderColor: 'rgba(52, 168, 83, 1)',
                    backgroundColor: 'rgba(52, 168, 83, 0.1)',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: true,
                    tension: 0
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: `${I18n.t('charts.time')} [sec]`
                        },
                        ticks: {
                            callback: (value) => value.toFixed(2)
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: `${I18n.t('charts.velocity')} [${velocityUnit}]`
                        }
                    }
                },
                plugins: {
                    ...this.defaultOptions.plugins,
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.parsed.y.toFixed(6)} ${velocityUnit}`;
                            },
                            title: (tooltipItems) => {
                                return `${I18n.t('charts.time')}: ${tooltipItems[0].parsed.x.toFixed(4)} sec`;
                            }
                        }
                    }
                }
            }
        });

        return this.velocityChart;
    },

    /**
     * 変位波形チャートを作成
     * @param {HTMLCanvasElement} canvas - キャンバス要素
     * @param {number[]} data - 変位データ（m）
     * @param {number} samplingRate - サンプリング周波数
     */
    createDisplacementChart(canvas, data, samplingRate) {
        // 既存のチャートを破棄
        if (this.displacementChart) {
            this.displacementChart.destroy();
        }

        // 時間軸を生成
        const timeData = data.map((_, index) => index / samplingRate);

        // データポイントが多い場合はダウンサンプリング
        const { labels, values } = this.downsample(timeData, data, 2000);

        // mをcmに変換（見やすくするため）
        const valuesInCm = values.map(v => v * 100);

        this.displacementChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '変位',
                    data: valuesInCm,
                    borderColor: 'rgba(251, 140, 0, 1)',
                    backgroundColor: 'rgba(251, 140, 0, 0.1)',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: true,
                    tension: 0
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: `${I18n.t('charts.time')} [sec]`
                        },
                        ticks: {
                            callback: (value) => value.toFixed(2)
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: `${I18n.t('charts.displacement')} [cm]`
                        }
                    }
                },
                plugins: {
                    ...this.defaultOptions.plugins,
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.parsed.y.toFixed(4)} cm`;
                            },
                            title: (tooltipItems) => {
                                return `${I18n.t('charts.time')}: ${tooltipItems[0].parsed.x.toFixed(4)} sec`;
                            }
                        }
                    }
                }
            }
        });

        return this.displacementChart;
    },

    /**
     * フーリエスペクトルチャートを作成
     * @param {HTMLCanvasElement} canvas - キャンバス要素
     * @param {number[]} frequencies - 周波数配列
     * @param {number[]} amplitudes - 振幅配列
     * @param {Object} options - オプション
     */
    createSpectrumChart(canvas, frequencies, amplitudes, options = {}) {
        const {
            logScale = false,
            isPowerSpectrum = false,
            unit = 'cm/s2'
        } = options;

        // 既存のチャートを破棄
        if (this.spectrumChart) {
            this.spectrumChart.destroy();
        }

        // データをフィルタリング（0Hz付近を除外するオプション）
        const startIndex = 1; // 0Hzを除外
        const filteredFreq = frequencies.slice(startIndex);
        const filteredAmp = amplitudes.slice(startIndex);

        // 0.5Hz以上の最大値でY軸レンジを設定
        const yMaxValue = this._getMaxAbove05Hz(filteredFreq, filteredAmp);
        const yAxisMax = logScale
            ? (yMaxValue > 0 ? Math.log10(yMaxValue * 1.1) : undefined)
            : (yMaxValue > 0 ? yMaxValue * 1.1 : undefined);

        // ダウンサンプリング
        const { labels, values } = this.downsample(filteredFreq, filteredAmp, 1000);

        // 対数スケール用のデータ変換
        const displayValues = logScale
            ? values.map(v => v > 0 ? Math.log10(v) : -10)
            : values;

        const yAxisLabel = isPowerSpectrum
            ? (logScale ? `パワー [log(${unit}²)]` : `パワー [${unit}²]`)
            : (logScale ? `振幅 [log(${unit})]` : `振幅 [${unit}]`);

        this.spectrumChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: isPowerSpectrum ? 'パワースペクトル' : '振幅スペクトル',
                    data: displayValues,
                    borderColor: 'rgba(220, 53, 69, 1)',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: true,
                    tension: 0
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: `${I18n.t('charts.frequency')} [Hz]`
                        },
                        ticks: {
                            callback: (value) => value.toFixed(1)
                        }
                    },
                    y: {
                        max: yAxisMax,
                        title: {
                            display: true,
                            text: yAxisLabel
                        }
                    }
                },
                plugins: {
                    ...this.defaultOptions.plugins,
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const originalValue = logScale
                                    ? Math.pow(10, context.parsed.y)
                                    : context.parsed.y;
                                return `${originalValue.toExponential(4)}`;
                            },
                            title: (tooltipItems) => {
                                return `${I18n.t('charts.frequency')}: ${tooltipItems[0].parsed.x.toFixed(2)} Hz`;
                            }
                        }
                    }
                }
            }
        });

        return this.spectrumChart;
    },

    /**
     * 加速度応答スペクトルチャートを作成
     * @param {HTMLCanvasElement} canvas - キャンバス要素
     * @param {Object} responseSpectrum - 応答スペクトルデータ
     * @param {string} unit - 表示単位（m/s², cm/s2[=gal], g）
     */
    createResponseAccelerationChart(canvas, responseSpectrum, unit = 'cm/s2') {
        if (this.responseAccelerationChart) {
            this.responseAccelerationChart.destroy();
        }

        const spectraInUnit = responseSpectrum.acceleration.map(series =>
            Analysis.convertAccelerationFromMps2(series, unit)
        );

        this.responseAccelerationChart = this._createResponseSpectrumChart(
            canvas,
            responseSpectrum.periods,
            spectraInUnit,
            responseSpectrum.dampings,
            {
                yAxisLabel: `Sa [${unit}]`,
                valueUnit: unit,
                precision: 5
            }
        );

        return this.responseAccelerationChart;
    },

    /**
     * 速度応答スペクトルチャートを作成
     * @param {HTMLCanvasElement} canvas - キャンバス要素
     * @param {Object} responseSpectrum - 応答スペクトルデータ
     * @param {string} velocityUnit - 速度表示単位（m/s or cm/s）
     */
    createResponseVelocityChart(canvas, responseSpectrum, velocityUnit = 'm/s') {
        if (this.responseVelocityChart) {
            this.responseVelocityChart.destroy();
        }

        const spectraInUnit = velocityUnit === 'cm/s'
            ? responseSpectrum.velocity.map(series => series.map(value => value * 100))
            : responseSpectrum.velocity;

        this.responseVelocityChart = this._createResponseSpectrumChart(
            canvas,
            responseSpectrum.periods,
            spectraInUnit,
            responseSpectrum.dampings,
            {
                yAxisLabel: `Sv [${velocityUnit}]`,
                valueUnit: velocityUnit,
                precision: 5
            }
        );

        return this.responseVelocityChart;
    },

    /**
     * 変位応答スペクトルチャートを作成
     * @param {HTMLCanvasElement} canvas - キャンバス要素
     * @param {Object} responseSpectrum - 応答スペクトルデータ
     */
    createResponseDisplacementChart(canvas, responseSpectrum) {
        if (this.responseDisplacementChart) {
            this.responseDisplacementChart.destroy();
        }

        const spectraInCm = responseSpectrum.displacement.map(series =>
            series.map(value => value * 100)
        );

        this.responseDisplacementChart = this._createResponseSpectrumChart(
            canvas,
            responseSpectrum.periods,
            spectraInCm,
            responseSpectrum.dampings,
            {
                yAxisLabel: 'Sd [cm]',
                valueUnit: 'cm',
                precision: 4
            }
        );

        return this.responseDisplacementChart;
    },

    /**
     * 複数減衰定数の応答スペクトルを描画
     * @param {HTMLCanvasElement} canvas - キャンバス要素
     * @param {number[]} periods - 周期配列 [sec]
     * @param {number[][]} spectraByDamping - 減衰ごとのスペクトル値
     * @param {number[]} dampings - 減衰定数配列
     * @param {Object} options - 描画オプション
     * @returns {Chart}
     */
    _createResponseSpectrumChart(canvas, periods, spectraByDamping, dampings, options = {}) {
        const {
            yAxisLabel = '',
            valueUnit = '',
            precision = 5
        } = options;

        const colors = [
            { border: 'rgba(220, 53, 69, 1)', background: 'rgba(220, 53, 69, 0.12)' },
            { border: 'rgba(40, 167, 69, 1)', background: 'rgba(40, 167, 69, 0.12)' },
            { border: 'rgba(74, 144, 217, 1)', background: 'rgba(74, 144, 217, 0.12)' }
        ];

        const datasets = dampings.map((damping, index) => {
            const color = colors[index % colors.length];
            const values = spectraByDamping[index] || [];
            return {
                label: `h=${(damping * 100).toFixed(0)}%`,
                data: periods.map((period, i) => ({
                    x: period,
                    y: values[i] ?? null
                })),
                borderColor: color.border,
                backgroundColor: color.background,
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
                tension: 0
            };
        });

        return new Chart(canvas, {
            type: 'line',
            data: {
                datasets
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    x: {
                        type: 'logarithmic',
                        min: periods[0],
                        max: periods[periods.length - 1],
                        title: {
                            display: true,
                            text: `${I18n.t('charts.period')} [sec]`
                        },
                        ticks: {
                            callback: (value) => {
                                const num = Number(value);
                                if (!Number.isFinite(num)) {
                                    return value;
                                }
                                return num >= 1 ? num.toFixed(1) : num.toFixed(2);
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: yAxisLabel
                        }
                    }
                },
                plugins: {
                    ...this.defaultOptions.plugins,
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(precision)} ${valueUnit}`;
                            },
                            title: (tooltipItems) => {
                                return `${I18n.t('charts.period')}: ${tooltipItems[0].parsed.x.toFixed(3)} sec`;
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * 0.5Hz以上の最大値を取得
     * @param {number[]} frequencies - 周波数配列
     * @param {number[]} amplitudes - 振幅配列
     * @returns {number} - 最大値
     */
    _getMaxAbove05Hz(frequencies, amplitudes) {
        let max = 0;
        for (let i = 0; i < frequencies.length; i++) {
            if (frequencies[i] >= 0.5 && amplitudes[i] > max) {
                max = amplitudes[i];
            }
        }
        return max;
    },

    /**
     * データをダウンサンプリング（表示用）
     * @param {number[]} xData - X軸データ
     * @param {number[]} yData - Y軸データ
     * @param {number} maxPoints - 最大ポイント数
     * @returns {Object}
     */
    downsample(xData, yData, maxPoints) {
        if (xData.length <= maxPoints) {
            return {
                labels: xData,
                values: yData
            };
        }

        const step = Math.ceil(xData.length / maxPoints);
        const labels = [];
        const values = [];

        // LTTB (Largest Triangle Three Buckets) の簡易版
        for (let i = 0; i < xData.length; i += step) {
            // 各バケット内の最大値と最小値を保持
            const bucketEnd = Math.min(i + step, xData.length);
            let maxVal = -Infinity;
            let minVal = Infinity;
            let maxIdx = i;
            let minIdx = i;

            for (let j = i; j < bucketEnd; j++) {
                if (yData[j] > maxVal) {
                    maxVal = yData[j];
                    maxIdx = j;
                }
                if (yData[j] < minVal) {
                    minVal = yData[j];
                    minIdx = j;
                }
            }

            // 最小値と最大値の両方を追加（順序を維持）
            if (minIdx < maxIdx) {
                labels.push(xData[minIdx], xData[maxIdx]);
                values.push(yData[minIdx], yData[maxIdx]);
            } else {
                labels.push(xData[maxIdx], xData[minIdx]);
                values.push(yData[maxIdx], yData[minIdx]);
            }
        }

        return { labels, values };
    },

    /**
     * 波形チャートをリセット
     */
    resetWaveformZoom() {
        if (this.waveformChart) {
            this.waveformChart.resetZoom();
        }
    },

    /**
     * 速度チャートをリセット
     */
    resetVelocityZoom() {
        if (this.velocityChart) {
            this.velocityChart.resetZoom();
        }
    },

    /**
     * 変位チャートをリセット
     */
    resetDisplacementZoom() {
        if (this.displacementChart) {
            this.displacementChart.resetZoom();
        }
    },

    /**
     * スペクトルチャートをリセット
     */
    resetSpectrumZoom() {
        if (this.spectrumChart) {
            this.spectrumChart.resetZoom();
        }
    },

    /**
     * 加速度応答スペクトルチャートをリセット
     */
    resetResponseAccelerationZoom() {
        if (this.responseAccelerationChart) {
            this.responseAccelerationChart.resetZoom();
        }
    },

    /**
     * 速度応答スペクトルチャートをリセット
     */
    resetResponseVelocityZoom() {
        if (this.responseVelocityChart) {
            this.responseVelocityChart.resetZoom();
        }
    },

    /**
     * 変位応答スペクトルチャートをリセット
     */
    resetResponseDisplacementZoom() {
        if (this.responseDisplacementChart) {
            this.responseDisplacementChart.resetZoom();
        }
    },

    /**
     * スペクトルチャートを更新
     * @param {number[]} frequencies - 周波数配列
     * @param {number[]} amplitudes - 振幅配列
     * @param {Object} options - オプション
     */
    updateSpectrumChart(frequencies, amplitudes, options = {}) {
        if (!this.spectrumChart) {
            return;
        }

        const {
            logScale = false,
            isPowerSpectrum = false,
            unit = 'cm/s2'
        } = options;

        const startIndex = 1;
        const filteredFreq = frequencies.slice(startIndex);
        const filteredAmp = amplitudes.slice(startIndex);

        // 0.5Hz以上の最大値でY軸レンジを設定
        const yMaxValue = this._getMaxAbove05Hz(filteredFreq, filteredAmp);
        const yAxisMax = logScale
            ? (yMaxValue > 0 ? Math.log10(yMaxValue * 1.1) : undefined)
            : (yMaxValue > 0 ? yMaxValue * 1.1 : undefined);

        const { labels, values } = this.downsample(filteredFreq, filteredAmp, 1000);

        const displayValues = logScale
            ? values.map(v => v > 0 ? Math.log10(v) : -10)
            : values;

        this.spectrumChart.data.labels = labels;
        this.spectrumChart.data.datasets[0].data = displayValues;
        this.spectrumChart.data.datasets[0].label = isPowerSpectrum ? 'パワースペクトル' : '振幅スペクトル';

        const yAxisLabel = isPowerSpectrum
            ? (logScale ? `パワー [log(${unit}²)]` : `パワー [${unit}²]`)
            : (logScale ? `振幅 [log(${unit})]` : `振幅 [${unit}]`);

        this.spectrumChart.options.scales.y.max = yAxisMax;
        this.spectrumChart.options.scales.y.title.text = yAxisLabel;
        this.spectrumChart.update();
    },

    /**
     * チャートを破棄
     */
    destroy() {
        if (this.waveformChart) {
            this.waveformChart.destroy();
            this.waveformChart = null;
        }
        if (this.velocityChart) {
            this.velocityChart.destroy();
            this.velocityChart = null;
        }
        if (this.displacementChart) {
            this.displacementChart.destroy();
            this.displacementChart = null;
        }
        if (this.spectrumChart) {
            this.spectrumChart.destroy();
            this.spectrumChart = null;
        }
        if (this.responseAccelerationChart) {
            this.responseAccelerationChart.destroy();
            this.responseAccelerationChart = null;
        }
        if (this.responseVelocityChart) {
            this.responseVelocityChart.destroy();
            this.responseVelocityChart = null;
        }
        if (this.responseDisplacementChart) {
            this.responseDisplacementChart.destroy();
            this.responseDisplacementChart = null;
        }
    }
};

// グローバルにエクスポート
window.WaveformChart = WaveformChart;
