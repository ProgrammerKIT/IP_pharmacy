react = open('node_modules/react/umd/react.production.min.js', encoding='utf-8').read()
dom = open('node_modules/react-dom/umd/react-dom.production.min.js', encoding='utf-8').read()
bundle = open('bundle.js', encoding='utf-8').read()

html = f"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0E1A20">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="拜訪作戰台">
<link rel="apple-touch-icon" href="IP_icon180.png">
<link rel="icon" href="IP_icon180.png">
<meta name="robots" content="noindex, nofollow">
<title>獨立藥局 拜訪作戰台</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  html,body{{margin:0;padding:0;background:#E6ECEE;-webkit-text-size-adjust:100%}}
  body{{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}}
  *{{box-sizing:border-box}}
  button{{border:0;background:none;cursor:pointer;font:inherit;color:inherit;border-radius:0}}
  /* Tailwind 核心工具類的最小替代（本檔不載入 Tailwind） */
  .flex{{display:flex}} .grid{{display:grid}} .block{{display:block}}
  .flex-wrap{{flex-wrap:wrap}} .items-center{{align-items:center}} .items-start{{align-items:flex-start}}
  .items-baseline{{align-items:baseline}} .justify-between{{justify-content:space-between}}
  .justify-center{{justify-content:center}} .text-left{{text-align:left}} .w-full{{width:100%}}
  .p-4{{padding:1rem}} .p-3{{padding:.75rem}} .p-8{{padding:2rem}}
  .px-3{{padding-left:.75rem;padding-right:.75rem}} .px-4{{padding-left:1rem;padding-right:1rem}}
  .py-2{{padding-top:.5rem;padding-bottom:.5rem}} .py-3{{padding-top:.75rem;padding-bottom:.75rem}}
  .py-4{{padding-top:1rem;padding-bottom:1rem}} .py-5{{padding-top:1.25rem;padding-bottom:1.25rem}}
  .py-6{{padding-top:1.5rem;padding-bottom:1.5rem}} .pt-4{{padding-top:1rem}} .pt-5{{padding-top:1.25rem}}
  .pb-3{{padding-bottom:.75rem}} .pb-2{{padding-bottom:.5rem}}
  .px-4.pb-3{{padding-bottom:.75rem}}
</style>
</head>
<body>
<div id="root"></div>
<script>{react}</script>
<script>{dom}</script>
<script>{bundle}</script>
<script>
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(PharmApp.default));
</script>
</body>
</html>"""
open('IP_index.html','w',encoding='utf-8').write(html)
print('html bytes', len(html))
