// 설정 화면의 틀 (SPEC §8.8). 왼쪽 설정 메뉴(서비스마다 · 계정 · 가입 신청)와 고른 것 하나를 오른쪽에 얹는다. 운영 계정에게만 보인다
// 책상에서만 쓰는 화면이라 좁은 화면 대응을 하지 않는다 (§8)

import { useState } from 'react';

import { api, type SettingsServiceRow, type User, type UserRow } from './api.js';
import { Head } from './Head.js';
import { use말 } from './i18n.js';
import { 할수있나 } from './role.js';
import { PendingSection } from './SettingsPending.js';
import { ServicePanel } from './SettingsService.js';
import { UserSection } from './SettingsUser.js';
import { Failed, Loading, useAsync } from './ui.js';

/**
 * @param 자리 주소의 고른 것 — 서비스 접두사 · `users` · `pending` · `new`. 없으면 첫 서비스(없으면 새 서비스)다.
 *   한 페이지에 서비스 · 가입 신청 · 계정을 다 쌓아 두면 「무슨 설정인지 모르겠다」고 했다(2026-10-07 사용자 · 2026-10-09 시안 A)
 * @param onMeChanged `GET /auth/me` 가 주는 것이 바뀌었을 때. 화면 전체가 그 응답 하나를 보고
 *   띠·자리·실행 설정을 그린다.
 *
 *   **이 화면은 그 응답의 재료를 고치는 자리다** — 계정의 배정·등급뿐 아니라
 *   서비스의 이름·색·대상 서버·Slack 웹훅이 전부 거기에 실려 나간다.
 *   다시 안 읽으면 새로고침할 때까지 옛 값을 본다. 첫 운영자는 그 상태로 멈춘다.
 */
export function Settings({ user, onMeChanged, 자리 }: { user: User; onMeChanged: () => void; 자리?: string }) {
  const t = use말();
  // 등급을 먼저 보지 않는다 — 훅은 갈래에 따라 건너뛸 수 없다.
  // 못 닿는 등급이 주소를 직접 쳐도 서버 gate.ts 가 403 을 내므로 목록이 비어 올 뿐이다
  const services = useAsync<{ items: SettingsServiceRow[] }>(() => api.settingsServices(), []);
  const users = useAsync<{ items: UserRow[] }>(() => api.settingsUsers(), []);
  // 저장한 서비스 칸을 새로 읽은 값으로 다시 그린다 — 안 그리면 적어 넣은 비밀값이 칸에 남아 다음 저장에 또 간다(2026-10-09 코드 검토)
  const [판, set판] = useState(0);
  // 방금 저장한 자리. 그 자리를 보는 동안만 「저장했습니다」를 띄운다 — 앞 판은 저장하면 폼이 닫혀 그것이 확인이었다
  const [저장한곳, set저장한곳] = useState<string | null>(null);

  // 서버 gate.ts 가 이미 막지만, 주소를 직접 친 사람에게 403 대신 이유를 보여준다
  if (!할수있나(user, null, '설정')) {
    return (
      <div className="screen">
        <div className="empty">
          {t('설정은 운영 계정만 볼 수 있습니다')}
          <small>{t('필요하면 운영 계정인 사람에게 올려 달라고 합니다')}</small>
        </div>
      </div>
    );
  }

  // **둘 다 본다.** 계정 목록만 실패하면 `users.data` 가 영영 null 이라
  // 「불러오는 중입니다」에서 멈춘다 — 새로고침해도 같고 사람은 느린 줄 안다
  const 오류 = services.error ?? users.error;
  if (오류 !== null) return <Failed error={오류} />;
  if (services.data === null || users.data === null) return <Loading />;

  const 서비스들 = services.data.items;
  // 접두사는 늘 대문자다. 손으로 친 소문자 주소도 그 서비스를 연다 — 메뉴 낱말(users · pending · new)만 그대로 둔다
  const 고른 = 자리 === undefined ? (서비스들[0]?.prefix ?? 'new') : 메뉴낱말.has(자리) ? 자리 : 자리.toUpperCase();
  const 서비스 = 서비스들.find((it) => it.prefix === 고른);
  const 대기수 = users.data.items.filter((it) => it.isApproved === false).length;
  // 서비스는 자기 것인지 가리지 않고 늘 다시 읽는다 — 이름·색·대상 서버·웹훅이 전부 /auth/me 에 실려 띠와 실행 창으로 간다.
  // **읽은 뒤에** 칸을 다시 그리고 옮긴다 — 먼저 옮기면 옛 목록에 새 접두사가 없어 「그런 서비스가 없습니다」가 깜빡였다
  const 서비스다시 = async (접두사: string, 옮기나: boolean) => {
    onMeChanged();
    if (!(await services.reload())) return;
    set판((n) => n + 1);
    set저장한곳(접두사);
    if (옮기나) window.location.hash = `#/settings/${encodeURIComponent(접두사)}`;
  };

  return (
    <>
      <Head 제목={t('설정')} 부제={t('운영 계정만 볼 수 있는 화면입니다')} />

      <div className="screen set-layout">
        <설정메뉴 서비스들={서비스들} 고른={고른} 계정수={users.data.items.length - 대기수} 대기수={대기수} />
        <div className="set-main">
          {고른 === 'users' ? (
            <UserSection rows={users.data.items} services={서비스들} me={user.username} onDone={users.reload} onSelf={onMeChanged} />
          ) : 고른 === 'pending' ? (
            대기수 === 0 ? (
              <div className="empty">{t('기다리는 가입 신청이 없습니다')}</div>
            ) : (
              <PendingSection rows={users.data.items} services={서비스들} onDone={users.reload} />
            )
          ) : 고른 === 'new' ? (
            // 만든 서비스로 옮긴다. 새 서비스 칸에 남으면 같은 것을 또 만들려 한다
            <ServicePanel key="new" onDone={(접두사) => void 서비스다시(접두사, true)} />
          ) : 서비스 === undefined ? (
            <div className="empty">{t('그런 서비스가 없습니다')}</div>
          ) : (
            // 서비스마다 · 저장할 때마다 새로 그린다 — 앞 서비스에서 적다 만 글자가 다른 서비스 칸에 남으면 남의 서비스에 저장된다
            <>
              {저장한곳 === 서비스.prefix ? <p className="hint set-saved" role="status">{t('저장했습니다')}</p> : null}
              <ServicePanel key={`${서비스.id}-${판}`} row={서비스} onDone={(접두사) => void 서비스다시(접두사, false)} />
            </>
          )}
        </div>
      </div>
    </>
  );
}

