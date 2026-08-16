class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        window.currentGameScene = this;
        
        this.mapSize = 10;
        this.tileWidth = 64;
        this.tileHeight = 32;
        this.startX = 400;
        this.startY = 150;
    }

    create() {
        // Инициализируем все менеджеры
        this.gridManager = new GridManager(this);
        this.gridManager.createGrid(isStoreOpen);

        this.cameraManager = new CameraManager(this);
        this.placementManager = new PlacementManager(this);
        this.entityManager = new EntityManager(this);

        this.highlightCursor = this.add.graphics();
        this.highlightCursor.setDepth(150).setVisible(false);

        this.cursorItemIcon = this.add.text(0, 0, '', { fontSize: '40px' }).setOrigin(0.5).setDepth(300).setVisible(false);

        this.buildingsGroup = this.add.group();

        // Обработка клавиши ESC (Отмена всех действий)
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.placementManager.placingType !== null) {
                this.placementManager.cancelPlacement();
                this.highlightCursor.setVisible(false);
                this.showFloatingText(this.startX, this.startY, "Строительство завершено", '#ffffff');
            }
            if (this.placementManager.holdingItemData !== null) {
                this.placementManager.cancelHoldingItem(this.cursorItemIcon);
                this.showFloatingText(this.startX, this.startY, "Выкладка завершена", '#ffffff');
            }
            if (typeof isMovingDoor !== 'undefined' && isMovingDoor) {
                isMovingDoor = false;
                this.showFloatingText(this.startX, this.startY, "Перемещение двери отменено", '#ffffff');
            }
            if (typeof movingBuilding !== 'undefined' && movingBuilding !== null) {
                movingBuilding = null;
                this.showFloatingText(this.startX, this.startY, "Перемещение отменено", '#ffffff');
            }
        });

        // Обработка клавиши R (Поворот мебели)
        this.input.keyboard.on('keydown-R', () => {
            let pType = this.placementManager.placingType;
            if (pType === 'register' || pType === 'large_counter' || (typeof movingBuilding !== 'undefined' && movingBuilding && (movingBuilding.bType === 'register' || movingBuilding.bType === 'large_counter'))) {
                this.placementManager.currentOrientation = this.placementManager.currentOrientation === 'horizontal' ? 'vertical' : 'horizontal';
                if (typeof movingBuilding !== 'undefined' && movingBuilding) {
                    movingBuilding.orientation = this.placementManager.currentOrientation;
                    if (movingBuilding.bType === 'register') GameGraphics.drawRegister(movingBuilding, 1, movingBuilding.orientation);
                    if (movingBuilding.bType === 'large_counter') {
                        movingBuilding.slots[1].dx = (this.placementManager.currentOrientation === 'horizontal') ? 1 : 0;
                        movingBuilding.slots[1].dy = (this.placementManager.currentOrientation === 'horizontal') ? 0 : 1;
                        GameGraphics.drawLargeCounter(movingBuilding, DEFAULT_COUNTER_COLOR, 1, movingBuilding.orientation);
                    }
                }
                let orientText = this.placementManager.currentOrientation === 'horizontal' ? 'Горизонтально' : 'Вертикально';
                this.showFloatingText(this.startX, this.startY, `Поворот: ${orientText}`, '#ffff00');
            }
        });

        this.time.addEvent({ delay: 4000, callback: () => this.entityManager.spawnCustomer(), callbackScope: this, loop: true });
        this.time.addEvent({ delay: 1000, loop: true, callback: () => this.entityManager.employeeAI(), callbackScope: this });

        this.input.on('pointerdown', (pointer) => this.onPointerDown(pointer), this);
        this.input.on('pointermove', (pointer) => this.onPointerMove(pointer), this);
        this.input.on('pointerup', () => this.cameraManager.stopDrag(), this);
        this.input.on('pointerupoutside', () => this.cameraManager.stopDrag(), this);
    }

    // --- ПРОКСИ-МЕТОДЫ ДЛЯ МЕНЕДЖЕРОВ ---
    findPath(sX, sY, tX, tY) { return this.gridManager.findPath(sX, sY, tX, tY); }
    getBuildingAdjacentTile(b) { return this.gridManager.getBuildingAdjacentTile(b); }
    getFreeAdjacentTile(tX, tY) { return this.gridManager.getFreeAdjacentTile(tX, tY); }
    canPlaceTwoTileObject(x, y, o) { return this.gridManager.canPlaceTwoTileObject(x, y, o); }
    clearBuildingZones(b) { return this.gridManager.clearBuildingZones(b); }

    startHoldingItem(itemData) { this.placementManager.startHoldingItem(itemData, this.cursorItemIcon); }
    startPlacement(type) { this.placementManager.startPlacement(type); }
    placeBuilding(gridX, gridY, type) { this.placementManager.placeBuilding(gridX, gridY, type); }
    spawnEmployee(register) { this.entityManager.spawnEmployee(register); }
    
    // --- ЛОГИКА ДВЕРЕЙ И МАГАЗИНА ---
    toggleDoors() {
        isStoreOpen = !isStoreOpen;
        
        if (this.gridManager && typeof this.gridManager.drawWallsAndDoors === 'function') {
            this.gridManager.drawWallsAndDoors(isStoreOpen);
        }
        
        this.showFloatingText(this.startX, this.startY, isStoreOpen ? "Магазин открыт" : "Магазин закрыт", isStoreOpen ? '#4CAF50' : '#808080');
        
        if (!isStoreOpen) {
            this.buildingsGroup.getChildren().filter(b => b.bType && b.bType.includes('register')).forEach(reg => {
                if (reg.customerQueue) {
                    reg.customerQueue.forEach(cust => { if (cust.state === 'queuing') { cust.state = 'leaving'; this.entityManager.moveCustomer(cust); } });
                    reg.customerQueue = reg.customerQueue.filter(c => c.state === 'paying');
                    this.entityManager.updateRegisterQueue(reg);
                }
            });
            if (this.customers) {
                this.customers.forEach(cust => {
                    if (cust && cust.active && cust.state !== 'paying' && cust.state !== 'queuing') {
                        cust.leaving = true; cust.state = 'leaving'; this.entityManager.moveCustomer(cust);
                    }
                });
            }
        }
    }

    updateBuildingColor(building) {
        if (!building.slots) return;
        let hasDirty = false, hasDelivered = false, hasReady = false;
        
        building.slots.forEach(slot => {
            if (slot.status === 'dirty') hasDirty = true;
            if (slot.status === 'delivered') hasDelivered = true;
            if (slot.status === 'ready') hasReady = true;
        });

        let color = DEFAULT_COUNTER_COLOR;
        if (hasDirty) color = 0x9e9e9e;
        else if (hasDelivered) color = 0x00ffff;
        else if (hasReady) color = 0x00ff00;

        if (building.bType === 'large_counter') {
            GameGraphics.drawLargeCounter(building, color, 1, building.orientation);
        } else {
            GameGraphics.drawCounter(building, color, 1);
        }
    }

    showFloatingText(x, y, message, color) {
        const t = this.add.text(x, y - 40, message, { fontSize: '20px', fontFamily: 'Arial', fontWeight: 'bold', color: color, stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(200);
        this.tweens.add({ targets: t, y: y - 80, alpha: 0, duration: 1500, onComplete: () => t.destroy() });
    }

    // --- ОБРАБОТЧИКИ МЫШИ ---
    onPointerDown(pointer) {
        this.cameraManager.startDrag(pointer);

        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const gridX = Math.floor((worldPoint.x - this.startX) / (this.tileWidth / 2) + (worldPoint.y - this.startY) / (this.tileHeight / 2)) / 2;
        const gridY = Math.floor((worldPoint.y - this.startY) / (this.tileHeight / 2) - (worldPoint.x - this.startX) / (this.tileWidth / 2)) / 2;
        const targetX = Math.round(gridX), targetY = Math.round(gridY);

        if (targetX >= 0 && targetX < this.mapSize && targetY >= 0 && targetY < this.mapSize) {
            let cellContent = this.cityMap[targetY][targetX];
            let actualContent = cellContent;
            if (cellContent && (cellContent.isReserved || cellContent.isEmployeeZone || cellContent.isQueueZone)) {
                actualContent = cellContent.parent;
            }

            const isoX = this.startX + (targetX - targetY) * (this.tileWidth / 2);
            const isoY = this.startY + (targetX + targetY) * (this.tileHeight / 2);

            // 1. ПЕРЕМЕЩЕНИЕ СУЩЕСТВУЮЩЕЙ ДВЕРИ
            if (typeof isMovingDoor !== 'undefined' && isMovingDoor) {
                this.cameraManager.dragging = false;
                let isFree = (x) => this.cityMap[0][x] === null || this.cityMap[0][x] === 'door';
                
                if (targetY === 0 && targetX >= 0 && targetX <= this.mapSize - 1 && isFree(targetX)) {
                    doorPosition = targetX;
                    isMovingDoor = false;
                    this.gridManager.drawWallsAndDoors(isStoreOpen);
                    this.showFloatingText(isoX, isoY, "Дверь перемещена!", '#00ff00');
                } else {
                    this.showFloatingText(isoX, isoY, "Место занято или не на стене!", '#ff0000');
                }
                return;
            }

            // 2. ВЫКЛАДКА ТОВАРА СО СКЛАДА
            if (this.placementManager.holdingItemData !== null) {
                this.cameraManager.dragging = false; 
                if (actualContent && actualContent.bType && actualContent.bType.includes('counter') && actualContent.slots) {
                    let emptySlot = actualContent.slots.find(s => s.status === 'empty');
                    if (emptySlot) {
                        emptySlot.status = 'delivered';
                        emptySlot.rewardCoins = this.placementManager.holdingItemData.rewardCoins;
                        emptySlot.rewardXP = this.placementManager.holdingItemData.rewardXP;
                        emptySlot.iconString = this.placementManager.holdingItemData.icon;
                        this.updateBuildingColor(actualContent);

                        const sX = actualContent.gridX + emptySlot.dx;
                        const sY = actualContent.gridY + emptySlot.dy;
                        const sIsoX = this.startX + (sX - sY) * (this.tileWidth / 2);
                        const sIsoY = this.startY + (sX + sY) * (this.tileHeight / 2);

                        emptySlot.itemIconObj = this.add.text(sIsoX, sIsoY - 45, '📦', {fontSize: '30px'}).setOrigin(0.5).setDepth(160);
                        this.showFloatingText(sIsoX, sIsoY, "Ожидает выкладки!", '#ffff00');

                        let consumedId = this.placementManager.holdingItemData.id;
                        if (typeof consumeWarehouseItem === 'function') consumeWarehouseItem(consumedId);

                        let nextItem = warehouseItems.find(i => i.name === this.placementManager.holdingItemName && i.status === 'ready' && i.id !== consumedId);
                        if (nextItem) {
                            this.placementManager.holdingItemData = nextItem;
                        } else {
                            this.placementManager.cancelHoldingItem(this.cursorItemIcon);
                            this.showFloatingText(sIsoX, sIsoY, "Товары закончились", '#ffff00');
                        }
                    } else {
                        this.placementManager.cancelHoldingItem(this.cursorItemIcon);
                        this.showFloatingText(isoX, isoY, "Все места заняты", '#ff0000');
                    }
                } else {
                    this.placementManager.cancelHoldingItem(this.cursorItemIcon);
                    this.showFloatingText(isoX, isoY, "Отмена", '#ff0000');
                }
                return;
            }

            // 3. КЛИК ПО ДВЕРИ (МЕНЮ)
            if (cellContent === 'door') { 
                this.cameraManager.dragging = false; 
                if (typeof openDoorMenu === 'function') openDoorMenu(); 
                return; 
            }

            // 4. ПОКУПКА НОВОЙ МЕБЕЛИ (И ДВЕРИ)
            if (this.placementManager.placingType !== null) {
                this.cameraManager.dragging = false; 
                let pType = this.placementManager.placingType;
                let canPlace = true;

                if (pType === 'door') {
                    canPlace = (targetY === 0 && targetX >= 0 && targetX <= this.mapSize - 1 && this.cityMap[0][targetX] === null);
                } else if (pType === 'counter') {
                    canPlace = (cellContent === null);
                } else {
                    canPlace = this.canPlaceTwoTileObject(targetX, targetY, this.placementManager.currentOrientation);
                }

                if (!canPlace) {
                    this.showFloatingText(isoX, isoY, pType === 'door' ? "Стена занята!" : "Недостаточно места!", '#ff0000'); 
                    return;
                }

                const costs = { 'door': 50, 'counter': 30, 'large_counter': 60, 'register': 100 };
                const cost = costs[pType] || 30;

                if (playerMoney < cost) {
                    this.showFloatingText(isoX, isoY, "Недостаточно монет!", '#ff0000');
                    this.placementManager.cancelPlacement();
                    return;
                }

                playerMoney -= cost; updateUI();
                
                if (pType === 'door') {
                    hasDoor = true;
                    doorPosition = targetX;
                    this.gridManager.drawWallsAndDoors(isStoreOpen);
                    this.placementManager.cancelPlacement();
                    this.showFloatingText(isoX, isoY, "-50 🪙 Дверь установлена!", '#00ff00');
                    return;
                }

                this.placeBuilding(targetX, targetY, pType);
                this.showFloatingText(isoX, isoY, "-" + cost + " 🪙", '#ffcc00');
                
                if (pType === 'counter' || pType === 'large_counter') {
                    if (playerMoney < cost) {
                        this.showFloatingText(isoX, isoY, "Монеты закончились!", '#ff0000');
                        this.placementManager.cancelPlacement();
                    }
                } else {
                    this.placementManager.cancelPlacement();
                }
                return; 
            }

            // 5. ПЕРЕМЕЩЕНИЕ МЕБЕЛИ
            if (typeof movingBuilding !== 'undefined' && movingBuilding !== null) {
                let canMove = true;
                if (movingBuilding.bType === 'counter') {
                    canMove = (cellContent === null);
                } else {
                    canMove = this.canPlaceTwoTileObject(targetX, targetY, movingBuilding.orientation);
                }

                if (!canMove) {
                    this.cameraManager.dragging = false; this.showFloatingText(isoX, isoY, "Недостаточно места!", '#ff0000'); return;
                }

                this.clearBuildingZones(movingBuilding);
                movingBuilding.gridX = targetX; movingBuilding.gridY = targetY;

                if (movingBuilding.bType === 'counter' || movingBuilding.bType === 'large_counter') {
                    if (movingBuilding.bType === 'large_counter' && movingBuilding.orientation === 'horizontal') {
                        const isoX2 = this.startX + ((targetX + 1) - targetY) * (this.tileWidth / 2);
                        const isoY2 = this.startY + ((targetX + 1) + targetY) * (this.tileHeight / 2);
                        movingBuilding.setPosition((isoX + isoX2) / 2, (isoY + isoY2) / 2);
                        this.cityMap[targetY][targetX] = movingBuilding; this.cityMap[targetY][targetX + 1] = movingBuilding;
                    } else if (movingBuilding.bType === 'large_counter' && movingBuilding.orientation === 'vertical') {
                        const isoX2 = this.startX + (targetX - (targetY + 1)) * (this.tileWidth / 2);
                        const isoY2 = this.startY + (targetX + (targetY + 1)) * (this.tileHeight / 2);
                        movingBuilding.setPosition((isoX + isoX2) / 2, (isoY + isoY2) / 2);
                        this.cityMap[targetY][targetX] = movingBuilding; this.cityMap[targetY + 1][targetX] = movingBuilding;
                    } else {
                        movingBuilding.setPosition(isoX, isoY); 
                        this.cityMap[targetY][targetX] = movingBuilding;
                    }
                    
                    movingBuilding.setDepth(10 + targetX + targetY);
                    this.updateBuildingColor(movingBuilding);

                    if (movingBuilding.slots) {
                        movingBuilding.slots.forEach(slot => {
                            const sX = targetX + slot.dx;
                            const sY = targetY + slot.dy;
                            const sIsoX = this.startX + (sX - sY) * (this.tileWidth / 2);
                            const sIsoY = this.startY + (sX + sY) * (this.tileHeight / 2);
                            if (slot.itemIconObj) slot.itemIconObj.setPosition(sIsoX, sIsoY - 45); 
                            if (slot.broomIconObj) slot.broomIconObj.setPosition(sIsoX, sIsoY - 45); 
                        });
                    }

                } else if (movingBuilding.bType === 'register') {
                    movingBuilding.orientation = this.placementManager.currentOrientation;
                    GameGraphics.drawRegister(movingBuilding, 1, movingBuilding.orientation);

                    if (movingBuilding.orientation === 'horizontal') {
                        const isoX2 = this.startX + ((targetX + 1) - targetY) * (this.tileWidth / 2);
                        const isoY2 = this.startY + ((targetX + 1) + targetY) * (this.tileHeight / 2);
                        movingBuilding.setPosition((isoX + isoX2) / 2, (isoY + isoY2) / 2);
                        this.cityMap[targetY][targetX] = movingBuilding; this.cityMap[targetY][targetX + 1] = movingBuilding;
                        this.cityMap[targetY + 1][targetX] = { isEmployeeZone: true, parent: movingBuilding }; this.cityMap[targetY + 1][targetX + 1] = { isEmployeeZone: true, parent: movingBuilding };
                    } else {
                        const isoX2 = this.startX + (targetX - (targetY + 1)) * (this.tileWidth / 2);
                        const isoY2 = this.startY + (targetX + (targetY + 1)) * (this.tileHeight / 2);
                        movingBuilding.setPosition((isoX + isoX2) / 2, (isoY + isoY2) / 2);
                        this.cityMap[targetY][targetX] = movingBuilding; this.cityMap[targetY + 1][targetX] = movingBuilding;
                        this.cityMap[targetY][targetX + 1] = { isEmployeeZone: true, parent: movingBuilding }; this.cityMap[targetY + 1][targetX + 1] = { isEmployeeZone: true, parent: movingBuilding };
                    }
                    movingBuilding.setDepth(10 + targetX + targetY);
                    
                    if (movingBuilding.employee) {
                        let eX = movingBuilding.orientation === 'horizontal' ? targetX : targetX + 1;
                        let eY = movingBuilding.orientation === 'horizontal' ? targetY + 1 : targetY;
                        const eIso1X = this.startX + (eX - eY) * (this.tileWidth / 2); const eIso1Y = this.startY + (eX + eY) * (this.tileHeight / 2);
                        const eIso2X = this.startX + ((eX + (movingBuilding.orientation === 'horizontal' ? 1 : 0)) - (eY + (movingBuilding.orientation === 'horizontal' ? 0 : 1))) * (this.tileWidth / 2);
                        const eIso2Y = this.startY + ((eX + (movingBuilding.orientation === 'horizontal' ? 1 : 0)) + (eY + (movingBuilding.orientation === 'horizontal' ? 0 : 1))) * (this.tileWidth / 2);
                        
                        this.tweens.killTweensOf(movingBuilding.employee);
                        movingBuilding.employee.setPosition((eIso1X + eIso2X) / 2, (eIso1Y + eIso2Y) / 2 - 8);
                        movingBuilding.employee.gridX = eX; movingBuilding.employee.gridY = eY; movingBuilding.employee.setDepth(15 + eX + eY);
                        movingBuilding.employee.state = 'idle';
                    }
                }
                movingBuilding = null; this.showFloatingText(isoX, isoY, "Установлено!", '#00ff00');
                return; 
            }

            // 6. КЛИК ПО МЕБЕЛИ (МЕНЮ И УБОРКА)
            if (actualContent === null) {
                // Пусто
            } else if (actualContent.bType && actualContent.bType.includes('counter') && actualContent.slots) {
                let cleaned = false;
                actualContent.slots.forEach(slot => {
                    if (slot.status === 'dirty') {
                        slot.status = 'empty';
                        if (slot.broomIconObj) { slot.broomIconObj.destroy(); slot.broomIconObj = null; }
                        cleaned = true;
                        if (typeof addXP === 'function') addXP(1); 
                    }
                });
                
                if (cleaned) {
                    this.updateBuildingColor(actualContent);
                    this.showFloatingText(actualContent.x, actualContent.y, "Чисто!", '#00ffff');
                } else {
                    if (typeof openObjectMenu === 'function') openObjectMenu(actualContent);
                }
            } else if (actualContent.bType && actualContent.bType.includes('register')) {
                if (typeof openObjectMenu === 'function') openObjectMenu(actualContent); 
            }
        }
    }

    onPointerMove(pointer) {
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

        if (this.placementManager.holdingItemData !== null && this.cursorItemIcon) {
            this.cursorItemIcon.setPosition(worldPoint.x, worldPoint.y - 20);
        }

        let isDragging = this.cameraManager.doDrag(pointer);
        if (isDragging) {
            if (this.highlightCursor) this.highlightCursor.setVisible(false); 
            if (this.placementManager.previewBuilding) this.placementManager.previewBuilding.setVisible(false);
            return; 
        } else {
            const gridX = Math.floor((worldPoint.x - this.startX) / (this.tileWidth / 2) + (worldPoint.y - this.startY) / (this.tileHeight / 2)) / 2;
            const gridY = Math.floor((worldPoint.y - this.startY) / (this.tileHeight / 2) - (worldPoint.x - this.startX) / (this.tileWidth / 2)) / 2;
            const targetX = Math.round(gridX), targetY = Math.round(gridY);

            this.highlightCursor.clear();

            if (targetX >= 0 && targetX < this.mapSize && targetY >= 0 && targetY < this.mapSize) {
                this.highlightCursor.setVisible(true);

                let bType = this.placementManager.placingType || (typeof movingBuilding !== 'undefined' && movingBuilding ? movingBuilding.bType : null);
                let currentOr = this.placementManager.placingType ? this.placementManager.currentOrientation : (typeof movingBuilding !== 'undefined' && movingBuilding ? movingBuilding.orientation : 'horizontal');

                if (bType) {
                    let valid = false;
                    if (bType === 'counter') {
                        valid = (this.cityMap[targetY][targetX] === null);
                    } else if (bType === 'door') {
                        valid = (targetY === 0 && targetX >= 0 && targetX <= this.mapSize - 1 && this.cityMap[0][targetX] === null);
                    } else {
                        valid = this.canPlaceTwoTileObject(targetX, targetY, currentOr);
                    }

                    let color = valid ? 0x00ff00 : 0xff0000; 

                    const drawTileHighlight = (cx, cy, tileColor, alpha) => {
                        if (cx >= 0 && cx < this.mapSize && cy >= 0 && cy < this.mapSize) {
                            let cIsoX = this.startX + (cx - cy) * (this.tileWidth / 2);
                            let cIsoY = this.startY + (cx + cy) * (this.tileHeight / 2);
                            this.highlightCursor.lineStyle(2, tileColor, 0.8).fillStyle(tileColor, alpha);
                            this.highlightCursor.beginPath();
                            this.highlightCursor.moveTo(cIsoX, cIsoY - this.tileHeight / 2);
                            this.highlightCursor.lineTo(cIsoX + this.tileWidth / 2, cIsoY);
                            this.highlightCursor.lineTo(cIsoX, cIsoY + this.tileHeight / 2);
                            this.highlightCursor.lineTo(cIsoX - this.tileWidth / 2, cIsoY);
                            this.highlightCursor.closePath();
                            this.highlightCursor.fillPath();
                            this.highlightCursor.strokePath();
                        }
                    };

                    if (bType === 'register') {
                        if (currentOr === 'horizontal') {
                            [0, 1].forEach(dx => drawTileHighlight(targetX + dx, targetY, color, 0.4));
                            [0, 1].forEach(dx => drawTileHighlight(targetX + dx, targetY + 1, 0x10b981, 0.4));
                            [0, 1].forEach(dx => drawTileHighlight(targetX + dx, targetY - 1, 0x3b82f6, 0.4));
                        } else {
                            [0, 1].forEach(dy => drawTileHighlight(targetX, targetY + dy, color, 0.4));
                            [0, 1].forEach(dy => drawTileHighlight(targetX + 1, targetY + dy, 0x10b981, 0.4));
                            [0, 1].forEach(dy => drawTileHighlight(targetX - 1, targetY + dy, 0x3b82f6, 0.4));
                        }
                    } else if (bType === 'large_counter' && currentOr === 'horizontal') {
                        [0, 1].forEach(dx => drawTileHighlight(targetX + dx, targetY, color, 0.4));
                    } else if (bType === 'large_counter' && currentOr === 'vertical') {
                        [0, 1].forEach(dy => drawTileHighlight(targetX, targetY + dy, color, 0.4));
                    } else if (bType === 'door') {
                        drawTileHighlight(targetX, targetY, color, 0.4);
                    } else if (bType === 'counter') {
                        drawTileHighlight(targetX, targetY, color, 0.4);
                    }

                    if (this.placementManager.previewBuilding && this.placementManager.placingType) {
                        const isoX1 = this.startX + (targetX - targetY) * (this.tileWidth / 2);
                        const isoY1 = this.startY + (targetX + targetY) * (this.tileHeight / 2);

                        if (this.placementManager.placingType === 'counter') {
                            this.placementManager.previewBuilding.setPosition(isoX1, isoY1);
                            GameGraphics.drawCounter(this.placementManager.previewBuilding, DEFAULT_COUNTER_COLOR, 0.6);
                        } else if (this.placementManager.placingType === 'large_counter') {
                            if (currentOr === 'horizontal') {
                                const isoX2 = this.startX + ((targetX + 1) - targetY) * (this.tileWidth / 2);
                                const isoY2 = this.startY + ((targetX + 1) + targetY) * (this.tileHeight / 2);
                                this.placementManager.previewBuilding.setPosition((isoX1 + isoX2) / 2, (isoY1 + isoY2) / 2);
                            } else {
                                const isoX2 = this.startX + (targetX - (targetY + 1)) * (this.tileWidth / 2);
                                const isoY2 = this.startY + (targetX + (targetY + 1)) * (this.tileHeight / 2);
                                this.placementManager.previewBuilding.setPosition((isoX1 + isoX2) / 2, (isoY1 + isoY2) / 2);
                            }
                            GameGraphics.drawLargeCounter(this.placementManager.previewBuilding, DEFAULT_COUNTER_COLOR, 0.6, currentOr);
                        } else if (this.placementManager.placingType === 'register') {
                            if (currentOr === 'horizontal') {
                                const isoX2 = this.startX + ((targetX + 1) - targetY) * (this.tileWidth / 2);
                                const isoY2 = this.startY + ((targetX + 1) + targetY) * (this.tileHeight / 2);
                                this.placementManager.previewBuilding.setPosition((isoX1 + isoX2) / 2, (isoY1 + isoY2) / 2);
                            } else {
                                const isoX2 = this.startX + (targetX - (targetY + 1)) * (this.tileWidth / 2);
                                const isoY2 = this.startY + (targetX + (targetY + 1)) * (this.tileHeight / 2);
                                this.placementManager.previewBuilding.setPosition((isoX1 + isoX2) / 2, (isoY1 + isoY2) / 2);
                            }
                            GameGraphics.drawRegister(this.placementManager.previewBuilding, 0.6, currentOr);
                        } else if (this.placementManager.placingType === 'door') {
                            this.placementManager.previewBuilding.setPosition(0, 0); 
                            GameGraphics.drawDoor(this.placementManager.previewBuilding, isoX1, isoY1, 75, false);
                        }
                        this.placementManager.previewBuilding.setVisible(true);
                    }

                    if (typeof movingBuilding !== 'undefined' && movingBuilding !== null) {
                        const isoX1 = this.startX + (targetX - targetY) * (this.tileWidth / 2);
                        const isoY1 = this.startY + (targetX + targetY) * (this.tileHeight / 2);
                        let curX, curY;
                        if (movingBuilding.orientation === 'horizontal') {
                            const isoX2 = this.startX + ((targetX + 1) - targetY) * (this.tileWidth / 2);
                            const isoY2 = this.startY + ((targetX + 1) + targetY) * (this.tileHeight / 2);
                            curX = (isoX1 + isoX2) / 2; curY = (isoY1 + isoY2) / 2;
                        } else {
                            const isoX2 = this.startX + (targetX - (targetY + 1)) * (this.tileWidth / 2);
                            const isoY2 = this.startY + (targetX + (targetY + 1)) * (this.tileHeight / 2);
                            curX = (isoX1 + isoX2) / 2; curY = (isoY1 + isoY2) / 2;
                        }
                        movingBuilding.x = curX; movingBuilding.y = curY; movingBuilding.setDepth(10 + targetX + targetY);
                        
                        if (movingBuilding.slots) {
                            movingBuilding.slots.forEach(slot => {
                                const sX = targetX + slot.dx;
                                const sY = targetY + slot.dy;
                                const sIsoX = this.startX + (sX - sY) * (this.tileWidth / 2);
                                const sIsoY = this.startY + (sX + sY) * (this.tileHeight / 2);
                                if (slot.itemIconObj) slot.itemIconObj.setPosition(sIsoX, sIsoY - 45);
                                if (slot.broomIconObj) slot.broomIconObj.setPosition(sIsoX, sIsoY - 45);
                            });
                        }
                    }

                } else {
                    if (this.placementManager.previewBuilding) this.placementManager.previewBuilding.setVisible(false);

                    let actualHover = this.cityMap[targetY][targetX];
                    if (actualHover && (actualHover.isReserved || actualHover.isEmployeeZone || actualHover.isQueueZone)) {
                        actualHover = actualHover.parent;
                    }
                    
                    if (this.placementManager.holdingItemData !== null && actualHover && actualHover.bType && actualHover.bType.includes('counter')) {
                        let hasEmpty = actualHover.slots && actualHover.slots.some(s => s.status === 'empty');
                        this.highlightCursor.lineStyle(2, hasEmpty ? 0x00ff00 : 0xff0000, 0.8).fillStyle(hasEmpty ? 0x00ff00 : 0xff0000, 0.4);
                        
                        actualHover.slots.forEach(s => {
                            let cx = actualHover.gridX + s.dx;
                            let cy = actualHover.gridY + s.dy;
                            let cIsoX = this.startX + (cx - cy) * (this.tileWidth / 2);
                            let cIsoY = this.startY + (cx + cy) * (this.tileHeight / 2);
                            this.highlightCursor.beginPath();
                            this.highlightCursor.moveTo(cIsoX, cIsoY - this.tileHeight / 2);
                            this.highlightCursor.lineTo(cIsoX + this.tileWidth / 2, cIsoY);
                            this.highlightCursor.lineTo(cIsoX, cIsoY + this.tileHeight / 2);
                            this.highlightCursor.lineTo(cIsoX - this.tileWidth / 2, cIsoY);
                            this.highlightCursor.closePath();
                            this.highlightCursor.fillPath();
                            this.highlightCursor.strokePath();
                        });
                    } else if (typeof isMovingDoor !== 'undefined' && isMovingDoor) {
                        let isFree = (x) => this.cityMap[0][x] === null || this.cityMap[0][x] === 'door';
                        let canPlaceDoor = (targetY === 0 && targetX >= 0 && targetX <= this.mapSize - 1 && isFree(targetX));
                        let doorColor = canPlaceDoor ? 0x00ff00 : 0xff0000;
                        
                        if (targetX < this.mapSize && targetY < this.mapSize) {
                            let cIsoX = this.startX + (targetX - targetY) * (this.tileWidth / 2);
                            let cIsoY = this.startY + (targetX + targetY) * (this.tileHeight / 2);
                            this.highlightCursor.lineStyle(2, doorColor, 0.8).fillStyle(doorColor, 0.4);
                            this.highlightCursor.beginPath();
                            this.highlightCursor.moveTo(cIsoX, cIsoY - this.tileHeight / 2);
                            this.highlightCursor.lineTo(cIsoX + this.tileWidth / 2, cIsoY);
                            this.highlightCursor.lineTo(cIsoX, cIsoY + this.tileHeight / 2);
                            this.highlightCursor.lineTo(cIsoX - this.tileWidth / 2, cIsoY);
                            this.highlightCursor.closePath();
                            this.highlightCursor.fillPath();
                            this.highlightCursor.strokePath();
                        }
                    } else {
                        let isoX = this.startX + (targetX - targetY) * (this.tileWidth / 2);
                        let isoY = this.startY + (targetX + targetY) * (this.tileHeight / 2);
                        this.highlightCursor.lineStyle(2, 0xffffff, 0.8).fillStyle(0xffffff, 0.4);
                        this.highlightCursor.beginPath();
                        this.highlightCursor.moveTo(isoX, isoY - this.tileHeight / 2);
                        this.highlightCursor.lineTo(isoX + this.tileWidth / 2, isoY);
                        this.highlightCursor.lineTo(isoX, isoY + this.tileHeight / 2);
                        this.highlightCursor.lineTo(isoX - this.tileWidth / 2, isoY);
                        this.highlightCursor.closePath();
                        this.highlightCursor.fillPath();
                        this.highlightCursor.strokePath();
                    }
                }
            } else {
                this.highlightCursor.setVisible(false);
                if (this.placementManager.previewBuilding) this.placementManager.previewBuilding.setVisible(false);
            }
        }
    }
}