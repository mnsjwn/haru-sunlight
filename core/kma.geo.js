/* =========================================================
   core / 기상청 좌표계  [백엔드 계층]
   - 위경도 → 단기예보 격자(nx, ny)  : 기상청 DFS Lambert Conformal Conic
   - 위경도 → 생활기상지수 지점코드(areaNo) : 행정표준코드 최근접 매핑
   기상청 API는 위경도를 그대로 받지 않으므로 이 변환이 반드시 필요하다.
   ========================================================= */
var KmaGeo = (function () {

  /* ---------- 단기예보 격자 변환 (기상청 배포 공식 그대로) ---------- */
  var RE = 6371.00877, GRID = 5.0, SLAT1 = 30.0, SLAT2 = 60.0;
  var OLON = 126.0, OLAT = 38.0, XO = 43, YO = 136;
  var DEGRAD = Math.PI / 180.0, PI = Math.PI;

  function toGrid(lat, lon) {
    var re = RE / GRID;
    var slat1 = SLAT1 * DEGRAD, slat2 = SLAT2 * DEGRAD;
    var olon = OLON * DEGRAD, olat = OLAT * DEGRAD;

    var sn = Math.tan(PI * 0.25 + slat2 * 0.5) / Math.tan(PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);

    var sf = Math.tan(PI * 0.25 + slat1 * 0.5);
    sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;

    var ro = Math.tan(PI * 0.25 + olat * 0.5);
    ro = re * sf / Math.pow(ro, sn);

    var ra = Math.tan(PI * 0.25 + lat * DEGRAD * 0.5);
    ra = re * sf / Math.pow(ra, sn);

    var theta = lon * DEGRAD - olon;
    if (theta > PI) theta -= 2.0 * PI;
    if (theta < -PI) theta += 2.0 * PI;
    theta *= sn;

    return {
      nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
      ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5)
    };
  }

  /* 대한민국 격자 범위 밖이면 기상청 API를 쓸 수 없다 */
  function inKorea(lat, lon) {
    return lat >= 32 && lat <= 39.5 && lon >= 124 && lon <= 132;
  }

  /* ---------- 지원 도시 ----------
     nx/ny는 기상청이 배포하는 공식 단기예보 지점 격자값(검증됨).
     areaNo는 생활기상지수 지점코드(10자리 행정표준코드) — 문서 상 형식대로
     구성했으나 실서비스키로 1회 대조가 필요하다. 설정 화면에서 확인/수정 가능. */
  var CITIES = [
    { name: '서울', lat: 37.5665, lon: 126.9780, nx: 60,  ny: 127, areaNo: '1100000000' },
    { name: '인천', lat: 37.4563, lon: 126.7052, nx: 55,  ny: 124, areaNo: '2800000000' },
    { name: '수원', lat: 37.2636, lon: 127.0286, nx: 60,  ny: 121, areaNo: '4111000000' },
    { name: '춘천', lat: 37.8813, lon: 127.7300, nx: 73,  ny: 134, areaNo: '5111000000' },
    { name: '강릉', lat: 37.7519, lon: 128.8761, nx: 92,  ny: 131, areaNo: '5115000000' },
    { name: '대전', lat: 36.3504, lon: 127.3845, nx: 67,  ny: 100, areaNo: '3000000000' },
    { name: '세종', lat: 36.4800, lon: 127.2890, nx: 66,  ny: 103, areaNo: '3600000000' },
    { name: '청주', lat: 36.6424, lon: 127.4890, nx: 69,  ny: 106, areaNo: '4311000000' },
    { name: '안동', lat: 36.5684, lon: 128.7294, nx: 91,  ny: 106, areaNo: '4717000000' },
    { name: '포항', lat: 36.0190, lon: 129.3435, nx: 102, ny: 94,  areaNo: '4711000000' },
    { name: '대구', lat: 35.8714, lon: 128.6014, nx: 89,  ny: 90,  areaNo: '2700000000' },
    { name: '전주', lat: 35.8242, lon: 127.1480, nx: 63,  ny: 89,  areaNo: '5211000000' },
    { name: '광주', lat: 35.1595, lon: 126.8526, nx: 58,  ny: 74,  areaNo: '2900000000' },
    { name: '울산', lat: 35.5384, lon: 129.3114, nx: 102, ny: 84,  areaNo: '3100000000' },
    { name: '창원', lat: 35.2280, lon: 128.6811, nx: 90,  ny: 77,  areaNo: '4812000000' },
    { name: '부산', lat: 35.1796, lon: 129.0756, nx: 98,  ny: 76,  areaNo: '2600000000' },
    { name: '여수', lat: 34.7604, lon: 127.6622, nx: 73,  ny: 66,  areaNo: '4613000000' },
    { name: '제주', lat: 33.4996, lon: 126.5312, nx: 52,  ny: 38,  areaNo: '5011000000' }
  ];

  function nearestCity(lat, lon) {
    var best = CITIES[0], bd = Infinity;
    CITIES.forEach(function (c) {
      var d = Math.pow(c.lat - lat, 2) + Math.pow((c.lon - lon) * 0.8, 2);
      if (d < bd) { bd = d; best = c; }
    });
    return best;
  }

  return { toGrid: toGrid, inKorea: inKorea, CITIES: CITIES, nearestCity: nearestCity };
})();
