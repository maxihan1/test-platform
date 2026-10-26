// 「API 문서」의 할 일 카드 — 케이스가 안 거친 응답. 바뀐 API 를 테스트에 반영하는 일은 테스트 작성의 「결정 필요」 한 곳에서 한다 (도메인/작성 §3.6 「★ 결정 목록」)

import { useState } from 'react';

import type { ApiCoverage } from './apiDocApi.js';
import { 안거친응답 } from './apidocView.js';
import { use말 } from './i18n.js';

export function 안거친응답카드({ coverage }: { coverage: ApiCoverage }) {
  const t = use말();
  // 수십 개가 한꺼번에 펴지면 아래 전체 목록이 화면 밖으로 밀린다 — 접어 두고 제목에 개수만 보인다
  const [폈나, set폈나] = useState(false);
  const 줄들 = 안거친응답(coverage);
  const 수 = coverage.total - coverage.covered;
  return (
    <section className="prd-card prd-untested" aria-labelledby="api-untested-title">
      <header>
        <h2 id="api-untested-title">{t('케이스가 안 거친 응답 {건수}개', { 건수: 수 })}</h2>
        <small>{t('응답 코드 {전체}개 중 아직 통과한 케이스가 받지 못한 응답입니다', { 전체: coverage.total })}</small>
        {줄들.length === 0 ? null : (
          <button type="button" className="btn ghost small" aria-expanded={폈나} onClick={() => set폈나(!폈나)}>
            {폈나 ? t('접기') : t('펴기')}
          </button>
        )}
      </header>
      {줄들.length === 0 ? (
        <p className="prd-card-empty">{t('모든 응답을 케이스가 거칩니다')}</p>
      ) : !폈나 ? null : (
        <ul className="prd-apis">
          {줄들.map((x) => (
            <li key={`${x.method} ${x.path}`}>
              <span className="prd-api-m">{x.method}</span> <span className="prd-id">{x.path}</span>{' '}
              <span className="api-codes">
                {x.codes.map((c) => (
                  <span key={c} className="api-code">
                    {c}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
