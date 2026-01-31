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
     * 文字列を数値にパース
     * @param {string} str - 文字列
     * @returns {number}
     */
    parseNumber(str) {
        if (typeof str !== 'string') return NaN;
        
        // 前後の空白を除去
        str = str.trim();
        
        // 空文字チェック
        if (str === '') return NaN;
        
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
        if (!line) return null;

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
     * ファイルを読み込んで数値配列に変換
     * @param {File} file - ファイルオブジェクト
     * @param {Object} options - オプション
     * @returns {Promise<number[]>}
     */
    async loadFile(file, options = {}) {
        const text = await this.readAsText(file);
        return this.parseData(text, options);
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
