class GameGraphics {

    // Отрисовка двери
    static drawDoor(g, isoX, isoY, wallHeight, isOpen) {
        g.clear();
        const tileWidth = 64;
        const tileHeight = 32;
        let fillColor = isOpen ? 0xddf0ff : 0x808080;
        let alpha = isOpen ? 0.4 : 0.8;

        g.fillStyle(fillColor, alpha);
        g.beginPath();
        g.moveTo(isoX, isoY - tileHeight / 2);
        g.lineTo(isoX + tileWidth / 2, isoY);
        g.lineTo(isoX + tileWidth / 2, isoY - wallHeight + 15);
        g.lineTo(isoX, isoY - tileHeight / 2 - wallHeight + 15);
        g.closePath();
        g.fillPath();
        g.lineStyle(2, isOpen ? 0x6a94ac : 0x444444, 1);
        g.strokePath();
    }

    // Отрисовка прилавка
    static drawCounter(graphicObj, statusColor, alpha = 1) {
        graphicObj.clear();
        const W = 32, H1 = 14, H2 = 2, H3 = 6, H4 = 4;
        let isDirty = (statusColor === 0x9e9e9e);
        let baseL = isDirty ? 0xcccccc : 0xf4f4f4, baseR = isDirty ? 0x999999 : 0xd0d0d0;
        let glassColor = (statusColor === DEFAULT_COUNTER_COLOR) ? 0x7a5c43 : statusColor;

        function drawLayer(yOff, h, cL, cR, cT) {
            if (cL) { graphicObj.fillStyle(cL, alpha).beginPath(); graphicObj.moveTo(-W, yOff); graphicObj.lineTo(0, yOff + W / 2); graphicObj.lineTo(0, yOff + W / 2 - h); graphicObj.lineTo(-W, yOff - h); graphicObj.closePath(); graphicObj.fillPath(); }
            if (cR) { graphicObj.fillStyle(cR, alpha).beginPath(); graphicObj.moveTo(0, yOff + W / 2); graphicObj.lineTo(W, yOff); graphicObj.lineTo(W, yOff - h); graphicObj.lineTo(0, yOff + W / 2 - h); graphicObj.closePath(); graphicObj.fillPath(); }
            if (cT) { graphicObj.fillStyle(cT, alpha).beginPath(); graphicObj.moveTo(0, yOff - h + W / 2); graphicObj.lineTo(W, yOff - h); graphicObj.lineTo(0, yOff - h - W / 2); graphicObj.lineTo(-W, yOff - h); graphicObj.closePath(); graphicObj.fillPath(); }
        }

        let curY = 0; drawLayer(curY, H1, baseL, baseR, null); curY -= H1; drawLayer(curY, H2, 0x333, 0x1a1a1a, null); curY -= H2; drawLayer(curY, H3, baseL, baseR, null); curY -= H3; drawLayer(curY, H4, 0x5c4033, 0x3e2b22, 0x4a332a); curY -= H4;

        graphicObj.fillStyle(glassColor, alpha * 0.85).beginPath(); graphicObj.moveTo(0, curY + 16); graphicObj.lineTo(32, curY); graphicObj.lineTo(0, curY - 16); graphicObj.lineTo(-32, curY); graphicObj.closePath(); graphicObj.fillPath();
        graphicObj.lineStyle(1, 0x000000, alpha * 0.3).strokePath();
    }

