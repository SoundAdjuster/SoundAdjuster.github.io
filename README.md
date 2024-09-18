アップロードされた音声ファイルに対してラウドネスノーマライズ（人の感覚に近い音量の均一化）をするウェブアプリです。

以下のURLよりご利用ください。

https://soundadjuster.github.io/

技術的には<a href="https://github.com/pyodide/pyodide">pyodide</a>によりブラウザ上でpythonを実行し、pythonのライブラリである<a href="https://github.com/csteinmetz1/pyloudnorm">pyloudnorm</a>を使用してラウドネスノーマライズを行っています。
そのため、ラウドネスノーマライズの精度はpyloudnormに依存します。
pyloudnorm自体の精度がかなり高いので、大きく外れることはないと思います。

pyloudnormはITU-R BS.1770-4 loudness algorithmを採用しているようですが、
優れたアルゴリズムとはいえ万能ではありません。
自身の作品に対する評価は最終的に自身で行うようお願いいたします。
開発者から当ウェブアプリの利用に関して損害などを補償することは一切ございません。
