// 왼쪽 줄 · 사이드바 · 본문 · 푸터 (SPEC §8). 모든 화면이 이 안에 들어간다
// 지금 어느 서비스를 보고 있는지가 늘 보여야 한다 — 엉뚱한 서비스에서 실행을 누르는 사고를 막는 장치가 이것 하나다

import { useEffect, useState } from 'react';

import type { ServiceRow, User } from './api.js';
import {
  고른서비스를적는다,
  빈띠사유,
  사이드바접었나,
  사이드바접음을적는다,
  자리목록,
  탭제목,
  type 자리,
} from './layout.js';
import { 지금앱칸 } from './Head.js';
import { use말, type 언어 } from './i18n.js';
import { 아이콘 } from './icons.js';
import { Notice } from './Notice.js';
import { use휴대폰 } from './phone.js';
import { PhoneShell } from './PhoneShell.js';
import { 기능보나, 판정을만든다, 할수있나 } from './role.js';
import { RunWatch } from './RunWatch.js';
import { 찾기칸 } from './ShellFind.js';
import { 로고움직임다시 } from './logoMotion.js';
import { 서비스고르개, 프로젝트고르개 } from './ShellPickers.js';
import { 사이드바머리, 왼쪽줄 } from './ShellRail.js';
import { 밝기단추 } from './theme.js';
import { use가입대기수 } from './useSignupWaiting.js';

interface Props {
  user: User;
  service: ServiceRow | null;
  onService: (prefix: string) => void;
  /** 화면 언어. 들고 있는 것은 `main.tsx` 다 — 로그인 화면도 덮어야 해서 껍데기보다 위에 있다 */
  언어: 언어;
  on언어: (고른: 언어) => void;
  onLogout: () => void;
  current: string;
  children: React.ReactNode;
}

