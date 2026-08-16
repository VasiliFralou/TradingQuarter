// Используем опциональную цепочку (?.) для безопасного обновления DOM
function updateUI() {
    const safeSetText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    safeSetText('money-display', playerMoney);
    safeSetText('cash-display', playerCash);
    safeSetText('rating-display', playerRating);
    safeSetText('level-badge', playerLevel);
    safeSetText('xp-text', `${playerXP} / ${xpToNextLevel} XP`);

    const xpPercent = Math.min((playerXP / xpToNextLevel) * 100, 100);
    const xpFill = document.getElementById('xp-fill');
    if (xpFill) xpFill.style.width = `${xpPercent}%`;
}

function addXP(amount) {
    playerXP += amount;
    if (playerXP >= xpToNextLevel) {
        playerXP -= xpToNextLevel;
        playerLevel++;
        xpToNextLevel = Math.floor(xpToNextLevel * 1.5);

        if (currentGameScene && currentGameScene.add) {
            const text = currentGameScene.add.text(400, 300, "УРОВЕНЬ ПОВЫШЕН!", {
                fontSize: '40px', fontWeight: 'bold', color: '#ffcc00', stroke: '#000', strokeThickness: 6
            }).setOrigin(0.5).setDepth(200);

            currentGameScene.tweens.add({
                targets: text,
                y: 200,
                alpha: 0,
                duration: 2500,
                onComplete: () => text.destroy()
            });
        }
    }
    updateUI();
}

