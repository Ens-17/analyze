function analyzeUSC(content) {
    const resultsDiv = document.getElementById('result');
    const resultsDiv2 = document.getElementById('result2');

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

    function getBeatFloorValues(matches, content) {
        const beatFloors = [];
        matches.forEach(match => {
            const index = content.indexOf(match);
            const before = content.substring(0, index);
            const beatMatch = before.match(/"beat":\s*([-+]?[0-9]*\.?[0-9]+)/g);
            if (beatMatch && beatMatch.length > 0) {
                const last = beatMatch[beatMatch.length - 1];
                const value = parseFloat(last.match(/([-+]?[0-9]*\.?[0-9]+)/)[0]);
                beatFloors.push(Math.floor(value / 4));
            } else {
                beatFloors.push("不明");
            }
        });
        return beatFloors;
    }

    const laneBeats = getBeatFloorValues(lanes, content);
    const sizeBeats = getBeatFloorValues(sizes, content);
    const fadeBeats = getBeatFloorValues(fades, content);
    const timescaleBeats = getBeatFloorValues(timescales, content);
    const typeBeats = getBeatFloorValues(types, content);
    const colorBeats = getBeatFloorValues(colors, content);
    const directionBeats = getBeatFloorValues(directions, content);
    const easeBeats = getBeatFloorValues(eases, content);

    const flags = {
        laneViolation: false,
        sizeViolation: false,
        laneViolation2: false,
        sizeViolation2: false,
        sizeViolation3: false,
        typeViolation: false,
        directionViolation: false,
        fadeViolation: false,
        easeViolation: false,
        colorViolation: false,
        timescaleViolation: false,
        sizeLaneMismatch: false,
        sizeLaneMismatch2: false,
    };

    const redMessages = [];
    const greenMessages = [];

    eases.forEach((ease, index) => {
        if ((ease.includes('inout') || ease.includes('outin')) && !flags.easeViolation) {
            greenMessages.push(`️⭕️ 直線、加速、減速以外の曲線が使われています [${easeBeats[index]}小節]`);
            flags.easeViolation = true;
        }
    });

    if (types.filter(type => type.includes('timeScaleGroup')).length >= 2) {
        greenMessages.push("️⭕️ レイヤーが複数あります");
    }

    colors.forEach((color, index) => {
        const colorValue = color.split('"')[3];
        if (!['green', 'yellow'].includes(colorValue) && !flags.colorViolation) {
            greenMessages.push(`⭕ 緑、黄以外の色ガイドが使われています [${colorBeats[index]}小節]`);
            flags.colorViolation = true;
        }
    });

    timescales.forEach((timescale, index) => {
        const value = parseFloat(timescale.match(/([-+]?[0-9]*\.?[0-9]+)/)[0]);
        if (value < 0 && !flags.timescaleViolation) {
            redMessages.push(`❌ 逆走が使われています [${timescaleBeats[index]}小節]`);
            flags.timescaleViolation = true;
        }
    });

    const allowedLanes = new Set([-5.5, -5.0, -4.5, -4.0, -3.5, -3.0, -2.5, -2.0, -1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5]);
    const allowedSizes = new Set([0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]);

    for (let i = 0; i < lanes.length; i++) {
        const laneValue = parseFloat(lanes[i].match(/([-+]?[0-9]*\.?[0-9]+)/)[0]);
        const sizeValue = i < sizes.length ? parseFloat(sizes[i].match(/([-+]?[0-9]*\.?[0-9]+)/)[0]) : null;

        if (laneValue % 1 !== 0 && !allowedLanes.has(laneValue) && !flags.laneViolation) {
            greenMessages.push(`️⭕️ 小数レーンにノーツが置かれています [${laneBeats[i]}小節]`);
            flags.laneViolation = true;
        }

        const leftEdge = laneValue - sizeValue;
        const rightEdge = laneValue + sizeValue;

        if ((leftEdge < -8.0 || rightEdge > 8.0) && !flags.laneViolation2) {
            redMessages.push(`❌ ノーツがレーン外に飛び出しています [${laneBeats[i]}小節]`);
            flags.laneViolation2 = true;
        }

        if (sizeValue !== null) {
            if (sizeValue * 2 > 0 && sizeValue * 2 < 13 && !allowedSizes.has(sizeValue) && !flags.sizeViolation) {
                greenMessages.push(`⭕️ 小数幅のノーツが使われています [${sizeBeats[i]}小節]`);
                flags.sizeViolation = true;
            }

            if (sizeValue * 2 >= 17 && !flags.sizeViolation2) {
                redMessages.push(`❌ 17幅以上のノーツが置かれています [${sizeBeats[i]}小節]`);
                flags.sizeViolation2 = true;
            }

            if (sizeValue * 2 == 0 && !flags.sizeViolation3) {
                greenMessages.push(`️⭕️ 0幅のノーツが置かれています [${sizeBeats[i]}小節]`);
                flags.sizeViolation3 = true;
            }

            if (laneValue % 1 === 0 && sizeValue !== null && sizeValue * 2 % 2 !== 0 && !flags.sizeLaneMismatch) {
                greenMessages.push(`️⭕️ ノーツが公式ではありえないレーンに置かれています [${laneBeats[i]}小節]`);
                flags.sizeLaneMismatch = true;
            }

            if (laneValue % 1 === 0.5 && sizeValue !== null && sizeValue * 2 % 2 !== 1 && !flags.sizeLaneMismatch) {
                greenMessages.push(`️⭕️ ノーツが公式ではありえないレーンに置かれています [${laneBeats[i]}小節]`);
                flags.sizeLaneMismatch = true;
            }
        }
    }

    types.forEach((type, index) => {
        if (type.includes('damage') && !flags.typeViolation) {
            redMessages.push(`️❌ ダメージノーツが使われています [${typeBeats[index]}小節]`);
            flags.typeViolation = true;
        }
    });

    directions.forEach((direction, index) => {
        if (direction.includes('none') && !flags.directionViolation) {
            redMessages.push(`️❌ 矢印無しフリックが使われています [${directionBeats[index]}小節]`);
            flags.directionViolation = true;
        }
    });

    fades.forEach((fade, index) => {
        if (fade.includes('in') && !flags.fadeViolation) {
            greenMessages.push(`⭕️ フェードインガイドが使われています [${fadeBeats[index]}小節]`);
            flags.fadeViolation = true;
        }
    });

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
    const resultsDiv2 = document.getElementById('result2');

    if (!file) {
        resultsDiv.innerHTML = "ファイルを選択してください";
        return;
    }

    if (file.name.endsWith('.usc')) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const content = e.target.result;
            analyzeUSC(content);
        };
        reader.readAsText(file);
    } else if (file.name.endsWith('.sus')) {
        resultsDiv.innerHTML = "現在susには対応していません。";
        resultsDiv.style.display = "block";
        resultsDiv2.style.display = "none";
    } else {
        resultsDiv.innerHTML = "譜面ファイルを選択してください。";
        resultsDiv.style.display = "block";
        resultsDiv2.style.display = "none";
    }
});
