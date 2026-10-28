// 휴대폰 껍데기 — 위 줄(서비스 고르개 · 사람 버튼) · 본문 · 아래 탭(대시보드 · 실행 기록 · 알림) (SPEC 공통/5-화면공통 §8 「휴대폰 화면」)
// 휴대폰에서 하는 일은 결과 확인 · 진행 상황 · 다시 실행뿐이라 PC 전용 화면의 주소로 오면 그 화면 대신 안내를 그린다

import { useEffect, useRef, useState } from 'react';

import type { ServiceRow, User } from './api.js';
import { use말, type 언어 } from './i18n.js';
import { 아이콘 } from './icons.js';
import { 고른서비스를적는다, 자리목록, type 빈띠, type 자리 } from './layout.js';
import { Notice } from './Notice.js';
import { 휴대폰자리인가 } from './phone.js';
import { 서비스고르개, 언어고르개, 프로젝트고르개 } from './ShellPickers.js';
import { useSSO } from './useSSO.js';

interface Props {
  user: User;
  service: ServiceRow | null;
  onService: (prefix: string) => void;
  언어: 언어;
  on언어: (고른: 언어) => void;
  onLogout: () => void;
  current: string;
  /** 실제 주소 — 성능 실행 한 건만 휴대폰에서 연다 (phone.ts) */
  주소?: string;
  /** 배정 · 권한이 없어 본문 대신 띄울 안내. PC 껍데기와 같은 판단이다 (layout.ts `빈띠사유`) */
  사유: 빈띠 | null;
  /** 웹 애플리케이션에 앱 케이스가 있나 — 「기기 성능」 메뉴를 가른다. PC 껍데기가 읽어 넘긴다 */
  앱케이스?: boolean;
  children: React.ReactNode;
}

const 지금이면 = (맞나: boolean) => (맞나 ? { 'aria-current': 'page' as const } : {});

export function PhoneShell({ user, service, onService, 언어, on언어, onLogout, current, 주소, 사유, 앱케이스 = false, children }: Props) {
  const t = use말();
  const sso = useSSO();
  // 「알림」 버튼은 아래 탭의 한 칸이다. 줄 · 서랍과 열림 상태를 같이 쓰도록 Notice 가 이 자리에 버튼을 그린다
  const [알림자리, set알림자리] = useState<HTMLElement | null>(null);
  const 메뉴 = useRef<HTMLDetailsElement>(null);
  // 펼침(details)은 바깥을 눌러도 안 닫힌다 — 240px 메뉴가 실패 카드 · 다시 실행 판을 덮은 채 남았다 (2026-10-12 코드 검토)
  useEffect(() => {
    const 닫기 = (e: Event) => {
      const 상자 = 메뉴.current;
      if (상자 === null || !상자.open) return;
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !상자.contains(e.target as Node)) 상자.open = false;
    };
    document.addEventListener('pointerdown', 닫기);
    document.addEventListener('keydown', 닫기);
    return () => {
      document.removeEventListener('pointerdown', 닫기);
      document.removeEventListener('keydown', 닫기);
    };
  }, []);
  const 대시보드인가 = current === '#/dashboard';
  const 자리들 = 자리목록(user, service?.prefix ?? null, 언어, 앱케이스);
  const 대시보드 = 자리들.find((it) => it.해시 === '#/dashboard');
  // API 애플리케이션은 실행 기록이 「API」 아래에 선다(layout.ts) — 휴대폰 탭은 그 자리를 쓴다
  const API실행기록 = 자리들.find((it) => it.해시 === '#/api/docs')?.하위?.find((it) => it.해시 === '#/runs/fn');
  const 실행기록: 자리 | undefined = 자리들.find((it) => it.해시 === '#/runs') ?? (API실행기록 === undefined ? undefined : { 이름: API실행기록.이름, 해시: API실행기록.해시, 아이콘: 'runs' });
  // 하위 고르개는 실행 기록 목록에서만 — 실행 결과 · 항목 상세(`#/runs`)는 종류를 모른다
  const 하위 = 실행기록?.하위?.some((it) => it.해시 === current) === true ? 실행기록.하위 : undefined;

  let 본문: React.ReactNode = children;
  if (사유 !== null) {
    본문 = (
      <div className="screen">
        <div className="empty">
          {사유.무엇}
          {사유.다음 === '' ? null : <small>{사유.다음}</small>}
        </div>
      </div>
    );
  } else if (!휴대폰자리인가(current, 주소)) {
    // 자리마다 새로 그린다 — 앞 주소에서 누른 「복사했습니다」가 다음 주소에 남으면 복사 안 한 주소를 복사했다고 말한다
    본문 = <PC전용 key={current} 자리={자리들.find((it) => current === it.해시 || current.startsWith(`${it.해시}/`))} 갈곳={실행기록 ?? 대시보드} />;
  }

  return (
    <div className="ph">
      <header className="ph-top">
        {/* 대시보드는 여러 서비스를 함께 본다 — PC 사이드바처럼 고르개를 숨긴다 (화면공통 §8 「껍데기」) */}
        {대시보드인가 ? (
          <span className="ph-gap" />
        ) : (
          <>
            <프로젝트고르개 user={user} service={service} onService={onService} />
            <서비스고르개 user={user} service={service} onService={onService} />
          </>
        )}
        {/* 자리를 옮기면 접힌 채로 다시 그린다 — 비밀번호 변경을 누르고 와도 메뉴가 펼쳐진 채 남지 않는다 */}
        <details key={current} ref={메뉴} className="ph-me">
          <summary aria-label={t('내 메뉴')}>
            <아이콘 이름="person" />
          </summary>
          <div className="ph-me-menu">
            <b>{user.displayName}</b>
            <div className="side-lang">
              <언어고르개 언어={언어} on언어={on언어} />
            </div>
            {/* maxihan 계정이면 비밀번호는 Auth_platform 이 가진다 (SPEC §8.6) */}
            {sso === true ? null : <a href="#/password">{t('비밀번호 변경')}</a>}
            <button className="btn ghost" onClick={onLogout}>
              {t('로그아웃')}
            </button>
          </div>
        </details>
      </header>

      <div className="main">
        {service === null ? null : (
          <Notice
            줄숨김={대시보드인가}
            서비스바꿈={(접두사) => {
              고른서비스를적는다(접두사);
              onService(접두사);
            }}
            버튼자리={알림자리}
          />
        )}
        {실행기록 === undefined || 하위 === undefined ? null : (
          <nav className="ph-sub" aria-label={실행기록.이름}>
            {하위.map((it) => (
              <a key={it.해시} href={it.해시} aria-label={it.라벨} {...지금이면(current === it.해시)}>
                {it.이름}
              </a>
            ))}
          </nav>
        )}
        {본문}
      </div>

      <nav className="ph-tabs" aria-label={t('휴대폰 메뉴')}>
        {대시보드 === undefined ? null : (
          <a href={대시보드.해시} {...지금이면(대시보드인가)}>
            <아이콘 이름="dashboard" />
            {대시보드.이름}
          </a>
        )}
        {실행기록 === undefined ? null : (
          <a href={실행기록.해시} {...지금이면(current === '#/runs' || current.startsWith('#/runs/'))}>
            <아이콘 이름="runs" />
            {실행기록.이름}
          </a>
        )}
        <span ref={set알림자리} className="ph-slot" />
      </nav>
    </div>
  );
}

