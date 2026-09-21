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
import { 본것으로적는다, 알림본적있나 } from './runState.js';
import { useAsync } from './ui.js';

interface Props {
  user: User;
  service: ServiceRow | null;
  onService: (prefix: string) => void;
  onLogout: () => void;
  current: string;
  /** 화면 제목과 주 행동. 제목은 화면마다 다르므로 껍데기가 지어내지 않는다 (SPEC §8) */
  header?: React.ReactNode;
  children: React.ReactNode;
}

export function Shell({ user, service, onService, onLogout, current, header, children }: Props) {
  useEffect(() => {
    document.title = 탭제목(service);
  }, [service]);

  // 띠에는 짧게, 왜인지와 무엇을 하면 되는지는 본문이 말한다.
  // 지금 자리를 같이 넘긴다 — 설정 화면은 배정이 없어도 열려야 한다 (그 배정을 만드는 자리다)
  const 사유 = 빈띠사유(user, current);

  // 접은 것은 사람이 되돌릴 수 있는 상태라 저장해 둔다. 새로고침마다 다시 접게 하면 그 기능이 짐이 된다
  const [접음, set접음] = useState(사이드바접었나);

  return (
    <div className={접음 ? 'wrap folded' : 'wrap'}>
      {/* 짙은 세로 막대 하나가 「어느 서비스를 · 어디를 · 누가」 셋을 다 들고 있다.
          2026-09-21 ② 에 옛 이름(`.band`·`.nav`·`.notice`·`.svc-dot`)을 걷어냈다.
          PR① 이 남겨 둔 것은 그 이름으로 단언하는 검사가 있었기 때문이고, 그 검사를 같이 고쳤다 */}
      <aside className="side">
        {/* 접어도 자리 넷을 **지우지 않는다.** display:none 을 쓰면 키보드 탭 대상에서 빠져
            키보드로만 쓰는 사람이 이동을 통째로 잃는다. 폭만 줄이고 글자를 숨긴다 */}
        <button
          className="side-fold"
          onClick={() => {
            const 다음 = !접음;
            set접음(다음);
            사이드바접음을적는다(다음);
          }}
          aria-expanded={!접음}
          aria-label={접음 ? '사이드바 펴기' : '사이드바 접기'}
        >
          {접음 ? '»' : '«'}
        </button>
        {/* 서비스 색이 사는 유일한 자리. 8px 네모가 `--svc` 를 쓴다 —
            이름만으로는 부족하다. 글자는 읽어야 보이고 색은 안 읽어도 구분된다 (SPEC §8) */}
        <div
          className="side-top"
          {...(service === null ? {} : { 'data-service-color': service.prefix })}
          style={service === null ? undefined : ({ '--svc': service.color } as React.CSSProperties)}
        >
          <div className="side-svc">
            {service === null ? (
              <span className="side-svc-name">서비스 없음</span>
            ) : (
              <>
                <span className="side-dot" aria-hidden="true" />
                <select
                  className="side-pick"
                  value={service.prefix}
                  onChange={(e) => {
                    고른서비스를적는다(e.target.value);
                    onService(e.target.value);
                  }}
                  aria-label="서비스 고르기"
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
          {service === null || service.prefix === '' ? null : (
            <span className="side-svc-id">{service.prefix}-</span>
          )}
        </div>

        <nav className="side-nav">
          {자리목록(user.role).map((자리) =>
            자리.바깥 === true ? (
              <a key={자리.이름} href={자리.해시} target="_blank" rel="noreferrer">
                {자리.이름} ↗
              </a>
            ) : (
              <a key={자리.이름} href={자리.해시} {...(current === 자리.해시 ? { 'aria-current': 'page' as const } : {})}>
                {자리.이름}
              </a>
            ),
          )}
        </nav>

        {/* 사람과 로그아웃을 바닥으로 민다. 자주 누르는 것이 아니라 늘 보여야 하는 것이다 */}
        <div className="side-gap" />

        <div className="side-who">
          <span className="side-who-name">{user.displayName}</span>
          <button className="side-out" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </aside>

      <div className="main">
        {/* 제목과 주 행동은 화면마다 다르다. 안 넘기면 줄 자체를 그리지 않는다 — 빈 칸을 잡아 두지 않는다 */}
        {header === undefined ? null : <div className="head">{header}</div>}

        {service === null ? null : <Notice service={service.prefix} />}

        {사유 === null ? (
          children
        ) : (
          <div className="screen">
            <div className="empty">
              {사유.무엇}
              <small>{사유.다음}</small>
            </div>
          </div>
        )}

        {/* 제품 버전을 넣을 통로가 아직 없다 (빌드 시 주입되는 값이 없다).
            지어내는 대신 확실히 아는 것만 적는다 — 제품 이름과 지금 보고 있는 서비스 */}
        <footer className="foot">{탭제목(service)}</footer>
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
function Notice({ service }: { service: string }) {
  const runs = useAsync<{ items: RunSummary[] }>(() => api.runs(service, 1), [service]);
  // 닫은 것을 이 상태로도 들어야 같은 렌더에서 사라진다. 저장은 runState 가 한다
  const [닫은것, set닫은것] = useState<ReadonlySet<number>>(() => new Set());
  const 줄 = 알림줄(runs.data?.items ?? [], 닫은것);
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
        ▶ {줄.글}
      </a>
      {/* 끝난 소식은 한 번 누르거나 닫으면 사라진다 (SPEC §8). 도는 중은 스스로 사라진다 */}
      {!줄.끝났나 ? null : (
        <button
          className="toast-x"
          aria-label="알림 닫기"
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
