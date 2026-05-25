let rainData;
let lastUpdate = "";
let mappa;
let myMap;
let canvas;

const targetUrl = 'https://wic.gov.taipei/OpenData/API/Rain/Get?stationNo=&loginId=open_rain&dataKey=85452C1D';
// 改用 AllOrigins 代理，並使用 raw 模式確保取得原始 JSON 
const apiUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl);

// 地圖設定：中心點在台北 (25.04, 121.54)，縮放層級 12
const options = {
  lat: 25.04,
  lng: 121.54,
  zoom: 12,
  style: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
};

function preload() {
  // 載入即時雨量資料
  // 在 preload 中直接賦值，p5 會等待資料下載完成才進入 setup
  rainData = loadJSON(apiUrl, 
    (data) => console.log("資料載入成功"),
    (err) => {
      console.error("API 載入失敗，可能是 CORS 代理問題或網路連線問題:", err);
      alert("API 載入失敗，請檢查主控台訊息。");
  });
}

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  
  // 初始化 Mappa 並將其疊加在畫布上
  mappa = new Mappa('Leaflet');
  myMap = mappa.tileMap(options);
  myMap.overlay(canvas);

  lastUpdate = new Date().toLocaleTimeString();

  // 每 10 分鐘自動抓取一次新資料
  setInterval(() => {
    loadJSON(apiUrl, (data) => {
      console.log("定時更新資料成功");
      rainData = data;
      lastUpdate = new Date().toLocaleTimeString();
    }, (err) => {
      console.error("定時更新失敗:", err);
    });
  }, 600000);
}

function draw() {
  // 清除 p5 畫布（保留透明度，地圖才能顯示）
  clear();
  
  // 繪製標題背景面板
  noStroke();
  fill(30, 40, 60, 220);
  rect(20, 20, 300, 70, 10);

  // 繪製文字標題
  fill(255);
  textSize(24);
  textAlign(LEFT, TOP);
  text("台北市即時雨量監測", 40, 30);
  
  textSize(14);
  fill(200);
  text(`最後更新時間: ${lastUpdate}`, 40, 60);
  
  // 資料結構檢查：確保取得陣列
  let actualList = Array.isArray(rainData) ? rainData : (rainData && rainData.data ? rainData.data : null);

  if (actualList && actualList.length > 0) {
    for (let i = 0; i < actualList.length; i++) {
      let item = actualList[i];
      
      // 確保經緯度存在
      let lat = Number(item.lat || item.Latitude);
      let lon = Number(item.lon || item.Longitude);
      let sName = item.stationName || item.StationName || "未知";
      let rainVal = parseFloat(item.rainFall1hr ?? item.Rainfall1hr ?? 0);
      
      if (!isNaN(lat) && !isNaN(lon)) {
        // 將經緯度轉換為螢幕上的像素點
        let pos = myMap.latLngToPixel(lat, lon);
        
        // 根據雨量決定圓圈半徑（直徑 circleSize）
        let circleSize = map(rainVal, 0, 50, 10, 60, true);
        
        // 有雨用亮藍色，無雨用灰色
        fill(rainVal > 0 ? color(0, 150, 255, 180) : color(150, 150, 150, 150));
        stroke(255);
        strokeWeight(1);
        ellipse(pos.x, pos.y, circleSize, circleSize);

        // 檢測滑鼠是否在圓點內 (Hover 邏輯)
        let d = dist(mouseX, mouseY, pos.x, pos.y);
        if (d < circleSize / 2) {
          // 繪製提示框背景
          noStroke();
          fill(0, 200);
          rect(pos.x + 15, pos.y - 15, textWidth(`${sName} (${rainVal}mm)`) + 10, 25, 5);
          // 顯示站名與雨量文字
          fill(255);
          textSize(14);
          textAlign(LEFT, CENTER);
          text(`${sName} (${rainVal}mm)`, pos.x + 20, pos.y);
          
          // 改變滑鼠游標圖案以提示可互動
          cursor(HAND);
        }
      }
    }
  } else if (frameCount < 100) { // 初始顯示載入中
    fill(0);
    text("正在分析 API 數據格式...", 40, 100);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
