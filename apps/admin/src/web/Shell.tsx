// 사이드바 · 헤더 · 본문 · 푸터 (SPEC §8). 모든 화면이 이 안에 들어간다
// 지금 어느 서비스를 보고 있는지가 늘 보여야 한다 — 엉뚱한 서비스에서 실행을 누르는 사고를 막는 장치가 이것 하나다

import { useEffect, useState } from 'react';

import { api, type RunSummary, type ServiceRow, type User } from './api.js';
import {
  고른서비스를적는다,
  빈띠사유,
  사이드바접었나,
  사이드바접음을적는다,
  알림줄,
  자리목록,
  탭제목,
} from './layout.js';
import { use말, type 언어 } from './i18n.js';
import { 아이콘 } from './icons.js';
import { 본것으로적는다, 알림본적있나 } from './runState.js';
import { useAsync } from './ui.js';

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

  useEffect(() => {
    document.title = 탭제목(service, 언어);
  }, [service, 언어]);

  // 띠에는 짧게, 왜인지와 무엇을 하면 되는지는 본문이 말한다.
  // 지금 자리를 같이 넘긴다 — 설정 화면은 배정이 없어도 열려야 한다 (그 배정을 만드는 자리다)
  const 사유 = 빈띠사유(user, service?.prefix ?? null, 언어, current);

  // 접은 것은 사람이 되돌릴 수 있는 상태라 저장해 둔다. 새로고침마다 다시 접게 하면 그 기능이 짐이 된다
  const [접음, set접음] = useState(사이드바접었나);

  return (
    <div className={접음 ? 'wrap folded' : 'wrap'}>
      {/* 짙은 세로 막대 하나가 「어느 서비스를 · 어디를 · 누가」 셋을 다 들고 있다.
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
        {/* 서비스 색은 2026-09-22 에 걷었다 (SPEC §8). 이름과 저장소 주소로 구분한다 —
            「이 파란 네모가 뭘 뜻하는지 모르겠다」가 걷은 이유다 */}
        <div className="side-top">
          {/* 무엇을 고르는 자리인지 **글자로 적는다.** 파란 네모를 걷은 이유가 바로
              「이게 뭘 뜻하는지 모르겠다」였다 — 같은 실수를 고르개에서 되풀이하지 않는다 */}
          <span className="side-cap">{t('서비스§고르개')}</span>
          <div className="side-svc">
            {service === null ? (
              <span className="side-svc-name">{t('서비스 없음')}</span>
            ) : (
              <>
                <select
                  className="side-pick"
                  value={service.prefix}
                  onChange={(e) => {
                    고른서비스를적는다(e.target.value);
                    onService(e.target.value);
                  }}
                  aria-label={t('서비스 고르기')}
                >
                  {user.services.map((it) => (
                    <option key={it.prefix} value={it.prefix}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

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
              // 묶음 링크는 기능 목록으로 간다 — 종류를 모르는 상세(실행 결과 등)에서 「지금 자리」라고 하면 다른 곳을 가리킨다.
              // 그래서 묶음은 aria-current 를 안 받고 펼친 표시만 받는다 (2026-10-02 검사 지적)
              <div key={자리.해시} className="side-group" role="group" aria-labelledby={`side-${자리.해시.slice(2)}`}>
                <a
                  id={`side-${자리.해시.slice(2)}`}
                  href={자리.하위[1]!.해시}
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

        {/* 사람과 로그아웃을 바닥으로 민다. 자주 누르는 것이 아니라 늘 보여야 하는 것이다 */}
        <div className="side-gap" />

        {/* 접어도 지우지 않는다 — 폭만 줄고 글자가 숨는다. 위 자리 목록과 같은 이유다 (SPEC §8) */}
        <div className="side-lang">
          <label className="side-lang-label" htmlFor="side-lang">
            {t('언어')}
          </label>
          <select id="side-lang" value={언어} onChange={(e) => on언어(e.target.value === 'en' ? 'en' : 'ko')}>
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="side-who">
          <span className="side-who-name">{user.displayName}</span>
          <button className="side-out" onClick={onLogout}>
            {t('로그아웃')}
          </button>
        </div>
        {/* 이름 바로 아래에 두되 사람 칸 밖이다 — 접으면 사람 칸이 통째로 숨어 키보드가 못 닿는다.
            자리 목록처럼 글자만 눌러 탭 순서에 남긴다 (도메인/인증 §8.6) */}
        <a className="side-pw" href="#/password">
          {t('비밀번호 변경')}
        </a>
      </aside>

      <div className="main">
        {service === null ? null : <Notice service={service.prefix} 언어={언어} />}

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
        <footer className="foot">{탭제목(service, 언어)}</footer>
      </div>
    </div>
  );
}

/**
 * 도는 실행이 있으면 자리 아래 한 줄 (SPEC §8).
 *
 * 한 번 돌리면 최악 50분이라 자리를 떴다 돌아오는 진입이 흔하다.
 * 도는 것이 있을 때만 2초마다 다시 묻는다 — 없으면 목록을 한 번 부르고 만다.
 */
function Notice({ service, 언어 }: { service: string; 언어: 언어 }) {
  const t = use말();
  const 닫기라벨 = t('알림 닫기');
  const runs = useAsync<{ items: RunSummary[] }>(() => api.runs(service, 1), [service]);
  // 닫은 것을 이 상태로도 들어야 같은 렌더에서 사라진다. 저장은 runState 가 한다
  const [닫은것, set닫은것] = useState<ReadonlySet<number>>(() => new Set());
  const 줄 = 알림줄(runs.data?.items ?? [], 언어, 닫은것);
  const reload = runs.reload;
  const 도는중인가 = 줄 !== null && !줄.끝났나;

  // 도는 것이 있을 때만 2초마다 다시 묻는다. 없으면 한 번 부르고 만다
  useEffect(() => {
    if (!도는중인가) return;
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
  }, [도는중인가, reload]);

  // 완료 모달이 이미 알린 실행은 줄로 또 알리지 않는다 (SPEC §8.9)
  useEffect(() => {
    if (줄 !== null && 줄.끝났나 && 알림본적있나(줄.runId)) {
      set닫은것((전) => new Set(전).add(줄.runId));
    }
  }, [줄?.runId, 줄?.끝났나]);

  if (줄 === null) return null;

  return (
    <div className="toast-row">
      <a className="toast" href={`#/runs/${줄.runId}`}>
        {/* 실제로 도는 동안만 맥박이 뛴다 — 되풀이 움직임은 이것 하나다 (DESIGN.md 원칙 4). 끝난 소식은 멈춘 표시다 */}
        {줄.끝났나 ? '▶ ' : <span className="pulse" aria-hidden="true" />}
        {줄.글}
      </a>
      {/* 끝난 소식은 한 번 누르거나 닫으면 사라진다 (SPEC §8). 도는 중은 스스로 사라진다 */}
      {!줄.끝났나 ? null : (
        <button
          className="toast-x"
          aria-label={닫기라벨}
          onClick={() => {
            본것으로적는다(줄.runId);
            set닫은것((전) => new Set(전).add(줄.runId));
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
