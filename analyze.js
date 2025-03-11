function analyzeUSC(content) {
    const resultsDiv = document.getElementById('result');
    const resultsDiv2 = document.getElementById('result2');  // result2を追加

    resultsDiv.innerHTML = "";
    resultsDiv2.innerHTML = "";

    let messages = [];
    const lines = content.split("\n");
    
    const lanes = content.match(/"lane":\s*([-+]?[0-9]*\.?[0-9]+)/g) || [];
    const sizes = content.match(/"size":\s*([-+]?[0-9]*\.?[0-9]+)/g) || [];
    const fades = content.match(/"fade":\s*"(.*?)"/g) || [];
    const timescales = content.match(/"timeScale":\s*([-]?[0-9]*\.?[0-9]+)/g) || [];
    const types = content.match(/"type":\s*"(.*?)"/g) || [];
    const colors = content.match(/"color":\s*"(.*?)"/g) || [];
    const directions = content.match(/"direction":\s*"(.*?)"/g) || [];
    const eases = content.match(/"ease":\s*"(.*?)"/g) || [];

    function getLineNumbers(matches, content) {
        const lineNumbers = [];
        matches.forEach(match => {
            const index = content.indexOf(match);
            const lineNumber = content.substring(0, index).split("\n").length;
            lineNumbers.push(lineNumber);
        });
        return lineNumbers;
    }

    const laneLines = getLineNumbers(lanes, content);
    const sizeLines = getLineNumbers(sizes, content);
    const fadeLines = getLineNumbers(fades, content);
    const timescaleLines = getLineNumbers(timescales, content);
    const typeLines = getLineNumbers(types, content);
    const colorLines = getLineNumbers(colors, content);
    const directionLines = getLineNumbers(directions, content);
    const easeLines = getLineNumbers(eases, content);
    
    const flags = {
        laneViolation: false,
        sizeViolation: false,
        laneViolation2: false,
        sizeViolation2: false,
        typeViolation: false,
        directionViolation: false,
        fadeViolation: false,
        easeViolation: false,
        colorViolation: false,
        timescaleViolation: false,
        sizeLaneMismatch: false,
        sizeLaneMismatch2: false,
    };

    const redMessages = [];   // ❌ メッセージ
    const greenMessages = []; // ⭕ メッセージ

    eases.forEach((ease, index) => {
        if ((ease.includes('inout') || ease.includes('outin')) && !flags.easeViolation) {
            redMessages.push(`❌ 直線、加速、減速以外の曲線が使われています [${easeLines[index]}]`);
            flags.easeViolation = true;
        }
    });

    // 複数レイヤーチェック
    if (types.filter(type => type.includes('timeScaleGroup')).length >= 2) {
        redMessages.push("❌ レイヤーが複数あります");
    }

    colors.forEach((color, index) => {
        const colorValue = color.split('"')[3];
        if (!['green', 'yellow'].includes(colorValue) && !flags.colorViolation) {
            greenMessages.push(`⭕ 緑、黄以外の色ガイドが使われています [${colorLines[index]}]`);
            flags.colorViolation = true;
        }
    });

    timescales.forEach((timescale, index) => {
        const value = parseFloat(timescale.match(/([-+]?[0-9]*\.?[0-9]+)/)[0]);
        if (value < 0 && !flags.timescaleViolation) {
            redMessages.push(`❌ 逆走が使われています [${timescaleLines[index]}]`);
            flags.timescaleViolation = true;
        }
    });

    const allowedLanes = new Set([-5.5, -5.0, -4.5, -4.0, -3.5, -3.0, -2.5, -2.0, -1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5]);
    const allowedSizes = new Set([0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]);
    
    for (let i = 0; i < lanes.length; i++) {
        const laneValue = parseFloat(lanes[i].match(/([-+]?[0-9]*\.?[0-9]+)/)[0]);
        const sizeValue = i < sizes.length ? parseFloat(sizes[i].match(/([-+]?[0-9]*\.?[0-9]+)/)[0]) : null;
    
        // 小数レーンの処理
        if (laneValue % 1 !== 0 && !allowedLanes.has(laneValue) && !flags.laneViolation) {
            redMessages.push(`❌ 小数レーンにノーツが置かれています [${laneLines[i]}]`);
            flags.laneViolation = true;
        }
    
        // レーン外判定
        const leftEdge = laneValue - sizeValue;
        const rightEdge = laneValue + sizeValue;
    
        if ((leftEdge < -6.0 || rightEdge > 6.0) && !flags.laneViolation2) {
            redMessages.push(`❌ ノーツがレーン外に飛び出しています [${laneLines[i]}]`);
            flags.laneViolation2 = true;
        }
    
        // 小数幅と13以上の幅の処理分岐
        if (sizeValue !== null) {
            if (sizeValue * 2 < 13 && !allowedSizes.has(sizeValue) && !flags.sizeViolation) {
                redMessages.push(`❌ 0幅、または小数幅のノーツが使われています [${sizeLines[i]}]`);
                flags.sizeViolation = true;
            }
    
            // 幅が13以上の場合
            if (sizeValue * 2 >= 13 && !flags.sizeViolation2) {
                redMessages.push(`❌ 13幅以上のノーツが置かれています [${sizeLines[i]}]`);
                flags.sizeViolation2 = true;
            }
    
            // laneがx.0のとき、sizeの2倍が偶数でなければならない
            if (laneValue % 1 === 0 && sizeValue !== null && sizeValue * 2 % 2 !== 0 && !flags.sizeLaneMismatch) {
                redMessages.push(`❌ ノーツが公式ではありえないレーンに置かれています [${laneLines[i]}]`);
                flags.sizeLaneMismatch = true;
            }
    
            // laneがx.5のとき、sizeの2倍が奇数でなければならない
            if (laneValue % 1 === 0.5 && sizeValue !== null && sizeValue * 2 % 2 !== 1 && !flags.sizeLaneMismatch) {
                redMessages.push(`❌ ノーツが公式ではありえないレーンに置かれています [${laneLines[i]}]`);
                flags.sizeLaneMismatch = true;
            }
        }
    }

    types.forEach((type, index) => {
        if (type.includes('damage') && !flags.typeViolation) {
            redMessages.push(`️❌ ダメージノーツが使われています [${typeLines[index]}]`);
            flags.typeViolation = true;
        }
    });

    directions.forEach((direction, index) => {
        if (direction.includes('none') && !flags.directionViolation) {
            redMessages.push(`️❌ 矢印無しフリックが使われています [${directionLines[index]}]`);
            flags.directionViolation = true;
        }
    });

    fades.forEach((fade, index) => {
        if (fade.includes('in') && !flags.fadeViolation) {
            greenMessages.push(`⭕️ フェードインガイドが使われています [${fadeLines[index]}]`);
            flags.fadeViolation = true;
        }
    });

    // 結果の出力
    if (redMessages.length > 0 && greenMessages.length > 0) {
        resultsDiv.innerHTML = greenMessages.join("<br>") + "<br>";
        resultsDiv2.innerHTML = redMessages.join("<br>") + "<br>";
        resultsDiv.style.display = "block";
        resultsDiv2.style.display = "block";
    } else if (redMessages.length > 0) {
        resultsDiv2.innerHTML = redMessages.join("<br>") + "<br>";
        resultsDiv2.style.display = "block";
        resultsDiv.style.display = "none";
    } else if (greenMessages.length > 0) {
        resultsDiv.innerHTML = greenMessages.join("<br>") + "<br>";
        resultsDiv.style.display = "block";
        resultsDiv2.style.display = "none";
    } else {
        resultsDiv.innerHTML = "✔️ 公式レギュレーション内です<br>";
        resultsDiv.style.display = "block";
        resultsDiv2.style.display = "none";
    }
}

document.getElementById('uscFile').addEventListener('change', function (event) {
    const file = event.target.files[0];
    const resultsDiv = document.getElementById('result');

    if (!file) {
        resultsDiv.innerHTML = "ファイルを選択してください";
        return;
    }

    if (file.name.endsWith('.usc')) {
        // USCファイルが選択された場合、ファイルを読み込み解析する
        const reader = new FileReader();
        reader.onload = function (e) {
            const content = e.target.result;
            analyzeUSC(content);
        };
        reader.readAsText(file);
    } else if (file.name.endsWith('.sus')) {
        // SUSファイルが選択された場合、別のメッセージを表示
        resultsDiv.innerHTML = "現在susには対応していません。";
        resultsDiv.style.display = "block";
        resultsDiv2.style.display = "none";
    } else {
        // その他のファイル形式の場合、無効なファイル形式のメッセージを表示
        resultsDiv.innerHTML = "譜面ファイルを選択してください。";
        resultsDiv.style.display = "block";
        resultsDiv2.style.display = "none";
    }
});
