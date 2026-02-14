/**
 * 応答スペクトル計算ワーカー
 */

self.importScripts('responseSpectrum.js');

self.onmessage = (event) => {
    try {
        const { acceleration, samplingRate, unit, config } = event.data;
        const result = self.ResponseSpectrum.compute(
            acceleration,
            samplingRate,
            unit,
            config
        );
        self.postMessage({ ok: true, result });
    } catch (error) {
        self.postMessage({
            ok: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
