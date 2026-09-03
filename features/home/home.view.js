/* =========================================================
   기능: 홈(오늘의 처방) — 뷰(화면)
   ========================================================= */
var HomeView = (function () {

  var el;

  function render(m) {
    el = document.getElementById('screen-home');
    /* 홈은 '오늘 몇 분'에만 집중한다.
       시간별 그래프·주간 충전률·생체리듬은 주간 탭, 프로필·알림은 마이페이지로 옮겼다. */
    el.innerHTML =
      top(m) +
      (m.stale ? '<div class="stale">⚠️ 네트워크 연결이 안 돼 저장된 예보로 계산했어요</div>' : '') +
      cta(m) +
      sep() + limitsSec(m) +
      (m.windows.length ? sep() + windowsSec(m) : '') +
      (m.gap ? sep() + gapBriefSec(m) : '') +
      sep() + moreSec(m);
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
      '<div class="top-mode mode-' + m.mode.id + '"><span class="dot"></span>' + m.modeLabel + ' 모드</div>' +
      main +
      '<div class="top-why">' + h.why + '</div>' +
      weatherLine(m, h) +
    '</div>';
  }

  /* 상단 날씨 — 한 줄, 최소한만. 창 시간 → UVI → 기온 순.
     체감온도는 기온과 2℃ 넘게 벌어질 때만 (평소엔 군더더기) */
  function weatherLine(m, h) {
    var w = m.weatherNow;
    var bits = [];
    if (h.when) bits.push(h.when);
    if (w) {
      bits.push('UVI ' + w.uvi);
      var t = parseInt(w.tempC, 10), f = parseInt(w.feels, 10);
      bits.push(Math.abs(f - t) >= 2 ? w.tempC + ' (체감 ' + w.feels + ')' : w.tempC);
    }
    if (!bits.length) return '';
    return '<div class="top-meta">' + bits.join('<span class="div">·</span>') + '</div>';
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
    var sub = h.sub ? '<button class="btn-text" id="h-cta-sub">' + h.sub.label + '</button>' : '';
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
                 '<div class="win-meta">' + w.meta +
                 (w.cappedNote ? '<br><span style="color:#F04452;font-weight:600">' + w.cappedNote + '</span>' : '') +
                 '</div></div>' +
            '<div class="win-min">' + w.minutes + '<small>분</small></div>' +
          '</button>';
        }).join('') +
      '</div></div>';
  }

  function gapBriefSec(m) {
    var g = m.gap;
    return '<div class="sec">' +
      '<div class="sec-title">' + g.title + '</div>' +
      '<div class="sec-desc">' + g.note + '</div>' +
      '<div class="card">' +
        '<div class="card-t">🍽️ 햇빛 대신 채우려면</div>' +
        '<div class="food">' + g.foods.map(function (f) {
          return '<div class="food-i"><em>' + f.emoji + '</em><span>' + f.name + '</span></div>';
        }).join('') + '</div>' +
      '</div>' +
      (g.showSupplementWarning
        ? '<div class="card warn"><div class="card-t">⚠️ 합산 상한 주의</div>' +
          '<div class="card-b">' + g.supplementWarning + '</div></div>'
        : '') +
    '</div>';
  }

  /* 더 볼 것들로 가는 입구 — 홈을 짧게 유지하는 장치 */
  function moreSec(m) {
    return '<div class="sec" style="padding-top:20px">' +
      '<button class="more-row" id="h-more-weekly">' +
        '<div class="more-ico">📈</div>' +
        '<div class="more-body">' +
          '<div class="more-t">자외선 · 생체리듬 자세히</div>' +
          '<div class="more-d">시간별 자외선, 노출 가능 구간, 주간 충전률</div>' +
        '</div>' + UI.ICON.right +
      '</button>' +
      '<button class="more-row" id="h-more-my" style="margin-top:8px">' +
        '<div class="more-ico">👤</div>' +
        '<div class="more-body">' +
          '<div class="more-t">내 설정 · 계산 근거</div>' +
          '<div class="more-d">피부 타입 ' + m.skinLabel + ' · ' + UI.esc(m.loc.name) + '</div>' +
        '</div>' + UI.ICON.right +
      '</button>' +
      '<div style="text-align:center;font-size:11.5px;color:#B0B8C1;margin-top:18px;line-height:1.6">' +
        '기상 데이터 기상청 단기예보 · 생활기상지수 · 태양고도 NOAA SPA<br>' +
        '이 앱은 의학적 진단·처방을 대신하지 않습니다' +
      '</div></div>';
  }

  function bind(m) {
    var q = function (id) { return document.getElementById(id); };

    /* 새로고침 — 기상청에서 날씨·자외선지수를 지금 다시 받아온다.
       받는 동안 아이콘을 돌리고, 끝나면 언제 기준 자료인지 토스트로 알려 준다. */
    if (q('h-refresh')) q('h-refresh').onclick = function () {
      var btn = this;
      if (btn.dataset.busy === '1') return;        // 연타 방지
      btn.dataset.busy = '1';
      btn.classList.add('spinning');

      App.refresh(true).then(function (res) {
        if (!res) return;
        if (res.stale) {
          UI.toast('기상청에서 새 자료를 못 받아 저장된 예보로 보여드려요');
          return;
        }
        var t = new Date(res.data.fetchedAt);
        var uv = res.data.uvMissing ? '자외선지수 누락' : '자외선지수 반영';
        UI.toast('최신 예보로 새로고침했어요 · ' +
                 UI.hm(t.getHours() * 60 + t.getMinutes()) + ' 기준 · ' + uv);
      }).catch(function () {
        /* 실패 토스트는 App.refresh가 이미 띄운다 */
      }).then(function () {
        /* 화면이 다시 그려지면 이 버튼은 사라지지만, 안 그려진 경우를 대비해 되돌린다 */
        var cur = document.getElementById('h-refresh');
        if (cur) { cur.classList.remove('spinning'); cur.dataset.busy = ''; }
      });
    };
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
      var g = el.querySelector('.sec');
      window.scrollTo({ top: document.body.scrollHeight * 0.45, behavior: 'smooth' });
    };

    [].forEach.call(el.querySelectorAll('[data-win]'), function (b) {
      b.onclick = function () { App.startTimer(m.rx.windows[+b.dataset.win]); };
    });

    if (q('h-more-weekly')) q('h-more-weekly').onclick = function () { App.go('weekly'); };
    if (q('h-more-my')) q('h-more-my').onclick = function () { App.go('settings'); };
  }


  return { render: render };
})();
