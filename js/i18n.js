/**
 * 多言語対応（国際化）モジュール
 */

const I18n = {
    currentLang: 'ja', // デフォルト言語

    /**
     * 翻訳データ
     */
    translations: {
        ja: {
            // ヘッダー
            header: {
                title: 'Wave Viewer',
                subtitle: '加速度データ波形分析ツール'
            },
            // コントロールパネル
            controls: {
                fileSelect: 'ファイル選択',
                fileNotSelected: 'ファイル未選択',
                samplingRate: 'サンプリング周波数:',
                skipHeader: 'ヘッダー行スキップ:',
                dataUnit: 'データ単位:',
                analyzeBtn: '🔍 解析実行',
                analyzing: '解析中...'
            },
            // ドロップゾーン
            dropZone: {
                title: 'ファイルをドラッグ&ドロップ',
                hint: 'または上のボタンでファイルを選択',
                format: '対応形式: CSV, TXT, DAT（1列の数値データ）、K-net/KiK-net形式'
            },
            // チャート
            charts: {
                acceleration: '加速度波形 (Acceleration)',
                velocity: '速度波形 (Velocity)',
                displacement: '変位波形 (Displacement)',
                spectrum: 'フーリエスペクトル (Fourier Spectrum)',
                responseAcceleration: '加速度応答スペクトル (Acceleration Response Spectrum)',
                responseVelocity: '速度応答スペクトル (Velocity Response Spectrum)',
                responseDisplacement: '変位応答スペクトル (Displacement Response Spectrum)',
                resetBtn: 'リセット',
                zoomHint: 'マウスホイールでズーム、ドラッグでパン',
                integrationHint: '積分により計算（ベースライン補正済み）',
                doubleIntegrationHint: '2重積分により計算（ベースライン補正済み）',
                responseHint: 'h=2%, 3%, 5% / 周期0.02-10s（対数等間隔）',
                logScale: '対数スケール',
                powerSpectrum: 'パワースペクトル',
                time: '時間',
                frequency: '周波数',
                period: '周期'
            },
            // 統計情報
            stats: {
                title: '統計情報',
                dataPoints: 'データ点数',
                duration: '継続時間',
                max: '最大値',
                min: '最小値',
                mean: '平均値',
                std: '標準偏差',
                rms: 'RMS',
                peakFreq: 'ピーク周波数'
            },
            // エクスポート
            export: {
                title: 'データエクスポート',
                acceleration: '📥 加速度データ',
                velocity: '📥 速度データ',
                displacement: '📥 変位データ',
                responseSpectra: '📥 応答スペクトル',
                all: '📥 全データ（CSV）'
            },
            // マニュアル
            manual: {
                title: '📖 使い方ガイド',
                quickStart: 'クイックスタート',
                quickStartContent: [
                    '1. 「ファイル選択」ボタンをクリック、またはファイルをドラッグ&ドロップ',
                    '2. データが自動解析され、加速度・速度・変位・フーリエ・応答スペクトルが表示されます',
                    '3. グラフはマウスホイールでズーム、ドラッグでパン可能',
                    '4. 単位がgalの場合、速度は自動的にcm/sで表示されます',
                    '5. 必要に応じてCSV（応答スペクトル含む）をエクスポート'
                ],
                dataFormat: '対応データ形式',
                dataFormatContent: [
                    '【1列データ】CSV/TXT/DAT形式の数値データ（1行1データ）',
                    '【K-net/KiK-net】防災科学技術研究所の強震観測網データ',
                    '※ K-netデータは自動検出され、サンプリング周波数等が自動設定されます'
                ],
                features: '主な機能',
                featuresContent: [
                    '【加速度波形】元データの時系列グラフ',
                    '【速度波形】加速度を積分して自動計算（gal入力時はcm/s表示）',
                    '【変位波形】速度を積分して自動計算（2重積分）',
                    '【フーリエスペクトル】FFTによる周波数分析',
                    '【応答スペクトル】Sa/Sv/Sd（周期0.02-10s、h=2/3/5%）',
                    '【統計情報】最大値、平均、RMS、ピーク周波数等',
                    '【データエクスポート】各波形・応答スペクトルをCSV形式で出力'
                ],
                operations: '操作方法',
                operationsContent: [
                    '【ズーム】マウスホイールで拡大・縮小',
                    '【パン】ドラッグでグラフを移動',
                    '【リセット】各グラフの「リセット」ボタンで初期表示に戻る',
                    '【スペクトル設定】対数スケール、パワースペクトルの切替が可能',
                    '【応答スペクトル】周期軸（対数）でh=2/3/5%を比較可能'
                ],
                notes: '注意事項',
                notesContent: [
                    '速度・変位はベースライン補正（線形トレンド除去）を適用',
                    '大容量データは自動的にダウンサンプリングして表示',
                    'K-netデータは単位がgalに自動設定され、速度表示はcm/sになります',
                    '応答スペクトルCSVはSa/Sv/Sdをh=2/3/5%で出力します',
                    'エクスポートされるCSVファイルはExcel対応（BOM付きUTF-8）'
                ]
            },
            // メッセージ
            messages: {
                fileTypeError: '対応していないファイル形式です。\nCSV, TXT, DAT ファイルを選択してください。',
                noFileError: 'ファイルを選択してください。',
                noDataError: 'データがありません。まずファイルを読み込んで解析を実行してください。',
                analysisError: '解析エラー: ',
                exportComplete: 'エクスポート完了: '
            }
        },
        en: {
            // Header
            header: {
                title: 'Wave Viewer',
                subtitle: 'Acceleration Data Waveform Analysis Tool'
            },
            // Control Panel
            controls: {
                fileSelect: 'Select File',
                fileNotSelected: 'No file selected',
                samplingRate: 'Sampling Rate:',
                skipHeader: 'Skip Header Lines:',
                dataUnit: 'Data Unit:',
                analyzeBtn: '🔍 Analyze',
                analyzing: 'Analyzing...'
            },
            // Drop Zone
            dropZone: {
                title: 'Drag & Drop File Here',
                hint: 'or click the button above to select',
                format: 'Supported: CSV, TXT, DAT (single column data), K-net/KiK-net format'
            },
            // Charts
            charts: {
                acceleration: 'Acceleration Waveform',
                velocity: 'Velocity Waveform',
                displacement: 'Displacement Waveform',
                spectrum: 'Fourier Spectrum',
                responseAcceleration: 'Acceleration Response Spectrum',
                responseVelocity: 'Velocity Response Spectrum',
                responseDisplacement: 'Displacement Response Spectrum',
                resetBtn: 'Reset',
                zoomHint: 'Scroll to zoom, drag to pan',
                integrationHint: 'Calculated by integration (baseline corrected)',
                doubleIntegrationHint: 'Calculated by double integration (baseline corrected)',
                responseHint: 'h=2%, 3%, 5% / Period 0.02-10s (log-spaced)',
                logScale: 'Logarithmic Scale',
                powerSpectrum: 'Power Spectrum',
                time: 'Time',
                frequency: 'Frequency',
                period: 'Period'
            },
            // Statistics
            stats: {
                title: 'Statistics',
                dataPoints: 'Data Points',
                duration: 'Duration',
                max: 'Maximum',
                min: 'Minimum',
                mean: 'Mean',
                std: 'Std. Dev.',
                rms: 'RMS',
                peakFreq: 'Peak Frequency'
            },
            // Export
            export: {
                title: 'Data Export',
                acceleration: '📥 Acceleration',
                velocity: '📥 Velocity',
                displacement: '📥 Displacement',
                responseSpectra: '📥 Response Spectra',
                all: '📥 All Data (CSV)'
            },
            // Manual
            manual: {
                title: '📖 User Guide',
                quickStart: 'Quick Start',
                quickStartContent: [
                    '1. Click "Select File" button or drag & drop a file',
                    '2. Data is auto-analyzed and acceleration/velocity/displacement/Fourier/response spectra are displayed',
                    '3. Scroll to zoom, drag to pan on graphs',
                    '4. If acceleration unit is gal, velocity is shown in cm/s',
                    '5. Export CSV files as needed (including response spectra)'
                ],
                dataFormat: 'Supported Data Formats',
                dataFormatContent: [
                    '[Single Column] CSV/TXT/DAT numerical data (one value per line)',
                    '[K-net/KiK-net] Strong-motion seismograph network data from NIED',
                    '* K-net data is auto-detected with sampling rate auto-configured'
                ],
                features: 'Key Features',
                featuresContent: [
                    '[Acceleration] Time-series graph of raw data',
                    '[Velocity] Auto-calculated by integrating acceleration (cm/s when input is gal)',
                    '[Displacement] Auto-calculated by double integration',
                    '[Fourier Spectrum] Frequency analysis using FFT',
                    '[Response Spectra] Sa/Sv/Sd (Period 0.02-10s, h=2/3/5%)',
                    '[Statistics] Max, mean, RMS, peak frequency, etc.',
                    '[Export] Export waveform and response spectra in CSV format'
                ],
                operations: 'Operations',
                operationsContent: [
                    '[Zoom] Scroll mouse wheel to zoom in/out',
                    '[Pan] Drag to move the graph',
                    '[Reset] Click "Reset" button to restore initial view',
                    '[Spectrum] Toggle logarithmic scale and power spectrum',
                    '[Response Spectra] Compare h=2/3/5% on logarithmic period axis'
                ],
                notes: 'Notes',
                notesContent: [
                    'Velocity & displacement use baseline correction (linear detrending)',
                    'Large datasets are automatically downsampled for display',
                    'K-net data units are automatically set to gal and velocity is displayed in cm/s',
                    'Response spectra CSV exports Sa/Sv/Sd for h=2/3/5%',
                    'Exported CSV files are Excel-compatible (UTF-8 with BOM)'
                ]
            },
            // Messages
            messages: {
                fileTypeError: 'Unsupported file format.\nPlease select CSV, TXT, or DAT file.',
                noFileError: 'Please select a file.',
                noDataError: 'No data available. Please load a file and run analysis first.',
                analysisError: 'Analysis Error: ',
                exportComplete: 'Export Complete: '
            }
        }
    },

    /**
     * 現在の言語を取得
     */
    getCurrentLang() {
        return this.currentLang;
    },

    /**
     * 言語を設定
     * @param {string} lang - 言語コード（ja, en）
     */
    setLang(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('wave-viewer-lang', lang);
        }
    },

    /**
     * 翻訳テキストを取得
     * @param {string} key - キー（例: 'header.title'）
     * @returns {string|Array}
     */
    t(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];

        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                return key; // キーが見つからない場合はキー自体を返す
            }
        }

        return value || key;
    },

    /**
     * ローカルストレージから言語設定を読み込む
     */
    loadLangFromStorage() {
        const savedLang = localStorage.getItem('wave-viewer-lang');
        if (savedLang && this.translations[savedLang]) {
            this.currentLang = savedLang;
        }
    }
};

// グローバルにエクスポート
window.I18n = I18n;