// 제목과 주 행동은 **화면이 그린다** (Head.tsx). 2026-09-22 까지 여기 `header` 통로가 있었는데
// 부르는 곳이 하나도 없었다 — 부제와 행동이 동적이라 올려 보내려면 배선이 늘기 때문이다
export function Shell({ user, service, onService, 언어, on언어, onLogout, current, children }: Props) {
  const t = use말();

  // 대시보드는 서비스를 고르지 않는 화면이다 — 숨긴 고르개의 서비스 이름이 탭과 바닥 글에 남으면 그 서비스만 보는 것처럼 읽힌다
  const 대시보드인가 = current === '#/dashboard';
  const 제목 = 탭제목(대시보드인가 ? null : service);

  useEffect(() => {
    document.title = 제목;
  }, [제목]);

  // 띠에는 짧게, 왜인지와 무엇을 하면 되는지는 본문이 말한다.
  // 지금 자리를 같이 넘긴다 — 설정 화면은 배정이 없어도 열려야 한다 (그 배정을 만드는 자리다)
  const 사유 = 빈띠사유(user, service?.prefix ?? null, 언어, current);

  // 접은 것은 사람이 되돌릴 수 있는 상태라 저장해 둔다. 새로고침마다 다시 접게 하면 그 기능이 짐이 된다
  const [접음, set접음] = useState(사이드바접었나);
  // 「알림」 버튼은 왼쪽 줄 아래에 선다. 줄과 서랍은 본문 쪽에 두고 버튼만 이 자리로 옮겨 그린다 (Notice 의 `버튼자리`)
  const [알림자리, set알림자리] = useState<HTMLElement | null>(null);

  // 휴대폰은 사이드바 대신 위 줄 · 아래 탭이다 (SPEC 공통/5-화면공통 §8 「휴대폰 화면」). 훅은 모두 위에서 부른 뒤 가른다
  const 휴대폰 = use휴대폰();
  // 가입 신청은 운영 계정이 설정에서 수락한다. 사이드바가 없는 휴대폰에서는 읽지 않는다
  const 가입대기 = use가입대기수(user.role === 'admin' && !휴대폰, current);
  const 자리들 = 자리목록(user, service?.prefix ?? null, 언어);
  // 화면 머리가 제목 앞에 애플리케이션 이름을 붙인다 (화면공통 §8 「화면 머리」 · 2026-10-29).
  // 대시보드는 여러 애플리케이션을 모으고, 설정은 안에서 애플리케이션을 따로 고르고, 비밀번호는 계정의 일이라 고른 애플리케이션과 상관없다
  const 앱과상관없다 = 대시보드인가 || current === '#/password' || current === '#/settings';
  const 본문 = <지금앱칸.Provider value={앱과상관없다 ? null : service}>{children}</지금앱칸.Provider>;
  // 진행 알약 · 진행 창은 화면을 옮겨도 남는다 — 화면이 아니라 틀에 하나 둔다 (도메인/실행 §8.9)
  const 진행알약 = <RunWatch 판정하기={(접두사) => 판정을만든다(user, 접두사)} />;
  if (휴대폰) {
    return (
      <>
        <PhoneShell user={user} service={service} onService={onService} 언어={언어} on언어={on언어} onLogout={onLogout} current={current} 사유={사유}>
          {본문}
        </PhoneShell>
        {진행알약}
      </>
    );
  }

  // 설정은 2026-10-30 부터 자리 목록이 아니라 왼쪽 줄의 톱니다 (화면공통 §8 「자리 목록」 「설정」 줄). 누가 여는지는 자리목록이 계속 정한다 — 찾기 창도 그 목록으로 찾는다
  const 메뉴들 = 자리들.filter((자리) => 자리.해시 !== '#/settings');
  return (
    <div className={접음 ? 'wrap folded' : 'wrap'}>
      {/* 위쪽 바는 없다 (화면공통 §8 「껍데기」 · 2026-10-30 시안 11판). 로고 · 알림 · 설정 · 내 메뉴는 왼쪽 줄로, 찾기는 사이드바 머리로,
          프로젝트 고르개는 사이드바 바닥으로 왔다가 2026-11-02 로고 아래로 올라갔다. 2026-09-21 ② 에 옛 이름(`.band`·`.nav`·`.notice`·`.svc-dot`)을 걷어냈다 */}
      <aside className="side">
        <왼쪽줄
          user={user}
          service={service}
          onService={onService}
          새로만들기={할수있나(user, service?.prefix ?? null, '설정')}
          설정={메뉴들.length !== 자리들.length}
          가입대기={가입대기}
          current={current}
          알림자리={set알림자리}
          언어={언어}
          on언어={on언어}
          onLogout={onLogout}
        />
        <div className="side-col">
        {/* 맨 위 — 왼쪽이 제품 로고, 오른쪽 끝이 접기 단추 (2026-11-02 사용자 — 이 자리는 로고 자리다 · 시안 1 + 움직임 「최종 2판 ㄱ」).
            처음 열 때 왼쪽 줄 마크의 체크가 그어진 뒤 「Commander」가 밀려 나오고 밑줄이 그어졌다 사라진다(rail.css). 마우스를 올리면 처음부터 다시 돈다 */}
        <div className="side-top" onMouseEnter={() => 로고움직임다시()}>
          <span className="side-logo">
            Test <b>Commander</b>
          </span>
        {/* 접어도 자리 목록을 **지우지 않는다.** display:none 을 쓰면 키보드 탭 대상에서 빠져
            키보드로만 쓰는 사람이 이동을 통째로 잃는다. 폭만 줄이고 글자를 숨긴다 */}
        <button
          className="side-fold"
          onClick={() => {
            const 다음 = !접음;
            set접음(다음);
            사이드바접음을적는다(다음);
          }}
          aria-expanded={!접음}
          aria-label={접음 ? t('사이드바 펴기') : t('사이드바 접기')}
        >
          {접음 ? '»' : '«'}
        </button>
        </div>
        {/* 로고 아래 — 프로젝트가 가장 위 층이라 애플리케이션 머리 · 메뉴보다 먼저 읽힌다(2026-11-02 사용자 — 바닥에 두니 「말도 안 된다」).
            고른 애플리케이션이 없으면 그 사실을 여기서 말한다 — 왼쪽 줄도 비어 있다 */}
        <div className="side-proj">
          <아이콘 이름="project" />
          {service === null ? <서비스고르개 user={user} service={service} onService={onService} /> : <프로젝트고르개 user={user} service={service} onService={onService} 수를붙임 />}
        </div>
        {service === null ? null : <사이드바머리 service={service} />}
        <찾기칸 자리들={자리들} prefix={service?.prefix ?? null} 케이스볼수있나={기능보나(user, service?.prefix ?? null, 'cases')} />
        <nav className="side-nav">
          {메뉴들.map((자리) =>
            자리.바깥 === true ? (
              <a key={자리.해시} href={자리.해시} target="_blank" rel="noreferrer">
                <아이콘 이름={자리.아이콘} />
                {자리.이름} ↗
              </a>
            ) : 자리.하위 === undefined ? (
              <a key={자리.해시} href={자리.해시} {...(current === 자리.해시 ? { 'aria-current': 'page' as const } : {})}>
                <아이콘 이름={자리.아이콘} />
                {자리.이름}
              </a>
            ) : (
              <메뉴묶음 key={자리.해시} 자리={자리} current={current} />
            ),
          )}
        </nav>
        {/* 바닥 — 오른쪽 끝에 밝게 · 어둡게 하나 */}
        <div className="side-foot">
          <밝기단추 />
        </div>
        </div>
      </aside>

      <div className="main">
        {/* 서비스 고르개와 상관없이 볼 수 있는 서비스 전체를 받는다. 대시보드도 같은 이유로 줄은 숨기고 버튼만 둔다 */}
        {service === null ? null : (
          <Notice
            줄숨김={대시보드인가}
            버튼자리={알림자리}
            서비스바꿈={(접두사) => {
              // 서비스 고르개와 같은 길이다 — 고른 서비스를 적어 두고 화면이 읽는 서비스를 바꾼다
              고른서비스를적는다(접두사);
              onService(접두사);
            }}
          />
        )}

        {사유 === null ? (
          본문
        ) : (
          <div className="screen">
            <div className="empty">
              {사유.무엇}
              {사유.다음 === '' ? null : <small>{사유.다음}</small>}
            </div>
          </div>
        )}

        {/* 제품 버전을 넣을 통로가 아직 없다 (빌드 시 주입되는 값이 없다).
            지어내는 대신 확실히 아는 것만 적는다 — 제품 이름과 지금 보고 있는 서비스 */}
        <footer className="foot">{제목}</footer>
      </div>
      {진행알약}
    </div>
  );
}

