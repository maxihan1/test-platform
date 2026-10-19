// 프로젝트 고르개 · 애플리케이션 고르개 · 언어 고르개 — 헤더(ShellHeader)와 휴대폰 위 줄(PhoneShell)이 같이 쓴다 (SPEC 공통/5-화면공통 §8)

import type { ServiceRow, User } from './api.js';
import { use말, type 언어 } from './i18n.js';
import { 고른서비스를적는다, 배정프로젝트들, 프로젝트서비스들 } from './layout.js';

/**
 * 프로젝트 고르개. 프로젝트를 바꾸면 그 안의 첫 애플리케이션으로 연다.
 * 프로젝트가 하나뿐이면 고를 것이 없어 이름만 적는다 (공통/1-제품과-구조 §2 「프로젝트 · 애플리케이션 · API 서버는 다른 층이다」)
 */
export function 프로젝트고르개({ user, service, onService }: { user: User; service: ServiceRow | null; onService: (prefix: string) => void }) {
  const t = use말();
  if (service === null) return null;
  const 프로젝트들 = 배정프로젝트들(user.services);
  if (프로젝트들.length < 2) return <span className="side-svc-name">{service.projectName}</span>;
  return (
    <select
      className="side-pick"
      value={service.projectId}
      onChange={(e) => {
        const 첫것 = 프로젝트서비스들(Number(e.target.value), user.services)[0];
        if (첫것 === undefined) return;
        고른서비스를적는다(첫것.prefix);
        onService(첫것.prefix);
      }}
      aria-label={t('프로젝트 선택')}
    >
      {프로젝트들.map((it) => (
        <option key={it.id} value={it.id}>
          {it.name}
        </option>
      ))}
    </select>
  );
}

/** 애플리케이션 고르개 — 고른 프로젝트 안의 것만 뜬다. 고른 애플리케이션을 브라우저에 적어 두고 화면이 읽는 애플리케이션을 바꾼다 */
export function 서비스고르개({ user, service, onService }: { user: User; service: ServiceRow | null; onService: (prefix: string) => void }) {
  const t = use말();
  if (service === null) return <span className="side-svc-name">{t('애플리케이션 없음')}</span>;
  return (
    <select
      className="side-pick"
      value={service.prefix}
      onChange={(e) => {
        고른서비스를적는다(e.target.value);
        onService(e.target.value);
      }}
      aria-label={t('애플리케이션 선택')}
    >
      {프로젝트서비스들(service.projectId, user.services).map((it) => (
        <option key={it.prefix} value={it.prefix}>
          {it.name}
        </option>
      ))}
    </select>
  );
}

/** 언어 고르개 — 사이드바와 휴대폰 사람 메뉴가 같이 쓴다. 둘이 한 화면에 같이 서지 않아 id 가 하나다 */
export function 언어고르개({ 언어, on언어 }: { 언어: 언어; on언어: (고른: 언어) => void }) {
  const t = use말();
  return (
    <>
      <label className="side-lang-label" htmlFor="side-lang">
        {t('언어')}
      </label>
      <select id="side-lang" value={언어} onChange={(e) => on언어(e.target.value === 'en' ? 'en' : 'ko')}>
        <option value="ko">한국어</option>
        <option value="en">English</option>
      </select>
    </>
  );
}
