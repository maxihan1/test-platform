// 사이드바 · 헤더 · 본문 · 푸터 (SPEC §8). 모든 화면이 이 안에 들어간다
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
} from './layout.js';
import { use말, type 언어 } from './i18n.js';
import { 아이콘 } from './icons.js';
import { Notice } from './Notice.js';
import { use휴대폰 } from './phone.js';
import { PhoneShell } from './PhoneShell.js';
import { ShellHeader } from './ShellHeader.js';

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
  const 제목 = 탭제목(대시보드인가 ? null : service, 언어);

  useEffect(() => {
    document.title = 제목;
  }, [제목]);

  // 띠에는 짧게, 왜인지와 무엇을 하면 되는지는 본문이 말한다.
  // 지금 자리를 같이 넘긴다 — 설정 화면은 배정이 없어도 열려야 한다 (그 배정을 만드는 자리다)
  const 사유 = 빈띠사유(user, service?.prefix ?? null, 언어, current);

  // 접은 것은 사람이 되돌릴 수 있는 상태라 저장해 둔다. 새로고침마다 다시 접게 하면 그 기능이 짐이 된다
  const [접음, set접음] = useState(사이드바접었나);
  // 「알림」 버튼은 맨 위 헤더에 선다. 줄과 서랍은 본문 쪽에 두고 버튼만 이 자리로 옮겨 그린다 (Notice 의 `버튼자리`)
  const [알림자리, set알림자리] = useState<HTMLElement | null>(null);

  // 휴대폰은 사이드바 대신 위 줄 · 아래 탭이다 (SPEC 공통/5-화면공통 §8 「휴대폰 화면」). 훅은 모두 위에서 부른 뒤 가른다
  const 휴대폰 = use휴대폰();
  if (휴대폰) {
    return (
      <PhoneShell user={user} service={service} onService={onService} 언어={언어} on언어={on언어} onLogout={onLogout} current={current} 사유={사유}>
        {children}
      </PhoneShell>
    );
  }

  return (
    <div className={접음 ? 'wrap folded' : 'wrap'}>
      <ShellHeader user={user} service={service} onService={onService} 언어={언어} on언어={on언어} onLogout={onLogout} 알림자리={set알림자리} />
      {/* 「어느 서비스를 · 누가」는 맨 위 헤더가, 「어디를」은 짙은 세로 막대의 자리 목록이 든다 (2026-10-13 시안 A).
          2026-09-21 ② 에 옛 이름(`.band`·`.nav`·`.notice`·`.svc-dot`)을 걷어냈다.
          PR① 이 남겨 둔 것은 그 이름으로 단언하는 검사가 있었기 때문이고, 그 검사를 같이 고쳤다 */}
      <aside className="side">
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
        <nav className="side-nav">
          {자리목록(user, service?.prefix ?? null, 언어).map((자리) =>
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
              // 하위는 늘 펼쳐 둔다. 하위가 지금 자리면 묶음은 펼친 표시(data-open)만 — 밑줄이 둘이 되지 않게 (화면공통 §8 · PR #132)
              // 묶음 링크는 묶음 자리로 간다 — 케이스 · 실행은 기능 목록, PRD 관리는 요구사항. 종류를 모르는 상세(실행 결과 등)에서 「지금 자리」라고 하면 다른 곳을 가리킨다.
              // 그래서 묶음은 aria-current 를 안 받고 펼친 표시만 받는다 (2026-10-02 검사 지적)
              <div key={자리.해시} className="side-group" role="group" aria-labelledby={`side-${자리.해시.slice(2)}`}>
                <a
                  id={`side-${자리.해시.slice(2)}`}
                  href={자리.해시}
                  {...(current === 자리.해시 || current.startsWith(`${자리.해시}/`) ? { 'data-open': '' } : {})}
                >
                  <아이콘 이름={자리.아이콘} />
                  {자리.이름}
                </a>
                {자리.하위.map((하위) => (
                  <a
                    key={하위.해시}
                    className="side-sub"
                    href={하위.해시}
                    aria-label={하위.라벨}
                    {...(current === 하위.해시 ? { 'aria-current': 'page' as const } : {})}
                  >
                    {하위.이름}
                  </a>
                ))}
              </div>
            ),
          )}
        </nav>
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
          children
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
    </div>
  );
}
