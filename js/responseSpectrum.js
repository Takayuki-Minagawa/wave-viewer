/**
 * 応答スペクトル計算モジュール
 */

const ResponseSpectrum = {
    /**
     * デフォルト計算条件
     */
    defaultConfig: {
        periodMin: 0.02,      // sec
        periodMax: 10.0,      // sec
        periodDivisions: 200, // 等比分割数（= 201点）
        dampings: [0.02, 0.03, 0.05]
    },

    /**
     * 応答スペクトルを計算
     * @param {number[]} acceleration - 加速度時刻歴
     * @param {number} samplingRate - サンプリング周波数 [Hz]
     * @param {string} unit - 入力加速度単位（m/s², gal, g）
     * @param {Object} config - 計算条件
     * @returns {Object}
     */
    compute(acceleration, samplingRate, unit = 'm/s²', config = {}) {
        if (!Array.isArray(acceleration) || acceleration.length < 2) {
            throw new Error('応答スペクトル計算には2点以上の加速度データが必要です');
        }
        if (!samplingRate || samplingRate <= 0) {
            throw new Error('サンプリング周波数が不正です');
        }

        const options = { ...this.defaultConfig, ...config };
        const periods = this.generateLogPeriods(
            options.periodMin,
            options.periodMax,
            options.periodDivisions
        );
        const dampings = [...options.dampings];
        const dt = 1 / samplingRate;
        const groundAcceleration = this._convertAccelerationToMps2(acceleration, unit);

        const accelerationSpectra = [];
        const velocitySpectra = [];
        const displacementSpectra = [];

        dampings.forEach(damping => {
            const spectrum = this._computeForDamping(
                groundAcceleration,
                dt,
                periods,
                damping
            );
            accelerationSpectra.push(spectrum.acceleration);
            velocitySpectra.push(spectrum.velocity);
            displacementSpectra.push(spectrum.displacement);
        });

        return {
            periods,
            dampings,
            acceleration: accelerationSpectra, // m/s²
            velocity: velocitySpectra,         // m/s
            displacement: displacementSpectra  // m
        };
    },

    /**
     * 等比数列（対数等間隔）の周期配列を生成
     * @param {number} periodMin - 最小周期 [sec]
     * @param {number} periodMax - 最大周期 [sec]
     * @param {number} divisions - 分割数
     * @returns {number[]}
     */
    generateLogPeriods(periodMin, periodMax, divisions) {
        if (periodMin <= 0 || periodMax <= periodMin || divisions < 1) {
            throw new Error('周期レンジ設定が不正です');
        }

        const periods = new Array(divisions + 1);
        const ratio = Math.pow(periodMax / periodMin, 1 / divisions);

        for (let i = 0; i <= divisions; i++) {
            periods[i] = periodMin * Math.pow(ratio, i);
        }

        return periods;
    },

    /**
     * 加速度データを m/s² に変換
     * @param {number[]} acceleration - 加速度データ
     * @param {string} unit - 加速度単位（m/s², gal, g）
     * @returns {number[]}
     */
    _convertAccelerationToMps2(acceleration, unit = 'm/s²') {
        if (unit === 'gal') {
            return acceleration.map(value => value / 100);
        }
        if (unit === 'g') {
            return acceleration.map(value => value * 9.80665);
        }
        return [...acceleration];
    },

    /**
     * 1つの減衰定数に対する応答スペクトルを計算
     * @param {number[]} groundAcceleration - 地動加速度 [m/s²]
     * @param {number} dt - 時間刻み [sec]
     * @param {number[]} periods - 周期配列 [sec]
     * @param {number} damping - 減衰定数（例: 0.05）
     * @returns {Object}
     */
    _computeForDamping(groundAcceleration, dt, periods, damping) {
        const acceleration = new Array(periods.length);
        const velocity = new Array(periods.length);
        const displacement = new Array(periods.length);

        for (let i = 0; i < periods.length; i++) {
            const response = this._computeSinglePeriodResponse(
                groundAcceleration,
                dt,
                periods[i],
                damping
            );
            acceleration[i] = response.sa;
            velocity[i] = response.sv;
            displacement[i] = response.sd;
        }

        return {
            acceleration,
            velocity,
            displacement
        };
    },

    /**
     * 1自由度系の最大応答を算定（Newmark-β法: β=1/4, γ=1/2）
     * @param {number[]} groundAcceleration - 地動加速度 [m/s²]
     * @param {number} dt - 時間刻み [sec]
     * @param {number} period - 固有周期 [sec]
     * @param {number} damping - 減衰定数
     * @returns {Object} - { sa, sv, sd }
     */
    _computeSinglePeriodResponse(groundAcceleration, dt, period, damping) {
        const omega = (2 * Math.PI) / period;
        const stiffness = omega * omega;           // k/m
        const dampingCoeff = 2 * damping * omega;  // c/m

        const beta = 0.25;
        const gamma = 0.5;

        const a0 = 1 / (beta * dt * dt);
        const a1 = gamma / (beta * dt);
        const a2 = 1 / (beta * dt);
        const a3 = (1 / (2 * beta)) - 1;
        const a4 = (gamma / beta) - 1;
        const a5 = dt * ((gamma / (2 * beta)) - 1);

        const kHat = stiffness + a0 + (a1 * dampingCoeff);

        let displacement = 0;
        let velocity = 0;
        let relAcceleration = -groundAcceleration[0];

        let maxSd = 0;
        let maxSv = 0;
        let maxSa = 0;

        for (let i = 0; i < groundAcceleration.length - 1; i++) {
            const loadNext = -groundAcceleration[i + 1];

            const pHat = loadNext
                + (a0 * displacement) + (a2 * velocity) + (a3 * relAcceleration)
                + dampingCoeff * (
                    (a1 * displacement) + (a4 * velocity) + (a5 * relAcceleration)
                );

            const displacementNext = pHat / kHat;
            const relAccelerationNext = (a0 * (displacementNext - displacement))
                - (a2 * velocity)
                - (a3 * relAcceleration);
            const velocityNext = velocity + dt * (
                ((1 - gamma) * relAcceleration) + (gamma * relAccelerationNext)
            );

            displacement = displacementNext;
            velocity = velocityNext;
            relAcceleration = relAccelerationNext;

            const absSa = Math.abs(relAcceleration + groundAcceleration[i + 1]); // 絶対加速度応答
            const absSv = Math.abs(velocity);
            const absSd = Math.abs(displacement);

            if (absSa > maxSa) {
                maxSa = absSa;
            }
            if (absSv > maxSv) {
                maxSv = absSv;
            }
            if (absSd > maxSd) {
                maxSd = absSd;
            }
        }

        return { sa: maxSa, sv: maxSv, sd: maxSd };
    }
};

// グローバルにエクスポート（window/worker両対応）
const responseSpectrumGlobal = typeof window !== 'undefined' ? window : self;
responseSpectrumGlobal.ResponseSpectrum = ResponseSpectrum;
