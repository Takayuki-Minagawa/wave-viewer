/**
 * ファイル読み込みモジュール
 */

const FileReaderModule = {
    /** ファイルをテキストとして読み込む。 */
    readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
            reader.readAsText(file);
        });
    },

    /** データとメタデータを同じ内容から一度だけ解析する。 */
    parse(text, options = {}) {
        if (this.isKnetFormat(text)) {
            return this.parseKnetRecord(text);
        }
        return {
            data: this.parseDelimitedData(text, options),
            metadata: this.emptyMetadata()
        };
    },

    /** テキストデータを数値配列に変換する。 */
    parseData(text, options = {}) {
        return this.parse(text, options).data;
    },

    /**
     * 通常の数値ファイルを解析する。
     * skipHeader は空行を含む物理行数。空行と # / // コメント行のみを無視する。
     * 不正な数値行を飛ばすと時間軸が変わるため、行番号を示して読み込みを中止する。
     */
    parseDelimitedData(text, options = {}) {
        const { skipHeader = 0, delimiter = null, columnIndex = 0 } = options;
        if (!Number.isInteger(skipHeader) || skipHeader < 0) {
            throw new Error('ヘッダー行スキップは0以上の整数で指定してください');
        }
        if (!Number.isInteger(columnIndex) || columnIndex < 0) {
            throw new Error('列番号は0以上の整数で指定してください');
        }
        if (delimiter !== null && (typeof delimiter !== 'string' || delimiter.length !== 1)) {
            throw new Error('区切り文字は1文字で指定してください');
        }

        const lines = text.split(/\r\n|\n|\r/);
        const data = [];
        let detectedDelimiter;
        // 列/区切り文字を明示すると、カンマを桁区切りとして自動解釈しない。
        const allowGroupedLine = delimiter === null && !Object.hasOwn(options, 'columnIndex');

        for (let index = skipHeader; index < lines.length; index++) {
            const line = lines[index];
            const trimmed = line.trim();
            if (!trimmed || /^(#|\/\/)/.test(trimmed)) {
                continue;
            }
            if (detectedDelimiter === undefined) {
                detectedDelimiter = delimiter || this.detectDelimiter(line, allowGroupedLine);
            }
            const columns = this.splitColumns(line, detectedDelimiter);
            const value = columns[columnIndex];
            const num = this.parseNumber(value);
            if (!Number.isFinite(num)) {
                throw new Error(`数値データが不正です（${index + 1}行目、${columnIndex + 1}列目）`);
            }
            data.push(num);
        }
        if (data.length === 0) {
            throw new Error('有効な数値データが見つかりませんでした');
        }
        return data;
    },

    /**
     * 数値全体を検証する。部分的な parseFloat (例: "1abc" → 1) は使わない。
     * 正規の3桁区切り、指数表記、およびCSVの引用符付き数値を受け付ける。
     */
    parseNumber(value) {
        if (typeof value !== 'string') {
            return NaN;
        }
        let token = value.trim();
        if (token.startsWith('"') && token.endsWith('"')) {
            token = token.slice(1, -1).trim();
        }
        const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
        const grouped = /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d*)?(?:[eE][+-]?\d+)?$/;
        if (!decimal.test(token) && !grouped.test(token)) {
            return NaN;
        }
        const number = Number(token.replace(/,/g, ''));
        return Number.isFinite(number) ? number : NaN;
    },

    /** 先頭の数値行から区切り文字を検出する。端のタブは空欄を表す区切りとして保持する。 */
    detectDelimiter(line, allowGroupedLine = true) {
        if (!line) {
            return null;
        }
        const trimmed = line.trim();
        // TSVの先頭・末尾の空欄を通常のインデントとして除去しない。
        const outsideQuotes = line.replace(/"(?:[^"]|"")*"/g, '');
        if (outsideQuotes.includes('\t')) {
            return '\t';
        }
        if (allowGroupedLine && Number.isFinite(this.parseNumber(trimmed))) {
            return null;
        }
        // 引用符内のカンマは列区切りではない。
        for (const delimiter of [';', ',']) {
            if (outsideQuotes.includes(delimiter)) {
                return delimiter;
            }
        }
        return /\s/.test(outsideQuotes.trim()) ? ' ' : null;
    },

    /** 単純な数値CSVの引用符を尊重して列を分割する。 */
    splitColumns(line, delimiter) {
        if (!delimiter) {
            return [line];
        }
        if (delimiter === ' ') {
            return line.trim().split(/\s+/);
        }
        const columns = [];
        let field = '';
        let quoted = false;
        for (let i = 0; i < line.length; i++) {
            const character = line[i];
            if (character === '"') {
                quoted = !quoted;
            }
            if (character === delimiter && !quoted) {
                columns.push(field);
                field = '';
            } else {
                field += character;
            }
        }
        columns.push(field);
        return columns;
    },

    /**
     * ヘッダーの特徴で検出する。数値欄やデータ行が壊れていても検出し、
     * K-net専用の検証でエラーにする（通常データとして読み飛ばさない）。
     */
    isKnetFormat(text) {
        const header = text.split(/\r\n|\n|\r/).slice(0, 17);
        return /^\s*Origin Time\b/.test(header[0] || '') ||
            (header.some(line => /^Sampling Freq/.test(line)) &&
             header.some(line => /^Scale Factor/.test(line)));
    },

    emptyMetadata() {
        return {
            isKnet: false,
            samplingRate: null,
            scaleFactor: null,
            duration: null,
            stationCode: null,
            direction: null
        };
    },

    /** K-netの必須換算情報を検証する。 */
    readKnetMetadata(lines) {
        const header = lines.slice(0, 17);
        const metadata = { ...this.emptyMetadata(), isKnet: true };
        const samplingLine = header.find(line => /^Sampling Freq/.test(line)) || '';
        const samplingMatch = samplingLine.match(/^Sampling Freq(?:\(Hz\))?\s+(.+?)\s*Hz\s*$/i);
        const samplingRate = samplingMatch ? this.parseNumber(samplingMatch[1]) : NaN;
        if (!Number.isFinite(samplingRate) || samplingRate <= 0) {
            throw new Error('K-netのサンプリング周波数が不正または欠落しています');
        }
        metadata.samplingRate = samplingRate;

        const scaleLine = header.find(line => /^Scale Factor/.test(line)) || '';
        const scaleMatch = scaleLine.match(/^Scale Factor\s+(.+?)\s*\(gal\)\s*\/\s*(.+?)\s*$/i);
        const numerator = scaleMatch ? this.parseNumber(scaleMatch[1]) : NaN;
        const denominator = scaleMatch ? this.parseNumber(scaleMatch[2]) : NaN;
        const scaleFactor = numerator / denominator;
        if (!(numerator > 0) || !(denominator > 0) || !Number.isFinite(scaleFactor) || scaleFactor <= 0) {
            throw new Error('K-netのスケールファクターが不正または欠落しています');
        }
        metadata.scaleFactor = scaleFactor;

        const durationLine = header.find(line => /^Duration Time/.test(line)) || '';
        const durationMatch = durationLine.match(/^Duration Time\(s\)\s+(.+?)\s*$/);
        const duration = durationMatch ? this.parseNumber(durationMatch[1]) : NaN;
        metadata.duration = Number.isFinite(duration) && duration >= 0 ? duration : null;
        const stationLine = header.find(line => /^Station Code/.test(line)) || '';
        metadata.stationCode = stationLine.replace(/^Station Code\s*/, '').trim() || null;
        const directionLine = header.find(line => /^Dir\./.test(line)) || '';
        metadata.direction = directionLine.replace(/^Dir\.\s*/, '').trim() || null;
        return metadata;
    },

    /** 17行のヘッダーと数値データをまとめて解析する。 */
    parseKnetRecord(text) {
        const lines = text.split(/\r\n|\n|\r/);
        const metadata = this.readKnetMetadata(lines);
        const data = [];
        for (let i = 17; i < lines.length; i++) {
            if (!lines[i].trim()) {
                continue;
            }
            for (const token of lines[i].trim().split(/\s+/)) {
                const count = this.parseNumber(token);
                const acceleration = count * metadata.scaleFactor;
                if (!Number.isFinite(count) || !Number.isFinite(acceleration)) {
                    throw new Error(`K-netの数値データが不正です（${i + 1}行目）`);
                }
                data.push(acceleration);
            }
        }
        if (data.length === 0) {
            throw new Error('K-netフォーマットからデータを抽出できませんでした');
        }
        return { data, metadata };
    },

    parseKnetData(text) {
        return this.parseKnetRecord(text).data;
    },

    extractKnetMetadata(text) {
        return this.isKnetFormat(text)
            ? this.readKnetMetadata(text.split(/\r\n|\n|\r/))
            : this.emptyMetadata();
    },

    async loadFile(file, options = {}) {
        return this.parse(await this.readAsText(file), options);
    },

    getExtension(filename) {
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    },

    isValidFileType(file) {
        const validExtensions = ['csv', 'txt', 'dat', 'ew', 'ns', 'ud', 'ew2', 'ns2', 'ud2'];
        return validExtensions.includes(this.getExtension(file.name));
    }
};

window.FileReaderModule = FileReaderModule;
