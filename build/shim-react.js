// 把 bundle 對 'react' 的 import 導向瀏覽器全域的 React UMD，
// 避免 esbuild 產生 browser 端不存在的 require()
const R = (typeof window !== 'undefined' ? window.React : globalThis.React);
module.exports = R;
