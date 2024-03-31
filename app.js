let audioContext;
const processBtn = document.getElementById('processBtn');

// decodeAudioDataをプロミス化するヘルパー関数
function decodeAudioDataPromise(audioContext, arrayBuffer) {
    return new Promise((resolve, reject) => {
        audioContext.decodeAudioData(
            arrayBuffer,
            resolve,
            reject
        );
    });
}

processBtn.addEventListener('click', async () => {
    if (fileArray.length === 0) {
        alert('ファイルを選択してください。');
        return;
    }

    // 最初の状態を保存
    const originalTransition = processBtn.style.transition;
    const originalText = processBtn.innerText;
    const originalColor = processBtn.style.backgroundColor;

    // ボタンのスタイルとテキストを変更し、無効化
    processBtn.style.transition = 'none';
    processBtn.innerText = '実行中...';
    processBtn.style.backgroundColor = '#ccc';
    processBtn.style.cursor = 'default'; // マウスカーソルを「操作不可」に変更
    processBtn.disabled = true;

    await processAudioFiles();

    // 処理が終わったら元の状態に戻す
    processBtn.style.transition = originalTransition;
    processBtn.innerText = originalText;
    processBtn.style.backgroundColor = originalColor;
    processBtn.style.cursor = 'pointer';
    processBtn.disabled = false;
});

async function processAudioFiles() {
    // AudioContextが未定義の場合、または閉じられている場合は新たに作成
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new AudioContext();
    }

    let index = 0;
    for (const file of fileArray) {
        const name = file.name;
        const wavFileName = name.replace(/\.[^/.]+$/, "") + ".wav";

        try {
            console.log(`"${name}"を処理中...`);

            const arrayBuffer = await file.arrayBuffer();

            // オーディオデータをデコード
            const audioBuffer = await decodeAudioDataPromise(audioContext, arrayBuffer);

            // ノーマライズ処理
            const [wavFile, afterLoudness] = await processLoudnorm(audioBuffer, wavFileName);

            createDownloadLink(wavFile, wavFileName, index);

            console.log(`"${name}"の処理が完了しました。調整後のラウドネスは${afterLoudness}です。`);

        } catch (error) {
            alert(`${name}の処理中にエラーが発生しました。`);
        }

        index++;
    }
}

async function processLoudnorm(audioBuffer) {
    let data;
    const pyodide = window.pyodide

    if (audioBuffer.numberOfChannels <= 2) {
        let tmp_data = [];

        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            tmp_data.push(audioBuffer.getChannelData(i));
        }

        data = transformShape(tmp_data);

    } else {
        error_message = 'Unsupported number of channels : ' + audioBuffer.numberOfChannels
        console.error(error_message);
        throw new Error(error_message);
    }

    // 直接pyodide.globalsにキーを設定
    pyodide.globals.set("sampleRate_js", audioBuffer.sampleRate);
    pyodide.globals.set("data_js", pyodide.toPy(data));
    pyodide.globals.set("target_loudness", parseFloat(document.getElementById('loudnessInput').value));

    await window.pyodide.runPythonAsync(`
    import numpy as np
    import pyloudnorm_custom_package as pyln
    from scipy.io import wavfile
    from io import BytesIO
    import base64
    import pyodide

    default_block_size = 0.400  # 秒

    # JavaScriptから渡された変数をPythonで受け取る
    sample_rate = sampleRate_js
    data = np.array(data_js)

    # オーディオファイルの長さを計算（秒）
    audio_length = len(data) / sample_rate

    # 使用するブロックサイズを決定。デフォルトのブロックサイズを超えそうなものは小さくする。
    block_size = audio_length - 0.01 if audio_length < default_block_size + 0.01 else default_block_size

    meter = pyln.Meter(sample_rate, block_size=block_size)
    loudness = meter.integrated_loudness(data)

    # 目標のラウドネスレベルに正規化
    loudness_normalized_audio = pyln.normalize.loudness(data, loudness, float(target_loudness))

    # WAVファイルをメモリ上に生成し、Base64でエンコード
    memfile = BytesIO()
    loudness_normalized_audio_int16 = np.int16(loudness_normalized_audio * 32767)
    wavfile.write(memfile, sample_rate, loudness_normalized_audio_int16)
    memfile.seek(0)
    wav_base64 = base64.b64encode(memfile.read()).decode('utf-8')

    # javascriptへ渡す
    wav_base64_py = pyodide.to_js(wav_base64)
    after_loudness_py = pyodide.to_js(meter.integrated_loudness(loudness_normalized_audio))
    `);

    // Pythonから受け取ったBase64エンコードされたWAVデータ
    const wavBase64 = pyodide.globals.get("wav_base64_py");
    const afterLoudness = pyodide.globals.get("after_loudness_py");

    // Base64デコード
    const byteCharacters = atob(wavBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    wavFile = new Uint8Array(byteNumbers);

    // wavのバイナリデータを返す
    return [wavFile, afterLoudness];
}

function createDownloadLink(data, fileName, index) {
    const url = URL.createObjectURL(new Blob([data], { type: 'audio/wav' }));
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = fileName;
    downloadLink.textContent = "Download";

    // fileListContainerから適切なリストアイテムを見つける
    const listItems = document.querySelectorAll('#fileList .download-link');
    if (index < listItems.length) {
        const downloadEle = listItems[index];
        downloadEle.innerHTML = "";
        downloadEle.appendChild(downloadLink);
    }
}

function transformShape(array) {
    // 最初に、入力配列の各列の要素を集めた新しい配列を作成
    let result = [];

    // 入力配列の列数を取得
    const columns = array[0].length;

    // 各列に対してループを実行
    for (let col = 0; col < columns; col++) {
        let newRow = array.map(row => row[col]);
        result.push(newRow);
    }

    return result;
}
