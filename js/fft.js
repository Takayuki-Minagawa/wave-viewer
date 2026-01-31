/**
 * FFT (高速フーリエ変換) モジュール
 * Cooley-Tukey アルゴリズムを使用
 */

const FFT = {
    /**
     * 次の2のべき乗を取得
     * @param {number} n - 入力値
     * @returns {number} - 2のべき乗
     */
    nextPowerOf2(n) {
        return Math.pow(2, Math.ceil(Math.log2(n)));
    },

    /**
     * データを2のべき乗の長さにゼロパディング
     * @param {number[]} data - 入力データ
     * @returns {number[]} - パディングされたデータ
     */
    zeroPad(data) {
        const n = this.nextPowerOf2(data.length);
        const padded = new Array(n).fill(0);
        for (let i = 0; i < data.length; i++) {
            padded[i] = data[i];
        }
        return padded;
    },

    /**
     * 窓関数を適用
     * @param {number[]} data - 入力データ
     * @param {string} windowType - 窓関数の種類
     * @returns {number[]} - 窓関数適用後のデータ
     */
    applyWindow(data, windowType = 'hanning') {
        const n = data.length;
        const windowed = new Array(n);

        for (let i = 0; i < n; i++) {
            let w;
            switch (windowType) {
                case 'hanning':
                    w = 0.5 * (1 - Math.cos(2 * Math.PI * i / (n - 1)));
                    break;
                case 'hamming':
                    w = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1));
                    break;
                case 'blackman':
                    w = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)) 
                        + 0.08 * Math.cos(4 * Math.PI * i / (n - 1));
                    break;
                case 'rectangular':
                default:
                    w = 1;
                    break;
            }
            windowed[i] = data[i] * w;
        }

        return windowed;
    },

    /**
     * FFT を実行（Cooley-Tukey アルゴリズム）
     * @param {number[]} real - 実部
     * @param {number[]} imag - 虚部
     */
    transform(real, imag) {
        const n = real.length;

        if (n <= 1) return;

        // ビット反転による並び替え
        for (let i = 0, j = 0; i < n; i++) {
            if (i < j) {
                [real[i], real[j]] = [real[j], real[i]];
                [imag[i], imag[j]] = [imag[j], imag[i]];
            }
            let m = n >> 1;
            while (m >= 1 && j >= m) {
                j -= m;
                m >>= 1;
            }
            j += m;
        }

        // バタフライ演算
        for (let mmax = 1; mmax < n; mmax <<= 1) {
            const theta = -Math.PI / mmax;
            const wpr = Math.cos(theta);
            const wpi = Math.sin(theta);

            for (let m = 0; m < mmax; m++) {
                const angle = m * theta;
                let wr = Math.cos(angle);
                let wi = Math.sin(angle);

                for (let i = m; i < n; i += mmax << 1) {
                    const j = i + mmax;
                    const tr = wr * real[j] - wi * imag[j];
                    const ti = wr * imag[j] + wi * real[j];

                    real[j] = real[i] - tr;
                    imag[j] = imag[i] - ti;
                    real[i] += tr;
                    imag[i] += ti;
                }

                const wtemp = wr;
                wr = wr * wpr - wi * wpi;
                wi = wi * wpr + wtemp * wpi;
            }
        }
    },

    /**
     * 振幅スペクトルを計算
     * @param {number[]} data - 時系列データ
     * @param {number} samplingRate - サンプリング周波数
     * @param {Object} options - オプション
     * @returns {Object} - 周波数と振幅の配列
     */
    amplitudeSpectrum(data, samplingRate, options = {}) {
        const {
            windowType = 'hanning',
            normalize = true
        } = options;

        // 窓関数を適用
        let processedData = this.applyWindow(data, windowType);

        // ゼロパディング
        processedData = this.zeroPad(processedData);
        const n = processedData.length;

        // 実部と虚部を初期化
        const real = [...processedData];
        const imag = new Array(n).fill(0);

        // FFT 実行
        this.transform(real, imag);

        // 振幅スペクトルを計算（ナイキスト周波数まで）
        const halfN = n / 2;
        const frequencies = [];
        const amplitudes = [];
        const df = samplingRate / n;

        for (let i = 0; i <= halfN; i++) {
            frequencies.push(i * df);
            let amp = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
            
            if (normalize) {
                // 正規化（DC成分以外は2倍）
                amp = i === 0 || i === halfN ? amp / n : (2 * amp) / n;
            }
            
            amplitudes.push(amp);
        }

        return { frequencies, amplitudes };
    },

    /**
     * パワースペクトルを計算
     * @param {number[]} data - 時系列データ
     * @param {number} samplingRate - サンプリング周波数
     * @param {Object} options - オプション
     * @returns {Object} - 周波数とパワーの配列
     */
    powerSpectrum(data, samplingRate, options = {}) {
        const { frequencies, amplitudes } = this.amplitudeSpectrum(data, samplingRate, options);
        const powers = amplitudes.map(amp => amp * amp);
        return { frequencies, powers };
    },

    /**
     * ピーク周波数を検出
     * @param {number[]} frequencies - 周波数配列
     * @param {number[]} amplitudes - 振幅配列
     * @param {number} minFreq - 最小周波数（0Hzを除外するため）
     * @returns {Object} - ピーク周波数と振幅
     */
    findPeakFrequency(frequencies, amplitudes, minFreq = 0.1) {
        let maxAmp = -Infinity;
        let peakFreq = 0;
        let peakIndex = 0;

        for (let i = 0; i < frequencies.length; i++) {
            if (frequencies[i] >= minFreq && amplitudes[i] > maxAmp) {
                maxAmp = amplitudes[i];
                peakFreq = frequencies[i];
                peakIndex = i;
            }
        }

        return { 
            frequency: peakFreq, 
            amplitude: maxAmp,
            index: peakIndex
        };
    }
};

// グローバルにエクスポート
window.FFT = FFT;
