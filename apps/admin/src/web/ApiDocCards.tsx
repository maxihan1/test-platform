// 「API 문서」의 할 일 카드 둘 — 반영 안 됨(바뀐 API → 테스트에 반영) · 케이스가 안 거친 응답. PRD 관리 「반영 안 됨」 · 「케이스가 안 거친 API」 카드와 같은 꼴이다

import { useState } from 'react';

import { apiDocApi, type ApiCoverage, type ApiDocChange } from './apiDocApi.js';
import { ApiError, type EnvRow } from './api.js';
import { 바뀐종류, 반영할줄, 안거친응답 } from './apidocView.js';
import { use말, use언어 } from './i18n.js';
import { use반영종류글 } from './PrdTodo.js';
import { message, type Async } from './ui.js';

// 「실서비스 서버」 줄은 작성이 가지 않는다 — 서버가 BAD_ENV 로 막는 것을 고르기 전에 뺀다 (도메인/작성 §7 「AUTHOR API 문서 판」)
const 돌려볼서버 = (envs: EnvRow[]) => envs.filter((e) => e.isProd !== true).map((e) => e.env);

export function 반영카드({
  id,
  버전,
  앞버전,
  비교,
  envs,
  쓰나,
}: {
  id: number;
  버전: number;
  앞버전: number;
  비교: Async<ApiDocChange[] | null>;
  envs: EnvRow[];
  쓰나: boolean;
}) {
  const t = use말();
  const 언어 = use언어();
  const 종류글 = use반영종류글();
  const 서버들 = 돌려볼서버(envs);
  const [서버, set서버] = useState(서버들[0] ?? '');
  const [busy, setBusy] = useState(false);
  const [결과, set결과] = useState<{ 글: string; 번호들: number[] } | null>(null);
  const changes = 비교.data ?? [];
  const 반영 = 반영할줄(changes);
  const 지운 = changes.filter((c) => c.change === 'REMOVED');

  async function 테스트에반영() {
    setBusy(true);
    try {
      const { requestId } = await apiDocApi.rewrite(id, 버전, 앞버전, 서버, 반영.map(({ method, path }) => ({ method, path })));
      set결과({ 글: t('작성 요청 {번호}번을 만들었습니다', { 번호: requestId }), 번호들: [requestId] });
    } catch (err) {
      // 열린 반영 요청이 있으면 서버가 그 번호들을 detail 로 준다 — 그 요청으로 가는 고리를 단다 (PrdTodo 와 같다)
      const 열린 = err instanceof ApiError && err.code === 'APPLY_OPEN' ? err.message.split(',').map(Number).filter(Number.isSafeInteger) : [];
      set결과({ 글: message(err, 언어), 번호들: 열린 });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="prd-card" aria-labelledby="api-apply-title">
      <header>
        <h2 id="api-apply-title">{t('반영 안 됨 {건수}건', { 건수: 반영.length })}</h2>
        <small>{t('버전 {버전}에서 바뀐 API 가 아직 테스트에 없습니다', { 버전 })}</small>
      </header>
      {비교.error !== null ? (
        <p className="prd-card-empty prd-note bad">{비교.error}</p>
      ) : 비교.data === null ? (
        <p className="prd-card-empty">…</p>
      ) : changes.length === 0 ? (
        <p className="prd-card-empty">{t('버전 {버전}과 비교해 바뀐 API 가 없습니다', { 버전: 앞버전 })}</p>
      ) : (
        <ul className="prd-unapplied api-changes">
          {[...반영, ...지운].map((c) => (
            <li key={`${c.method} ${c.path}`}>
              <span className="prd-kind">{종류글[바뀐종류[c.change]]}</span>
              <span className="api-op">
                <span className="prd-api-m">{c.method}</span> <span className="prd-id">{c.path}</span>
              </span>
              <span className="prd-text">
                {c.notes.join(' · ')}
                {c.breaking ? <span className="case-tag">{t('기존 테스트가 실패할 수 있음')}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      {지운.length === 0 ? null : <p className="hint api-card-hint">{t('지운 API 를 쓰던 케이스는 지우지 않고 PR 에 삭제 제안으로 적습니다')}</p>}
      {쓰나 && 반영.length > 0 ? (
        <footer>
          {결과 === null ? null : (
            <span className="note" role="status">
              {결과.글}
              {결과.번호들.map((번호) => (
                <a key={번호} href={`#/authoring/${String(번호)}`}>
                  {' '}
                  {t('#{번호} 요청 보기', { 번호 })}
                </a>
              ))}
            </span>
          )}
          {서버들.length === 0 ? (
            <span className="note">{t('테스트를 돌려 볼 대상 서버가 없습니다. 설정에서 먼저 넣습니다')}</span>
          ) : (
            <label className="api-env">
              {t('대상 서버')}{' '}
              <select value={서버} onChange={(e) => set서버(e.target.value)}>
                {서버들.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </label>
          )}
          {/* 세운 뒤 또 누르면 자기가 세운 요청에 APPLY_OPEN 이 난다 — 막아 둔다 (PrdTodo 와 같다) */}
          <button className="btn small" disabled={busy || 서버 === '' || (결과 !== null && 결과.번호들.length > 0)} onClick={() => void 테스트에반영()}>
            {t('바뀐 API {건수}건 테스트에 반영', { 건수: 반영.length })}
          </button>
        </footer>
      ) : null}
    </section>
  );
}

export function 안거친응답카드({ coverage }: { coverage: ApiCoverage }) {
  const t = use말();
  // 수십 개가 한꺼번에 펴지면 아래 전체 목록이 화면 밖으로 밀린다 — 접어 두고 제목에 개수만 보인다 (PrdApis 와 같다)
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
