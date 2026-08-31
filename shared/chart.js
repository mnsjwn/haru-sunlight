/* =========================================================
   shared / 시간별 UV · 기온 그래프 (인라인 SVG)
   가능 창을 파란 띠로 하이라이트한다 (§9 홈)
   ========================================================= */
var Chart = (function () {

  var W = 320, H = 132, PAD_B = 20, T0 = 5 * 60, T1 = 20 * 60;

  function x(min) { return (min - T0) / (T1 - T0) * W; }

  function render(rx) {
    var pts = rx.scanned.filter(function (p) {
      return p.minuteOfDay >= T0 && p.minuteOfDay <= T1;
    });
    if (!pts.length) return '';

    var uvMax = Math.max(2, Math.ceil(pts.reduce(function (m, p) { return Math.max(m, p.uvi); }, 0)));
    var tMin = pts.reduce(function (m, p) { return Math.min(m, p.tempC); }, 99);
    var tMax = pts.reduce(function (m, p) { return Math.max(m, p.tempC); }, -99);
    if (tMax - tMin < 4) tMax = tMin + 4;

    var plotH = H - PAD_B;
    var uvY = function (v) { return plotH - (v / uvMax) * (plotH - 8); };
    var tY  = function (v) { return plotH - ((v - tMin) / (tMax - tMin)) * (plotH - 26) - 8; };

    /* 가능 창 하이라이트 */
    var bands = rx.windows.map(function (w) {
      var x0 = Math.max(0, x(w.start)), x1 = Math.min(W, x(w.end));
      if (x1 <= x0) return '';
      return '<rect x="' + x0.toFixed(1) + '" y="0" width="' + (x1 - x0).toFixed(1) +
             '" height="' + plotH + '" rx="4" fill="#3182F6" opacity=".1"/>';
    }).join('');

    /* UV 곡선 + 면적 */
    var line = '', area = '';
    pts.forEach(function (p, i) {
      var px = x(p.minuteOfDay).toFixed(1), py = uvY(p.uvi).toFixed(1);
      line += (i ? 'L' : 'M') + px + ' ' + py;
    });
    area = line + 'L' + x(pts[pts.length - 1].minuteOfDay).toFixed(1) + ' ' + plotH +
           'L' + x(pts[0].minuteOfDay).toFixed(1) + ' ' + plotH + 'Z';

    /* 기온 곡선 */
    var tline = '';
    pts.forEach(function (p, i) {
      tline += (i ? 'L' : 'M') + x(p.minuteOfDay).toFixed(1) + ' ' + tY(p.tempC).toFixed(1);
    });

    /* 눈금 */
    var ticks = '';
    [6, 9, 12, 15, 18].forEach(function (h) {
      var px = x(h * 60);
      ticks += '<line x1="' + px.toFixed(1) + '" y1="0" x2="' + px.toFixed(1) + '" y2="' + plotH +
               '" stroke="#E5E8EB" stroke-width="1" stroke-dasharray="2 3"/>' +
               '<text x="' + px.toFixed(1) + '" y="' + (H - 5) +
               '" fill="#8B95A1" font-size="10" font-weight="600" text-anchor="middle">' + h + '시</text>';
    });

    /* 지금 시각 */
    var nowLine = '';
    if (rx.nowMinute != null && rx.nowMinute >= T0 && rx.nowMinute <= T1) {
      var nx = x(rx.nowMinute).toFixed(1);
      nowLine = '<line x1="' + nx + '" y1="0" x2="' + nx + '" y2="' + plotH +
                '" stroke="#191F28" stroke-width="1.5"/>' +
                '<circle cx="' + nx + '" cy="0" r="3" fill="#191F28"/>';
    }

    /* 권장 시작점 마커 */
    var mark = '';
    if (rx.targetWindow) {
      var mx = x(rx.targetWindow.recommendStart);
      var my = uvY(rx.targetWindow.best.uvi);
      if (mx >= 0 && mx <= W) {
        mark = '<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) +
               '" r="5" fill="#3182F6" stroke="#fff" stroke-width="2.5"/>';
      }
    }

    return '' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" preserveAspectRatio="none" style="overflow:visible">' +
        '<defs><linearGradient id="uvg" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#3182F6" stop-opacity=".28"/>' +
          '<stop offset="100%" stop-color="#3182F6" stop-opacity="0"/>' +
        '</linearGradient></defs>' +
        ticks + bands +
        '<path d="' + area + '" fill="url(#uvg)"/>' +
        '<path d="' + tline + '" fill="none" stroke="#FF9500" stroke-width="1.6" stroke-dasharray="3 3" stroke-linecap="round"/>' +
        '<path d="' + line + '" fill="none" stroke="#3182F6" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>' +
        nowLine + mark +
      '</svg>' +
      '<div style="display:flex;justify-content:space-between;padding:6px 2px 0;font-size:11px;color:#8B95A1;font-weight:600">' +
        '<span>UV 최대 ' + uvMax + '</span>' +
        '<span>기온 ' + Math.round(tMin) + '~' + Math.round(tMax) + '℃</span>' +
      '</div>';
  }

  return { render: render };
})();
