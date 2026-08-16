# 獨立藥局 拜訪作戰台｜建置工具鏈

這個目錄是**每期重跑的唯一入口**。所有口徑規則以 `/獨立藥局_月度分析SOP` 為準，
本目錄的程式只是把 SOP 的規則實作出來——**兩者不一致時以 SOP 為準，並回頭修正程式**。

---

## 每期更新流程

```bash
# 0. 首次或換環境時
npm i --prefix . react@18.3.1 react-dom@18.3.1 jsdom@24

# 1. 把上期的指紋留作基準（很重要，用來抓靜默錯誤）
cp baseline.json baseline_prev.json

# 2. 一鍵建置：資料 → 指紋對帳 → 組版 → 測試
./build.sh /path/to/新的_Offtake.xlsx

# 3. 測試通過才部署
GH_TOKEN=github_pat_xxx python3 deploy.py "v1.16.0 說明文字"
GH_TOKEN=github_pat_xxx python3 deploy.py --file version.json "version bump"
```

`build.sh` 任何一步失敗都會中止，不會產出可部署的檔案。

---

## 檔案職責

| 檔案 | 做什麼 |
|---|---|
| `pipeline.py` | **口徑規則的唯一實作處**。xlsx → `data.json` ＋ `baseline.json`。品項合併、剔除、排除客戶、22 客戶群鎖定表、分層門檻全在檔頭常數區 |
| `verify_baseline.py` | 指紋對帳。**去年的數字不該變**，變了就中止 |
| `app_web.jsx` | App 原始碼。`__DATA__`／`__BUILD_AT__` 兩個佔位符由 build.sh 置換 |
| `shim-react.js` | 把 `import react` 導向瀏覽器全域 React UMD。**不可移除**——改用 esbuild `--external:react` 會產生瀏覽器沒有的 `require()`，整頁空白 |
| `mkhtml.py` | 內嵌 React UMD ＋ bundle ＋ iOS meta，組成單一 `IP_index.html` |
| `mkver.py` | 由 `app_web.jsx` 抽版號（不是從壓縮後的 HTML 抽，變數名會被改掉） |
| `test_ui.js` | 五分頁巡檢 ＋ 兩種客戶卡 ＋ 表單路徑。**失敗即 exit 1** |
| `deploy.py` | 用 GitHub Contents API 直接 commit |
| `baseline.json` | 本期指紋，下期用來對帳 |

---

## 踩過的坑（改動前務必看過）

1. **esbuild 不可用 `--external:react`** — IIFE 格式下會產生 `typeof require !== "undefined" ? require : 拋錯`，瀏覽器沒有 `require`，整頁空白。必須用 `--alias:react=./shim-react.js`。
2. **版號要從 `app_web.jsx` 抽**，不能從壓縮後的 HTML——minify 會把變數改名。
3. **jsdom 沒有 `fetch`** — App 的版本偵測必須做 `typeof fetch !== 'function'` 防護，否則測試環境整頁空白（實際瀏覽器不會，但測不出東西）。
4. **不要只測部分分頁** — 曾因只測三頁而漏掉複盤頁因欄位改名而空白。`test_ui.js` 必須巡檢全部。
5. **測試沒過不要部署** — 曾發生過一次，之後才補防護。
6. **`data.json` 只放數字，使用者資料在 localStorage** — 兩者永不混合，改資料不會動到使用者的拜訪紀錄與補登。

---

## 資料與程式的分界

- **程式碼／分析數字**：在這個 repo，每期重新產生
- **使用者資料**（拜訪紀錄、接單補登）：在使用者裝置的 `localStorage`，命名空間 `dsipharm:`
- 更新版本**不會**影響使用者資料。只有刪除桌面圖示才會，那種情況要先匯出 JSON

---

## 新增客戶或品項時

`pipeline.py` 遇到不在 `GROUP_MAP`／`ITEM_MAP` 的名稱會**直接中止並列出名稱**，不會自行歸群。
須先報 Kit 裁定、寫進 SOP 鎖定表，再同步更新 `pipeline.py` 的常數。**兩邊都要改，不得只改其一。**
