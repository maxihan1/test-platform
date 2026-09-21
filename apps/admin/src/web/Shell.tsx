// 맨 위 띠 · 자리 넷 · 알림 줄 (SPEC §8). 모든 화면이 이 안에 들어간다
// 지금 어느 서비스를 보고 있는지가 늘 보여야 한다 — 엉뚱한 서비스에서 실행을 누르는 사고를 막는 장치가 이 띠 하나다

import { useEffect, useState } from 'react';

import { api, type RunSummary, type ServiceRow, type User } from './api.js';
import { 고른서비스를적는다, 빈띠사유, 알림줄, 자리목록, 탭제목 } from './layout.js';
import { 본것으로적는다, 알림본적있나 } from './runState.js';
import { useAsync } from './ui.js';

interface Props {
  user: User;
  service: ServiceRow | null;
  onService: (prefix: string) => void;
  onLogout: () => void;
  current: string;
  children: React.ReactNode;
}

export function Shell({ user, service, onService, onLogout, current, children }: Props) {
  useEffect(() => {
    document.title = 탭제목(service);
  }, [service]);

  // 띠에는 짧게, 왜인지와 무엇을 하면 되는지는 본문이 말한다.
  // 지금 자리를 같이 넘긴다 — 설정 화면은 배정이 없어도 열려야 한다 (그 배정을 만드는 자리다)
  const 사유 = 빈띠사유(user, current);

  return (
    <div className="wrap">
      {/* 2026-09-21 — 띠의 바탕은 고정색(`--chrome`)이다. 서비스 색은 아래 자리 넷 줄로 내렸다.
          이름만으로는 부족하다는 것은 그대로다 — 글자는 읽어야 보이고 색은 안 읽어도 구분된다.
          옮긴 이유는 스킨의 껍데기 색과 서비스 색이 같은 자리를 놓고 다퉈서다 (SPEC §8) */}
      <div className="band">
        <div className="band-left">
          {service === null ? (
            <span className="band-name">서비스 없음</span>
          ) : (
            <>
              <select
                className="band-pick"
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
              {service.prefix === '' ? null : <span className="band-repo">{service.prefix}-</span>}
            </>
          )}
        </div>
        <div className="band-right">
          <span className="band-who">{user.displayName}</span>
          <button className="band-out" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </div>

      {/* 서비스 색이 사는 자리. 8px 네모와 이 줄 아래 3px 경계선 둘이 같은 `--svc` 를 쓴다 —
          두 값을 따로 주면 한쪽만 바뀌는 날이 온다. 흰 면 위라 어두운 색일수록 잘 보인다 (§8) */}
      <nav
        className="nav"
        {...(service === null ? {} : { 'data-service-color': service.prefix })}
        style={service === null ? undefined : ({ '--svc': service.color } as React.CSSProperties)}
      >
        {service === null ? null : <span className="svc-dot" aria-hidden="true" />}
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
    <div className="notice-row">
      <a className="notice" href={`#/runs/${줄.runId}`}>
        ▶ {줄.글}
      </a>
      {/* 끝난 소식은 한 번 누르거나 닫으면 사라진다 (SPEC §8). 도는 중은 스스로 사라진다 */}
      {!줄.끝났나 ? null : (
        <button
          className="notice-x"
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