    // Отрисовка Большого прилавка (на 2 клетки) — прямоугольный
    static drawLargeCounter(graphicObj, statusColor, alpha = 1, orientation = 'horizontal') {
        graphicObj.clear();

        // --- НАСТРОЙКИ СМЕЩЕНИЯ ---
        // Так как при повороте WL и WR меняются местами, сдвиг по X нужно отзеркалить
        let offsetX = (orientation === 'horizontal') ? 16 : -16; 
        
        // По Y обычно сдвиг не требуется, но если захочешь поправить высоту при повороте,
        // можешь сделать так: (orientation === 'horizontal') ? 0 : 5;
        let offsetY = 0;  

        const H1 = 14, H2 = 2, H3 = 6, H4 = 4;

        let isDirty = (statusColor === 0x9e9e9e);
        let baseL = isDirty ? 0xcccccc : 0xf4f4f4;
        let baseR = isDirty ? 0x999999 : 0xd0d0d0;
        let glassColor = (statusColor === 0x00ffff) ? 0x00ffff : (isDirty ? 0x9e9e9e : 0x7a5c43);

        let WL = (orientation === 'horizontal') ? 64 : 32;
        let WR = (orientation === 'horizontal') ? 32 : 64;

        function drawLayer(yOff, h, cL, cR, cT) {
            // Применяем offsetY к базовой высоте, чтобы сдвинуть всё вниз
            let bY = yOff + (WL + WR) / 4 + offsetY;

            if (cL) {
                graphicObj.fillStyle(cL, alpha).beginPath();
                graphicObj.moveTo(offsetX - WL, bY - WL / 2);
                graphicObj.lineTo(offsetX, bY);
                graphicObj.lineTo(offsetX, bY - h);
                graphicObj.lineTo(offsetX - WL, bY - WL / 2 - h);
                graphicObj.closePath().fillPath();
            }
            if (cR) {
                graphicObj.fillStyle(cR, alpha).beginPath();
                graphicObj.moveTo(offsetX, bY);
                graphicObj.lineTo(offsetX + WR, bY - WR / 2);
                graphicObj.lineTo(offsetX + WR, bY - WR / 2 - h);
                graphicObj.lineTo(offsetX, bY - h);
                graphicObj.closePath().fillPath();
            }
            if (cT) {
                graphicObj.fillStyle(cT, alpha).beginPath();
                graphicObj.moveTo(offsetX, bY - h);
                graphicObj.lineTo(offsetX + WR, bY - WR / 2 - h);
                graphicObj.lineTo(offsetX + WR - WL, bY - (WL + WR) / 2 - h);
                graphicObj.lineTo(offsetX - WL, bY - WL / 2 - h);
                graphicObj.closePath().fillPath();
            }
        }

        let curY = 0;

        drawLayer(curY, H1, baseL, baseR, null); curY -= H1;
        drawLayer(curY, H2, 0x333, 0x1a1a1a, null); curY -= H2;
        drawLayer(curY, H3, baseL, baseR, null); curY -= H3;
        drawLayer(curY, H4, 0x5c4033, 0x3e2b22, 0x4a332a); curY -= H4;

        // Витрина
        let bY_glass = curY + (WL + WR) / 4 + offsetY;
        graphicObj.fillStyle(glassColor, alpha * 0.85).beginPath();
        graphicObj.moveTo(offsetX, bY_glass);
        graphicObj.lineTo(offsetX + WR, bY_glass - WR / 2);
        graphicObj.lineTo(offsetX + WR - WL, bY_glass - (WL + WR) / 2);
        graphicObj.lineTo(offsetX - WL, bY_glass - WL / 2);
        graphicObj.closePath().fillPath();

        graphicObj.lineStyle(1, 0x000000, alpha * 0.3).strokePath();
    }

