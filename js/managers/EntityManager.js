class EntityManager {
    constructor(scene) {
        this.scene = scene;
        this.scene.employees = [];
        this.scene.customers = [];

        // БАГФИКС: Слушаем событие удаления здания из ui.js
        if (this.scene.events) {
            this.scene.events.on('building-destroyed', this.handleBuildingDestroyed, this);
        }
    }

    // БАГФИКС: Метод, который спасает игру от вылета при удалении здания
    handleBuildingDestroyed(building) {
        // 1. Отправляем разочарованных покупателей домой
        this.scene.customers.forEach(cust => {
            if (cust.targetBuilding === building) {
                cust.targetBuilding = null;
                cust.targetSlot = null;
                this.scene.tweens.killTweensOf(cust);
                cust.state = 'seeking'; // Заставляем искать другой товар
                this.moveCustomer(cust);
            }
            if (cust.targetRegister === building) {
                cust.targetRegister = null;
                this.scene.tweens.killTweensOf(cust);
                cust.state = 'leaving'; // Касса пропала - уходим в гневе
                this.moveCustomer(cust);
            }
        });

        // 2. Возвращаем работников в режим ожидания
        this.scene.employees.forEach(emp => {
            if (emp.targetBuilding === building) {
                emp.targetBuilding = null;
                this.scene.tweens.killTweensOf(emp);
                emp.state = 'idle'; // Работник поймет, что идти некуда, и выберет новую цель
            }
        });
    }

    walkTo(entity, tX, tY, onComplete) {
        const path = this.scene.findPath(entity.gridX, entity.gridY, tX, tY);
        if (!path) { if (onComplete) onComplete(false); return; }
        if (path.length === 0) { if (onComplete) onComplete(true); return; }

        let step = 0;
        const nextStep = () => {
            if (step >= path.length) { if (onComplete) onComplete(true); return; }
            let p = path[step];
            let pxIso = this.scene.startX + (p.x - p.y) * (this.scene.tileWidth / 2);
            let pyIso = this.scene.startY + (p.x + p.y) * (this.scene.tileHeight / 2);

            this.scene.tweens.add({
                targets: entity, x: pxIso, y: pyIso, duration: 350, ease: 'Linear',
                onComplete: () => {
                    entity.gridX = p.x; entity.gridY = p.y;
                    entity.setDepth(15 + p.x + p.y);
                    step++; nextStep();
                }
            });
        };
        this.scene.tweens.killTweensOf(entity);
        nextStep();
    }

    spawnEmployee(register) {
        let empX, empY, eX, eY;
        if (register.orientation === 'horizontal') {
            eX = register.gridX; eY = register.gridY + 1;
            const isoX1 = this.scene.startX + (register.gridX - (register.gridY + 1)) * (this.scene.tileWidth / 2);
            const isoY1 = this.scene.startY + (register.gridX + (register.gridY + 1)) * (this.scene.tileHeight / 2);
            const isoX2 = this.scene.startX + ((register.gridX + 1) - (register.gridY + 1)) * (this.scene.tileWidth / 2);
            const isoY2 = this.scene.startY + ((register.gridX + 1) + (register.gridY + 1)) * (this.scene.tileHeight / 2);
            empX = (isoX1 + isoX2) / 2; empY = (isoY1 + isoY2) / 2 - 8;
        } else {
            eX = register.gridX + 1; eY = register.gridY;
            const isoX1 = this.scene.startX + ((register.gridX + 1) - register.gridY) * (this.scene.tileWidth / 2);
            const isoY1 = this.scene.startY + ((register.gridX + 1) + register.gridY) * (this.scene.tileHeight / 2);
            const isoX2 = this.scene.startX + ((register.gridX + 1) - (register.gridY + 1)) * (this.scene.tileWidth / 2);
            const isoY2 = this.scene.startY + ((register.gridX + 1) + (register.gridY + 1)) * (this.scene.tileHeight / 2);
            empX = (isoX1 + isoX2) / 2; empY = (isoY1 + isoY2) / 2 - 8;
        }

        const emp = this.scene.add.graphics({ x: empX, y: empY });
        emp.fillStyle(0x1a1a1a, 1).fillEllipse(-4, -3, 8, 5).fillEllipse(4, -1, 8, 5);
        emp.fillStyle(0x111111, 1).fillRect(-6, -22, 5, 20).fillRect(1, -20, 5, 20);
        emp.fillStyle(0x222222, 1).fillRoundedRect(-8, -36, 16, 16, 4);
        emp.lineStyle(3, 0xffccaa, 1).beginPath().moveTo(-7, -32).lineTo(-10, -18).strokePath().beginPath().moveTo(7, -32).lineTo(10, -18).strokePath();
        emp.fillStyle(0xffccaa, 1).fillCircle(0, -42, 7); 
        emp.fillStyle(0x0a0a0a, 1).beginPath().arc(0, -43, 7.5, Math.PI, 0, false).closePath().fillPath().fillRect(-7.5, -43, 15, 3); 
        
        emp.gridX = eX; emp.gridY = eY; emp.setDepth(15 + eX + eY);
        emp.state = 'idle'; emp.homeReg = register; register.employee = emp;
        this.scene.employees.push(emp);
    }

    employeeAI() {
        this.scene.employees.forEach(emp => {
            if (emp.state === 'idle') {
                let targetFound = false;
                for (let b of this.scene.buildingsGroup.getChildren()) {
                    if (b.bType && b.bType.includes('counter') && b.slots) {
                        if (b.slots.some(s => s.status === 'delivered')) {
                            targetFound = true; break;
                        }
                    }
                }
                
                if (targetFound) {
                    emp.state = 'working';
                    this.stockNextCounter(emp, new Set());
                }
            }
        });
    }

    stockNextCounter(emp, skipped) {
        let targetBuilding = null;
        for (let b of this.scene.buildingsGroup.getChildren()) {
            if (b.bType && b.bType.includes('counter') && !skipped.has(b)) {
                if (b.slots && b.slots.some(s => s.status === 'delivered')) {
                    targetBuilding = b;
                    break;
                }
            }
        }

        if (!targetBuilding) {
            let reg = emp.homeReg;
            let regX = reg.orientation === 'horizontal' ? reg.gridX : reg.gridX + 1;
            let regY = reg.orientation === 'horizontal' ? reg.gridY + 1 : reg.gridY;
            this.walkTo(emp, regX, regY, (success) => {
                let x1 = regX, y1 = regY;
                let x2 = reg.orientation === 'horizontal' ? regX + 1 : regX;
                let y2 = reg.orientation === 'horizontal' ? regY : regY + 1;
                const isoX1 = this.scene.startX + (x1 - y1) * (this.scene.tileWidth / 2);
                const isoY1 = this.scene.startY + (x1 + y1) * (this.scene.tileHeight / 2);
                const isoX2 = this.scene.startX + (x2 - y2) * (this.scene.tileWidth / 2);
                const isoY2 = this.scene.startY + (x2 + y2) * (this.scene.tileHeight / 2);
                emp.setPosition((isoX1 + isoX2) / 2, (isoY1 + isoY2) / 2 - 8);
                emp.state = 'idle';
            });
            return;
        }

        // БАГФИКС: Запоминаем, куда идет работник
        emp.targetBuilding = targetBuilding;

        const adj = this.scene.getBuildingAdjacentTile(targetBuilding);
        if (!adj) { skipped.add(targetBuilding); this.stockNextCounter(emp, skipped); return; }

        this.walkTo(emp, adj.x, adj.y, (success) => {
            if (!success) { skipped.add(targetBuilding); this.stockNextCounter(emp, skipped); return; }
            this.scene.time.delayedCall(1500, () => { 
                // БАГФИКС: Проверяем, существует ли еще здание после задержки!
                if (!targetBuilding.active) {
                    emp.state = 'idle';
                    return;
                }

                targetBuilding.slots.forEach(s => {
                    if (s.status === 'delivered') {
                        s.status = 'ready';
                        if(s.itemIconObj) s.itemIconObj.setText(s.iconString);
                    }
                });
                this.scene.updateBuildingColor(targetBuilding);
                this.scene.showFloatingText(targetBuilding.x, targetBuilding.y, "Выложено!", '#ffff00');
                
                this.stockNextCounter(emp, skipped);
            });
        });
    }

    spawnCustomer() {
        if (typeof hasDoor !== 'undefined' && !hasDoor) return; 
        if (typeof isStoreOpen !== 'undefined' && !isStoreOpen) return;
        if (this.scene.customers && this.scene.customers.length >= 6) return; 
        if (!this.scene.buildingsGroup.getChildren().some(b => b.bType && b.bType.includes('register'))) return;
        
        const spawnDoorX = typeof doorPosition !== 'undefined' ? doorPosition : 5; 
        const spawnDoorY = 0; 
        const isoX = this.scene.startX + (spawnDoorX - spawnDoorY) * (this.scene.tileWidth / 2);
        const isoY = this.scene.startY + (spawnDoorX + spawnDoorY) * (this.scene.tileHeight / 2);

        const customerColors = [0x2563eb, 0xdc2626, 0x16a34a];
        const chosenColor = Phaser.Utils.Array.GetRandom(customerColors);

        const customer = this.scene.add.graphics({ x: isoX, y: isoY });
        customer.fillStyle(0x888888, 1).fillEllipse(-4, -3, 8, 5).fillEllipse(4, -1, 8, 5);
        customer.fillStyle(0x1a1a1a, 1).fillRect(-6, -22, 5, 20).fillRect(1, -20, 5, 20);
        customer.fillStyle(chosenColor, 1).fillRoundedRect(-8, -36, 16, 16, 4);
        customer.lineStyle(3, 0xffccaa, 1).beginPath().moveTo(-7, -32).lineTo(-10, -18).strokePath().beginPath().moveTo(7, -32).lineTo(10, -18).strokePath();
        customer.fillStyle(0xffccaa, 1).fillCircle(0, -42, 7); 
        customer.fillStyle(0x0f0f0f, 1).beginPath().arc(0, -43, 7.5, Math.PI, 0, false).closePath().fillPath().fillRect(-7.5, -43, 15, 3); 
        
        customer.gridX = spawnDoorX; customer.gridY = spawnDoorY; customer.setDepth(15 + spawnDoorX + spawnDoorY); 
        customer.state = 'seeking';
        if (!this.scene.customers) this.scene.customers = [];
        this.scene.customers.push(customer); 
        this.moveCustomer(customer);
    }

    updateRegisterQueue(target) {
        if (!target.customerQueue) return;
        for (let y = 0; y < this.scene.mapSize; y++) {
            for (let x = 0; x < this.scene.mapSize; x++) {
                if (this.scene.cityMap[y][x] && this.scene.cityMap[y][x].isQueueZone && this.scene.cityMap[y][x].parent === target) this.scene.cityMap[y][x] = null;
            }
        }
        target.customerQueue.forEach((cust, index) => {
            if (cust.state === 'paying' || cust.state === 'leaving') return;
            let qX, qY;
            if (target.orientation === 'horizontal') { qX = target.gridX; qY = Math.max(0, target.gridY - 1 - index); } 
            else { qX = Math.max(0, target.gridX - 1 - index); qY = target.gridY; }

            if (this.scene.cityMap[qY][qX] === null) this.scene.cityMap[qY][qX] = { isQueueZone: true, parent: target };

            cust.state = 'queuing';
            this.walkTo(cust, qX, qY, (success) => {
                if (index === 0 && cust.state === 'queuing') {
                    cust.state = 'paying';
                    let checkPay = this.scene.time.addEvent({
                        delay: 500, loop: true,
                        callback: () => {
                            // БАГФИКС: Если кассу удалили, распускаем очередь
                            if (!target.active || !target.scene) { 
                                checkPay.remove(); 
                                if (cust.state !== 'leaving') {
                                    cust.state = 'leaving';
                                    this.moveCustomer(cust);
                                }
                                return; 
                            }
                            if (target.employee && target.employee.state === 'idle') {
                                checkPay.remove();
                                this.scene.time.delayedCall(1000, () => {
                                    if(typeof playerMoney !== 'undefined') playerMoney += cust.itemCost; 
                                    if(typeof addXP !== 'undefined') addXP(cust.itemXP); 
                                    if(typeof updateUI === 'function') updateUI();
                                    this.scene.showFloatingText(target.x, target.y - 20, `+${cust.itemCost}🪙 +${cust.itemXP}⭐`, '#00ff00');
                                    target.customerQueue = target.customerQueue.filter(c => c !== cust);
                                    this.updateRegisterQueue(target);
                                    cust.state = 'leaving'; this.moveCustomer(cust);
                                });
                            }
                        }
                    });
                }
            });
        });
    }

    moveCustomer(customer) {
        if (typeof isStoreOpen !== 'undefined' && !isStoreOpen && customer.state !== 'paying') { 
            customer.leaving = true; customer.state = 'leaving'; 
        }

        if (customer.state === 'seeking') {
            let readyBuildings = [];
            for (let b of this.scene.buildingsGroup.getChildren()) {
                if (b.bType && b.bType.includes('counter') && b.slots) {
                    if (b.slots.some(s => s.status === 'ready' && !s.targetedByCust)) {
                        readyBuildings.push(b);
                    }
                }
            }

            if (readyBuildings.length > 0 && Math.random() > 0.1) {
                let targetB = Phaser.Utils.Array.GetRandom(readyBuildings);
                let targetSlot = targetB.slots.find(s => s.status === 'ready' && !s.targetedByCust);
                
                targetSlot.targetedByCust = true; 
                customer.state = 'taking';
                
                // БАГФИКС: Запоминаем цель
                customer.targetBuilding = targetB;
                customer.targetSlot = targetSlot;

                const adj = this.scene.getBuildingAdjacentTile(targetB);
                
                if (!adj) { targetSlot.targetedByCust = false; this.scene.time.delayedCall(1000, () => this.moveCustomer(customer)); return; }
                
                this.walkTo(customer, adj.x, adj.y, (success) => {
                    if (!success) { targetSlot.targetedByCust = false; customer.state = 'seeking'; this.scene.time.delayedCall(500, () => this.moveCustomer(customer)); return; }
                    this.scene.time.delayedCall(1000, () => { 
                        // БАГФИКС: Проверяем существует ли еще прилавок!
                        if (!targetB.active) {
                            customer.state = 'seeking'; 
                            this.moveCustomer(customer); 
                            return; 
                        }

                        targetSlot.status = 'dirty'; targetSlot.targetedByCust = false;
                        if (targetSlot.itemIconObj) { targetSlot.itemIconObj.destroy(); targetSlot.itemIconObj = null; }
                        
                        this.scene.updateBuildingColor(targetB);
                        
                        const sX = targetB.gridX + targetSlot.dx;
                        const sY = targetB.gridY + targetSlot.dy;
                        const isoX = this.scene.startX + (sX - sY) * (this.scene.tileWidth / 2);
                        const isoY = this.scene.startY + (sX + sY) * (this.scene.tileHeight / 2);
                        targetSlot.broomIconObj = this.scene.add.text(isoX, isoY - 45, '🧹', {fontSize: '24px'}).setOrigin(0.5).setDepth(160);

                        customer.itemCost = targetSlot.rewardCoins; customer.itemXP = targetSlot.rewardXP;
                        targetSlot.rewardCoins = 0; targetSlot.rewardXP = 0;
                        customer.state = 'going_to_pay'; this.moveCustomer(customer);
                    });
                });
            } else {
                let tX = Phaser.Math.Between(1, 9), tY = Phaser.Math.Between(1, 9);
                const adj = this.scene.getFreeAdjacentTile(tX, tY); 
                if (!adj) { this.scene.time.delayedCall(1000, () => this.moveCustomer(customer)); return; }
                this.walkTo(customer, adj.x, adj.y, (success) => {
                    if (Math.random() > 0.8) customer.state = 'leaving'; 
                    this.scene.time.delayedCall(1000, () => this.moveCustomer(customer));
                });
            }
        } else if (customer.state === 'going_to_pay') {
            let registers = this.scene.buildingsGroup.getChildren().filter(b => b.bType && b.bType.includes('register'));
            if (registers.length === 0) { customer.state = 'leaving'; this.moveCustomer(customer); return; }
            let target = registers[0]; 
            if (!target.customerQueue) target.customerQueue = [];
            target.customerQueue.push(customer);
            
            // БАГФИКС: Запоминаем кассу
            customer.targetRegister = target;
            
            this.updateRegisterQueue(target);
        } else if (customer.state === 'leaving') {
            const leaveDoorX = typeof doorPosition !== 'undefined' ? doorPosition : 5;
            this.walkTo(customer, leaveDoorX, 0, (success) => {
                customer.destroy(); this.scene.customers = this.scene.customers.filter(c => c !== customer);
            });
        }
    }
}