// --- ВСЕ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ИГРЫ ---

var playerMoney = 1000;
var playerCash = 0;
var playerRating = 100;
var playerLevel = 1;     
var playerXP = 0;
var xpToNextLevel = 250;
var isStoreOpen = false;

var DEFAULT_COUNTER_COLOR = 0x93c5fd; 

// --- НОВАЯ СИСТЕМА СКЛАДА ---
var warehouseCapacity = 5; // Начальная вместимость (в штуках)
var nextSlotPrice = 250;   // Цена следующего расширения
var warehouseItems = [];   // Массив для хранения ВСЕХ текущих товаров

var holdingItemData = null; 

var selectedBuildingData = null;
var movingBuilding = null;
var currentGameScene = null;

// --- СОСТОЯНИЕ ДВЕРИ ---
var doorPosition = 4; // Начальная позиция по оси X (на верхней стене Y = 0)
var isMovingDoor = false;

// --- СОСТОЯНИЕ ДВЕРИ ---
var hasDoor = false;     // Изначально двери нет
var doorPosition = null; // Позиция не задана
var isMovingDoor = false;