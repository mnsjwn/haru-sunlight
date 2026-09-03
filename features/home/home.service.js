/* =========================================================
   기능: 홈(오늘의 처방) — 서비스(로직)
   처방 도메인 결과를 화면이 그대로 그릴 수 있는 뷰모델로 변환한다.
   DOM 접근 없음.
   ========================================================= */
var HomeService = (function () {

  /* §5 식이 대체 — 용량 지시 없음. 공식 기준 수치만 인용 */
  var FOODS = [
    { emoji: '🐟', name: '연어 100g' },
    { emoji: '🐠', name: '고등어 100g' },
    { emoji: '🥚', name: '달걀 3개' }
  ];
  var OFFICIAL = {
    source: '한국인 영양소 섭취기준(2020) · 보건복지부',
    rows: [
      { k: '성인 충분섭취량', v: '400 IU / 일' },
      { k: '상한섭취량',      v: '4,000 IU / 일' }
    ]
  };

  function build(rx, opts) {
    opts = opts || {};
    var daily = Repo.getDaily();
    var weekly = Engine.weeklyCharge(daily);
    var todayPct = daily[rx.dateKey] || 0;
    var hasWindow = rx.windows.length > 0;

    return {
      rx: rx,
      loc: rx.loc,
      dateText: UI.dateKo(rx.date),
      stale: !!opts.stale,
      mode: rx.mode,
      modeLabel: rx.hasDaytimeData === false
        ? (rx.isNightNow ? '야간' : '낮 자료 없음')
        : rx.mode.label,
      hero: hero(rx),
      limits: limits(referencePoint(rx), rx),
      windows: windowRows(rx),
      chart: Chart.render(rx),
      weekly: weekly,
      todayPercent: todayPct,
      bodyStore: Math.round(Engine.bodyStore(daily)),
      gap: hasWindow ? null : gapAdvice(rx, daily, weekly),
      circadian: circadianCard(rx),
      weatherNow: weatherNow(referencePoint(rx)),
      sun: { rise: timePart(rx.sunrise), set: timePart(rx.sunset) },
      skinLabel: 'ⅠⅡⅢⅣⅤⅥ'[(rx.profile.skinType || 3) - 1],
      solarNoonText: UI.hm(rx.solarNoon),
      maxAltText: rx.maxAltitude.toFixed(0) + '°'
    };
  }

  /* 히어로에 쓸 기준 시점: 지금 창이 열려 있으면 '지금', 아니면 대상 창의 최적 시점 */
  function referencePoint(rx) {
    if (rx.activeWindow) return rx.nowPoint;
    if (rx.targetWindow) return rx.targetWindow.best;
    return rx.nowPoint;
  }

  function hero(rx) {
    var open = !!rx.activeWindow;
    var t = rx.targetWindow;

    if (open) {
      var p = rx.nowPoint;
      return {
        kicker: '지금 나가면',
        minutes: Math.max(1, Math.round(p.minutes)),
        why: whyText(p),
        when: UI.hm(rx.activeWindow.end) + '까지',
        cta: { label: '타이머 시작', action: 'timer', primary: true },
        sub: null,
        state: 'open'
      };
    }
    if (t) {
      return {
        kicker: UI.hmk(t.recommendStart) + '부터',
        minutes: t.recommendMinutes,
        why: whyText(t.best),
        when: UI.hm(t.start) + '–' + UI.hm(t.end),
        cta: { label: Notify.granted() ? '알림 예약됨' : '15분 전에 알려주기', action: 'notify', primary: true },
        sub: { label: '그래도 지금 나갈래요', action: 'timer' },
        state: 'waiting'
      };
    }
    /* 창이 하나도 없을 때 — "오늘은 무리"라고 말하는 것도 기능 (§9)
       다만 이유를 정확히 구분해야 한다:
         ① 창은 있었는데 이미 지나감
         ② 오늘 낮 자료 자체가 없음 (저녁 조회 — 기상청 발표가 밤 시간부터 시작)
         ③ 진짜로 날씨 때문에 창이 없음 (§4 모드) */
    var passed = rx.windows.length > 0;
    var noDaytime = rx.hasDaytimeData === false;

    return {
      kicker: null,
      minutes: null,
      passed: passed,
      noDaytime: noDaytime,
      headline: passed ? '오늘 창은 이미 지났어요'
              : noDaytime ? (rx.isNightNow ? '오늘은 해가 졌어요' : '오늘 낮 예보가 없어요')
              : rx.mode.headline,
      why: passed
        ? '마지막 창이 ' + UI.hm(rx.windows[rx.windows.length - 1].end) + '에 닫혔습니다'
        : noDaytime
        ? (rx.isNightNow
            ? '일몰 뒤에는 UVB가 도달하지 않습니다 · 기상청 예보도 밤 시간만 남았어요'
            : '기상청 발표 시각 기준으로 오늘 낮 자료가 아직 없어요')
        : rx.mode.reason,
      when: tomorrowText(rx),
      cta: null,
      sub: null,
      state: 'closed'
    };
  }

  /* 내일 안내 — 창이 없는 날도 그 사실을 말해 준다 */
  function tomorrowText(rx) {
    if (!rx.tomorrow) return '내일 아침에 다시 확인해 주세요';
    var t = rx.tomorrow;
    if (t.window) {
      return '내일은 ' + UI.hmk(t.window.recommendStart) + '부터 ' +
             t.window.recommendMinutes + '분 창이 열려요';
    }
    return '내일도 창이 없어요 · ' + t.rx.mode.label + ' 예보';
  }

  /* 상단 날씨 한 줄 — 카드나 칩 없이 조용히 붙는다 */
  function weatherNow(p) {
    if (!p) return null;
    return {
      uvi: p.uvi.toFixed(1),
      tempC: Math.round(p.tempC) + '℃',
      feels: Math.round(p.heatIndexC) + '℃'
    };
  }

  /* 무엇이 시간을 정했는지 — 한 줄로 짧게.
     자세한 근거는 아래 "무엇이 이 시간을 정했나" 섹션이 따로 보여 준다. */
  function whyText(p) {
    var name = { vitd: '비타민D 필요량', burn: '화상 한계', heat: '열 안전 상한' }[p.limitedBy];
    var josa = p.limitedBy === 'burn' ? '가' : '이';
    return '<b>' + name + '</b>' + josa + ' 정했어요';
  }

  /* 세 제약 breakdown — 무엇이 결정했는지가 이 앱의 핵심 (§2)
     고도가 45°에 못 미쳐 창 자체가 막힌 날은 그 사실이 진짜 결정자이므로 한 줄 더 얹는다 */
  function limits(p, rx) {
    if (!p) return [];
    var altBlocked = !!rx && rx.maxAltitude < 45;
    var rows = altBlocked ? [{
      key: 'alt', icon: '📐', name: '태양고도',
      value: rx.maxAltitude.toFixed(0) + '°',
      note: '45° 이상이어야 UVB가 대기를 통과합니다 · 오늘 최대치',
      win: true
    }] : [];
    return rows.concat([
      {
        key: 'vitd', icon: '☀️', name: '비타민D 필요량',
        value: UI.mins(p.vitd),
        note: 'MED ' + p.med + ' J/m² · 노출면적 ' + Math.round(p.fBSA * 100) + '% · UVI ' + p.uvi.toFixed(1),
        win: !altBlocked && p.limitedBy === 'vitd'
      },
      {
        key: 'burn', icon: '🔥', name: '화상 한계',
        value: UI.mins(p.burn),
        note: p.spf > 1 ? '자외선차단제 SPF ' + p.spf + ' 적용' : '차단제 없음(SPF 1) 기준',
        win: !altBlocked && p.limitedBy === 'burn'
      },
      {
        key: 'heat', icon: '🌡️', name: '열 안전 상한',
        value: UI.mins(p.heat),
        note: '체감 ' + p.heatIndexC.toFixed(0) + '℃' + (p.heatNote ? ' · ' + p.heatNote : ' · 제한 없음'),
        win: !altBlocked && p.limitedBy === 'heat'
      }
    ]);
  }

  function windowRows(rx) {
    return rx.windows.map(function (w, i) {
      return {
        index: i, start: w.start, end: w.end,
        timeText: UI.hm(w.start) + ' ~ ' + UI.hm(w.end),
        recommendText: UI.hm(w.recommendStart) + ' 시작 권장',
        minutes: w.recommendMinutes,
        meta: 'UVI ' + w.best.uvi.toFixed(1) + ' · 태양고도 ' + w.best.altitude.toFixed(0) +
              '° · ' + Math.round(w.best.tempC) + '℃',
        /* 안전 한계에 잘려 목표를 못 채우는 창은 그 사실을 밝힌다 */
        capped: w.completable === false,
        cappedNote: w.completable === false
          ? (w.best.limitedBy === 'heat'
              ? '더위로 한 번에 ' + UI.mins(w.best.heat) + '까지 · ' +
                Math.ceil(w.best.vitd / w.best.heat) + '번 나눠 나가면 채울 수 있어요'
              : '화상 한계로 ' + UI.mins(w.best.burn) + '까지 · 팔·다리를 더 내놓으면 줄어요')
          : null,
        best: i === 0,
        active: rx.activeWindow === w
      };
    });
  }

  /* §5 장마·흐림 / 겨울 — 대체 수단 안내 */
  function gapAdvice(rx, daily, weekly) {
    var miss = Engine.consecutiveMissDays(daily, false);
    var supplement = rx.profile.supplement;
    return {
      title: (rx.hasDaytimeData === false ? (rx.isNightNow ? '야간' : '낮 자료 없음') : rx.mode.label) +
             ' · ' + (miss > 1 ? miss + '일 연속 노출 창 없음' : '오늘은 노출 창 없음'),
      missDays: miss,
      weeklyPercent: weekly.percent,
      foods: FOODS,
      official: OFFICIAL,
      showSupplementWarning: supplement,
      supplementWarning: '보충제를 드시는 중이라고 하셨어요. ' +
        '햇빛으로 만든 양과 보충제 섭취량은 합산해서 상한(4,000 IU/일)을 넘지 않아야 합니다.',
      note: rx.hasDaytimeData === false
        ? (rx.isNightNow
            ? '해가 진 뒤라 오늘 채울 수 있는 몫은 끝났습니다. 그날 못 채운 만큼은 아래로 보완하세요.'
            : '기상청 발표 시각 기준으로 오늘 낮 예보가 아직 없습니다. 아침에 다시 확인해 주세요.')
        : rx.mode.id === 'winter'
        ? '겨울에는 태양고도가 낮아 UVB가 대기를 통과하지 못합니다. 이 기간에는 합성 자체가 되지 않아요.'
        : rx.mode.id === 'heat'
        ? '오늘 최고 체감온도가 ' + rx.maxHeatIndexC.toFixed(0) + '℃까지 올라 열 안전 상한에 걸렸습니다. 자외선이 없는 게 아니라 더위 때문에 창을 닫았어요.'
        : cloudNote(rx)
    };
  }

  /* 기상청은 청천 UV를 주지 않아 구름이 몇 % 깎았는지는 계산할 수 없다.
     대신 실측 UV 자체가 낮다는 사실만 전달한다. */
  function cloudNote(rx) {
    var peakUvi = rx.scanned.reduce(function (m, p) { return Math.max(m, p.uvi); }, 0);
    return '오늘 최고 자외선지수가 ' + peakUvi.toFixed(1) +
      '로 낮아 필요한 시간이 60분을 넘어갑니다. 그래서 창을 내지 않았어요.';
  }

  /* §6 축 2 — 생체리듬 */
  function circadianCard(rx) {
    if (!rx.circadian) return null;
    var c = rx.circadian;
    var hasWindow = rx.windows.length > 0;
    return {
      tminText: UI.hm(c.tmin),
      avoidText: UI.hm(c.avoidStart),
      phaseLabel: c.phaseLabel,
      wakeText: UI.hm(UI.timeToMin(rx.profile.wakeTime)),
      indoorHint: !hasWindow,
      body: hasWindow
        ? '심부체온 최저점은 <b>' + UI.hm(c.tmin) + '</b>. 그 이후에 빛을 보면 위상이 앞당겨져 밤에 일찍 졸립니다. ' +
          '<b>' + UI.hm(c.avoidStart) + '</b>부터 취침까지는 밝은 빛을 피하세요.'
        : '오늘은 비타민D 창이 없지만 <b>생체리듬은 창가에서 리셋됩니다.</b> ' +
          'UVB(290~315nm)는 유리에 막혀도 청색광(~460nm)은 통과하기 때문이에요. ' +
          '기상 후 <b>' + UI.hm(c.tmin) + '</b> 이후 창가에서 10~20분이면 충분합니다.'
    };
  }

  function timePart(iso) { return iso ? iso.slice(11, 16) : '—'; }

  /* 노출 완료 기록 — 타이머가 호출 */
  function record(rx, session) {
    Repo.addCharge(rx.dateKey, session.percent);
    Repo.addSession({
      dateKey: rx.dateKey,
      at: session.startedAt,
      minutes: session.minutes,
      percent: session.percent,
      clothing: session.clothing,
      spf: session.spf,
      limitedBy: session.limitedBy
    });
  }

  return {
    FOODS: FOODS, OFFICIAL: OFFICIAL,
    build: build, limits: limits, record: record
  };
})();
