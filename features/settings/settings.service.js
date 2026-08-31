/* =========================================================
   기능: 설정 — 서비스(로직)
   §9 · 피부타입 · 기상시간 · 보충제 복용 여부 (+ 위치 · 알림)
   ========================================================= */
var SettingsService = (function () {

  var SKIN = [
    { t: 1, label: 'Ⅰ', desc: '항상 타고 절대 안 그을림' },
    { t: 2, label: 'Ⅱ', desc: '쉽게 타고 조금 그을림' },
    { t: 3, label: 'Ⅲ', desc: '가끔 타고 서서히 그을림' },
    { t: 4, label: 'Ⅳ', desc: '거의 안 타고 잘 그을림' },
    { t: 5, label: 'Ⅴ', desc: '드물게 타고 진하게 그을림' },
    { t: 6, label: 'Ⅵ', desc: '타지 않음' }
  ];
  var SPF = [1, 15, 30, 50];

  function model() {
    var p = Repo.getProfile();
    var loc = Repo.getLocation();
    var cache = Repo.getWeatherCache();
    return {
      profile: p,
      location: loc,
      hasKey: WeatherAPI.hasKey(),
      skinOptions: SKIN,
      spfOptions: SPF,
      clothingOptions: Object.keys(Engine.CLOTHING).map(function (k) {
        return { key: k, label: Engine.CLOTHING[k].label, f: Engine.CLOTHING[k].f };
      }),
      medOfCurrent: Engine.MED[p.skinType],
      notifySupported: Notify.supported(),
      notifyGranted: Notify.granted(),
      cacheText: cache
        ? cache.dateKey + ' · ' + new Date(cache.fetchedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) + ' 갱신' +
          (cache.uvMissing ? ' · 자외선지수 누락(날씨만 반영)' : '')
        : '없음'
    };
  }

  function set(patch) { return Repo.setProfile(patch); }

  /* config.local.js에 넣어 둔 키 + 지금 위치로 실제 호출해 본다 —
     경로·키가 맞는지 확인하는 용도일 뿐, 여기서 키를 입력받지는 않는다 */
  function testConnection() {
    var loc = Repo.getLocation();
    if (!loc) return Promise.reject(new Error('위치가 설정되지 않았습니다'));
    return WeatherAPI.load(loc, true).then(function (res) { return res.data; });
  }

  function toggleNotify(on) {
    if (!on) { Repo.setProfile({ notify: false }); Notify.clear(); return Promise.resolve(false); }
    return Notify.request().then(function (ok) {
      Repo.setProfile({ notify: ok });
      return ok;
    });
  }

  function useGeolocation() {
    return WeatherAPI.locate().then(function (loc) {
      Repo.setLocation(loc);
      return loc;
    });
  }
  function useCity(name) {
    var c = WeatherAPI.CITIES.filter(function (x) { return x.name === name; })[0];
    if (!c) return null;
    var loc = { lat: c.lat, lon: c.lon, name: c.name, precise: false, nx: c.nx, ny: c.ny, areaNo: c.areaNo };
    Repo.setLocation(loc);
    return loc;
  }

  function resetAll() { Repo.reset(); }

  return {
    SKIN: SKIN, SPF: SPF,
    model: model, set: set, toggleNotify: toggleNotify,
    testConnection: testConnection,
    useGeolocation: useGeolocation, useCity: useCity, resetAll: resetAll
  };
})();