/**
 * PC 전용 화면의 주소로 왔을 때. 집으로 보내지 않는다 — 가려던 주소가 사라지면 PC 에서 다시 찾을 길이 없다.
 * 알림 서랍의 작성 요청 고리처럼 휴대폰에도 PC 전용 화면으로 가는 고리가 있다
 */
function PC전용({ 자리: 여기, 갈곳 }: { 자리: 자리 | undefined; 갈곳: 자리 | undefined }) {
  const t = use말();
  // null 은 아직 안 누름, true 는 복사함, false 는 못 함
  const [복사됨, set복사됨] = useState<boolean | null>(null);

  // 클립보드는 https 에서만 열린다. 사내 서버를 http 로 열면 `navigator.clipboard` 가 아예 없어 그 자리에서 던진다 — 약속 안에서 불러 실패 갈래로 받는다
  const 복사하기 = () => {
    void Promise.resolve()
      .then(() => navigator.clipboard.writeText(window.location.href))
      .then(
        () => set복사됨(true),
        () => set복사됨(false),
      );
  };

  return (
    <div className="screen">
      <div className="pc-only">
        <아이콘 이름="desktop" />
        <h1>{여기 === undefined ? t('이 화면은 PC 에서 엽니다') : t('「{이름}」 화면은 PC 에서 엽니다', { 이름: 여기.이름 })}</h1>
        <p>{t('휴대폰에서는 실행 결과 확인 · 진행 상황 · 다시 실행만 합니다. 같은 주소를 PC 에서 여세요')}</p>
        <button className="btn ghost" onClick={복사하기}>
          {복사됨 === true ? t('주소를 복사했습니다') : t('주소 복사')}
        </button>
        {복사됨 === false ? <p className="err">{t('주소를 복사하지 못했습니다. 주소창에서 직접 복사하세요')}</p> : null}
        {갈곳 === undefined ? null : (
          <a className="btn" href={갈곳.해시}>
            {갈곳.해시 === '#/runs' ? t('실행 기록으로') : t('대시보드로')}
          </a>
        )}
      </div>
    </div>
  );
}
