/* =========================================================
   기능: 주간 — 뷰(화면)
   ========================================================= */
var WeeklyView = (function () {

  function render(m) {
    var el = document.getElementById('screen-weekly');
    el.innerHTML =
      '<div class="page-title">주간 기록</div>' +
      '<div class="page-sub">하루 목표를 100%로 봤을 때의 충전률입니다.</div>' +

      '<div class="sec" style="padding-top:8px">' +
        '<div class="gauge">' +
          '<div class="gauge-top">' +
            '<div style="font-size:13px;font-weight:600;color:#6B7684">최근 7일 평균</div>' +
            '<div class="gauge-num">' + m.weeklyPercent + '<small>%</small></div>' +
          '</div>' +
          '<div class="gauge-bar"><div class="gauge-fill" style="width:' + Math.min(100, m.weeklyPercent) + '%"></div></div>' +
        '</div>' +
        '<div style="height:16px"></div>' +
        '<div class="week">' +
          m.bars.map(function (b) {
            return '<div class="week-c' + (b.isToday ? ' today' : '') + '">' +
              '<div class="week-v">' + (b.percent ? b.percent : '') + '</div>' +
              '<div class="week-b ' + (b.isToday && b.percent ? 'today' : (b.percent ? 'has' : '')) +
                '" style="height:' + b.height + '%"></div>' +
              '<div class="week-d">' + b.label + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="sep"></div>' +
      '<div class="sec">' +
        '<div class="sec-title">체내 저장량</div>' +
        '<div class="sec-desc">25(OH)D는 하루 만에 사라지지 않습니다. 반감기 ' + m.halfLife +
          '일을 적용해 지난 노출을 감가한 추정치예요.</div>' +
        '<div class="gauge">' +
          '<div class="gauge-top">' +
            '<div style="font-size:13px;font-weight:600;color:#6B7684">누적 노출 ' + m.totalMinutes + '분</div>' +
            '<div class="gauge-num">' + m.bodyStore + '<small>%</small></div>' +
          '</div>' +
          '<div class="gauge-bar"><div class="gauge-fill" style="width:' + m.bodyStore + '%"></div></div>' +
          '<div class="gauge-cap">' +
            (m.missDays > 0
              ? '창 없는 날이 ' + m.missDays + '일째 이어지고 있어요. 저장량은 매일 조금씩 줄어듭니다.'
              : '꾸준히 채우는 중입니다.') +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="sep"></div>' +
      '<div class="sec">' +
        '<div class="sec-title">' + (m.forecast.length > 1 ? '앞으로 ' + m.forecast.length + '일' : '오늘 예보') + '</div>' +
        '<div class="sec-desc">' + (m.forecast.length > 1
          ? '기상청 단기예보 기준으로 창이 열리는 날입니다.'
          : '기상청 단기예보가 오늘치만 도착했어요. 보통 2~3일치가 함께 옵니다.') + '</div>' +
        '<div class="win-list">' +
          (m.forecast.length ? m.forecast.map(function (f) {
            return '<div class="win-item' + (f.isToday ? ' best' : '') + '">' +
              '<div class="win-rank" style="font-size:11px">' + f.label.split(' ')[1] + '</div>' +
              '<div><div class="win-time">' + f.label.split(' ')[0] + ' · ' + f.bestText + '</div>' +
                   '<div class="win-meta">' + f.mode.label + ' 모드 · 창 ' + f.count + '개</div></div>' +
              '<div class="win-min">' + (f.minutes || '—') + (f.minutes ? '<small>분</small>' : '') + '</div>' +
            '</div>';
          }).join('') : '<div class="empty">예보를 불러오지 못했어요</div>') +
        '</div>' +
      '</div>' +

      '<div class="sep"></div>' +
      '<div class="sec">' +
        '<div class="sec-title">노출 이력</div>' +
        (m.sessions.length
          ? '<div style="margin-top:6px">' + m.sessions.map(function (s) {
              return '<div class="log">' +
                '<div class="log-d">' + s.dateText + '</div>' +
                '<div class="log-t">' + s.timeText + ' · ' + s.minutes + '분' +
                  '<small>' + s.gear + ' · ' + s.limitLabel + ' 기준</small></div>' +
                '<div class="log-p">+' + s.percent + '%</div>' +
              '</div>';
            }).join('') + '</div>'
          : '<div class="empty"><em>🌤️</em>아직 기록이 없어요<br>타이머로 한 번 나가 보세요</div>') +
      '</div>';
  }

  return { render: render };
})();
