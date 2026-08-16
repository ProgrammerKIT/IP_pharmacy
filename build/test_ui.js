/* 部署前巡檢：五個分頁 ＋ 兩種客戶卡 ＋ 表單路徑，並攔截 console 錯誤。
   任一頁渲染內容過短或出現 JS 錯誤即視為失敗（exit 1），build.sh 會中止。 */
const { JSDOM } = require('jsdom'); const fs = require('fs');
const dom = new JSDOM(fs.readFileSync('IP_index.html', 'utf8'),
  { url: 'https://programmerkit.github.io/IP_pharmacy/IP_index.html', runScripts: 'dangerously', pretendToBeVisual: true });
const w = dom.window, d = w.document; const errs = [];
w.addEventListener('error', e => errs.push(e.message));
w.console.error = (...a) => errs.push(String(a[0]).slice(0, 160));
const btn = t => [...d.querySelectorAll('button')].find(b => b.textContent.trim() === t);
const click = el => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const TABS = ['🔥接單', '拜訪前', '複盤', '排程', '資料'];
let fail = 0, i = 0;

function done() {
  click(btn('拜訪前'));
  setTimeout(() => {
    click([...d.querySelectorAll('button')].find(b => /建祥體系/.test(b.textContent)));
    setTimeout(() => {
      const hand = d.getElementById('root').textContent.length;
      console.log('客戶卡(手寫劇本)'.padEnd(16), String(hand).padStart(6), hand > 800 ? 'OK' : (fail++, '⚠'));
      const go = btn('拜訪完了，記錄結果'); if (!go) { fail++; console.log('⚠ 客戶卡→表單按鈕不見了'); }
      click(go);
      setTimeout(() => {
        const ok = /拜訪日期/.test(d.getElementById('root').textContent);
        console.log('拜訪紀錄表單'.padEnd(16), ok ? '     OK' : (fail++, '     ⚠'));
        click(btn('拜訪前'));
        setTimeout(() => {
          click([...d.querySelectorAll('button')].find(b => /^彬利藥品/.test(b.textContent.trim())));
          setTimeout(() => {
            const auto = d.getElementById('root').textContent.length;
            console.log('客戶卡(自動議題)'.padEnd(16), String(auto).padStart(6), auto > 800 ? 'OK' : (fail++, '⚠'));
            console.log('JS 錯誤'.padEnd(16), errs.length ? (fail++, errs.join(' / ')) : '     (無)');
            console.log(fail ? `\n❌ 測試未通過（${fail} 項）` : '\n✅ 測試全數通過');
            process.exit(fail ? 1 : 0);
          }, 350);
        }, 300);
      }, 400);
    }, 350);
  }, 300);
}

function step() {
  if (i >= TABS.length) return done();
  const t = TABS[i++]; const b = btn(t);
  if (!b) { fail++; console.log(t.padEnd(16), '  找不到此分頁 ⚠'); return step(); }
  click(b);
  setTimeout(() => {
    const len = d.getElementById('root').textContent.length;
    console.log(t.padEnd(16), String(len).padStart(6), len > 600 ? 'OK' : (fail++, '⚠ 疑似空白'));
    step();
  }, 350);
}
setTimeout(step, 1500);
