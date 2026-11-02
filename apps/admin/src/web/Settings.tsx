// 설정 화면의 틀 (SPEC §8.8). 왼쪽 설정 메뉴(프로젝트마다 · 애플리케이션마다 · 계정 · 가입 신청)와 고른 것 하나를 오른쪽에 얹는다. 운영 계정에게만 보인다
// 책상에서만 쓰는 화면이라 좁은 화면 대응을 하지 않는다 (§8)

import { Fragment, useEffect, useState } from 'react';

import { api, type SettingsProject, type SettingsServiceRow, type User, type UserRow } from './api.js';
import { BTS이름 } from './btsName.js';
import { Head } from './Head.js';
import { 고른서비스를읽는다 } from './layout.js';
import { 떠나기로했다 } from './leaveGuard.js';
import { use말 } from './i18n.js';
import { 할수있나 } from './role.js';
import { SettingsBts } from './SettingsBts.js';
import { PendingSection } from './SettingsPending.js';
import { SettingsPerfAgents } from './SettingsPerfAgents.js';
import { SettingsPerfDummy } from './SettingsPerfDummy.js';
import { ProjectPanel } from './SettingsProject.js';
import { ServicePanel } from './SettingsService.js';
import { UserSection } from './SettingsUser.js';
import { SettingsWizard } from './SettingsWizard.js';
import { 프로젝트줄들, type 프로젝트줄 } from './settingsView.js';
import { Failed, Loading, useAsync } from './ui.js';

/**
 * @param 자리 주소의 고른 것 — 서비스 접두사 · `project-<번호>` · `project-new` · `users` · `pending` · `new`. 없으면 첫 서비스(없으면 새로 만들기 마법사)다.
 *   한 페이지에 서비스 · 가입 신청 · 계정을 다 쌓아 두면 「무슨 설정인지 모르겠다」고 했다(2026-10-07 사용자 · 2026-10-09 시안 A)
 * @param onMeChanged `GET /auth/me` 가 주는 것이 바뀌었을 때. 화면 전체가 그 응답 하나를 보고
 *   띠·자리·실행 설정을 그린다.
 *
 *   **이 화면은 그 응답의 재료를 고치는 자리다** — 계정의 배정·등급뿐 아니라
 *   서비스의 이름·색·대상 서버·Slack 웹훅이 전부 거기에 실려 나간다.
 *   다시 안 읽으면 새로고침할 때까지 옛 값을 본다. 첫 운영자는 그 상태로 멈춘다.
 * @param on서비스번호 맨 위 고르개를 그 애플리케이션으로 바꾼다 — 마법사 끝 화면의 「테스트 작성 시작」이 쓴다
 */
