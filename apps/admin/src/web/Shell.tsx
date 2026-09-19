// 맨 위 띠 · 자리 넷 · 알림 줄 (SPEC §8). 모든 화면이 이 안에 들어간다
// 지금 어느 서비스를 보고 있는지가 늘 보여야 한다 — 엉뚱한 서비스에서 실행을 누르는 사고를 막는 장치가 이 띠 하나다

import { useEffect } from 'react';

import { api, type RunSummary, type ServiceRow, type User } from './api.js';
import { 고른서비스를적는다, 빈띠사유, 알림줄, 자리목록, 탭제목 } from './layout.js';
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

  const 사유 = 빈띠사유(user);

  return (
    <div className="wrap">
      {/* 띠의 바탕색은 그 서비스의 색이다. 이름만으로는 부족하다 —
          글자는 읽어야 보이고 색은 안 읽어도 구분된다. 띠 밖에서는 이 색을 쓰지 않는다 (DESIGN.md) */}
      <div className="band" style={service === null ? undefined : { background: service.color }}>
        <div className="band-left">
          {service === null ? (
            <span className="band-name">{사유?.무엇 ?? '서비스'}</span>
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

      <nav className="nav">
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
  const 줄 = 알림줄(runs.data?.items ?? []);
  const reload = runs.reload;

  useEffect(() => {
    if (줄 === null) return;
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
  }, [줄 === null, reload]);

  if (줄 === null) return null;

  return (
    <a className="notice" href={`#/runs/${줄.runId}`}>
      ▶ {줄.글}
    </a>
  );
}
