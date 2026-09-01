/* =========================================================
   기능: 설정 — 뷰(화면)
   ========================================================= */
var SettingsView = (function () {

  var el;
  var openSido = null;   // 지역 선택에서 펼쳐 둔 시·도

  function render() {
    var m = SettingsService.model();
    el = document.getElementById('screen-settings');
    var p = m.profile;

    el.innerHTML =
      '<div class="page-title">설정</div>' +
      '<div class="page-sub">한 번 정해 두면 매일 입력할 것은 없습니다.</div>' +

      '<div class="sec" style="padding-top:8px">' +
        '<div class="sec-title">피부 타입</div>' +
        '<div class="sec-desc">Fitzpatrick 분류 · 현재 MED <b>' + m.medOfCurrent + ' J/m²</b>. ' +
          '타입이 한 단계 오르면 필요한 시간도 그만큼 늘어납니다.</div>' +
        '<div class="seg" id="s-skin">' +
          m.skinOptions.map(function (s) {
            return '<button data-t="' + s.t + '"' + (p.skinType === s.t ? ' class="on"' : '') + '>' + s.label + '</button>';
          }).join('') +
        '</div>' +
        '<div style="font-size:12.5px;color:#8B95A1;margin-top:10px;font-weight:500">' +
          m.skinOptions.filter(function (s) { return s.t === p.skinType; })[0].desc + '</div>' +
      '</div>' +

      '<div class="sep"></div>' +
      '<div class="sec">' +
        '<div class="sec-title">기본 옷차림</div>' +
        '<div class="sec-desc">노출 피부 면적 비율(f_BSA)이 필요 시간을 좌우합니다.</div>' +
        '<div class="seg" id="s-cloth">' +
          m.clothingOptions.map(function (c) {
            return '<button data-c="' + c.key + '"' + (p.clothing === c.key ? ' class="on"' : '') + '>' +
              c.label + '<div style="font-size:11px;color:#8B95A1;font-weight:600;margin-top:2px">' +
              Math.round(c.f * 100) + '%</div></button>';
          }).join('') +
        '</div>' +
        '<div style="height:10px"></div>' +
        '<div class="seg" id="s-spf">' +
          m.spfOptions.map(function (v) {
            return '<button data-s="' + v + '"' + (+p.spf === v ? ' class="on"' : '') + '>' +
              (v === 1 ? '안 바름' : 'SPF ' + v) + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="sep"></div>' +
      row('s-wake', '기상 시간', '생체리듬 계산 기준', '<input type="time" id="s-wake-in" value="' + p.wakeTime +
          '" style="border:none;background:#F2F4F6;border-radius:9px;padding:8px 10px;font-size:14px;font-weight:700;color:#191F28">') +
      toggleRow('s-circ', '생체리듬 안내', '심부체온 최저점 · 빛 회피 창을 홈에 표시', p.useCircadian) +

      '<div class="sep"></div>' +
      toggleRow('s-supp', '보충제 복용 중', '켜면 합산 상한(4,000 IU/일) 경고를 함께 보여드려요', p.supplement) +
      toggleRow('s-notify', '알림', m.notifySupported
          ? '창이 열리기 ' + Notify.LEAD_MIN + '분 전에 알려드려요'
          : '이 브라우저는 알림을 지원하지 않아요', p.notify && m.notifyGranted) +

      '<div class="sep"></div>' +
      '<div class="sec">' +
        '<div class="sec-title">위치</div>' +
        '<div class="sec-desc">기상청 API 기준 국내 지역만 지원해요. 기기에만 저장돼요.</div>' +
        '<div class="card" style="margin-bottom:8px"><div class="card-b">' +
          (m.location
            ? '<b>' + UI.esc(m.location.name) + '</b> · ' + m.location.lat + ', ' + m.location.lon +
              (m.location.precise ? ' · 현재 위치' : ' · 도시 선택')
            : '설정되지 않음') +
        '</div></div>' +
        '<button class="btn btn-sub" id="s-geo">📍 현재 위치로 다시 잡기</button>' +
        regionPicker(m) +
      '</div>' +

      '<div class="sep"></div>' +
      '<div class="sec">' +
        '<div class="sec-title">데이터</div>' +
        '<div class="sec-desc">예보 캐시 ' + m.cacheText + ' · 1시간마다 자동으로 새로 받습니다.</div>' +
        '<button class="btn btn-sub" id="s-recache" style="margin-bottom:8px">예보 새로 받기</button>' +
        '<button class="btn btn-sub" id="s-reset" style="color:#F04452">전체 초기화</button>' +
      '</div>' +

      '<div class="sec" style="padding-top:0">' +
        '<div class="card"><div class="card-t">일광 처방</div><div class="card-b">' +
          '백엔드 없음 · 모든 계산은 이 기기에서. 기상 데이터만 기상청에서 1시간마다 받아옵니다.<br>' +
          '태양고도 NOAA SPA · 체감온도 NOAA Heat Index · 섭취기준 보건복지부(2020)' +
        '</div></div>' +
      '</div>';

    bind();
  }

  /* 지역 선택 — 시도를 먼저 고르고 그 안의 지역을 고른다.
     지역마다 기상청 지점코드(areaNo)가 달라 자외선지수도 그 지역 값으로 바뀐다. */
  function regionPicker(m) {
    var cur = m.location ? KmaGeo.findByName(m.location.name) : null;
    var curSido = openSido || (cur ? cur.sido : (KmaGeo.GROUPS[0] || {}).sido);
    var group = KmaGeo.GROUPS.filter(function (g) { return g.sido === curSido; })[0] || KmaGeo.GROUPS[0];

    return '<div style="margin-top:14px">' +
      '<div style="font-size:12.5px;font-weight:700;color:#6B7684;margin-bottom:7px">시 · 도</div>' +
      '<div class="ob-city" id="s-sido">' +
        KmaGeo.GROUPS.map(function (g) {
          return '<button data-sido="' + g.sido + '"' + (g.sido === curSido ? ' class="on"' : '') +
                 '>' + g.sido + '</button>';
        }).join('') +
      '</div>' +
      '<div style="font-size:12.5px;font-weight:700;color:#6B7684;margin:16px 0 7px">' +
        group.sido + ' 지역 <span style="font-weight:500;color:#B0B8C1">· ' + group.areas.length + '곳</span></div>' +
      '<div class="ob-city" id="s-city">' +
        group.areas.map(function (a) {
          var on = m.location && m.location.name === a.name;
          return '<button data-city="' + a.name + '"' + (on ? ' class="on"' : '') + '>' + a.name + '</button>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  function row(id, title, desc, right) {
    return '<div class="row" id="' + id + '">' +
      '<div class="row-l"><div class="row-t">' + title + '</div>' +
      '<div class="row-d">' + desc + '</div></div>' + (right || '') + '</div>';
  }
  function toggleRow(id, title, desc, on) {
    return '<button class="row" id="' + id + '">' +
      '<div class="row-l"><div class="row-t">' + title + '</div>' +
      '<div class="row-d">' + desc + '</div></div>' +
      '<div class="sw' + (on ? ' on' : '') + '"></div></button>';
  }

  function bind() {
    var q = function (id) { return document.getElementById(id); };

    [].forEach.call(el.querySelectorAll('#s-skin button'), function (b) {
      b.onclick = function () { SettingsService.set({ skinType: +b.dataset.t }); after(); };
    });
    [].forEach.call(el.querySelectorAll('#s-cloth button'), function (b) {
      b.onclick = function () { SettingsService.set({ clothing: b.dataset.c }); after(); };
    });
    [].forEach.call(el.querySelectorAll('#s-spf button'), function (b) {
      b.onclick = function () { SettingsService.set({ spf: +b.dataset.s }); after(); };
    });

    q('s-wake-in').onchange = function () {
      SettingsService.set({ wakeTime: this.value }); after();
    };
    q('s-circ').onclick = function () {
      SettingsService.set({ useCircadian: !Repo.getProfile().useCircadian }); after();
    };
    q('s-supp').onclick = function () {
      SettingsService.set({ supplement: !Repo.getProfile().supplement }); after();
    };
    q('s-notify').onclick = function () {
      var cur = Repo.getProfile().notify && Notify.granted();
      SettingsService.toggleNotify(!cur).then(function (ok) {
        if (!cur && !ok) UI.toast('브라우저에서 알림이 차단돼 있어요');
        else if (ok) UI.toast('창이 열리기 15분 전에 알려드릴게요');
        after();
      });
    };

    q('s-geo').onclick = function () {
      UI.toast('위치를 확인하는 중…');
      SettingsService.useGeolocation()
        .then(function () { App.refresh(true); UI.toast('위치를 갱신했어요'); })
        .catch(function () { UI.toast('권한이 없어요. 아래에서 도시를 골라 주세요'); });
    };
    [].forEach.call(el.querySelectorAll('#s-sido button'), function (b) {
      b.onclick = function () { openSido = b.dataset.sido; render(); };
    });
    [].forEach.call(el.querySelectorAll('#s-city button'), function (b) {
      b.onclick = function () {
        var loc = SettingsService.useCity(b.dataset.city);
        if (loc) openSido = (KmaGeo.findByName(loc.name) || {}).sido || openSido;
        App.refresh(true);          // 지역이 바뀌면 그 지역 자외선지수로 즉시 다시 받는다
        UI.toast(b.dataset.city + '(으)로 바꿨어요');
        render();
      };
    });

    q('s-recache').onclick = function () { App.refresh(true); UI.toast('예보를 다시 받았어요'); };
    q('s-reset').onclick = function () {
      UI.sheet('전체 초기화', '설정과 노출 이력이 모두 지워집니다. 되돌릴 수 없어요.',
        '<button class="btn btn-danger" id="s-reset-go">지우고 처음부터</button>' +
        '<button class="btn btn-sub" id="s-reset-no" style="margin-top:8px">그만두기</button>');
      document.getElementById('s-reset-no').onclick = UI.closeSheet;
      document.getElementById('s-reset-go').onclick = function () {
        SettingsService.resetAll();
        UI.closeSheet();
        location.reload();
      };
    };
  }

  /* 설정이 바뀌면 처방을 다시 계산해야 한다 (아키텍처: 설정 변경 시 재계산) */
  function after() {
    App.invalidate();
    render();
  }

  return { render: render };
})();
