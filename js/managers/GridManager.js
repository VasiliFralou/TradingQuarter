class GridManager {
    constructor(scene) {
        this.scene = scene;
        this.mapSize = scene.mapSize;
        this.tileWidth = scene.tileWidth;
        this.tileHeight = scene.tileHeight;
        this.startX = scene.startX;
        this.startY = scene.startY;

        // Инициализация игровой матрицы
        this.scene.cityMap = Array.from({ length: this.mapSize }, () => Array(this.mapSize).fill(null));
    }

    // Отрисовка тайлов пола, стен и дверей
    createGrid(isStoreOpen) {
        // 1. Рисуем только пол один раз
        this.scene.graphics = this.scene.add.graphics();
        for (let y = 0; y < this.mapSize; y++) {
            for (let x = 0; x < this.mapSize; x++) {
                let isoX = this.startX + (x - y) * (this.tileWidth / 2);
                let isoY = this.startY + (x + y) * (this.tileHeight / 2);
                let tileColor = (x + y) % 2 === 0 ? 0xf0f0f0 : 0xaad4e5;
                this.scene.graphics.fillStyle(tileColor, 1);
                this.scene.graphics.lineStyle(1, 0xcccccc, 0.5);
                this.scene.graphics.beginPath();
                this.scene.graphics.moveTo(isoX, isoY - this.tileHeight / 2);
                this.scene.graphics.lineTo(isoX + this.tileWidth / 2, isoY);
                this.scene.graphics.lineTo(isoX, isoY + this.tileHeight / 2);
                this.scene.graphics.lineTo(isoX - this.tileWidth / 2, isoY);
                this.scene.graphics.closePath();
                this.scene.graphics.fillPath();
                this.scene.graphics.strokePath();
            }
        }

        // 2. Инициализируем графику для стен и дверей
        this.scene.wallsGraphics = this.scene.add.graphics();
        this.scene.doorFloorGraphics = this.scene.add.graphics(); // Для красного пола под дверью
        this.scene.doorGraphics = [this.scene.add.graphics(), this.scene.add.graphics()];

        // 3. Вызываем отрисовку стен и дверей
        this.drawWallsAndDoors(isStoreOpen);
    }

    drawWallsAndDoors(isStoreOpen) {
        this.scene.wallsGraphics.clear();
        this.scene.doorFloorGraphics.clear();
        this.scene.doorGraphics[0].clear();
        this.scene.doorGraphics[1].clear();

        // Очищаем старые двери из логической карты
        for (let i = 0; i < this.mapSize; i++) {
            if (this.scene.cityMap[0][i] === 'door') this.scene.cityMap[0][i] = null;
        }

        const wallHeight = 75;
        let doorIndex = 0;

        for (let i = 0; i < this.mapSize; i++) {
            // Левая стена (X = 0)
            let isoXLeft = this.startX + (0 - i) * (this.tileWidth / 2);
            let isoYLeft = this.startY + (0 + i) * (this.tileHeight / 2);
            this.scene.wallsGraphics.fillStyle(0x8cb6ce, 1).lineStyle(1, 0x6a94ac, 1);
            this.scene.wallsGraphics.beginPath();
            this.scene.wallsGraphics.moveTo(isoXLeft, isoYLeft - this.tileHeight / 2);
            this.scene.wallsGraphics.lineTo(isoXLeft - this.tileWidth / 2, isoYLeft);
            this.scene.wallsGraphics.lineTo(isoXLeft - this.tileWidth / 2, isoYLeft - wallHeight);
            this.scene.wallsGraphics.lineTo(isoXLeft, isoYLeft - this.tileHeight / 2 - wallHeight);
            this.scene.wallsGraphics.closePath();
            this.scene.wallsGraphics.fillPath();
            this.scene.wallsGraphics.strokePath();

            // Правая стена (Y = 0)
            let isoXRight = this.startX + (i - 0) * (this.tileWidth / 2);
            let isoYRight = this.startY + (i + 0) * (this.tileHeight / 2);

            // ТЕПЕРЬ ДВЕРЬ РИСУЕТСЯ ТОЛЬКО ЕСЛИ ОНА КУПЛЕНА И ТОЛЬКО НА 1 КЛЕТКУ
            if (hasDoor && i === doorPosition) {
                // Рисуем красный пол под дверью
                this.scene.doorFloorGraphics.fillStyle(0xcc4444, 1).lineStyle(1, 0x882222, 1);
                this.scene.doorFloorGraphics.beginPath();
                this.scene.doorFloorGraphics.moveTo(isoXRight, isoYRight - this.tileHeight / 2);
                this.scene.doorFloorGraphics.lineTo(isoXRight + this.tileWidth / 2, isoYRight);
                this.scene.doorFloorGraphics.lineTo(isoXRight, isoYRight + this.tileHeight / 2);
                this.scene.doorFloorGraphics.lineTo(isoXRight - this.tileWidth / 2, isoYRight);
                this.scene.doorFloorGraphics.closePath();
                this.scene.doorFloorGraphics.fillPath();
                this.scene.doorFloorGraphics.strokePath();

                // Рисуем саму дверь
                GameGraphics.drawDoor(this.scene.doorGraphics[doorIndex], isoXRight, isoYRight, wallHeight, isStoreOpen);
                this.scene.cityMap[0][i] = 'door';
                doorIndex++;
            } else {
                // Обычная стена
                this.scene.wallsGraphics.fillStyle(0xa6ccde, 1).lineStyle(1, 0x82a9be, 1);
                this.scene.wallsGraphics.beginPath();
                this.scene.wallsGraphics.moveTo(isoXRight, isoYRight - this.tileHeight / 2);
                this.scene.wallsGraphics.lineTo(isoXRight + this.tileWidth / 2, isoYRight);
                this.scene.wallsGraphics.lineTo(isoXRight + this.tileWidth / 2, isoYRight - wallHeight);
                this.scene.wallsGraphics.lineTo(isoXRight, isoYRight - this.tileHeight / 2 - wallHeight);
                this.scene.wallsGraphics.closePath();
                this.scene.wallsGraphics.fillPath();
                this.scene.wallsGraphics.strokePath();
            }
        }
    }

    // Алгоритм поиска пути (BFS)
    findPath(startX_pos, startY_pos, targetX, targetY) {
        if (startX_pos === targetX && startY_pos === targetY) return [];
        let queue = [{ x: startX_pos, y: startY_pos, path: [] }];
        let visited = new Set();
        visited.add(`${startX_pos},${startY_pos}`);
        let neighbors = [{ dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: -1, dy: 0 }];

        while (queue.length > 0) {
            let curr = queue.shift();
            for (let n of neighbors) {
                let nx = curr.x + n.dx, ny = curr.y + n.dy;
                if (nx === targetX && ny === targetY) return [...curr.path, { x: nx, y: ny }];
                if (nx >= 0 && nx < this.mapSize && ny >= 0 && ny < this.mapSize) {
                    let cell = this.scene.cityMap[ny][nx];
                    let isWalkable = (cell === null || cell === 'door' || (cell && cell.isQueueZone));
                    if (isWalkable && !visited.has(`${nx},${ny}`)) {
                        visited.add(`${nx},${ny}`);
                        queue.push({ x: nx, y: ny, path: [...curr.path, { x: nx, y: ny }] });
                    }
                }
            }
        }
        return null;
    }

    getBuildingAdjacentTile(building) {
        let tilesToCheck = [];
        if (building.slots) {
            building.slots.forEach(s => tilesToCheck.push({ x: building.gridX + s.dx, y: building.gridY + s.dy }));
        } else {
            tilesToCheck.push({ x: building.gridX, y: building.gridY });
        }

        const neighbors = [{ dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: -1, dy: 0 }];
        for (let t of tilesToCheck) {
            for (let n of neighbors) {
                let nx = t.x + n.dx, ny = t.y + n.dy;
                if (nx >= 0 && nx < this.mapSize && ny >= 0 && ny < this.mapSize) {
                    if (this.scene.cityMap[ny][nx] === null || this.scene.cityMap[ny][nx] === 'door') return { x: nx, y: ny };
                }
            }
        }
        return null;
    }

    getFreeAdjacentTile(targetX, targetY) {
        const neighbors = [{ dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: -1, dy: 0 }];
        for (let n of neighbors) {
            let nx = targetX + n.dx, ny = targetY + n.dy;
            if (nx >= 0 && nx < this.mapSize && ny >= 0 && ny < this.mapSize) {
                if (this.scene.cityMap[ny][nx] === null || this.scene.cityMap[ny][nx] === 'door') return { x: nx, y: ny };
            }
        }
        return null;
    }

    canPlaceTwoTileObject(x, y, orientation) {
        if (orientation === 'horizontal') {
            if (x + 1 >= this.mapSize || y < 0 || y >= this.mapSize) return false;
            if (this.scene.cityMap[y][x] !== null || this.scene.cityMap[y][x + 1] !== null) return false;
        } else {
            if (y + 1 >= this.mapSize || x < 0 || x >= this.mapSize) return false;
            if (this.scene.cityMap[y][x] !== null || this.scene.cityMap[y + 1][x] !== null) return false;
        }
        return true;
    }

    clearBuildingZones(building) {
        for (let y = 0; y < this.mapSize; y++) {
            for (let x = 0; x < this.mapSize; x++) {
                if (this.scene.cityMap[y][x] === building || (this.scene.cityMap[y][x] && this.scene.cityMap[y][x].parent === building)) {
                    this.scene.cityMap[y][x] = null;
                }
            }
        }
    }
}