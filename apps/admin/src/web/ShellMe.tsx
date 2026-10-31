// 왼쪽 줄 맨 아래 내 동그라미와 내 메뉴 — 언어 · 비밀번호 변경(SSO 면 디바이스 팜 토큰) · 로그아웃 (SPEC 공통/5-화면공통 §8 「껍데기」 · 2026-10-30)

import { useEffect, useRef, useState } from 'react';

import type { User } from './api.js';
import { FarmToken } from './FarmToken.js';
import { use말, type 언어 } from './i18n.js';
import { 언어고르개 } from './ShellPickers.js';
import { useSSO } from './useSSO.js';

/**
 * 앞 판은 맨 위 헤더 오른쪽 끝의 이름 단추였다(2026-10-13 ~ 10-29). 위쪽 바를 걷어 언어 고르개도 이 안으로 들어왔다.
 * 바깥을 누르거나 Esc 를 누르면 닫힌다 — 안 닫히면 본문의 버튼을 가린 채 남는다 (PhoneShell 의 내 메뉴와 같은 처리)
 */
export function 내메뉴({
  user,
  프로젝트,
  언어,
  on언어,
  onLogout,
}: {
  user: User;
  /** 고른 프로젝트 이름. 고른 애플리케이션이 없으면 없다 */
  프로젝트: string | null;
  언어: 언어;
  on언어: (고른: 언어) => void;
  onLogout: () => void;
}) {
  const t = use말();
  const [열림, set열림] = useState(false);
  const [팜토큰창, set팜토큰창] = useState(false);
  const 상자 = useRef<HTMLDivElement>(null);
  const 버튼 = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!열림) return;
    const 닫기 = (e: Event) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== 'Escape') return;
        set열림(false);
        // 메뉴 안에 있던 포커스가 사라지는 메뉴와 같이 없어지지 않게 동그라미로 돌려 보낸다
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
    <div className="rail-me" ref={상자}>
      <button
        type="button"
        ref={버튼}
        className="rail-me-btn"
        title={user.displayName}
        aria-label={`${t('내 메뉴')} · ${user.displayName}`}
        aria-expanded={열림}
        aria-controls="rail-me-menu"
        onClick={() => set열림(!열림)}
      >
        <span className="rail-me-av" aria-hidden="true">
          {Array.from(user.displayName)[0] ?? ''}
        </span>
      </button>
      {열림 ? (
        <div className="rail-me-menu" id="rail-me-menu">
          <내메뉴항목 user={user} 프로젝트={프로젝트} 언어={언어} on언어={on언어} onLogout={onLogout} 닫기={() => set열림(false)} 팜토큰열기={() => set팜토큰창(true)} />
        </div>
      ) : null}
      {팜토큰창 ? <FarmToken onClose={() => set팜토큰창(false)} /> : null}
    </div>
  );
}

/**
 * 내 메뉴 안 줄들 — PC 는 동그라미 위로 뜨는 판, 휴대폰은 아래 판(PhoneShell)이 같이 쓴다 (화면공통 §8 「휴대폰 화면」 「내 동그라미」).
 * 디바이스 팜 토큰 창은 메뉴가 닫혀도 남아야 해서 메뉴 밖이 든다
 */
export function 내메뉴항목({
  user,
  프로젝트,
  언어,
  on언어,
  onLogout,
  닫기,
  팜토큰열기,
}: {
  user: User;
  프로젝트: string | null;
  언어: 언어;
  on언어: (고른: 언어) => void;
  onLogout: () => void;
  닫기: () => void;
  팜토큰열기: () => void;
}) {
  const t = use말();
  const sso = useSSO();
  return (
    <>
      <div className="rail-me-who">
        <b>{user.displayName}</b>
        {프로젝트 === null ? null : <small>{프로젝트}</small>}
      </div>
      <div className="side-lang">
        <언어고르개 언어={언어} on언어={on언어} />
      </div>
      {/* maxihan 계정이면 비밀번호는 Auth_platform 이 가진다 (SPEC §8.6) */}
      {sso === true ? null : (
        <a href="#/password" onClick={닫기}>
          {t('비밀번호 변경')}
        </a>
      )}
      {/* 토큰 주인을 통합계정에 묻고 계정에 묶인 사람과 견줘서 SSO 설치에만 있다 (도메인/인증 §8.6) */}
      {sso === true ? (
        <button
          type="button"
          onClick={() => {
            닫기();
            팜토큰열기();
          }}
        >
          {t('통합계정 토큰')}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          // 로그아웃이 실패해도 메뉴가 본문 버튼을 가린 채 남지 않게 먼저 닫는다
          닫기();
          onLogout();
        }}
      >
        {t('로그아웃')}
      </button>
    </>
  );
}
