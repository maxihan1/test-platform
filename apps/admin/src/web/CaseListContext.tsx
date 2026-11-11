// 케이스 목록의 맥락 조각 — 요구 줄 · 상세 서랍의 화면 · API 서버 구획 · 걸린 요구 칩 (도메인/카탈로그 §8.1 「맥락」)
// 2026-11-11 시안 B — 줄 아래 두 줄(요구 · 종류 · 화면 · 설계 기법)과 묶음 머리 줄을 걷었다. 한 건이 한 줄이고 맥락은 상세 서랍에서 본다

import type { CaseRow } from './api.js';
import { 파일이름 } from './caseGroups.js';
import { use말 } from './i18n.js';
import { PRD항목주소 } from './route.js';

/** 화면 파일 클래스 이름을 읽기 좋게 — `게시판목록화면` → `게시판목록 화면` (PRD-F9-18) */
export const 화면이름글 = (이름: string): string => 이름.replace(/(?<=\S)(?=화면$)/, ' ');

/**
 * 요구 줄 — 첫 요구 번호 · 요구 문장 · 외 N건. E2E 단계 추가 탭이 쓴다 (도메인/시나리오 §8.11).
 * 요구보나가 거짓이면 번호가 고리 없는 글자다
 */
export function 요구줄({ row, 요구보나, 요구쓰나 }: { row: CaseRow; 요구보나: boolean; 요구쓰나: boolean }) {
  const t = use말();
  const reqs = row.reqs ?? [];
  const 첫 = reqs[0];
  const 더 = new Set(reqs.map((r) => r.reqId)).size - 1;
  // PRD 를 안 쓰는 서비스는 줄마다 「없음」을 달지 않는다 — 줄 하나만 버린다
  if (첫 === undefined) return 요구쓰나 ? <span className="case-req none">{t('연결된 요구사항 없음')}</span> : null;
  return (
    <span className="case-req">
      {첫.text === null || !요구보나 ? (
        <span className="case-req-id">{첫.reqId}</span>
      ) : (
        <a className="case-req-id" href={PRD항목주소(첫.reqId)} title={t('PRD 관리에서 보기')}>
          {첫.reqId}
        </a>
      )}
      <span className="case-req-text" title={첫.text ?? undefined}>
        {첫.text ?? t('PRD 에 없는 번호예요')}
      </span>
      {더 <= 0 ? null : <span className="case-req-more">{t('외 {건수}건', { 건수: 더 })}</span>}
    </span>
  );
}

/**
 * 상세 서랍의 화면 · API 서버 구획 — 줄에서 뺀 맥락이다. API 애플리케이션은 화면 자리에 엔드포인트가 선다.
 * 화면 이름을 못 읽었으면 주소, 그것도 없으면 파일 이름이다. 주소는 마우스를 올리면 보인다
 */
export function 케이스자리({ row }: { row: CaseRow }) {
  const t = use말();
  const 화면들 = row.screens ?? [];
  const 끝점들 = row.endpoints ?? [];
  const 서버들 = row.apiServers ?? [];
  return (
    <>
      {화면들.length + 끝점들.length === 0 ? null : (
        <div className="dsec">
          <div className="dlabel">{끝점들.length > 0 && 화면들.length === 0 ? t('엔드포인트') : t('화면')}</div>
          <div className="case-where">
            {화면들.map((s) => (
              <span className="case-screen" key={s.file} title={s.url ?? undefined}>
                {s.name == null ? (s.url ?? 파일이름(s.file)) : 화면이름글(s.name)}
              </span>
            ))}
            {끝점들.map((e) => (
              <span className="case-screen" key={e}>
                {e}
              </span>
            ))}
          </div>
        </div>
      )}
      {/* API 서버 이름은 판정 색이 아니라 설명 정보다 (도메인/카탈로그 §8.1 「API 서버」) */}
      {서버들.length === 0 ? null : (
        <div className="dsec">
          <div className="dlabel">{t('API 서버')}</div>
          <div className="case-where">
            {서버들.map((이름) => (
              <span className="tech-tag" key={이름}>
                {이름}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** 걸린 요구 번호 — 표 위 줄에 칩으로 보이고 ✕ 로 푼다. 필터 판의 조건 칩은 CaseListFilterBar 가 그린다 */
export function 걸린칩들({ 검색 }: { 검색: { 요구: string | null; 요구지우기: () => void } }) {
  const t = use말();
  // 주소의 요구 번호는 검색 조건 훅이 같이 뺀다(CaseListFilter use주소조건)
  return 검색.요구 === null ? null : <걸린칩 글={t('요구사항 {번호}', { 번호: 검색.요구 })} on풀기={검색.요구지우기} />;
}

export function 걸린칩({ 글, on풀기 }: { 글: string; on풀기: () => void }) {
  const t = use말();
  return (
    <span className="filter-on">
      {글}
      <button type="button" aria-label={t('{조건} 조건 풀기', { 조건: 글 })} onClick={on풀기}>
        ✕
      </button>
    </span>
  );
}
