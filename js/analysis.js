/**
 * 統計分析モジュール
 */

const Analysis = {
    /**
     * 最大値を計算
     * @param {number[]} data - データ配列
     * @returns {number}
     */
    max(data) {
        return Math.max(...data);
    },

    /**
     * 最小値を計算
     * @param {number[]} data - データ配列
     * @returns {number}
     */
    min(data) {
        return Math.min(...data);
    },

    /**
     * 平均値を計算
     * @param {number[]} data - データ配列
     * @returns {number}
     */
    mean(data) {
        const sum = data.reduce((acc, val) => acc + val, 0);
        return sum / data.length;
    },

    /**
     * 分散を計算
     * @param {number[]} data - データ配列
     * @param {number} mean - 平均値（省略可）
     * @returns {number}
     */
    variance(data, mean = null) {
        const avg = mean !== null ? mean : this.mean(data);
        const squaredDiffs = data.map(val => Math.pow(val - avg, 2));
        return squaredDiffs.reduce((acc, val) => acc + val, 0) / data.length;
    },

    /**
     * 標準偏差を計算
     * @param {number[]} data - データ配列
     * @returns {number}
     */
    standardDeviation(data) {
        return Math.sqrt(this.variance(data));
    },

    /**
     * RMS（二乗平均平方根）を計算
     * @param {number[]} data - データ配列
     * @returns {number}
     */
    rms(data) {
        const squaredSum = data.reduce((acc, val) => acc + val * val, 0);
        return Math.sqrt(squaredSum / data.length);
    },

    /**
     * 中央値を計算
     * @param {number[]} data - データ配列
     * @returns {number}
     */
    median(data) {
        const sorted = [...data].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
    },

    /**
     * ピークツーピーク値を計算
     * @param {number[]} data - データ配列
     * @returns {number}
     */
    peakToPeak(data) {
        return this.max(data) - this.min(data);
    },

    /**
     * 歪度（スキューネス）を計算
     * @param {number[]} data - データ配列
     * @returns {number}
     */
    skewness(data) {
        const avg = this.mean(data);
        const std = this.standardDeviation(data);
        const n = data.length;

        if (std === 0) {
            return 0;
        }

        const sum = data.reduce((acc, val) =>
            acc + Math.pow((val - avg) / std, 3), 0);

        return sum / n;
    },

    /**
     * 尖度（クルトシス）を計算
     * @param {number[]} data - データ配列
     * @returns {number}
     */
    kurtosis(data) {
        const avg = this.mean(data);
        const std = this.standardDeviation(data);
        const n = data.length;

        if (std === 0) {
            return 0;
        }

        const sum = data.reduce((acc, val) =>
            acc + Math.pow((val - avg) / std, 4), 0);

        return (sum / n) - 3; // 過剰尖度
    },

    /**
     * 全ての統計情報を計算
     * @param {number[]} data - データ配列
     * @param {number} samplingRate - サンプリング周波数
     * @returns {Object} - 統計情報
     */
    computeAll(data, samplingRate) {
        const count = data.length;
        const duration = count / samplingRate;
        const maxVal = this.max(data);
        const minVal = this.min(data);
        const meanVal = this.mean(data);
        const stdVal = this.standardDeviation(data);
        const rmsVal = this.rms(data);

        return {
            count,
            duration,
            max: maxVal,
            min: minVal,
            mean: meanVal,
            std: stdVal,
            rms: rmsVal,
            peakToPeak: maxVal - minVal,
            median: this.median(data),
            skewness: this.skewness(data),
            kurtosis: this.kurtosis(data)
        };
    },

    /**
     * 数値をフォーマット
     * @param {number} value - 数値
     * @param {number} precision - 小数点以下桁数
     * @returns {string}
     */
    formatNumber(value, precision = 4) {
        if (Math.abs(value) >= 1000 || (Math.abs(value) < 0.001 && value !== 0)) {
            return value.toExponential(precision);
        }
        return value.toFixed(precision);
    },

    /**
     * ベースライン補正（線形トレンド除去）
     * @param {number[]} data - データ配列
     * @returns {number[]} - 補正後のデータ
     */
    removeBaseline(data) {
        const n = data.length;
        if (n < 2) {
            return [...data];
        }

        // 線形回帰でトレンドを求める
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += data[i];
            sumXY += i * data[i];
            sumX2 += i * i;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // トレンドを除去
        return data.map((val, i) => val - (slope * i + intercept));
    },

    /**
     * 台形則による数値積分
     * @param {number[]} data - データ配列
     * @param {number} dt - 時間間隔（1/サンプリング周波数）
     * @param {boolean} removeBaseline - ベースライン補正を行うか
     * @returns {number[]} - 積分結果
     */
    integrate(data, dt, removeBaseline = true) {
        const n = data.length;
        if (n < 2) {
            return [0];
        }

        // ベースライン補正
        const correctedData = removeBaseline ? this.removeBaseline(data) : data;

        // 台形則で積分
        const integrated = new Array(n);
        integrated[0] = 0;

        for (let i = 1; i < n; i++) {
            // 台形則: (f(x) + f(x+h)) * h / 2
            integrated[i] = integrated[i - 1] + (correctedData[i - 1] + correctedData[i]) * dt / 2;
        }

        return integrated;
    },

    /**
     * 加速度から速度を計算
     * @param {number[]} acceleration - 加速度データ
     * @param {number} samplingRate - サンプリング周波数
     * @param {string} unit - 加速度の単位（m/s², gal, g）
     * @returns {number[]} - 速度データ（m/s）
     */
    accelerationToVelocity(acceleration, samplingRate, unit = 'm/s²') {
        const dt = 1 / samplingRate;

        // 単位をm/s²に変換
        let accInMPS2 = [...acceleration];
        if (unit === 'gal') {
            accInMPS2 = acceleration.map(val => val / 100); // gal -> m/s²
        } else if (unit === 'g') {
            accInMPS2 = acceleration.map(val => val * 9.80665); // g -> m/s²
        }

        // 積分して速度を求める
        return this.integrate(accInMPS2, dt, true);
    },

    /**
     * 速度から変位を計算
     * @param {number[]} velocity - 速度データ（m/s）
     * @param {number} samplingRate - サンプリング周波数
     * @returns {number[]} - 変位データ（m）
     */
    velocityToDisplacement(velocity, samplingRate) {
        const dt = 1 / samplingRate;
        return this.integrate(velocity, dt, true);
    },

    /**
     * 加速度から速度と変位を一括計算
     * @param {number[]} acceleration - 加速度データ
     * @param {number} samplingRate - サンプリング周波数
     * @param {string} unit - 加速度の単位
     * @returns {Object} - { velocity, displacement }
     */
    computeVelocityAndDisplacement(acceleration, samplingRate, unit = 'm/s²') {
        const velocity = this.accelerationToVelocity(acceleration, samplingRate, unit);
        const displacement = this.velocityToDisplacement(velocity, samplingRate);

        return {
            velocity,      // m/s
            displacement   // m
        };
    }
};

// グローバルにエクスポート
window.Analysis = Analysis;
