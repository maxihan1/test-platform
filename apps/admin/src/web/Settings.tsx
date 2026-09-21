// 설정 화면의 틀 (SPEC §8.8). 서비스 구획과 계정 구획을 얹는다. 운영 등급에게만 보인다
// 책상에서만 쓰는 화면이라 좁은 화면 대응을 하지 않는다 (§8)

import { api, type SettingsServiceRow, type User, type UserRow } from './api.js';
import { Head } from './Head.js';
import { 할수있나 } from './role.js';
import { ServiceSection } from './SettingsService.js';
import { UserSection } from './SettingsUser.js';
import { Failed, Loading, useAsync } from './ui.js';

/**
 * @param onMeChanged `GET /auth/me` 가 주는 것이 바뀌었을 때. 화면 전체가 그 응답 하나를 보고
 *   띠·자리·실행 설정을 그린다.
 *
 *   **이 화면은 그 응답의 재료를 고치는 자리다** — 계정의 배정·등급뿐 아니라
 *   서비스의 이름·색·대상 서버·Slack 웹훅이 전부 거기에 실려 나간다.
 *   다시 안 읽으면 새로고침할 때까지 옛 값을 본다. 첫 운영자는 그 상태로 멈춘다.
 */
export function Settings({ user, onMeChanged }: { user: User; onMeChanged: () => void }) {
  // 등급을 먼저 보지 않는다 — 훅은 갈래에 따라 건너뛸 수 없다.
  // 못 닿는 등급이 주소를 직접 쳐도 서버 gate.ts 가 403 을 내므로 목록이 비어 올 뿐이다
  const services = useAsync<{ items: SettingsServiceRow[] }>(() => api.settingsServices(), []);
  const users = useAsync<{ items: UserRow[] }>(() => api.settingsUsers(), []);

  // 서버 gate.ts 가 이미 막지만, 주소를 직접 친 사람에게 403 대신 이유를 보여준다
  if (!할수있나(user.role, '설정')) {
    return (
      <div className="screen">
        <div className="empty">
          설정은 운영 등급만 볼 수 있습니다
          <small>필요하면 운영 등급인 사람에게 올려 달라고 합니다</small>
        </div>
      </div>
    );
  }

  // **둘 다 본다.** 계정 목록만 실패하면 `users.data` 가 영영 null 이라
  // 「불러오는 중입니다」에서 멈춘다 — 새로고침해도 같고 사람은 느린 줄 안다
  const 오류 = services.error ?? users.error;
  if (오류 !== null) return <Failed error={오류} />;
  if (services.data === null || users.data === null) return <Loading />;

  return (
    <>
      <Head 제목="설정" 부제="운영 등급만 볼 수 있는 자리다" />

      <div className="screen">
      {/* 서비스는 자기 것인지 가리지 않고 늘 다시 읽는다 — 이름·색·대상 서버·웹훅이
          전부 /auth/me 에 실려 띠와 실행 설정으로 간다. 가리는 판단을 더하면 또 반쪽이 된다 */}
      <ServiceSection
        rows={services.data.items}
        onDone={() => {
          services.reload();
          onMeChanged();
        }}
      />
      <UserSection
        rows={users.data.items}
        services={services.data.items}
        me={user.username}
        onDone={users.reload}
        onSelf={onMeChanged}
      />
      </div>
    </>
  );
}
