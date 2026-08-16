class CameraManager {
    constructor(scene) {
        this.scene = scene;
        this.cam = scene.cameras.main;
        
        this.dragging = false;
        this.lastPointerX = 0;
        this.lastPointerY = 0;

        this.init();
    }

    init() {
        // Устанавливаем границы перемещения камеры
        this.cam.setBounds(-1000, -1000, 3000, 3000);

        // Обработка зума колесиком мыши
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            let currentZoom = this.cam.zoom;
            if (deltaY > 0) {
                currentZoom -= 0.1;
            } else {
                currentZoom += 0.1;
            }
            // Ограничиваем зум, чтобы игрок не улетел в космос
            currentZoom = Phaser.Math.Clamp(currentZoom, 0.5, 2.0);
            this.cam.setZoom(currentZoom);
        });
    }

    // Вызывается при нажатии кнопки мыши/тапе
    startDrag(pointer) {
        this.dragging = true;
        this.lastPointerX = pointer.x;
        this.lastPointerY = pointer.y;
    }

    // Вызывается при движении мыши
    doDrag(pointer) {
        if (this.dragging) {
            this.cam.scrollX += (this.lastPointerX - pointer.x);
            this.cam.scrollY += (this.lastPointerY - pointer.y);
            this.lastPointerX = pointer.x;
            this.lastPointerY = pointer.y;
            return true; // Возвращаем true, если камера сейчас двигается
        }
        return false;
    }

    // Вызывается при отпускании кнопки
    stopDrag() {
        this.dragging = false;
    }
}