/**
 * 하위가 있는 묶음. **지금 자리가 든 묶음만 펼친다** (화면공통 §8 「자리 목록」 · 2026-10-30 시안 11판) — 앞 판은 늘 펼쳐 둬 사이드바가 목차처럼 길었다.
 * 접힌 묶음은 꺾쇠(▸)로 알리고, 묶음 링크를 누르면 그 묶음의 첫 하위로 가서 펼쳐진다.
 * 하위가 지금 자리면 묶음은 펼친 표시(data-open)만 — 밑줄이 둘이 되지 않게 (PR #132).
 * 묶음 링크는 묶음 자리로 간다 — 종류를 모르는 상세(실행 결과 등)에서 「지금 자리」라고 하면 다른 곳을 가리켜 aria-current 를 안 받는다 (2026-10-02 검사 지적)
 */
function 메뉴묶음({ 자리: 묶음, current }: { 자리: 자리; current: string }) {
  const 하위 = 묶음.하위 ?? [];
  // 「PRD 관리 › API 문서」 처럼 하위 주소가 묶음 주소 아래가 아니어도 그 하위가 지금이면 펼친다
  const 펼침 = current === 묶음.해시 || current.startsWith(`${묶음.해시}/`) || 하위.some((it) => it.해시 === current);
  const id = `side-${묶음.해시.slice(2)}`;
  return (
    <div className="side-group" role="group" aria-labelledby={id}>
      <a id={id} href={묶음.해시} {...(펼침 ? { 'data-open': '' } : {})}>
        <아이콘 이름={묶음.아이콘} />
        {묶음.이름}
        <span className="side-chev">
          <아이콘 이름="chev" />
        </span>
      </a>
      {!펼침
        ? null
        : 하위.map((it) => (
            <a key={it.해시} className="side-sub" href={it.해시} aria-label={it.라벨} {...(current === it.해시 ? { 'aria-current': 'page' as const } : {})}>
              {it.이름}
            </a>
          ))}
    </div>
  );
}
