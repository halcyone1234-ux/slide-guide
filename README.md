# 讓人想看下去的簡報

像素風的捲動式教學網站：先看三好三壞，再學好簡報要照顧的五件事，最後自己做出一份讓人想看下去的報告簡報。上課可以用鍵盤或簡報筆一頁一頁翻，課後也可以用手機或電腦自學。

網站：https://halcyone1234-ux.github.io/slide-guide/

## 怎麼用

- 直接用瀏覽器開 `index.html` 就能用，不需要伺服器。
- 翻頁：空白鍵、方向鍵右、PageDown 是下一頁；方向鍵左、PageUp 是上一頁。簡報筆送出的就是這些鍵。
- `P` 切換投影模式（字放大、藏起補充小字），`M` 藏起右下角的觀眾魟魚。
- 網址參數可以換報告長度和課程名稱，例如 `?min=15&pages=15&course=課程名稱`。

## 內容

照課程講義的順序，五關加一個最後任務，每一頁都有可以動手的互動：選錯會閃紅框，答對馬鈴薯會放煙火。

| 關卡 | 內容 |
|---|---|
| 開場 | 兩份簡報選一份、今天的路線 |
| 第 1 關　看 | 三好三壞：找截止日、三秒鐘選方案、點出最重要的線，再看改過之後 |
| 第 2 關　修 | 五件事：排版、配色、資訊密度、文字大小、Salience，各一個現場測試加一步改法 |
| 第 3 關　學 | 學術報告：文獻回顧、研究方法、統計表、結論 |
| 第 4 關　想 | 報告內容：七個區塊、一句話結論、鉤子、故事線、時間、20 頁分鏡、出處 |
| 第 5 關　生 | 工具：分三種、給 AI 六件事、兩次下指令、修改指令、AI 初稿的通病 |
| 最後任務 | 交件前檢查表（可以印成一張 A4）、出處 |

示範例子是虛構的小農市集集點卡研究，數字都是編的，內容見 `demo-case.md`。工具的資料取自各家官方頁面並標了日期，用之前請再看一次。

## 檔案

- `index.html`：所有場景。
- `assets/css/`：`base`、`pixel`（像素介面）、`scenes`（場景版面）、`slide`、`examples`（示範投影片）、`lessons`（互動元件）、`transition`、`print`。
- `assets/js/`：`site-config`（報告長度與七個區塊）、`main`（翻頁）、`journey`、`transition`（轉場）、`mascots`、`feedback`（紅框與煙火）、`widgets`（第 0、4 關的互動）、`lessons`（其他各關的互動）。原生 HTML、CSS、JavaScript，沒有框架，也不需要打包。
- `assets/img/mascots/`：吉祥物像素圖。
- `assets/fonts/`：Cubic 11 像素字型。

勾選、評分和寫下的句子只記在這台電腦的瀏覽器裡，不會傳到任何地方。

## 授權與來源

- 像素字型 Cubic 11（俐方體11號）以 SIL Open Font License 1.1 授權，全文見 `assets/fonts/Cubic_11-OFL.txt`。
- 吉祥物圖片的著作權屬原作者，未經同意請勿另作他用。
- 內文字型 Noto Sans TC 由 Google Fonts 載入。
- 投影片設計的規則引用 Naegle KM (2021), *Ten simple rules for effective presentation slides*, PLOS Comput Biol（CC BY 4.0）；對比門檻引用 W3C WCAG 2.1。