const 메뉴낱말 = new Set(['users', 'pending', 'new']);

/** 설정 안의 메뉴. 주소를 바꾸는 링크다 — 새로고침 · 뒤로 가기가 고른 것을 지킨다 */
function 설정메뉴({ 서비스들, 고른, 계정수, 대기수 }: { 서비스들: SettingsServiceRow[]; 고른: string; 계정수: number; 대기수: number }) {
  const t = use말();
  const 자리 = (값: string) => (값 === 고른 ? { 'aria-current': 'page' as const } : {});

  return (
    <nav className="set-nav" aria-label={t('설정 메뉴')}>
      <h2>{t('서비스')}</h2>
      {서비스들.length === 0 ? <p className="hint">{t('아직 서비스가 없습니다')}</p> : null}
      {서비스들.map((it) => (
        <a key={it.id} href={`#/settings/${encodeURIComponent(it.prefix)}`} {...자리(it.prefix)}>
          <span className="set-nav-name">{it.name}</span>
          {/* 접두사는 늘 둔다 — 주소와 케이스 번호에 쓰이는 이름이다. 비활성이면 곁에 그 사실을 더한다 */}
          <span className="set-nav-sub">{it.isActive ? it.prefix : `${it.prefix} · ${t('비활성')}`}</span>
        </a>
      ))}
      <a href="#/settings/new" className="set-nav-add" {...자리('new')}>
        {t('+ 서비스 추가')}
      </a>
      <h2>{t('사람')}</h2>
      <a href="#/settings/users" {...자리('users')}>
        <span className="set-nav-name">{t('계정')}</span>
        <span className="set-nav-sub">{계정수}</span>
      </a>
      {/* 기다리는 신청이 없으면 자리가 없다 — 승인 대기 묶음과 같은 규칙이다 (§8.8) */}
      {대기수 === 0 ? null : (
        <a href="#/settings/pending" {...자리('pending')}>
          <span className="set-nav-name">{t('가입 신청')}</span>
          <span className="set-nav-sub set-nav-count">{대기수}</span>
        </a>
      )}
    </nav>
  );
}
