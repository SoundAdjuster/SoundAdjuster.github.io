const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

document.getElementById('processBtn').addEventListener('click', async () => {
    const files = document.getElementById('fileInput').files;
    const targetLoudness = document.getElementById('loudnessInput').value || '-31.5';
    if (files.length === 0) {
        alert('ファイルを選択してください。');
        return;
    }

    if (!ffmpeg.isLoaded()) {
        await ffmpeg.load();
    }

    for (const file of files) {
        const fileName = file.name;
        const wavFileName = fileName.replace(/\.[^/.]+$/, "") + ".wav";

        await ffmpeg.FS('writeFile', fileName, await fetchFile(file));

        // 第一パス: ラウドネス情報の取得
        await ffmpeg.run('-i', fileName, '-af', 'loudnorm=I=-31.5:print_format=json', '-f', 'null', '-');
        const stderr = ffmpeg.FS('readFile', 'ffmpeg-stderr.log').toString();
        const loudnessInfo = stderr.match(/\{.+\}/);
        let measuredI = '-31.5';
        if (loudnessInfo) {
            const loudnessData = JSON.parse(loudnessInfo[0]);
            measuredI = loudnessData.input_i;
        }

        // 第二パス: ラウドネス正規化を適用してWAVとして出力
        await ffmpeg.run('-i', fileName, '-af', `loudnorm=I=${targetLoudness}:measured_i=${measuredI}`, wavFileName);

        const data = ffmpeg.FS('readFile', wavFileName);
        const url = URL.createObjectURL(new Blob([data.buffer], { type: 'audio/wav' }));

        // ダウンロードリンクの作成
        const a = document.createElement('a');
        a.href = url;
        a.download = wavFileName;
        document.body.appendChild(a);
        a.click();

        // ファイルシステムからファイルを削除
        ffmpeg.FS('unlink', fileName);
        ffmpeg.FS('unlink', wavFileName);
        a.remove();
    }
});