function openMenu(menuType) {
    const modal = document.getElementById('main-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    if (!modal || !title || !body) return;

    body.innerHTML = '';

    if (menuType === 'upgrades') {
        title.innerText = 'Улучшения (Мебель)';
        renderUpgradesMenu(body);
    } else if (menuType === 'warehouse') {
        title.innerText = 'Склад';
        renderWarehouseMenu(body);
    } else if (menuType === 'catalog') {
        title.innerText = 'Каталог товаров';
        renderCatalogMenu(body);
    }
    modal.style.display = 'block';
}

function closeMenu() {
    const modal = document.getElementById('main-modal');
    if (modal) modal.style.display = 'none';
}

function renderUpgradesMenu(container) {
    const furniture = [];

    if (!hasDoor) {
        furniture.push({ id: 'door', name: 'Входная дверь', cost: 50, icon: '🚪' });
    }

    furniture.push(
        { id: 'counter', name: 'Прилавок (маленький)', cost: 30, icon: '🪑' },
        { id: 'large_counter', name: 'Прилавок (средний)', cost: 60, icon: '🛋️' },
        { id: 'register', name: 'Касса', cost: 100, icon: '📠' }
    );

    let html = '';
    furniture.forEach(item => {
        html += `
            <div class="item-card">
                <div style="font-weight:bold">${item.name}</div>
                <div class="item-icon">${item.icon}</div>
                <div style="margin-bottom:10px;">Цена: ${item.cost} 🪙</div>
                <button class="btn-order" onclick="buyBuilding('${item.id}', ${item.cost})">Купить</button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function buyBuilding(type, cost) {
    if (playerMoney < cost) {
        alert("Недостаточно монет!");
        return;
    }
    closeMenu();
    if (currentGameScene?.startPlacement) {
        currentGameScene.startPlacement(type);
        if (typeof showActionPanel === 'function') {
            showActionPanel(type === 'register' || type === 'large_counter');
        }
    }
}

function renderWarehouseMenu(container) {
    let readyGroups = {};
    let deliveringItems = [];

    (warehouseItems || []).forEach(item => {
        if (item.status === 'ready') {
            if (!readyGroups[item.name]) {
                readyGroups[item.name] = { ...item, count: 0 };
            }
            readyGroups[item.name].count++;
        } else {
            deliveringItems.push(item);
        }
    });

    const isFull = warehouseItems.length >= warehouseCapacity;
    const loadColor = isFull ? '#ef4444' : '#16a34a';

    let html = `
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: #fdf4ff; padding: 15px; border-radius: 12px; border: 3px solid #c084fc; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="font-size: 18px; font-weight: bold; color: #6b21a8;">
                📦 Склад: <span style="color: ${loadColor};">${warehouseItems.length}</span> / ${warehouseCapacity}
            </div>
            <button class="btn-action" style="width: auto; padding: 10px 20px; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);" onclick="openMenu('catalog')">🛒 Заказать товар</button>
        </div>
    `;

    deliveringItems.forEach(item => {
        html += `
            <div class="item-card">
                <div style="font-weight:bold">${item.name}</div>
                <div class="item-icon" style="margin: 5px 0;">${item.icon}</div>
                <div style="background:#ffedd5; color:#d97706; font-size:12px; font-weight:bold; border-radius:4px; padding:2px; margin-bottom:5px; border:1px solid #f59e0b;">В пути: 1 шт.</div>
                <div class="item-stats" style="margin-bottom: 8px;">
                    <div style="color:#16a34a">Доход: ${item.rewardCoins} 🪙</div>
                    <div style="color:#9333ea">Опыт: +${item.rewardXP} ⭐</div>
                </div>
                <button class="btn-action" style="background:#f59e0b; cursor:default;" id="timer-btn-${item.id}">${item.timeLeft} сек</button>
            </div>
        `;
    });

    Object.values(readyGroups).forEach(group => {
        html += `
            <div class="item-card">
                <div style="font-weight:bold">${group.name}</div>
                <div class="item-icon" style="margin: 5px 0;">${group.icon}</div>
                <div style="background:#dcfce7; color:#15803d; font-size:12px; font-weight:bold; border-radius:4px; padding:2px; margin-bottom:5px; border:1px solid #22c55e;">Готово: ${group.count} шт.</div>
                <div class="item-stats" style="margin-bottom: 8px;">
                    <div style="color:#16a34a">Доход: ${group.rewardCoins} 🪙</div>
                    <div style="color:#9333ea">Опыт: +${group.rewardXP} ⭐</div>
                </div>
                <button class="btn-action" onclick="pickupItem('${group.name}')">На прилавок</button>
            </div>
        `;
    });

    html += `
        <div class="item-card" style="background:#fff7ed; border-color:#f59e0b; display: flex; flex-direction: column;">
            <div style="font-weight:bold;">Расширить склад</div>
            <div class="item-icon" style="color:#f59e0b; font-size: 40px; margin: 10px 0;">➕</div>
            <div class="item-stats" style="margin-bottom: 8px;">
                <div style="color:#d97706; font-weight:bold;">Цена: ${nextSlotPrice} 🪙</div>
                <div style="color:#666">Даст +1 место</div>
            </div>
            <button class="btn-order" style="background:#f59e0b; border-color:#d97706; margin-top: auto;" onclick="unlockWarehouseSlot()">Купить</button>
        </div>
    `;

    container.innerHTML = html;
}

function unlockWarehouseSlot() {
    if (playerMoney < nextSlotPrice) {
        alert("Недостаточно монет для расширения склада!");
        return;
    }
    playerMoney -= nextSlotPrice;
    warehouseCapacity++;
    nextSlotPrice *= 2;
    updateUI();
    openMenu('warehouse');
}

function renderCatalogMenu(container) {
    let warehouseCounts = {};
    warehouseItems.forEach(item => {
        warehouseCounts[item.name] = (warehouseCounts[item.name] || 0) + 1;
    });

    const isFull = warehouseItems.length >= warehouseCapacity;
    const loadColor = isFull ? '#ef4444' : '#16a34a';

    let html = `
        <div style="width: 100%; display: flex; justify-content: center; margin-bottom: 10px; background: #fdf4ff; padding: 10px; border-radius: 8px; border: 2px solid ${loadColor};">
            <span style="font-size: 16px; font-weight: bold; color: ${loadColor};">
                ${isFull ? '⚠️ Склад заполнен' : `📦 Свободных мест: ${warehouseCapacity - warehouseItems.length}`}
            </span>
        </div>
    `;

    itemsDatabase.forEach(item => {
        let count = warehouseCounts[item.name] || 0;
        let countBadge = count > 0
            ? `<div style="background:#ffedd5; color:#d97706; font-size:12px; font-weight:bold; border-radius:4px; padding:2px; margin-bottom:5px; border:1px solid #f59e0b;">Заказано: ${count} шт.</div>`
            : `<div style="height: 21px; margin-bottom: 5px;"></div>`;

        let btnStyle = isFull ? 'background:#ccc; border-color:#999; cursor:not-allowed;' : '';

        html += `
            <div class="item-card">
                <div style="font-weight:bold">${item.name}</div>
                <div class="item-icon" style="margin: 5px 0;">${item.icon}</div>
                ${countBadge}
                <div class="item-stats" style="margin-bottom: 8px;">
                    <div>Цена: ${item.cost} 🪙</div>
                    <div style="color:#16a34a">Доход: ${item.reward} 🪙</div>
                    <div style="color:#9333ea">Опыт: +${item.xp} ⭐</div>
                    <div>Время: ${item.time} сек</div>
                </div>
                <button class="btn-order" style="${btnStyle}" onclick="orderToWarehouse(${item.cost}, ${item.time}, ${item.reward}, ${item.xp}, '${item.icon}', '${item.name}')">Заказать</button>
            </div>
        `;
    });

    container.innerHTML = html;
}

function orderToWarehouse(cost, time, rewardCoins, rewardXP, icon, name) {
    if (warehouseItems.length >= warehouseCapacity) {
        alert("Склад заполнен! Расширьте его или выставьте товары.");
        return;
    }
    if (playerMoney < cost) {
        alert("Нет монет!");
        return;
    }

    playerMoney -= cost;
    updateUI();

    let newItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: name,
        icon: icon,
        rewardCoins: rewardCoins,
        rewardXP: rewardXP,
        status: 'delivering',
        timeLeft: time
    };
    warehouseItems.push(newItem);

    if (currentGameScene && currentGameScene.time) {
        let timerEvent = currentGameScene.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                newItem.timeLeft--;
                const timerBtn = document.getElementById(`timer-btn-${newItem.id}`);
                if (timerBtn) timerBtn.innerText = `${newItem.timeLeft} сек`;

                if (newItem.timeLeft <= 0) {
                    timerEvent.remove(); 
                    newItem.status = 'ready';

                    const modal = document.getElementById('main-modal');
                    const title = document.getElementById('modal-title');
                    if (modal && modal.style.display === 'block' && title && title.innerText === 'Склад') {
                        openMenu('warehouse');
                    }
                }
            }
        });
    }

    openMenu('catalog');
}

function pickupItem(itemName) {
    closeMenu();
    let itemToPickup = warehouseItems.find(i => i.name === itemName && i.status === 'ready');
    if (itemToPickup && currentGameScene?.startHoldingItem) {
        currentGameScene.startHoldingItem(itemToPickup);
        if (typeof showActionPanel === 'function') showActionPanel(false);
    }
}

function consumeWarehouseItem(itemId) {
    let idx = warehouseItems.findIndex(i => i.id === itemId);
    if (idx !== -1) warehouseItems.splice(idx, 1);
}

function openObjectMenu(building) {
    selectedBuildingData = building;
    const modal = document.getElementById('object-modal');
    const rotateBtn = document.getElementById('btn-rotate');
    if (rotateBtn) {
        if (building.bType === 'register' || building.bType === 'large_counter') {
            rotateBtn.style.display = 'block';
        } else {
            rotateBtn.style.display = 'none';
        }
    }
    if (modal) modal.style.display = 'block';
}

function closeObjectMenu() {
    const modal = document.getElementById('object-modal');
    if (modal) modal.style.display = 'none';
    selectedBuildingData = null;
}

function startMoveBuilding() {
    if (!selectedBuildingData || !currentGameScene) return;

    movingBuilding = selectedBuildingData;
    currentGameScene.placementManager.currentOrientation = movingBuilding.orientation;

    if (movingBuilding.bType === 'register' || movingBuilding.bType === 'large_counter') {
        currentGameScene.clearBuildingZones(movingBuilding);
    } else if (movingBuilding.bType === 'counter') {
        if (currentGameScene.cityMap && currentGameScene.cityMap[movingBuilding.gridY]) {
            currentGameScene.cityMap[movingBuilding.gridY][movingBuilding.gridX] = null;
        }
        if (typeof GameGraphics !== 'undefined') {
            GameGraphics.drawCounter(movingBuilding, DEFAULT_COUNTER_COLOR, 0.6);
        }
    }

    closeObjectMenu();
    if (currentGameScene.showFloatingText) {
        currentGameScene.showFloatingText(movingBuilding.x, movingBuilding.y, "Куда поставить?", '#ffff00');
    }
    if (typeof showActionPanel === 'function') {
        showActionPanel(movingBuilding.bType === 'register' || movingBuilding.bType === 'large_counter');
    }
}

function deleteBuilding() {
    if (!selectedBuildingData || !currentGameScene) return;
    
    let refund = 15;
    if (selectedBuildingData.bType === 'large_counter') refund = 30;
    if (selectedBuildingData.bType === 'register') refund = 50;
    
    playerMoney += refund; 
    updateUI();

    if (selectedBuildingData.slots) {
        selectedBuildingData.slots.forEach(slot => {
            if (slot.itemIconObj?.active) slot.itemIconObj.destroy();
            if (slot.broomIconObj?.active) slot.broomIconObj.destroy();
        });
    } else {
        if (selectedBuildingData.itemIconObj?.active) selectedBuildingData.itemIconObj.destroy();
        if (selectedBuildingData.broomIconObj?.active) selectedBuildingData.broomIconObj.destroy();
    }

    if (selectedBuildingData.bType === 'register' || selectedBuildingData.bType === 'large_counter') {
        if (typeof currentGameScene.clearBuildingZones === 'function') {
            currentGameScene.clearBuildingZones(selectedBuildingData);
        }
    } else if (currentGameScene.cityMap && currentGameScene.cityMap[selectedBuildingData.gridY]) {
        currentGameScene.cityMap[selectedBuildingData.gridY][selectedBuildingData.gridX] = null;
    }

    if (selectedBuildingData.bType === 'register' && selectedBuildingData.employee) {
        if (selectedBuildingData.employee.active) {
            selectedBuildingData.employee.destroy();
        }
        currentGameScene.employees = (currentGameScene.employees || []).filter(e => e !== selectedBuildingData.employee);
    }

    if (currentGameScene.events) {
        currentGameScene.events.emit('building-destroyed', selectedBuildingData);
    }

    if (typeof currentGameScene.showFloatingText === 'function') {
        currentGameScene.showFloatingText(selectedBuildingData.x, selectedBuildingData.y, `+${refund} 🪙`, '#ffcc00');
    }
    
    if (selectedBuildingData.active !== false && selectedBuildingData.destroy) {
        selectedBuildingData.destroy();
    }
    
    closeObjectMenu();
}

window.addEventListener('DOMContentLoaded', () => {
    updateUI();
});

function openDoorMenu() {
    const modal = document.getElementById('door-modal');
    if (modal) modal.style.display = 'block';
}

function closeDoorMenu() {
    const modal = document.getElementById('door-modal');
    if (modal) modal.style.display = 'none';
}

function uiToggleDoorState() {
    closeDoorMenu();
    if (currentGameScene && typeof currentGameScene.toggleDoors === 'function') {
        currentGameScene.toggleDoors();
    }
}

function startMoveDoor() {
    closeDoorMenu();
    isMovingDoor = true;
    if (currentGameScene) {
        currentGameScene.showFloatingText(currentGameScene.startX, currentGameScene.startY, "Выберите место на верхней стене", '#ffff00');
    }
    if (typeof showActionPanel === 'function') showActionPanel(false);
}

// --- НОВЫЕ ФУНКЦИИ ВРАЩЕНИЯ И ПАНЕЛИ ДЕЙСТВИЙ (БЕЗ КЛАВИАТУРЫ) ---

function rotateBuildingInPlace() {
    if (!selectedBuildingData || !currentGameScene) return;

    let b = selectedBuildingData;
    if (b.bType !== 'register' && b.bType !== 'large_counter') {
        return;
    }

    let newOrientation = b.orientation === 'horizontal' ? 'vertical' : 'horizontal';
    
    currentGameScene.clearBuildingZones(b);
    
    let canRotate = currentGameScene.canPlaceTwoTileObject(b.gridX, b.gridY, newOrientation);
    
    if (canRotate) {
        b.orientation = newOrientation;
        
        if (b.bType === 'register') {
            if (typeof GameGraphics !== 'undefined') GameGraphics.drawRegister(b, 1, b.orientation);
        } else if (b.bType === 'large_counter') {
            b.slots[1].dx = (b.orientation === 'horizontal') ? 1 : 0;
            b.slots[1].dy = (b.orientation === 'horizontal') ? 0 : 1;
            currentGameScene.updateBuildingColor(b);
        }
        
        const isoX1 = currentGameScene.startX + (b.gridX - b.gridY) * (currentGameScene.tileWidth / 2);
        const isoY1 = currentGameScene.startY + (b.gridX + b.gridY) * (currentGameScene.tileHeight / 2);
        let isoX2, isoY2;
        if (b.orientation === 'horizontal') {
            isoX2 = currentGameScene.startX + ((b.gridX + 1) - b.gridY) * (currentGameScene.tileWidth / 2);
            isoY2 = currentGameScene.startY + ((b.gridX + 1) + b.gridY) * (currentGameScene.tileHeight / 2);
        } else {
            isoX2 = currentGameScene.startX + (b.gridX - (b.gridY + 1)) * (currentGameScene.tileWidth / 2);
            isoY2 = currentGameScene.startY + (b.gridX + (b.gridY + 1)) * (currentGameScene.tileHeight / 2);
        }
        b.setPosition((isoX1 + isoX2) / 2, (isoY1 + isoY2) / 2);
        
        currentGameScene.cityMap[b.gridY][b.gridX] = b;
        if (b.orientation === 'horizontal') {
            currentGameScene.cityMap[b.gridY][b.gridX + 1] = b;
            if (b.bType === 'register') {
                currentGameScene.cityMap[b.gridY + 1][b.gridX] = { isEmployeeZone: true, parent: b }; 
                currentGameScene.cityMap[b.gridY + 1][b.gridX + 1] = { isEmployeeZone: true, parent: b };
            }
        } else {
            currentGameScene.cityMap[b.gridY + 1][b.gridX] = b;
            if (b.bType === 'register') {
                currentGameScene.cityMap[b.gridY][b.gridX + 1] = { isEmployeeZone: true, parent: b }; 
                currentGameScene.cityMap[b.gridY + 1][b.gridX + 1] = { isEmployeeZone: true, parent: b };
            }
        }
        
        if (b.bType === 'register' && b.employee) {
            let eX = b.orientation === 'horizontal' ? b.gridX : b.gridX + 1;
            let eY = b.orientation === 'horizontal' ? b.gridY + 1 : b.gridY;
            const eIso1X = currentGameScene.startX + (eX - eY) * (currentGameScene.tileWidth / 2); 
            const eIso1Y = currentGameScene.startY + (eX + eY) * (currentGameScene.tileHeight / 2);
            const eIso2X = currentGameScene.startX + ((eX + (b.orientation === 'horizontal' ? 1 : 0)) - (eY + (b.orientation === 'horizontal' ? 0 : 1))) * (currentGameScene.tileWidth / 2);
            const eIso2Y = currentGameScene.startY + ((eX + (b.orientation === 'horizontal' ? 1 : 0)) + (eY + (b.orientation === 'horizontal' ? 0 : 1))) * (currentGameScene.tileHeight / 2);
            
            currentGameScene.tweens.killTweensOf(b.employee);
            b.employee.setPosition((eIso1X + eIso2X) / 2, (eIso1Y + eIso2Y) / 2 - 8);
            b.employee.gridX = eX; b.employee.gridY = eY; b.employee.setDepth(15 + eX + eY);
            b.employee.state = 'idle';
        }

        if (b.slots) {
            b.slots.forEach(slot => {
                const sX = b.gridX + slot.dx;
                const sY = b.gridY + slot.dy;
                const sIsoX = currentGameScene.startX + (sX - sY) * (currentGameScene.tileWidth / 2);
                const sIsoY = currentGameScene.startY + (sX + sY) * (currentGameScene.tileHeight / 2);
                if (slot.itemIconObj) slot.itemIconObj.setPosition(sIsoX, sIsoY - 45); 
                if (slot.broomIconObj) slot.broomIconObj.setPosition(sIsoX, sIsoY - 45); 
            });
        }
        
        currentGameScene.showFloatingText(b.x, b.y, "Повёрнуто!", '#00ff00');
    } else {
        currentGameScene.cityMap[b.gridY][b.gridX] = b;
        if (b.orientation === 'horizontal') {
            currentGameScene.cityMap[b.gridY][b.gridX + 1] = b;
            if (b.bType === 'register') {
                currentGameScene.cityMap[b.gridY + 1][b.gridX] = { isEmployeeZone: true, parent: b }; 
                currentGameScene.cityMap[b.gridY + 1][b.gridX + 1] = { isEmployeeZone: true, parent: b };
            }
        } else {
            currentGameScene.cityMap[b.gridY + 1][b.gridX] = b;
            if (b.bType === 'register') {
                currentGameScene.cityMap[b.gridY][b.gridX + 1] = { isEmployeeZone: true, parent: b }; 
                currentGameScene.cityMap[b.gridY + 1][b.gridX + 1] = { isEmployeeZone: true, parent: b };
            }
        }
        currentGameScene.showFloatingText(b.x, b.y, "Нет места для поворота!", '#ff0000');
    }

    closeObjectMenu();
}

function rotateCurrentAction() {
    if (!currentGameScene) return;
    
    let pManager = currentGameScene.placementManager;
    let pType = pManager?.placingType;
    let bType = pType || (typeof movingBuilding !== 'undefined' && movingBuilding ? movingBuilding.bType : null);
    
    if (bType === 'register' || bType === 'large_counter') {
        pManager.currentOrientation = pManager.currentOrientation === 'horizontal' ? 'vertical' : 'horizontal';
        
        if (typeof movingBuilding !== 'undefined' && movingBuilding) {
            movingBuilding.orientation = pManager.currentOrientation;
            if (movingBuilding.bType === 'register') {
                if (typeof GameGraphics !== 'undefined') GameGraphics.drawRegister(movingBuilding, 1, movingBuilding.orientation);
            }
            if (movingBuilding.bType === 'large_counter') {
                movingBuilding.slots[1].dx = (movingBuilding.orientation === 'horizontal') ? 1 : 0;
                movingBuilding.slots[1].dy = (movingBuilding.orientation === 'horizontal') ? 0 : 1;
                currentGameScene.updateBuildingColor(movingBuilding);
            }
        }
        
        let orientText = pManager.currentOrientation === 'horizontal' ? 'Горизонтально' : 'Вертикально';
        currentGameScene.showFloatingText(currentGameScene.startX, currentGameScene.startY, `Поворот: ${orientText}`, '#ffff00');
    }
}

function cancelCurrentAction() {
    if (!currentGameScene) return;
    
    if (currentGameScene.placementManager?.placingType !== null) {
        currentGameScene.placementManager.cancelPlacement();
        if (currentGameScene.highlightCursor) currentGameScene.highlightCursor.setVisible(false);
        currentGameScene.showFloatingText(currentGameScene.startX, currentGameScene.startY, "Строительство отменено", '#ffffff');
    }
    if (currentGameScene.placementManager?.holdingItemData !== null) {
        currentGameScene.placementManager.cancelHoldingItem(currentGameScene.cursorItemIcon);
        currentGameScene.showFloatingText(currentGameScene.startX, currentGameScene.startY, "Выкладка завершена", '#ffffff');
    }
    if (typeof isMovingDoor !== 'undefined' && isMovingDoor) {
        isMovingDoor = false;
        currentGameScene.showFloatingText(currentGameScene.startX, currentGameScene.startY, "Перемещение двери отменено", '#ffffff');
    }
    if (typeof movingBuilding !== 'undefined' && movingBuilding !== null) {
        movingBuilding = null;
        currentGameScene.showFloatingText(currentGameScene.startX, currentGameScene.startY, "Перемещение отменено", '#ffffff');
    }
    hideActionPanel();
}

function showActionPanel(showRotate) {
    const panel = document.getElementById('action-panel');
    if (panel) {
        panel.style.display = 'flex';
        const rotateBtn = document.getElementById('btn-action-rotate');
        if (rotateBtn) {
            rotateBtn.style.display = showRotate ? 'block' : 'none';
        }
    }
}

function hideActionPanel() {
    const panel = document.getElementById('action-panel');
    if (panel) panel.style.display = 'none';
}