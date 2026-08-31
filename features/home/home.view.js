/* =========================================================
   기능: 홈(오늘의 처방) — 뷰(화면)
   ========================================================= */
var HomeView = (function () {

  var el;

  function render(m) {
    el = document.getElementById('screen-home');
    el.innerHTML =
      top(m) +
      (m.stale ? '<div class="stale">⚠️ 네트워크 연결이 안 돼 저장된 예보로 계산했어요</div>' : '') +
      cta(m) +
      sep() + limitsSec(m) +
      (m.windows.length ? sep() + windowsSec(m) : '') +
      sep() + chartSec(m) +
      (m.gap ? sep() + gapSec(m) : '') +
      sep() + weeklySec(m) +
      (m.circadian ? sep() + circadianSec(m) : '') +
      sep() + evidenceSec(m);
    bind(m);
  }

  function sep() { return '<div class="sep"></div>'; }

  /* 상단 — 위치·날짜 한 줄, 모드는 텍스트만, 날씨는 조용한 한 줄 */
  function top(m) {
    var h = m.hero;
    var d = m.rx.date;
    var dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    var dateShort = (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + dow;

    var main = h.state === 'closed'
      ? '<div class="top-headline">' + h.headline + '</div>'
      : '<div class="top-kicker">' + h.kicker + '</div>' +
        '<div class="top-num"><b>' + h.minutes + '</b><span>분</span></div>';

    return '<div class="top">' +
      '<div class="top-bar">' +
        '<button class="top-place" id="h-loc">' + UI.ICON.pin + UI.esc(m.loc.name) +
          '<em>· ' + dateShort + '</em></button>' +
        '<button class="top-refresh" id="h-refresh">' + UI.ICON.refresh + '</button>' +
      '</div>' +
      '<div class="top-mode mode-' + m.mode.id + '"><span class="dot"></span>' + m.mode.label + ' 모드</div>' +
      main +
      '<div class="top-why">' + h.why + '</div>' +
      weatherLine(m, h) +
    '</div>';
  }

  /* 상단 날씨 — 칩·카드 없이 한 줄. UVI · 기온 · 체감 · 창 안내 */
  function weatherLine(m, h) {
    var w = m.weatherNow;
    var bits = [];
    if (w) {
      bits.push('UVI <b>' + w.uvi + '</b>');
      bits.push('<b>' + w.tempC + '</b>');
      if (w.feels !== w.tempC) bits.push('체감 <b>' + w.feels + '</b>');
    }
    if (h.when) bits.push(h.when);
    if (!bits.length) return '';
    return '<div class="top-meta">' +
      bits.map(function (b, i) {
        return (i ? '<span class="div">·</span>' : '') + '<i>' + b + '</i>';
      }).join('') +
    '</div>';
  }

  function cta(m) {
    var h = m.hero;
    if (!h.cta) {
      return h.passed
        ? '<div class="btn-wrap"><button class="btn btn-sub" id="h-cta-tomorrow">내일 창 알림 받기</button></div>'
        : '<div class="btn-wrap"><button class="btn btn-sub" id="h-cta-alt">대체 수단 보기</button></div>';
    }
    var main = '<button class="btn btn-primary" id="h-cta">' +
        (h.cta.action === 'timer' ? UI.ICON.play : UI.ICON.bell) + h.cta.label + '</button>';
    var sub = h.sub ? '<button class="btn btn-sub" id="h-cta-sub" style="margin-top:8px">' + h.sub.label + '</button>' : '';
    return '<div class="btn-wrap">' + main + sub + '</div>';
  }

  function limitsSec(m) {
    return '<div class="sec">' +
      '<div class="sec-title">무엇이 이 시간을 정했나</div>' +
      '<div class="sec-desc">세 가지 제약을 각각 계산해 <b>가장 짧은 값</b>을 처방합니다. 파란 항목이 오늘의 결정자예요.</div>' +
      '<div class="limits">' +
        m.limits.map(function (l) {
          return '<div class="limit' + (l.win ? ' win' : '') + '">' +
            '<div class="limit-ico">' + l.icon + '</div>' +
            '<div class="limit-body">' +
              '<div class="limit-name">' + l.name + (l.win ? '<span class="limit-tag">결정</span>' : '') + '</div>' +
              '<div class="limit-note">' + l.note + '</div>' +
            '</div>' +
            '<div class="limit-val">' + l.value + '</div>' +
          '</div>';
        }).join('') +
      '</div></div>';
  }

  function windowsSec(m) {
    return '<div class="sec">' +
      '<div class="sec-title">오늘 열리는 창</div>' +
      '<div class="sec-desc">태양고도 45° 이상 · 열 안전 통과 · 필요시간 60분 이하를 모두 만족하는 구간입니다.</div>' +
      '<div class="win-list">' +
        m.windows.map(function (w) {
          return '<button class="win-item' + (w.best ? ' best' : '') + '" data-win="' + w.index + '">' +
            '<div class="win-rank">' + (w.active ? '지금' : w.index + 1) + '</div>' +
            '<div><div class="win-time">' + w.timeText + '</div>' +
                 '<div class="win-meta">' + w.meta + '</div></div>' +
            '<div class="win-min">' + w.minutes + '<small>분</small></div>' +
          '</button>';
        }).join('') +
      '</div></div>';
  }

  function chartSec(m) {
    return '<div class="sec">' +
      '<div class="sec-title">시간별 자외선 · 기온</div>' +
      '<div class="sec-desc">파란 띠가 나갈 수 있는 구간입니다.</div>' +
      '<div class="chart-wrap">' +
        '<div class="chart-legend">' +
          '<i><b style="background:#3182F6"></b>자외선</i>' +
          '<i><b style="background:#FF9500"></b>기온</i>' +
        '</div>' + m.chart +
      '</div>' +
      '<div class="sun-line">' +
        '<span>일출 <b>' + m.sun.rise + '</b> · 일몰 <b>' + m.sun.set + '</b></span>' +
        '<span>남중 <b>' + m.solarNoonText + '</b> · 최대고도 <b>' + m.maxAltText + '</b></span>' +
      '</div>' +
    '</div>';
  }

  /* §5 장마 · 흐림 / 겨울 — 대체 수단 */
  function gapSec(m) {
    var g = m.gap;
    return '<div class="sec" id="gap-sec">' +
      '<div class="sec-title">' + g.title + '</div>' +
      '<div class="sec-desc">' + g.note + '</div>' +

      '<div class="gauge" style="margin-bottom:8px">' +
        '<div class="gauge-top"><div style="font-size:13px;font-weight:600;color:#6B7684">이번 주 충전률</div>' +
          '<div class="gauge-num">' + g.weeklyPercent + '<small>%</small></div></div>' +
        '<div class="gauge-bar"><div class="gauge-fill" style="width:' + Math.min(100, g.weeklyPercent) + '%"></div></div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-t">🍽️ 식이 대체</div>' +
        '<div class="card-b">햇빛으로 못 만든 만큼은 음식에서 채울 수 있습니다.</div>' +
        '<div class="food">' + g.foods.map(function (f) {
          return '<div class="food-i"><em>' + f.emoji + '</em><span>' + f.name + '</span></div>';
        }).join('') + '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-t">💊 보충제를 고려할 구간입니다</div>' +
        '<div class="card-b">저희가 용량을 정해 드리지는 않습니다. 공식 기준만 그대로 옮깁니다.</div>' +
        '<dl class="official">' +
          '<dt>비타민D 섭취 기준</dt>' +
          g.official.rows.map(function (r) {
            return '<dd><span>' + r.k + '</span><b>' + r.v + '</b></dd>';
          }).join('') +
          '<div class="src">출처 · ' + g.official.source + '</div>' +
        '</dl>' +
      '</div>' +

      (g.showSupplementWarning
        ? '<div class="card warn"><div class="card-t">⚠️ 합산 상한 주의</div>' +
          '<div class="card-b">' + g.supplementWarning + '</div></div>'
        : '') +
    '</div>';
  }

  function weeklySec(m) {
    return '<div class="sec">' +
      '<div class="sec-title">이번 주 충전률</div>' +
      '<div class="sec-desc">하루 목표를 100%로 봤을 때 최근 7일 평균입니다.</div>' +
      '<div class="gauge">' +
        '<div class="gauge-top">' +
          '<div style="font-size:13px;font-weight:600;color:#6B7684">오늘 ' + m.todayPercent + '% 충전</div>' +
          '<div class="gauge-num">' + m.weekly.percent + '<small>%</small></div>' +
        '</div>' +
        '<div class="gauge-bar"><div class="gauge-fill" style="width:' + Math.min(100, m.weekly.percent) + '%"></div></div>' +
        '<div class="gauge-cap">체내 저장량 ' + m.bodyStore + '% · 25(OH)D 반감기 ' +
          Engine.HALF_LIFE_DAYS + '일을 적용해 지난 노출을 감가한 값입니다.</div>' +
      '</div></div>';
  }

  function circadianSec(m) {
    var c = m.circadian;
    return '<div class="sec">' +
      '<div class="sec-title">생체리듬</div>' +
      '<div class="sec-desc">햇빛의 두 번째 축입니다. 비타민D와 파장이 달라요.</div>' +
      '<div class="card' + (c.indoorHint ? ' info' : '') + '">' +
        '<div class="card-t">🌗 심부체온 최저점 ' + c.tminText + '</div>' +
        '<div class="card-b">' + c.body + '</div>' +
      '</div>' +
      (c.phaseLabel ? '<div class="card"><div class="card-t">⏱️ 오늘 권장 시점의 효과</div>' +
        '<div class="card-b">' + c.phaseLabel + '</div></div>' : '') +
      '<div class="card"><div class="card-t">🚫 빛 회피 창</div>' +
        '<div class="card-b"><b>' + c.avoidText + '</b>부터 취침 전까지는 밝은 빛을 줄이세요. ' +
        '기상 ' + c.wakeText + ' 기준 16시간 후입니다.</div></div>' +
    '</div>';
  }

  function evidenceSec(m) {
    return '<div class="sec" style="padding-top:20px">' +
      '<button class="btn btn-sub" id="h-evidence">계산 근거 보기</button>' +
      '<div style="text-align:center;font-size:11.5px;color:#B0B8C1;margin-top:14px;line-height:1.6">' +
        '기상 데이터 기상청 단기예보 · 생활기상지수 · 태양고도 NOAA SPA<br>' +
        '이 앱은 의학적 진단·처방을 대신하지 않습니다' +
      '</div></div>';
  }

  /* ---------- 이벤트 ---------- */
  function bind(m) {
    var q = function (id) { return document.getElementById(id); };

    if (q('h-refresh')) q('h-refresh').onclick = function () { App.refresh(true); };
    if (q('h-loc')) q('h-loc').onclick = function () { App.go('settings'); };

    if (q('h-cta')) q('h-cta').onclick = function () {
      if (m.hero.cta.action === 'timer') App.startTimer(m.rx.activeWindow || m.rx.targetWindow);
      else App.enableNotify();
    };
    if (q('h-cta-sub')) q('h-cta-sub').onclick = function () {
      App.startTimer(m.rx.targetWindow);
    };
    if (q('h-cta-tomorrow')) q('h-cta-tomorrow').onclick = function () { App.enableNotify(); };
    if (q('h-cta-alt')) q('h-cta-alt').onclick = function () {
      var g = document.getElementById('gap-sec');
      if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else UI.toast('오늘은 안내할 대체 수단이 없어요');
    };

    [].forEach.call(el.querySelectorAll('[data-win]'), function (b) {
      b.onclick = function () { App.startTimer(m.rx.windows[+b.dataset.win]); };
    });

    if (q('h-evidence')) q('h-evidence').onclick = function () { evidenceSheet(m); };
  }

  function evidenceSheet(m) {
    var p = m.rx.activeWindow ? m.rx.nowPoint
          : (m.rx.targetWindow ? m.rx.targetWindow.best : m.rx.nowPoint);
    var body =
      '<div class="card"><div class="card-t">공식</div><div class="card-b" style="font-family:ui-monospace,Menlo,monospace;font-size:12.5px;line-height:1.9">' +
        '비타민D 필요시간 = (k × MED × f_BSA) ÷ (1.5 × UVI)<br>' +
        '화상 한계시간 = (MED × SPF) ÷ (1.5 × UVI)<br>' +
        '열 안전 상한 = 체감온도 구간표<br>' +
        '<b style="color:#3182F6">최종 = min(세 값)</b>' +
      '</div></div>' +
      '<div class="card"><div class="card-t">지금 대입한 값</div><dl class="official" style="margin-top:4px">' +
        row('k (비타민D/홍반 비율)', Engine.K) +
        row('MED (피부 타입 ' + 'ⅠⅡⅢⅣⅤⅥ'[m.rx.profile.skinType - 1] + ')', p.med + ' J/m²') +
        row('f_BSA (' + Engine.CLOTHING[m.rx.profile.clothing].label + ')', p.fBSA) +
        row('SPF', p.spf) +
        row('UVI', p.uvi.toFixed(2)) +
        row('환산계수', Engine.UVI_COEFF) +
        row('체감온도', p.heatIndexC.toFixed(1) + '℃') +
        row('태양고도', p.altitude.toFixed(1) + '°') +
      '</dl></div>' +
      '<div class="card"><div class="card-t">창이 열리는 조건</div><div class="card-b">' +
        '① 태양고도 ≥ 45° — 그림자가 키보다 짧아야 UVB가 도달합니다<br>' +
        '② 열 안전 상한 > 0<br>' +
        '③ 계산된 노출시간 ≤ 60분 — 넘으면 비현실적이라 창을 내지 않습니다' +
      '</div></div>' +
      '<div class="card warn"><div class="card-t">아직 확정 안 된 값</div><div class="card-b">' +
        'k는 문헌마다 0.3~0.5로 갈립니다. 이 버전은 중앙값 <b>0.4</b>로 고정했습니다. ' +
        '노출시간→IU 환산도 편차가 커서 IU 대신 <b>충전률 %</b>로만 표시합니다.' +
      '</div></div>';
    UI.sheet('계산 근거', '모든 계산은 이 기기에서 이뤄집니다. 서버로 보내는 값은 없습니다.', body);
  }
  function row(k, v) { return '<dd><span>' + k + '</span><b>' + v + '</b></dd>'; }

  return { render: render };
})();