export function Settings({ user, onMeChanged, 자리, on서비스번호 }: { user: User; onMeChanged: () => void; 자리?: string; on서비스번호?: (serviceId: number) => void }) {
  const t = use말();
  // 등급을 먼저 보지 않는다 — 훅은 갈래에 따라 건너뛸 수 없다.
  // 못 닿는 등급이 주소를 직접 쳐도 서버 gate.ts 가 403 을 내므로 목록이 비어 올 뿐이다
  const projects = useAsync<{ items: SettingsProject[] }>(() => api.settingsProjects(), []);
  const services = useAsync<{ items: SettingsServiceRow[] }>(() => api.settingsServices(), []);
  const users = useAsync<{ items: UserRow[] }>(() => api.settingsUsers(), []);
  // 저장한 서비스 칸을 새로 읽은 값으로 다시 그린다 — 안 그리면 적어 넣은 비밀값이 칸에 남아 다음 저장에 또 간다(2026-10-09 코드 검토)
  const [판, set판] = useState(0);
  // 방금 저장한 자리. 그 자리를 보는 동안만 「저장했습니다」를 띄운다 — 앞 판은 저장하면 폼이 닫혀 그것이 확인이었다
  const [저장한곳, set저장한곳] = useState<string | null>(null);
  // 애플리케이션이 하나도 없으면 마법사 주소로 바꿔 둔다 — 다 만든 뒤 목록을 다시 읽어도 마법사(끝 화면)가 그 자리에 남게.
  // 주소가 비어 있으면 첫 애플리케이션을 여는데, 막 만든 것이 그 첫 애플리케이션이 되어 끝 화면이 사라졌다.
  // 프로젝트도 없을 때 프로젝트부터 만드는 것은 마법사가 정한다(아래 새프로젝트)
  const 비었다 = 자리 === undefined && services.data?.items.length === 0;
  useEffect(() => {
    if (비었다) window.location.replace('#/settings/new');
  }, [비었다]);

  // 서버 gate.ts 가 이미 막지만, 주소를 직접 친 사람에게 403 대신 이유를 보여준다
  if (!할수있나(user, null, '설정')) {
    return (
      <div className="screen">
        <div className="empty">
          {t('설정은 관리자만 볼 수 있습니다')}
          <small>{t('권한이 필요하면 관리자에게 요청해 주세요')}</small>
        </div>
      </div>
    );
  }

  // **둘 다 본다.** 계정 목록만 실패하면 `users.data` 가 영영 null 이라
  // 「불러오는 중입니다」에서 멈춘다 — 새로고침해도 같고 사람은 느린 줄 안다
  const 오류 = projects.error ?? services.error ?? users.error;
  if (오류 !== null) return <Failed error={오류} />;
  if (projects.data === null || services.data === null || users.data === null) return <Loading />;

  const 서비스들 = services.data.items;
  const 프로젝트들 = projects.data.items;
  // 접두사는 늘 대문자다. 손으로 친 소문자 주소도 그 서비스를 연다 — 메뉴 낱말(users · pending · new)만 그대로 둔다
  // 주소에 자리가 없으면 맨 위에서 고른 서비스로 연다. 그 서비스가 목록에 없으면 첫 서비스다 (점검 N13)
  const 헤더서비스 = 서비스들.find((it) => it.prefix === 고른서비스를읽는다())?.prefix;
  // 프로젝트 자리는 접두사 모양(대문자·숫자)에 안 걸리게 `project-` 로 시작한다 — 대문자로 바꾸기 전에 먼저 가른다
  // `project-<번호>-bts` 는 그 프로젝트의 BTS 연결 화면이다 (도메인/BTS §8.15)
  const 프로젝트자리 = 자리 !== undefined && /^project-(new|\d+(-bts)?)$/i.test(자리);
  const 고른 =
    자리 === undefined
      ? (헤더서비스 ?? 서비스들[0]?.prefix ?? 'new')
      : 프로젝트자리
        ? 자리.toLowerCase()
        : 메뉴낱말.has(자리)
          ? 자리
          : 자리.toUpperCase();
  const 서비스 = 서비스들.find((it) => it.prefix === 고른);
  const BTS자리 = 고른.endsWith('-bts');
  const 프로젝트 = 프로젝트들.find((it) => `project-${it.id}` === (BTS자리 ? 고른.slice(0, -'-bts'.length) : 고른));
  const 프로젝트줄 = 프로젝트줄들(프로젝트들, 서비스들);
  const 대기수 = users.data.items.filter((it) => it.isApproved === false).length;
  // 마법사의 「나가기」 — 보던 애플리케이션, 없으면 첫 프로젝트, 그것도 없으면 계정이다
  const 나갈자리 = 헤더서비스 ?? 서비스들[0]?.prefix;
  const 나가는곳 =
    나갈자리 !== undefined ? `#/settings/${encodeURIComponent(나갈자리)}` : 프로젝트들[0] !== undefined ? `#/settings/project-${프로젝트들[0].id}` : '#/settings/users';
  // 서비스는 자기 것인지 가리지 않고 늘 다시 읽는다 — 이름·색·대상 서버·웹훅이 전부 /auth/me 에 실려 띠와 실행 창으로 간다.
  // **읽은 뒤에** 칸을 다시 그리고 옮긴다 — 먼저 옮기면 옛 목록에 새 접두사가 없어 「그런 서비스가 없습니다」가 깜빡였다
  const 서비스다시 = async (접두사: string, 옮기나: boolean, 저장 = true) => {
    onMeChanged();
    // 프로젝트도 같이 읽는다 — 메뉴는 애플리케이션을 제 프로젝트 줄 아래에 그려서, 다른 탭이 막 만든 프로젝트를 모르면 그 애플리케이션이 메뉴에서 빠진다
    if ((await Promise.all([projects.reload(), services.reload()])).includes(false)) return;
    // 활성만 뒤집었으면 칸을 다시 그리지 않는다 — 다시 그리면 저장 안 한 대상 서버 줄 · 웹훅이 사라지고 「저장했습니다」가 떴다(리뷰 L32)
    if (!저장) return;
    set판((n) => n + 1);
    set저장한곳(접두사);
    if (옮기나) {
      // 방금 저장한 서비스로 옮기는 자기 이동이다 — 떠나기 상자를 띄우지 않는다
      떠나기로했다();
      window.location.hash = `#/settings/${encodeURIComponent(접두사)}`;
    }
  };

  // 프로젝트를 만들거나 이름을 바꾸거나 애플리케이션을 옮기면 /auth/me 의 프로젝트도 달라지고,
  // 비어 지워진 프로젝트의 권한 줄은 서버가 같이 지우므로 계정 목록도 다시 읽는다
  const 프로젝트다시 = async () => {
    onMeChanged();
    const 읽음 = await Promise.all([projects.reload(), services.reload(), users.reload()]);
    if (읽음.includes(false)) return;
    set판((n) => n + 1);
  };

  return (
    <>
      <Head 제목={t('설정')} 부제={t('관리자만 볼 수 있는 화면입니다')} />

      <div className="screen set-layout">
        <설정메뉴 프로젝트들={프로젝트줄} 서비스들={서비스들} 고른={고른} 계정수={users.data.items.length - 대기수} 대기수={대기수} />
        <div className="set-main">
          {고른 === 'perf-agents' ? (
            <SettingsPerfAgents
              projects={프로젝트들.map(({ id, name }) => ({ id, name }))}
              아래={<SettingsPerfDummy services={서비스들.map(({ id, prefix, name }) => ({ id, prefix, name }))} 기본접두사={헤더서비스} 관리자={할수있나(user, null, '설정')} />}
            />
          ) : 고른 === 'users' ? (
            <UserSection rows={users.data.items} projects={프로젝트줄} me={user.username} onDone={users.reload} onSelf={onMeChanged} />
          ) : 고른 === 'pending' ? (
            대기수 === 0 ? (
              <div className="empty">{t('기다리는 가입 신청이 없습니다')}</div>
            ) : (
              <PendingSection rows={users.data.items} projects={프로젝트줄} onDone={users.reload} />
            )
          ) : 고른 === 'project-new' || 고른 === 'new' ? (
            // 프로젝트가 하나도 없으면 애플리케이션을 넣을 곳이 없다 — 「+ 애플리케이션 추가」도 프로젝트부터 만든다
            <SettingsWizard
              key={고른}
              새프로젝트={고른 === 'project-new' || 프로젝트들.length === 0}
              projects={프로젝트들}
              services={서비스들}
              기본프로젝트={서비스들.find((it) => it.prefix === 헤더서비스)?.projectId}
              나가는곳={나가는곳}
              on만듦={() => void 프로젝트다시()}
              고를수있나={(번호) => user.services.some((it) => it.id === 번호)}
              내프로젝트={(번호) => user.services.some((it) => it.projectId === 번호)}
              on작성={(번호) => {
                on서비스번호?.(번호);
                떠나기로했다();
                window.location.hash = '#/authoring';
              }}
              on설정={(접두사) => void 서비스다시(접두사, true)}
            />
          ) : 프로젝트자리 ? (
            프로젝트 === undefined ? (
              <div className="empty">{t('그런 프로젝트가 없습니다')}</div>
            ) : BTS자리 ? (
              <SettingsBts row={프로젝트} services={서비스들} onDone={() => void services.reload()} />
            ) : (
              <ProjectPanel key={`${프로젝트.id}-${판}`} row={프로젝트} projects={프로젝트들} services={서비스들} onDone={() => void 프로젝트다시()} />
            )
          ) : 서비스 === undefined ? (
            <div className="empty">{t('그런 애플리케이션이 없습니다')}</div>
          ) : (
            // 서비스마다 · 저장할 때마다 새로 그린다 — 앞 서비스에서 적다 만 글자가 다른 서비스 칸에 남으면 남의 서비스에 저장된다
            <ServicePanel
              key={`${서비스.id}-${판}`}
              row={서비스}
              저장했다={저장한곳 === 서비스.prefix}
              onDone={(접두사, 저장) => void 서비스다시(접두사, false, 저장)}
            />
          )}
        </div>
      </div>
    </>
  );
}

