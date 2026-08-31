/* =========================================================
   core / 처방 도메인 서비스  (백엔드 계층 — 유스케이스)
   외부 데이터(1계층) + 계산 엔진(2계층) + 모드 판정(3계층)을 조합해
   "그날의 처방" 하나를 만들어 낸다. DOM을 절대 건드리지 않는다.
   ========================================================= */
var Prescription = (function () {

  function tzHours(weather) {
    if (weather && typeof weather.utcOffsetSeconds === 'number') {
      return weather.utcOffsetSeconds / 3600;
    }
    return -new Date().getTimezoneOffset() / 60;
  }

  /* '지금'은 기기 시계가 아니라 예보 지점의 현지 시각이어야 한다.
     (기기 시간대와 조회 지점의 시간대가 다를 때 창이 어긋나는 것을 막는다) */
  function localNow(tzH) {
    var now = new Date();
    var d = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + tzH * 3600000);
    return {
      date: d,
      minute: d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60,
      key: Engine.dayKey(d)
    };
  }

  function findDay(weather, dateKey) {
    for (var i = 0; i < weather.days.length; i++) {
      if (weather.days[i].date === dateKey) return weather.days[i];
    }
    return null;
  }

  /* 하루치 처방 계산 */
  function forDate(weather, loc, profile, dateKey) {
    var day = findDay(weather, dateKey);
    if (!day || day.hourly.length < 2) return null;

    var parts = dateKey.split('-');
    var y = +parts[0], mo = +parts[1], d = +parts[2];
    var tz = tzHours(weather);

    var sunAlt = function (minuteOfDay) {
      return Solar.altitude(y, mo, d, minuteOfDay, loc.lat, loc.lon, tz);
    };

    var series = Engine.interpolate(day.hourly, 10);
    var scanned = Engine.scan(series, profile, sunAlt);
    var allWindows = Engine.findWindows(scanned);

    var maxAltitude = Solar.maxAltitude(y, mo, d, loc.lat, loc.lon, tz);
    var maxHeatIndexC = scanned.reduce(function (m, p) {
      return Math.max(m, p.heatIndexC);
    }, -99);

    var mode = Engine.decideMode({
      maxAltitude: maxAltitude,
      maxHeatIndexC: maxHeatIndexC,
      windows: allWindows
    });

    return {
      dateKey: dateKey, date: new Date(y, mo - 1, d),
      tz: tz, loc: loc, profile: profile,
      sunrise: day.sunrise, sunset: day.sunset,
      series: series, scanned: scanned,
      allWindows: allWindows, windows: mode.windows,
      droppedWindows: allWindows.length - mode.windows.length,
      maxAltitude: maxAltitude, maxHeatIndexC: maxHeatIndexC,
      solarNoon: Solar.solarNoonMinutes(y, mo, d, loc.lon, tz),
      mode: mode,
      sunAlt: sunAlt
    };
  }

  /* 오늘 처방 + '지금' 상태 */
  function forToday(weather, loc, profile) {
    var here = localNow(tzHours(weather));
    var rx = forDate(weather, loc, profile, here.key);
    if (!rx) return null;

    var nowM = here.minute;
    rx.nowMinute = nowM;
    rx.nowPoint = pointAt(rx, nowM);

    rx.activeWindow = null;
    rx.nextWindow = null;
    rx.windows.forEach(function (w) {
      if (nowM >= w.start && nowM < w.end) rx.activeWindow = w;
      else if (nowM < w.start && !rx.nextWindow) rx.nextWindow = w;
    });
    /* 오늘 남은 창이 없으면 내일 첫 창을 미리 뽑아 둔다 (§9 "내일 아침 창 제시") */
    rx.tomorrow = null;
    var tk = Engine.dayKey(new Date(here.date.getTime() + 86400000));
    var trx = forDate(weather, loc, profile, tk);
    if (trx && trx.windows.length) {
      rx.tomorrow = { rx: trx, window: trx.windows[0] };
    }

    /* 권장 대상 창: 지금 열린 창 > 다음 창 > 없음 */
    rx.targetWindow = rx.activeWindow || rx.nextWindow || null;

    /* §6 생체리듬 */
    if (profile.useCircadian) {
      var wake = UI.timeToMin(profile.wakeTime);
      var expo = rx.targetWindow ? rx.targetWindow.recommendStart : null;
      rx.circadian = Engine.circadian(wake, expo);
    }
    return rx;
  }

  /* 특정 시각의 계산 결과 (10분 격자에서 가장 가까운 표본) */
  function pointAt(rx, minute) {
    var best = null, bd = Infinity;
    for (var i = 0; i < rx.scanned.length; i++) {
      var d = Math.abs(rx.scanned[i].minuteOfDay - minute);
      if (d < bd) { bd = d; best = rx.scanned[i]; }
    }
    return best;
  }

  /* 지금 이 순간의 값을 프로필(옷차림·SPF)만 바꿔 재계산 — 타이머 실시간 반영용 */
  function recomputeNow(rx, profile) {
    var p = pointAt(rx, localNow(rx.tz).minute);
    return Engine.computePoint({
      uvi: p.uvi, tempC: p.tempC, rh: p.rh,
      skinType: profile.skinType, clothing: profile.clothing, spf: profile.spf
    });
  }

  /* 7일 예보 전체 처방 (주간 화면 · 장마 연속일수 판정) */
  function forWeek(weather, loc, profile) {
    return weather.days.map(function (d) {
      return forDate(weather, loc, profile, d.date);
    }).filter(Boolean);
  }

  return {
    forDate: forDate, forToday: forToday, forWeek: forWeek,
    pointAt: pointAt, recomputeNow: recomputeNow, tzHours: tzHours,
    localNow: localNow
  };
})();
