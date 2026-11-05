// 언어 고르개 — PC 내 메뉴(ShellMe)와 휴대폰 「전체」 메뉴판 · 내 메뉴(PhoneShell)가 같이 쓴다. 프로젝트 · 애플리케이션 고르기는 2026-11-05 부터 위치 카드 · 위치 판(ShellPlace)이다 (SPEC 공통/5-화면공통 §8)

import { use말, type 언어 } from './i18n.js';

/** 둘이 한 화면에 같이 서지 않아 id 가 하나다 */
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
