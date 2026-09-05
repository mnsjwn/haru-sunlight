/*
  일광 처방 — 서비스 워커 (알림 전용, 오프라인 캐싱 없음)

  이 파일이 존재하는 유일한 이유: iOS Safari는 "홈 화면에 추가"로 설치된
  웹앱(standalone)에서만, 그리고 반드시 서비스 워커의 registration.showNotification()을
  거쳐야만 Notification API가 동작한다(iOS 16.4+). index.html의 new Notification(...)
  직접 호출만으로는 iOS에서 알림이 뜨지 않는다.

  이 프로젝트는 백엔드가 없는 클라이언트 전용 구조를 유지한다.
  그래서 이 서비스 워커는:
    - Push API를 사용하지 않는다 (서버가 없어 푸시를 보낼 주체가 없음)
    - fetch 이벤트를 가로채지 않는다 → 오프라인 캐싱을 하지 않음 → 코드를
      수정해서 다시 배포하면 사용자는 항상 최신 버전을 받는다(캐시 무효화
      버그를 걱정할 필요가 없다)
    - install/activate 시 즉시 스스로를 활성화만 해서, index.html이
      navigator.serviceWorker.ready로 이 워커를 곧바로 사용할 수 있게 한다

  즉 "앱이 완전히 꺼진 상태에서도 정해진 시각에 알림이 오는" 진짜 푸시는
  이 파일로는 구현되지 않는다. 그건 서버(VAPID 키 발급 + 발송 트리거)가
  반드시 필요한, 별도의 더 큰 작업이다.
*/

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// 알림을 탭하면 이미 열려 있는 탭으로 포커스를 옮기고, 없으면 새로 연다.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => "focus" in c);
      if (existing) return existing.focus();
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});
