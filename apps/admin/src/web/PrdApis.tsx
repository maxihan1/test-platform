// 「PRD 관리」의 서비스 지도 — 편 요구 줄의 「거치는 API」와 할 일 칸 아래 「케이스가 안 거친 API」 카드 (도메인/작성 §3.6 「서비스 지도」 · 2026-10-16 시안)
// 요구 → API 는 지도 ①(GET /prd 의 cases)과 지도 API 의 케이스 줄을 tcId 로 잇는다. 관찰한 API 라 기대값의 근거가 아니다

import { useState, type ReactNode } from 'react';

import type { API줄 as 주소, 지도API } from '../prd/apiMap.js';
import type { 덮는케이스 } from '../prd/trace.js';
import { use말, use언어 } from './i18n.js';
import { when } from './ui.js';

export interface 거치는줄 {
  method: string;
  host: string;
  path: string;
  via: { tcId: string; steps: number[] }[];
}

/** 그 요구를 덮는 케이스가 부른 API 만 — 부른 케이스 · 단계를 같이 단다 */
export function 요구가거치는(덮는: 덮는케이스[], apis: 지도API[]): 거치는줄[] {
  const 케이스 = new Set(덮는.map((c) => c.tcId));
  return apis.flatMap((a) => {
    const via = a.cases.filter((c) => 케이스.has(c.tcId));
    return via.length === 0 ? [] : [{ method: a.method, host: a.host, path: a.path, via }];
  });
}

// 한 줄 — 방식 · 주소, 뒤 칸(부른 곳 · 본 화면)은 자리마다 다르다
function API줄({ a, children }: { a: 주소; children: ReactNode }) {
  return (
    <li>
      <span className="prd-api-m">{a.method}</span>
      <span className="prd-id">
        {a.host}
        {a.path}
      </span>
      {children}
    </li>
  );
}

function 부른곳({ via }: { via: 거치는줄['via'] }) {
  const t = use말();
  return (
    <span className="prd-api-via">
      {via
        .map((c) => (c.steps.length === 0 ? c.tcId : t('{케이스} {단계}단계', { 케이스: c.tcId, 단계: c.steps.join(', ') })))
        .join(' · ')}
    </span>
  );
}

/** 편 줄 구획. 그 요구의 케이스가 아직 아무 API 도 안 불렀으면 안 그린다 */
export function 거치는API({ 줄들 }: { 줄들: 거치는줄[] }) {
  const t = use말();
  if (줄들.length === 0) return null;
  // 개발 정보라 접어 둔다 — 요구를 읽는 사람이 먼저 보는 것은 근거와 테스트다 (점검 8.12)
  return (
    <section>
      <details className="prd-fold">
        <summary>{t('거치는 API {건수}개', { 건수: 줄들.length })}</summary>
        <ul className="prd-apis">
          {줄들.map((a) => (
            <API줄 key={`${a.method} ${a.host}${a.path}`} a={a}>
              <부른곳 via={a.via} />
            </API줄>
          ))}
        </ul>
      </details>
    </section>
  );
}

/** 지도가 아직 비었으면(실행 · 화면 훑기 전) 카드를 안 그린다 */
export function 안거친API카드({ apis }: { apis: 지도API[] }) {
  const t = use말();
  const 언어 = use언어();
  // 수십 개가 한꺼번에 펴지면 아래 요구 목록이 화면 밖으로 밀린다 — 접어 두고 제목 옆에 개수만 보인다 (점검 8.6)
  const [폈나, set폈나] = useState(false);
  if (apis.length === 0) return null;
  const 안거친 = apis.filter((a) => a.cases.length === 0);
  return (
    <section className="prd-card prd-untested" aria-labelledby="prd-untested-title">
      <header>
        <h2 id="prd-untested-title">{t('케이스가 안 거친 API {건수}개', { 건수: 안거친.length })}</h2>
        <small>{t('이 서비스에서 본 API {전체}개 중 아직 어떤 케이스도 부르지 않은 API 입니다', { 전체: apis.length })}</small>
        {안거친.length === 0 ? null : (
          <button type="button" className="btn ghost small" aria-expanded={폈나} onClick={() => set폈나(!폈나)}>
            {폈나 ? t('접기') : t('펴기')}
          </button>
        )}
      </header>
      {안거친.length === 0 ? (
        <p className="prd-card-empty">{t('본 API 를 모두 케이스가 거칩니다')}</p>
      ) : !폈나 ? null : (
        <ul className="prd-apis">
          {안거친.map((a) => (
            <API줄 key={`${a.method} ${a.host}${a.path}`} a={a}>
              <span className="prd-api-via">
                {a.screens[0] === undefined
                  ? t('마지막 {때}', { 때: when(a.lastSeen, 언어) })
                  : t('화면 {주소} 에서 봤습니다 · 마지막 {때}', { 주소: a.screens[0].url, 때: when(a.lastSeen, 언어) })}
              </span>
            </API줄>
          ))}
        </ul>
      )}
    </section>
  );
}
