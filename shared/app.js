/* =========================================================
   shared / 앱 셸 — 부트스트랩 · 탭 라우팅 · 상태 보유
   기능 뷰는 여기서만 호출한다. 계산은 전부 core 계층이 한다.
   ========================================================= */
var App = (function () {

  var state = {
    profile: null,
    location: null,
    weather: null,
    stale: false,
    rx: null,          // 오늘 처방 (invalidate() 되면 다시 계산)
    tab: 'home',
    loading: true,
    error: null
  };

  /* ---------- 부트 ---------- */
  function init() {
    document.getElementById('sheet-bg').onclick = function (e) {
      if (e.target.id === 'sheet-bg') UI.closeSheet();
    };
    [].forEach.call(document.querySelectorAll('.tab'), function (t) {
      t.onclick = function () { go(t.dataset.tab); };
    });

    state.profile = Repo.getProfile();
    state.location = Repo.getLocation();

    if (!state.profile.onboarded || !state.location) {
      OnboardingView.show();
      return;
    }
    var hash = (location.hash || '').replace('#', '');
    if (hash) state.tab = hash;
    applyActiveTab(state.tab);
    boot();
  }

  function boot() {
    state.profile = Repo.getProfile();
    state.location = Repo.getLocation();
    state.loading = true;
    state.error = null;
    applyActiveTab(state.tab);   // go()를 안 거쳐도 지금 탭이 보이게 먼저 맞춘다
    renderSkeleton();

    WeatherAPI.load(state.location, false)
      .then(function (res) {
        state.weather = res.data;
        state.stale = res.stale;
        state.loading = false;
        invalidate();
        if (state.profile.notify) Notify.schedule(prescription());
        go(state.tab);
        scheduleHourly();
      })
      .catch(function (err) {
        state.loading = false;
        state.error = err;
        refreshView();   // 설정 탭이면 renderError 대신 SettingsView가 뜨도록 분기를 태운다
      });
  }

  /* 예보 다시 받기. 호출부가 성공/실패를 알 수 있도록 Promise를 돌려준다
     (새로고침 버튼이 회전 표시를 끄고 결과 토스트를 띄우는 데 쓴다) */
  function refresh(force) {
    if (!state.location) return Promise.resolve(null);
    state.location = Repo.getLocation();
    return WeatherAPI.load(state.location, !!force).then(function (res) {
      state.weather = res.data;
      state.stale = res.stale;
      invalidate();
      if (state.profile.notify) Notify.schedule(prescription());
      refreshView();
      return res;
    }).catch(function (e) {
      UI.toast(e && e.noKey ? '기상청 서비스키가 없어요 — config.local.js를 확인해 주세요' : '예보를 받지 못했어요');
      throw e;
    });
  }

  /* ---------- 처방 (설정 변경 시 재계산) ---------- */
  function invalidate() { state.rx = null; state.profile = Repo.getProfile(); }

  function prescription() {
    if (!state.weather || !state.location) return null;
    if (!state.rx) {
      state.rx = Prescription.forToday(state.weather, state.location, Repo.getProfile());
    }
    return state.rx;
  }

  /* ---------- 라우팅 ---------- */
  var TABS = ['home', 'timer', 'weekly', 'settings'];

  /* 탭 버튼·화면의 active 클래스만 맞춘다. renderSkeleton/renderError처럼
     go()를 거치지 않고 state.tab에 직접 그리는 경로도 이걸 먼저 불러야
     그 화면이 실제로 보인다(안 그러면 콘텐츠는 그려지는데 숨겨진 채로 남는다). */
  function applyActiveTab(tab) {
    [].forEach.call(document.querySelectorAll('.tab'), function (t) {
      t.classList.toggle('on', t.dataset.tab === tab);
    });
    [].forEach.call(document.querySelectorAll('.screen'), function (s) {
      s.classList.toggle('active', s.id === 'screen-' + tab);
    });
  }

  function go(tab) {
    if (TABS.indexOf(tab) < 0) tab = 'home';
    state.tab = tab;
    if (location.hash !== '#' + tab) {
      try { history.replaceState(null, '', '#' + tab); } catch (e) {}
    }
    applyActiveTab(tab);
    if (tab !== 'timer') TimerView.stopLoop();
    window.scrollTo(0, 0);
    refreshView();
  }

  function refreshView() {
    /* 설정 탭은 날씨를 못 받은 상태(키 없음·오류)에서도 항상 열려야 한다 —
       거기서 config.local.js 설정 방법을 안내한다 */
    if (state.tab === 'settings') return SettingsView.render();

    if (state.loading) return renderSkeleton();
    if (state.error) return renderError();
    var rx = prescription();
    if (!rx) return renderError();

    if (state.tab === 'home') {
      HomeView.render(HomeService.build(rx, { stale: state.stale }));
    } else if (state.tab === 'timer') {
      TimerView.render(rx);
    } else if (state.tab === 'weekly') {
      WeeklyView.render(WeeklyService.build(state.weather, state.location, Repo.getProfile()));
    }
  }

  /* ---------- 액션 ---------- */
  function startTimer(win) {
    var rx = prescription();
    if (!rx) return;
    if (!TimerService.isRunning()) TimerService.start(rx, win || rx.activeWindow || rx.targetWindow);
    go('timer');
  }

  function enableNotify() {
    Notify.request().then(function (ok) {
      Repo.setProfile({ notify: ok });
      invalidate();
      if (ok) {
        var n = Notify.schedule(prescription());
        UI.toast(n ? '창 ' + n + '개에 15분 전 알림을 걸었어요' : '오늘 남은 창이 없어요');
      } else {
        UI.toast('브라우저에서 알림이 차단돼 있어요');
      }
      refreshView();
    });
  }

  /* ---------- 로딩 · 오류 ---------- */
  function renderSkeleton() {
    document.getElementById('screen-' + state.tab).innerHTML =
      '<div class="hero" style="padding-top:40px">' +
        '<div class="skel" style="width:88px;height:26px;border-radius:99px"></div>' +
        '<div class="skel" style="width:110px;height:20px;margin-top:22px"></div>' +
        '<div class="skel" style="width:190px;height:64px;margin-top:12px;border-radius:14px"></div>' +
        '<div class="skel" style="width:70%;height:18px;margin-top:16px"></div>' +
        '<div class="skel" style="width:55%;height:18px;margin-top:8px"></div>' +
      '</div>' +
      '<div class="sep"></div>' +
      '<div class="sec">' +
        '<div class="skel" style="width:100%;height:64px;margin-bottom:8px;border-radius:14px"></div>' +
        '<div class="skel" style="width:100%;height:64px;margin-bottom:8px;border-radius:14px"></div>' +
        '<div class="skel" style="width:100%;height:64px;border-radius:14px"></div>' +
      '</div>';
  }

  /* 서비스키는 앱 UI에 넣지 않는다(설정 화면에도 없음).
     키가 없을 때만 이 화면에서 config.local.js 설정 방법을 안내한다. */
  function renderError() {
    var noKey = state.error && state.error.noKey;

    var body = noKey
      ? '<div class="empty" style="padding-top:80px"><em>🔑</em>' +
          '기상청 서비스키가 없어요' +
        '</div>' +
        '<div class="sec" style="padding-top:0">' +
          '<div class="card warn">' +
            '<div class="card-t">config.local.js 파일에 넣어 주세요</div>' +
            '<div class="card-b">앱 화면에서는 키를 입력받지 않습니다. 아래대로 파일만 만들면 바로 시작돼요. ' +
              '이 파일은 <b>.gitignore</b>에 등록돼 있어 깃허브에는 올라가지 않습니다.</div>' +
          '</div>' +
          '<dl class="official" style="margin-top:8px">' +
            '<dt>설정 방법</dt>' +
            '<dd style="display:block;padding:6px 0;font-size:13px;color:#4E5968;line-height:1.75">' +
              '1. <b>config.local.example.js</b>를 복사해 <b>config.local.js</b>로 저장<br>' +
              '2. 그 안의 <b>window.KMA_SERVICE_KEY</b>에 발급받은 키를 붙여넣기<br>' +
              '3. 페이지 새로고침' +
            '</dd>' +
          '</dl>' +
        '</div>' +
        '<div class="btn-wrap"><button class="btn btn-primary" id="e-retry">다시 시도</button></div>'
      : '<div class="empty" style="padding-top:100px"><em>📡</em>' +
          UI.esc((state.error && state.error.message) || '예보를 받지 못했어요') +
          '<br>네트워크 상태를 확인해 주세요' +
        '</div>' +
        '<div class="btn-wrap"><button class="btn btn-primary" id="e-retry">다시 시도</button></div>';

    document.getElementById('screen-' + state.tab).innerHTML = body;
    var b = document.getElementById('e-retry');
    if (b) b.onclick = function () { boot(); };
  }

  /* ---------- 매시 정각 자동 갱신 ----------
     시간이 흐르면 '지금'의 자외선지수·기온이 달라지므로 1시간마다 다시 받아
     화면을 새로 계산한다. 정각에 맞춰 첫 틱을 걸고 이후 1시간 간격. */
  var hourlyTimer = null;
  function scheduleHourly() {
    if (hourlyTimer) clearTimeout(hourlyTimer);
    var now = new Date();
    var msToNextHour = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000;
    if (msToNextHour < 5000) msToNextHour += 3600000;
    hourlyTimer = setTimeout(function () {
      refresh(false);          // TTL(1시간) 지났으면 실제 재조회, 아니면 캐시로 재계산
      scheduleHourly();
    }, msToNextHour);
  }

  /* ---------- 생명주기 ---------- */
  var bootedDay = Engine.dayKey(new Date());
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    var today = Engine.dayKey(new Date());
    if (today !== bootedDay) { bootedDay = today; boot(); return; }   // 자정 넘김
    refresh(false);            // 돌아왔을 때 캐시가 1시간 넘었으면 새로 받는다
    scheduleHourly();
  });

  return {
    init: init, boot: boot, go: go, refresh: refresh,
    refreshView: refreshView, invalidate: invalidate,
    prescription: prescription, startTimer: startTimer, enableNotify: enableNotify,
    get state() { return state; }
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  App.init();
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      reg.update();                       // 새 sw.js가 있으면 즉시 받아온다
      /* 새 워커가 대기 상태로 멈춰 있으면 바로 넘겨받게 한다 —
         안 그러면 코드를 고쳐도 옛 캐시가 계속 나온다 */
      if (reg.waiting) reg.waiting.postMessage('skipWaiting');
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            location.reload();            // 새 버전 적용 후 한 번 새로고침
          }
        });
      });
    }).catch(function () {});
  }
});
