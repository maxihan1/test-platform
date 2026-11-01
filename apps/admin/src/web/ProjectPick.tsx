// 로그인한 직후 프로젝트를 고르는 화면 (SPEC 공통/5-화면공통 §8 「프로젝트 고르기」). 프로젝트가 둘 이상일 때만 뜬다

import type { ServiceRow, User } from './api.js';
import { use말 } from './i18n.js';
import { 배정프로젝트들, 프로젝트서비스들 } from './layout.js';

interface Props {
  user: User;
  /** 마지막에 열었던 애플리케이션. 그 프로젝트에 표시를 달고, 그 프로젝트를 고르면 이 애플리케이션으로 다시 연다 */
  마지막: ServiceRow | null;
  onPick: (prefix: string) => void;
  onLogout: () => void;
}

export function ProjectPick({ user, 마지막, onPick, onLogout }: Props) {
  const t = use말();
  return (
    <div className="pp">
      <header className="pp-top">
        <span className="pp-logo">QA Hub</span>
        <span className="pp-gap" />
        <span className="pp-user">{user.displayName}</span>
        <button type="button" className="btn ghost" onClick={onLogout}>
          {t('로그아웃')}
        </button>
      </header>
      <main className="pp-main">
        <h1 className="pp-h">{t('프로젝트를 고르세요')}</h1>
        <p className="pp-sub">{t('고른 프로젝트의 애플리케이션만 보입니다. 사이드바 맨 위에서 언제든 바꿀 수 있습니다.')}</p>
        <div className="pp-grid">
          {배정프로젝트들(user.services).map((프로젝트) => {
            const 앱들 = 프로젝트서비스들(프로젝트.id, user.services);
            const 마지막인가 = 마지막?.projectId === 프로젝트.id;
            return (
              <button
                key={프로젝트.id}
                type="button"
                className={마지막인가 ? 'pp-card is-last' : 'pp-card'}
                onClick={() => onPick(마지막인가 ? 마지막.prefix : 앱들[0]!.prefix)}
              >
                <span className="pp-card-h">
                  <span className="pp-card-name">{프로젝트.name}</span>
                  {마지막인가 ? <span className="pp-chip">{t('마지막에 연 프로젝트')}</span> : null}
                </span>
                <span className="pp-apps">
                  {앱들.map((앱) => (
                    <span key={앱.prefix}>{앱.name}</span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
