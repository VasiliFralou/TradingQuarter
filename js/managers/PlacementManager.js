class PlacementManager {
    constructor(scene) {
        this.scene = scene;
        this.placingType = null;
        this.previewBuilding = null;
        this.currentOrientation = 'horizontal';

        this.holdingItemData = null;
        this.holdingItemName = null;
    }

    startPlacement(type) {
        this.placingType = type;
        this.currentOrientation = 'horizontal';
        if (this.previewBuilding) {
            this.previewBuilding.destroy();
            this.previewBuilding = null;
        }
        this.previewBuilding = this.scene.add.graphics();
        this.previewBuilding.setDepth(160);
        
        if (typeof togglePlacementControls === 'function') togglePlacementControls(true);
    }

    cancelPlacement() {
        this.placingType = null;
        if (this.previewBuilding) {
            this.previewBuilding.destroy();
            this.previewBuilding = null;
        }
        if (typeof togglePlacementControls === 'function') togglePlacementControls(false);
    }

    startHoldingItem(itemData, cursorItemIcon) {
        this.holdingItemData = itemData;
        this.holdingItemName = itemData.name;
        if (cursorItemIcon) {
            cursorItemIcon.setText(itemData.icon);
            cursorItemIcon.setVisible(true);
        }
    }

    cancelHoldingItem(cursorItemIcon) {
        this.holdingItemData = null;
        this.holdingItemName = null;
        if (cursorItemIcon) {
            cursorItemIcon.setVisible(false);
        }
    }

    placeBuilding(gridX, gridY, type) {
        const isoX1 = this.scene.startX + (gridX - gridY) * (this.scene.tileWidth / 2);
        const isoY1 = this.scene.startY + (gridX + gridY) * (this.scene.tileHeight / 2);

        const building = this.scene.add.graphics();
        building.gridX = gridX; 
        building.gridY = gridY;
        building.bType = type;
        building.orientation = this.currentOrientation;
        building.setDepth(10 + gridX + gridY);

        if (type === 'counter') {
            building.setPosition(isoX1, isoY1);
            building.slots = [{ dx: 0, dy: 0, status: 'empty', itemIconObj: null, broomIconObj: null }];
            GameGraphics.drawCounter(building, DEFAULT_COUNTER_COLOR, 1);
            this.scene.buildingsGroup.add(building);
            this.scene.cityMap[gridY][gridX] = building;
        } else if (type === 'large_counter') {
            let dx2 = (building.orientation === 'horizontal') ? 1 : 0;
            let dy2 = (building.orientation === 'horizontal') ? 0 : 1;
            building.slots = [
                { dx: 0, dy: 0, status: 'empty', itemIconObj: null, broomIconObj: null },
                { dx: dx2, dy: dy2, status: 'empty', itemIconObj: null, broomIconObj: null }
            ];

            if (building.orientation === 'horizontal') {
                const isoX2 = this.scene.startX + ((gridX + 1) - gridY) * (this.scene.tileWidth / 2);
                const isoY2 = this.scene.startY + ((gridX + 1) + gridY) * (this.scene.tileHeight / 2);
                building.setPosition((isoX1 + isoX2) / 2, (isoY1 + isoY2) / 2);
                GameGraphics.drawLargeCounter(building, DEFAULT_COUNTER_COLOR, 1, 'horizontal');
                this.scene.cityMap[gridY][gridX] = building;
                this.scene.cityMap[gridY][gridX + 1] = building;
            } else {
                const isoX2 = this.scene.startX + (gridX - (gridY + 1)) * (this.scene.tileWidth / 2);
                const isoY2 = this.scene.startY + (gridX + (gridY + 1)) * (this.scene.tileHeight / 2);
                building.setPosition((isoX1 + isoX2) / 2, (isoY1 + isoY2) / 2);
                GameGraphics.drawLargeCounter(building, DEFAULT_COUNTER_COLOR, 1, 'vertical');
                this.scene.cityMap[gridY][gridX] = building;
                this.scene.cityMap[gridY + 1][gridX] = building;
            }
            this.scene.buildingsGroup.add(building);
        } else if (type === 'register') {
            building.customerQueue = [];
            if (building.orientation === 'horizontal') {
                const isoX2 = this.scene.startX + ((gridX + 1) - gridY) * (this.scene.tileWidth / 2);
                const isoY2 = this.scene.startY + ((gridX + 1) + gridY) * (this.scene.tileHeight / 2);
                building.setPosition((isoX1 + isoX2) / 2, (isoY1 + isoY2) / 2);
                GameGraphics.drawRegister(building, 1, 'horizontal');
                this.scene.cityMap[gridY][gridX] = building;
                this.scene.cityMap[gridY][gridX + 1] = building;
                this.scene.cityMap[gridY + 1][gridX] = { isEmployeeZone: true, parent: building };
                this.scene.cityMap[gridY + 1][gridX + 1] = { isEmployeeZone: true, parent: building };
            } else {
                const isoX2 = this.scene.startX + (gridX - (gridY + 1)) * (this.scene.tileWidth / 2);
                const isoY2 = this.scene.startY + (gridX + (gridY + 1)) * (this.scene.tileHeight / 2);
                building.setPosition((isoX1 + isoX2) / 2, (isoY1 + isoY2) / 2);
                GameGraphics.drawRegister(building, 1, 'vertical');
                this.scene.cityMap[gridY][gridX] = building;
                this.scene.cityMap[gridY + 1][gridX] = building;
                this.scene.cityMap[gridY][gridX + 1] = { isEmployeeZone: true, parent: building };
                this.scene.cityMap[gridY + 1][gridX + 1] = { isEmployeeZone: true, parent: building };
            }
            building.status = 'active';
            this.scene.spawnEmployee(building);
            this.scene.buildingsGroup.add(building);
        }
    }
}