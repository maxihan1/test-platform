// 「PRD 관리」의 서비스 지도 — 편 요구 줄의 「거치는 API」 (도메인/작성 §3.6 「서비스 지도」 · 2026-10-16 시안)
// 요구 → API 는 지도 ①(GET /prd 의 cases)과 지도 API 의 케이스 줄을 tcId 로 잇는다. 관찰한 API 라 기대값의 근거가 아니다

import type { ReactNode } from 'react';

import type { API줄 as 주소, 지도API } from '../prd/apiMap.js';
import type { 덮는케이스 } from '../prd/trace.js';
import { use말 } from './i18n.js';

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