    // Отрисовка Кассы (Детальная)
    static drawRegister(graphicObj, alpha = 1, orientation = 'horizontal') {
        graphicObj.clear();
        const h = 24;
        const woodTop = 0x5a483d, woodLeft = 0x3d3028, woodRight = 0x1f1814;
        const whiteTop = 0xffffff, whiteLeft = 0xcccccc, whiteRight = 0x888888;

        if (orientation === 'horizontal') {
            graphicObj.fillStyle(woodLeft, alpha).beginPath(); graphicObj.moveTo(-48, -8); graphicObj.lineTo(16, 24); graphicObj.lineTo(16, 24 - h); graphicObj.lineTo(-48, -8 - h); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.fillStyle(woodRight, alpha).beginPath(); graphicObj.moveTo(16, 24); graphicObj.lineTo(48, 8); graphicObj.lineTo(48, 8 - h); graphicObj.lineTo(16, 24 - h); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.fillStyle(woodTop, alpha).beginPath(); graphicObj.moveTo(-48, -8 - h); graphicObj.lineTo(16, 24 - h); graphicObj.lineTo(48, 8 - h); graphicObj.lineTo(-16, -24 - h); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.lineStyle(2, 0x110d0a, alpha * 0.8); graphicObj.beginPath(); graphicObj.moveTo(-44, -8 - h / 2 + 2); graphicObj.lineTo(12, 24 - h / 2 + 2); graphicObj.strokePath();

            graphicObj.fillStyle(whiteLeft, alpha).beginPath(); graphicObj.moveTo(-48, -8); graphicObj.lineTo(-38, -3); graphicObj.lineTo(-38, -3 - h); graphicObj.lineTo(-48, -8 - h); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.fillStyle(whiteLeft, alpha).beginPath(); graphicObj.moveTo(6, 19); graphicObj.lineTo(16, 24); graphicObj.lineTo(16, 24 - h); graphicObj.lineTo(6, 19 - h); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.fillStyle(whiteRight, alpha).beginPath(); graphicObj.moveTo(16, 24); graphicObj.lineTo(26, 19); graphicObj.lineTo(26, 19 - h); graphicObj.lineTo(16, 24 - h); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.fillStyle(whiteTop, alpha).beginPath(); graphicObj.moveTo(-40, -12 - h); graphicObj.lineTo(24, 20 - h); graphicObj.lineTo(36, 14 - h); graphicObj.lineTo(-28, -18 - h); graphicObj.closePath(); graphicObj.fillPath();

            graphicObj.fillStyle(0xd0d0d0, alpha).beginPath(); graphicObj.moveTo(-2, -h - 2); graphicObj.lineTo(-6, -h - 4); graphicObj.lineTo(-6, -h - 12); graphicObj.lineTo(-2, -h - 10); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.fillStyle(0xeeeeee, alpha).beginPath(); graphicObj.moveTo(-16, -h - 6); graphicObj.lineTo(6, -h + 5); graphicObj.lineTo(6, -h - 12); graphicObj.lineTo(-16, -h - 23); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.fillStyle(0x151515, alpha).beginPath(); graphicObj.moveTo(-14, -h - 7); graphicObj.lineTo(4, -h + 2); graphicObj.lineTo(4, -h - 11); graphicObj.lineTo(-14, -h - 20); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.fillStyle(0x222222, alpha).beginPath(); graphicObj.moveTo(18, -h + 1); graphicObj.lineTo(26, -h + 5); graphicObj.lineTo(32, -h + 2); graphicObj.lineTo(24, -h - 2); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.fillStyle(0x1a1a1a, alpha).fillRect(18, -h - 5, 8, 9);
            graphicObj.fillStyle(0xffffff, alpha).fillRect(20, -h - 5, 4, 2);
        } else {
            graphicObj.fillStyle(woodLeft, alpha).beginPath(); graphicObj.moveTo(-48, 8); graphicObj.lineTo(-16, 24); graphicObj.lineTo(-16, 24 - h); graphicObj.lineTo(-48, 8 - h); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.fillStyle(woodRight, alpha).beginPath(); graphicObj.moveTo(-16, 24); graphicObj.lineTo(48, -8); graphicObj.lineTo(48, -8 - h); graphicObj.lineTo(-16, 24 - h); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.lineStyle(2, 0x110d0a, alpha * 0.8); graphicObj.beginPath(); graphicObj.moveTo(-12, 24 - h / 2 - 2); graphicObj.lineTo(44, -8 - h / 2 + 1); graphicObj.strokePath();
            graphicObj.fillStyle(woodTop, alpha).beginPath(); graphicObj.moveTo(-48, 8 - h); graphicObj.lineTo(-16, 24 - h); graphicObj.lineTo(48, -8 - h); graphicObj.lineTo(16, -24 - h); graphicObj.closePath(); graphicObj.fillPath();

            graphicObj.fillStyle(whiteLeft, alpha).beginPath(); graphicObj.moveTo(-48, 8); graphicObj.lineTo(-38, 13); graphicObj.lineTo(-38, 13 - h); graphicObj.lineTo(-48, 8 - h); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.fillStyle(whiteRight, alpha).beginPath(); graphicObj.moveTo(-38, 13); graphicObj.lineTo(-28, 8); graphicObj.lineTo(-28, 8 - h); graphicObj.lineTo(-38, 13 - h); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.fillStyle(whiteRight, alpha).beginPath(); graphicObj.moveTo(38, -3); graphicObj.lineTo(48, -8); graphicObj.lineTo(48, -8 - h); graphicObj.lineTo(38, -3 - h); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.fillStyle(whiteTop, alpha).beginPath(); graphicObj.moveTo(-36, 14 - h); graphicObj.lineTo(-24, 20 - h); graphicObj.lineTo(36, -10 - h); graphicObj.lineTo(24, -16 - h); graphicObj.closePath(); graphicObj.fillPath();

            graphicObj.fillStyle(0xd0d0d0, alpha).beginPath(); graphicObj.moveTo(2, -h - 2); graphicObj.lineTo(6, -h - 4); graphicObj.lineTo(6, -h - 12); graphicObj.lineTo(2, -h - 10); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.fillStyle(0xeeeeee, alpha).beginPath(); graphicObj.moveTo(-10, -h + 4); graphicObj.lineTo(12, -h - 7); graphicObj.lineTo(12, -h - 24); graphicObj.lineTo(-10, -h - 13); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.fillStyle(0x151515, alpha).beginPath(); graphicObj.moveTo(-8, -h + 2); graphicObj.lineTo(10, -h - 7); graphicObj.lineTo(10, -h - 22); graphicObj.lineTo(-8, -h - 13); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.fillStyle(0x222222, alpha).beginPath(); graphicObj.moveTo(-18, -h - 1); graphicObj.lineTo(-10, -h + 3); graphicObj.lineTo(-4, -h + 0); graphicObj.lineTo(-12, -h - 4); graphicObj.closePath(); graphicObj.fillPath();
            graphicObj.fillStyle(0x1a1a1a, alpha).fillRect(-18, -h - 10, 8, 9);
            graphicObj.fillStyle(0xffffff, alpha).fillRect(-16, -h - 10, 4, 2);
        }
    }
}