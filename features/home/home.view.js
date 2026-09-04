/* =========================================================
   기능: 홈(오늘의 처방) — 뷰(화면)

   레퍼런스 구조를 그대로 따른다.
     큰 제목 + 원형 버튼  →  원형 버튼 + 파란 알약 CTA
     →  요약 카드(큰 수치)  →  오늘 열리는 창

   홈에는 이 세 가지만 둔다. '무엇이 이 시간을 정했나'와 하단 이동 행들은
   마이페이지로, 시간별 그래프·생체리듬은 주간 탭으로 옮겼다.
   ========================================================= */
var HomeView = (function () {

  var el;

  function render(m) {
    el = document.getElementById('screen-home');
    el.innerHTML =
      header(m) +
      (m.stale ? '<div class="stale">⚠️ 네트워크 연결이 안 돼 저장된 예보로 계산했어요</div>' : '') +
      actionRow(m) +
      summaryCard(m) +
      /* 창이 있으면 '오늘 열리는 창', 없으면 그 자리에 대체 수단이 온다.
         '무엇이 이 시간을 정했나'와 하단 이동 행들은 마이페이지로 옮겼다. */
      (m.windows.length ? windowsCard(m) : '') +
      (m.gap ? gapCard(m) : '');
    bind(m);
  }

  /* ---------- 헤더 : 큰 제목 + 원형 버튼 ---------- */
  function header(m) {
    var d = m.rx.date;
    var dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    var dateShort = (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + dow;
    var notifyOn = m.rx.profile.notify && Notify.granted();

    return '<div class="hdr">' +
      '<div class="hdr-l">' +
        '<div class="hdr-t">오늘의 처방</div>' +
        '<div class="hdr-d">' + UI.esc(m.loc.name) + ' · ' + dateShort + '</div>' +
      '</div>' +
      '<div class="hdr-acts">' +
        '<button class="iconbtn" id="h-bell" aria-label="알림">' + UI.ICON.bell +
          (notifyOn ? '<span class="dot"></span>' : '') + '</button>' +
        '<button class="iconbtn" id="h-refresh" aria-label="날씨·자외선 새로고침">' +
          UI.ICON.refresh + '</button>' +
      '</div>' +
    '</div>';
  }

  /* ---------- 액션 행 : 원형 버튼 + 파란 알약 CTA ---------- */
  function actionRow(m) {
    var h = m.hero;
    var cta;
    if (h.cta) {
      cta = '<button class="act-cta" id="h-cta">' +
              (h.cta.action === 'timer' ? UI.ICON.play : UI.ICON.bell) + h.cta.label + '</button>';
    } else if (h.passed) {
      cta = '<button class="act-cta" id="h-cta-tomorrow">' + UI.ICON.bell + '내일 창 알림 받기</button>';
    } else {
      cta = '<button class="act-cta ghost" id="h-cta-alt">대체 수단 보기</button>';
    }

    return '<div class="actrow">' +
      '<button class="act-c" id="h-loc" aria-label="지역 바꾸기">' + UI.ICON.pin + '</button>' +
      '<button class="act-c" id="h-evi" aria-label="계산 근거 보기">' + UI.ICON.sliders + '</button>' +
      cta +
    '</div>';
  }

  /* ---------- 요약 카드 : 큰 수치 + 알약 막대 ---------- */
  function summaryCard(m) {
    var h = m.hero;
    var w = m.weatherNow;

    var main = h.state === 'closed'
      ? '<div class="stat"><div class="stat-n ink" style="font-size:25px;letter-spacing:-.9px;' +
          'line-height:1.35">' + h.headline + '</div></div>'
      : '<div class="stat"><div class="stat-n">' + h.minutes + '</div>' +
        '<div class="stat-u">분</div></div>';

    var cap = (h.kicker ? h.kicker + ' · ' : '') + h.why;

    var duo = '<div class="duo" style="margin-top:16px">' +
        (w ? '<div class="duo-i"><b>' + w.uvi + '</b><span>자외선지수</span></div>' +
             '<div class="duo-i"><b>' + w.tempC + '</b><span>' +
               (w.feels === w.tempC ? '기온' : '체감 ' + w.feels) + '</span></div>' : '') +
        '<div class="duo-i"><b>' + m.windows.length + '</b><span>열리는 창</span></div>' +
      '</div>';

    var sub = h.sub
      ? '<button class="btn-text" id="h-cta-sub">' + h.sub.label + '</button>'
      : '';

    return '<div class="sec">' +
      '<div class="c-head">' +
        '<div class="c-ico">' + UI.ICON.sun + '</div>' +
        '<div class="c-t">오늘의 처방<small>' + (h.when || m.dateText) + '</small></div>' +
        '<button class="c-go" id="h-go-weekly" aria-label="주간으로">' + UI.ICON.right + '</button>' +
      '</div>' +
      '<div class="top-mode mode-' + m.mode.id + '" style="margin-bottom:14px">' +
        '<span class="dot"></span>' + m.modeLabel + ' 모드</div>' +
      main +
      '<div class="stat-cap">' + cap + '</div>' +
      duo +
      sub +
    '</div>';
  }

  /* ---------- 오늘 열리는 창 ---------- */
  function windowsCard(m) {
    return '<div class="sec">' +
      '<div class="c-head">' +
        '<div class="c-ico mint">🪟</div>' +
        '<div class="c-t">오늘 열리는 창<small>고도 45°↑ · 열 안전 통과 · 60분 이하</small></div>' +
        '<span class="pill">' + m.windows.length + '개</span>' +
      '</div>' +
      '<div class="win-list">' +
        m.windows.map(function (w) {
          return '<button class="win-item' + (w.best ? ' best' : '') + '" data-win="' + w.index + '">' +
            '<div class="win-rank">' + (w.active ? '지금' : w.index + 1) + '</div>' +
            '<div class="lrow-b"><div class="win-time">' + w.timeText + '</div>' +
                 '<div class="win-meta">' + w.meta +
                 (w.cappedNote ? '<br><span style="color:#F0475B;font-weight:700">' +
                    w.cappedNote + '</span>' : '') +
                 '</div></div>' +
            '<div class="win-min">' + w.minutes + '<small>분</small></div>' +
          '</button>';
        }).join('') +
      '</div></div>';
  }

  /* ---------- 창이 없는 날의 대체 수단 ---------- */
  function gapCard(m) {
    var g = m.gap;
    return '<div class="sec">' +
      '<div class="c-head">' +
        '<div class="c-ico warm">🍽️</div>' +
        '<div class="c-t">' + g.title + '<small>햇빛 대신 채우는 방법</small></div>' +
      '</div>' +
      '<div class="sec-desc" style="margin-bottom:12px">' + g.note + '</div>' +
      '<div class="food">' + g.foods.map(function (f) {
        return '<div class="food-i"><em>' + f.emoji + '</em><span>' + f.name + '</span></div>';
      }).join('') + '</div>' +
      (g.showSupplementWarning
        ? '<div class="card warn" style="margin-top:12px"><div class="card-t">⚠️ 합산 상한 주의</div>' +
          '<div class="card-b">' + g.supplementWarning + '</div></div>'
        : '') +
    '</div>';
  }

  /* ---------- 이벤트 ---------- */
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

    if (q('h-bell')) q('h-bell').onclick = function () { App.enableNotify(); };
    if (q('h-loc')) q('h-loc').onclick = function () { App.go('settings'); };
    if (q('h-evi')) q('h-evi').onclick = function () { SettingsView.evidenceSheet(); };
    if (q('h-go-weekly')) q('h-go-weekly').onclick = function () { App.go('weekly'); };

    if (q('h-cta')) q('h-cta').onclick = function () {
      if (m.hero.cta.action === 'timer') App.startTimer(m.rx.activeWindow || m.rx.targetWindow);
      else App.enableNotify();
    };
    if (q('h-cta-sub')) q('h-cta-sub').onclick = function () {
      App.startTimer(m.rx.targetWindow);
    };
    if (q('h-cta-tomorrow')) q('h-cta-tomorrow').onclick = function () { App.enableNotify(); };
    if (q('h-cta-alt')) q('h-cta-alt').onclick = function () {
      window.scrollTo({ top: document.body.scrollHeight * 0.45, behavior: 'smooth' });
    };

    [].forEach.call(el.querySelectorAll('[data-win]'), function (b) {
      b.onclick = function () { App.startTimer(m.rx.windows[+b.dataset.win]); };
    });
  }

  return { render: render };
})();
