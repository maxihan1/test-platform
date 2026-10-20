// 화면 맨 위 헤더 — 제품 로고 · 프로젝트와 애플리케이션 선택 · 알림 버튼 자리 · 언어 · 계정 메뉴 (SPEC 공통/5-화면공통 §8 「껍데기」, 2026-10-13 시안 A)

import { useEffect, useRef, useState } from 'react';

import type { ServiceRow, User } from './api.js';
import { use말, type 언어 } from './i18n.js';
import { 집 } from './route.js';
import { 서비스고르개, 언어고르개, 프로젝트고르개 } from './ShellPickers.js';

interface Props {
  user: User;
  service: ServiceRow | null;
  onService: (prefix: string) => void;
  언어: 언어;
  on언어: (고른: 언어) => void;
  onLogout: () => void;
  /** 알림 버튼이 들어올 자리. `Notice` 가 줄과 서랍은 본문에 두고 버튼만 이 자리로 옮겨 그린다 */
  알림자리: (자리: HTMLElement | null) => void;
}

export function ShellHeader({ user, service, onService, 언어, on언어, onLogout, 알림자리 }: Props) {
  const t = use말();
  return (
    <header className="hd">
      <a className="hd-logo" href={집(user, service?.prefix ?? null)} aria-label={t('QA Hub 홈')}>
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" className="hd-logo-mark">
          <rect width="28" height="28" rx="8" fill="var(--accent)" />
          <path d="M8 14.5l4 4 8-9" fill="none" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="hd-logo-text">
          QA <b>Hub</b>
        </span>
      </a>
      <div className="hd-bar">
        {/* 대시보드에서도 둔다. 대시보드 내용은 서비스 전체를 모아 보여 주고, 이 칸은 다른 메뉴로 갈 때 쓸 서비스를 미리 고르는 용도다 */}
        {service === null ? null : (
          <>
            <div className="hd-svc">
              <프로젝트고르개 user={user} service={service} onService={onService} />
            </div>
            <span className="hd-chev" aria-hidden="true">
              ›
            </span>
          </>
        )}
        <div className="hd-svc">
          {service === null ? null : <span className="hd-svc-code">{service.prefix}</span>}
          <서비스고르개 user={user} service={service} onService={onService} />
        </div>
        <span className="hd-gap" />
        <div className="hd-tools">
          <span ref={알림자리} className="hd-slot" />
          <div className="side-lang hd-lang">
            <svg className="hd-lang-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
            </svg>
            <언어고르개 언어={언어} on언어={on언어} />
          </div>
          <span className="hd-sep" />
          <계정메뉴 user={user} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}

/**
 * 이름을 누르면 비밀번호 변경과 로그아웃이 나온다. 앞 판은 사이드바 맨 아래에 늘 펼쳐 둔 자리였다.
 * 바깥을 누르거나 Esc 를 누르면 닫힌다 — 안 닫히면 본문의 버튼을 가린 채 남는다 (PhoneShell 의 내 메뉴와 같은 처리)
 */
function 계정메뉴({ user, onLogout }: { user: User; onLogout: () => void }) {
  const t = use말();
  const [열림, set열림] = useState(false);
  const 상자 = useRef<HTMLDivElement>(null);
  const 버튼 = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!열림) return;
    const 닫기 = (e: Event) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== 'Escape') return;
        set열림(false);
        // 메뉴 안에 있던 포커스가 사라지는 메뉴와 같이 없어지지 않게 이름 버튼으로 돌려 보낸다
        버튼.current?.focus();
      } else if (!상자.current?.contains(e.target as Node)) {
        set열림(false);
      }
    };
    document.addEventListener('pointerdown', 닫기);
    document.addEventListener('keydown', 닫기);
    return () => {
      document.removeEventListener('pointerdown', 닫기);
      document.removeEventListener('keydown', 닫기);
    };
  }, [열림]);

  return (
    <div className="hd-me" ref={상자}>
      <button type="button" ref={버튼} className="hd-me-btn" aria-expanded={열림} aria-controls="hd-me-menu" onClick={() => set열림(!열림)}>
        <span className="hd-me-av" aria-hidden="true">
          {Array.from(user.displayName)[0] ?? ''}
        </span>
        <span>{user.displayName}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {열림 ? (
        <div className="hd-me-menu" id="hd-me-menu">
          <a href="#/password" onClick={() => set열림(false)}>
            {t('비밀번호 변경')}
          </a>
          <button
            type="button"
            onClick={() => {
              // 로그아웃이 실패해도 메뉴가 본문 버튼을 가린 채 남지 않게 먼저 닫는다
              set열림(false);
              onLogout();
            }}
          >
            {t('로그아웃')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