const 메뉴낱말 = new Set(['users', 'pending', 'new', 'perf-agents']);

/** 설정 안의 메뉴. 주소를 바꾸는 링크다 — 새로고침 · 뒤로 가기가 고른 것을 지킨다 */
function 설정메뉴({
  프로젝트들,
  서비스들,
  고른,
  계정수,
  대기수,
}: {
  프로젝트들: 프로젝트줄[];
  서비스들: SettingsServiceRow[];
  고른: string;
  계정수: number;
  대기수: number;
}) {
  const t = use말();
  const 자리 = (값: string) => (값 === 고른 ? { 'aria-current': 'page' as const } : {});

  return (
    <nav className="set-nav" aria-label={t('설정 메뉴')}>
      <h2>{t('프로젝트')}</h2>
      {프로젝트들.length === 0 ? <p className="hint">{t('아직 프로젝트가 없습니다')}</p> : null}
      {/* 애플리케이션은 제 프로젝트 아래에 들여 쓴다 — 나란히 두면 어느 프로젝트 것인지 안 보였다 (2026-10-20 ⑬-3) */}
      {프로젝트들.map((it) => (
        <Fragment key={it.id}>
          <a href={`#/settings/project-${it.id}`} {...자리(`project-${it.id}`)}>
            <span className="set-nav-name">{it.name}</span>
            <span className="set-nav-sub">{t('애플리케이션 {수}개', { 수: it.앱수 })}</span>
          </a>
          {/* 묶음 이름을 프로젝트로 달아 화면 읽기에도 어느 프로젝트 것인지 들린다 */}
          <div className="set-nav-tree" role="group" aria-label={it.name}>
            <a href={`#/settings/project-${it.id}-bts`} {...자리(`project-${it.id}-bts`)}>
              <span className="set-nav-name">{t('{bts} 연결', { bts: BTS이름 })}</span>
            </a>
            {서비스들
              .filter((앱) => 앱.projectId === it.id)
              .map((앱) => (
                <a key={앱.id} href={`#/settings/${encodeURIComponent(앱.prefix)}`} {...자리(앱.prefix)}>
                  <span className="set-nav-name">{앱.name}</span>
                  {/* 접두사는 늘 둔다 — 주소와 케이스 번호에 쓰이는 이름이다. 비활성이면 곁에 그 사실을 더한다 */}
                  <span className="set-nav-sub">{앱.isActive ? 앱.prefix : `${앱.prefix} · ${t('비활성')}`}</span>
                </a>
              ))}
          </div>
        </Fragment>
      ))}
      <a href="#/settings/project-new" className="set-nav-add" {...자리('project-new')}>
        {t('+ 프로젝트 추가')}
      </a>
      <a href="#/settings/new" className="set-nav-add" {...자리('new')}>
        {t('+ 애플리케이션 추가')}
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
      {/* 맨 아래 — 프로젝트 · 사람과 따로 서는 기계 묶음이다 (도메인/인증 §8.8 「성능 에이전트」) */}
      <h2>{t('성능 테스트')}</h2>
      <a href="#/settings/perf-agents" {...자리('perf-agents')}>
        <span className="set-nav-name">{t('성능 에이전트')}</span>
      </a>
    </nav>
  );
}
