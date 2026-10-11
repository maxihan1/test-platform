// 서비스 고르개 · 언어 고르개 — 사이드바(Shell)와 휴대폰 위 줄(PhoneShell)이 같이 쓴다 (SPEC 공통/5-화면공통 §8)

import type { ServiceRow, User } from './api.js';
import { use말, type 언어 } from './i18n.js';
import { 고른서비스를적는다 } from './layout.js';

/** 서비스 고르개 — 사이드바와 휴대폰 위 줄이 같이 쓴다. 고른 서비스를 브라우저에 적어 두고 화면이 읽는 서비스를 바꾼다 */
export function 서비스고르개({ user, service, onService }: { user: User; service: ServiceRow | null; onService: (prefix: string) => void }) {
  const t = use말();
  if (service === null) return <span className="side-svc-name">{t('서비스 없음')}</span>;
  return (
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
