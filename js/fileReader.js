/**
 * ファイル読み込みモジュール
 */

const FileReaderModule = {
    /**
     * ファイルをテキストとして読み込む
     * @param {File} file - ファイルオブジェクト
     * @returns {Promise<string>} - ファイル内容
     */
    readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                resolve(event.target.result);
            };

            reader.onerror = (error) => {
                reject(new Error('ファイルの読み込みに失敗しました: ' + error.message));
            };

            reader.readAsText(file);
        });
    },

    /**
     * テキストデータをパースして数値配列に変換
     * @param {string} text - テキストデータ
     * @param {Object} options - パースオプション
     * @returns {number[]} - 数値配列
     */
    parseData(text, options = {}) {
        // K-net/KiK-netフォーマットかチェック
        if (this.isKnetFormat(text)) {
            console.log('K-net/KiK-netフォーマットを検出しました');
            return this.parseKnetData(text);
        }

        const {
            skipHeader = 0,
            delimiter = null, // null = 自動検出
            columnIndex = 0
        } = options;

        // 行に分割（空行を除去）
        let lines = text.split(/\r?\n/).filter(line => line.trim() !== '');

        // ヘッダー行をスキップ
        if (skipHeader > 0) {
            lines = lines.slice(skipHeader);
        }

        // デリミタを自動検出
        const detectedDelimiter = delimiter || this.detectDelimiter(lines[0]);

        const data = [];
        const errors = [];

        lines.forEach((line, index) => {
            try {
                let value;

                if (detectedDelimiter) {
                    // 区切り文字がある場合は指定列を取得
                    const columns = line.split(detectedDelimiter);
                    value = columns[columnIndex];
                } else {
                    // 区切り文字がない場合は行全体を数値として扱う
                    value = line;
                }

                // 数値に変換
                const num = this.parseNumber(value);

                if (!isNaN(num) && isFinite(num)) {
                    data.push(num);
                } else {
                    errors.push({ line: index + skipHeader + 1, value: value });
                }
            } catch (e) {
                errors.push({ line: index + skipHeader + 1, value: line, error: e.message });
            }
        });

        if (data.length === 0) {
            throw new Error('有効な数値データが見つかりませんでした');
        }

        if (errors.length > 0 && errors.length <= 10) {
            console.warn('パースエラーがある行:', errors);
        } else if (errors.length > 10) {
            console.warn(`パースエラー: ${errors.length}行でエラーが発生`);
        }

        return data;
    },

    /**
     * K-net/KiK-netフォーマットかどうかを判定
     * @param {string} text - テキストデータ
     * @returns {boolean}
     */
    isKnetFormat(text) {
        const lines = text.split(/\r?\n/);
        if (lines.length < 20) {
            return false;
        }

        // 最初の数行でK-netフォーマットの特徴をチェック
        // 1行目: Origin Time
        // 11行目: Sampling Freq(Hz)
        // 14行目: Scale Factor
        const hasOriginTime = lines[0] && lines[0].includes('Origin Time');
        const hasSamplingFreq = lines.length > 10 && lines[10] && lines[10].includes('Sampling Freq');
        const hasScaleFactor = lines.length > 13 && lines[13] && lines[13].includes('Scale Factor');

        // データ行（18行目以降）に「→」が含まれているかチェック
        const hasArrow = lines.length > 17 && lines[17] && lines[17].includes('→');

        return hasOriginTime && hasSamplingFreq && hasScaleFactor && hasArrow;
    },

    /**
     * K-net/KiK-netフォーマットのデータをパース
     * @param {string} text - テキストデータ
     * @returns {number[]} - 数値配列（スケールファクター適用済み）
     */
    parseKnetData(text) {
        const lines = text.split(/\r?\n/);
        const data = [];

        // スケールファクターを取得（14行目）
        let scaleFactor = 1.0;
        if (lines.length > 13) {
            const scaleFactorLine = lines[13];
            // "Scale Factor      7845(gal)/8223790" から数値を抽出
            const match = scaleFactorLine.match(/(\d+)\(gal\)\/(\d+)/);
            if (match) {
                const numerator = parseFloat(match[1]);
                const denominator = parseFloat(match[2]);
                scaleFactor = numerator / denominator;
                console.log(`スケールファクター: ${numerator}/${denominator} = ${scaleFactor}`);
            }
        }

        // サンプリング周波数を取得（11行目）
        let samplingFreq = 100; // デフォルト
        if (lines.length > 10) {
            const samplingLine = lines[10];
            const match = samplingLine.match(/(\d+)Hz/);
            if (match) {
                samplingFreq = parseInt(match[1]);
                console.log(`サンプリング周波数: ${samplingFreq} Hz`);
            }
        }

        // 18行目以降がデータ行
        for (let i = 17; i < lines.length; i++) {
            const line = lines[i];
            if (!line || line.trim() === '') {
                continue;
            }

            // 行番号と「→」を除去して数値部分のみ抽出
            const arrowIndex = line.indexOf('→');
            if (arrowIndex === -1) {
                continue;
            }

            const dataStr = line.substring(arrowIndex + 1);
            // 空白で分割して数値を取得
            const numbers = dataStr.trim().split(/\s+/);

            numbers.forEach(numStr => {
                const num = parseFloat(numStr);
                if (!isNaN(num) && isFinite(num)) {
                    // スケールファクターを適用
                    data.push(num * scaleFactor);
                }
            });
        }

        if (data.length === 0) {
            throw new Error('K-netフォーマットからデータを抽出できませんでした');
        }

        console.log(`K-netデータ読み込み完了: ${data.length}点`);
        return data;
    },

    /**
     * 文字列を数値にパース
     * @param {string} str - 文字列
     * @returns {number}
     */
    parseNumber(str) {
        if (typeof str !== 'string') {
            return NaN;
        }

        // 前後の空白を除去
        str = str.trim();

        // 空文字チェック
        if (str === '') {
            return NaN;
        }

        // 科学的表記に対応（例: 1.23e-4, 1.23E+4）
        // カンマ区切りの数値にも対応（例: 1,234.56）
        str = str.replace(/,(?=\d{3})/g, '');

        return parseFloat(str);
    },

    /**
     * デリミタを自動検出
     * @param {string} line - サンプル行
     * @returns {string|null}
     */
    detectDelimiter(line) {
        if (!line) {
            return null;
        }

        const delimiters = [',', '\t', ';', ' '];
        const counts = {};

        delimiters.forEach(d => {
            counts[d] = (line.split(d).length - 1);
        });

        // 最も多く出現する区切り文字を選択
        let maxCount = 0;
        let bestDelimiter = null;

        for (const [d, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                bestDelimiter = d;
            }
        }

        // 区切り文字が見つからない場合はnullを返す
        return maxCount > 0 ? bestDelimiter : null;
    },

    /**
     * K-netフォーマットからメタデータを抽出
     * @param {string} text - テキストデータ
     * @returns {Object} - メタデータ（samplingRate, scaleFactor, etc.）
     */
    extractKnetMetadata(text) {
        const lines = text.split(/\r?\n/);
        const metadata = {
            isKnet: false,
            samplingRate: null,
            scaleFactor: null,
            duration: null,
            stationCode: null,
            direction: null
        };

        if (!this.isKnetFormat(text)) {
            return metadata;
        }

        metadata.isKnet = true;

        // サンプリング周波数を取得（11行目）
        if (lines.length > 10) {
            const samplingLine = lines[10];
            const match = samplingLine.match(/(\d+)Hz/);
            if (match) {
                metadata.samplingRate = parseInt(match[1]);
            }
        }

        // 継続時間を取得（12行目）
        if (lines.length > 11) {
            const durationLine = lines[11];
            const match = durationLine.match(/(\d+(\.\d+)?)/);
            if (match) {
                metadata.duration = parseFloat(match[1]);
            }
        }

        // 方向を取得（13行目）
        if (lines.length > 12) {
            const dirLine = lines[12];
            const match = dirLine.match(/Dir\.\s+(.+)/);
            if (match) {
                metadata.direction = match[1].trim();
            }
        }

        // スケールファクターを取得（14行目）
        if (lines.length > 13) {
            const scaleFactorLine = lines[13];
            const match = scaleFactorLine.match(/(\d+)\(gal\)\/(\d+)/);
            if (match) {
                const numerator = parseFloat(match[1]);
                const denominator = parseFloat(match[2]);
                metadata.scaleFactor = numerator / denominator;
            }
        }

        // 観測点コードを取得（6行目）
        if (lines.length > 5) {
            const stationLine = lines[5];
            const match = stationLine.match(/Station Code\s+(.+)/);
            if (match) {
                metadata.stationCode = match[1].trim();
            }
        }

        return metadata;
    },

    /**
     * ファイルを読み込んで数値配列に変換
     * @param {File} file - ファイルオブジェクト
     * @param {Object} options - オプション
     * @returns {Promise<Object>} - { data: number[], metadata: Object }
     */
    async loadFile(file, options = {}) {
        const text = await this.readAsText(file);
        const metadata = this.extractKnetMetadata(text);
        const data = this.parseData(text, options);

        return { data, metadata };
    },

    /**
     * ファイル拡張子を取得
     * @param {string} filename - ファイル名
     * @returns {string}
     */
    getExtension(filename) {
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    },

    /**
     * ファイルが対応形式かチェック
     * @param {File} file - ファイルオブジェクト
     * @returns {boolean}
     */
    isValidFileType(file) {
        const validExtensions = ['csv', 'txt', 'dat'];
        const extension = this.getExtension(file.name);
        return validExtensions.includes(extension);
    }
};

// グローバルにエクスポート
window.FileReaderModule = FileReaderModule;
