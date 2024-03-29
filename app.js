const { fetchFile } = FFmpegUtil;
const { FFmpeg } = FFmpegWASM;
let ffmpeg = null;

document.getElementById('processBtn').addEventListener('click', async () => {
    const targetLoudness = document.getElementById('loudnessInput').value;
    console.log("測定結果：" + targetLoudness);

    if (fileArray.length === 0) {
        alert('ファイルを選択してください。');
        return;
    }

    // ffmpegのインスタンスがまだロードされていない場合にのみロードする
    if (ffmpeg === null) {
        ffmpeg = new FFmpeg()
        await ffmpeg.load({
            coreURL: "/assets/core/package/dist/umd/ffmpeg-core.js",
        });
    }

    for (const file of fileArray) {
        const name = file.name;
        const wavFileName = name.replace(/\.[^/.]+$/, "") + ".wav";
        const tempFileName = "temp_" + Date.now() + "_" + wavFileName;

        try {
            console.log(`"${name}"を処理中...`);

            await ffmpeg.writeFile(name, await fetchFile(file));

            // ラウドネス正規化を適用してWAVとして出力
            await ffmpeg.exec(['-i', name, '-af', `loudnorm=I=${targetLoudness}`, tempFileName]);

            const data = await ffmpeg.readFile(tempFileName);

            downloadFile(data, wavFileName);

            console.log(`"${name}"の処理が完了しました。`);

        } catch (error) {
            alert(`${name}の処理中にエラーが発生しました。`);
        }
    }
});

function downloadFile(data, fileName) {
    const url = URL.createObjectURL(new Blob([data.buffer], { type: 'audio/wav' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
}
