// 「PRD 관리」 맨 위의 할 일 두 칸 — 확인 필요(골라서 한 번에 확정) · 반영 안 됨(테스트에 반영) (도메인/작성 §3.6 「사람이 고칠 때」 · 「미확정」)
// 확정은 PR 없이 바로 새 판이다. 확정은 QA 가 한다 — 기획자에게는 문서 · 화면 충돌만 묻는다 (2026-10-10 사용자)

import type { PrdBasis } from '@platform/kit';
import { useState } from 'react';

import { ApiError } from './api.js';
import { 요청오류문장 } from './errorText.js';
import { use말, use언어 } from './i18n.js';
import type { 판짓기 } from './Prd.js';
import { prdApi, type PrdNow } from './prdApi.js';
import { PrdUncovered } from './PrdUncovered.js';
import { 뒤집은, 반영안됨줄, 확인필요줄, type 반영종류 } from './prdView.js';
import { message } from './ui.js';
import { ScenarioUsage } from './ScenarioUsage.js';
import { 미확정나이 } from './unconfirmed.js';

/** 「N일째」 · 「오늘」. 시각이 없으면 안 적는다 */
export function use나이글(): (since: string | null | undefined) => string | null {
  const t = use말();
  return (since) => {
    if (since === null || since === undefined) return null;
    const 일 = 미확정나이(since);
    return 일 === 0 ? t('오늘') : t('{일}일째', { 일 });
  };
}

export function use반영종류글(): Record<반영종류, string> {
  const t = use말();
  return { changed: t('바뀜'), added: t('새 항목'), removed: t('지움') };
}

export const 근거자리 = (b: PrdBasis | undefined) => (b === undefined ? '' : b.ref === undefined ? b.from : `${b.from} · ${b.ref}`);

export function PrdTodo({ service, now, 쓰나, 짓기 }: { service: string; now: PrdNow; 쓰나: boolean; 짓기: 판짓기 }) {
  const t = use말();
  const 나이글 = use나이글();
  const 종류글 = use반영종류글();
  const [고른, set고른] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [반영결과, set반영결과] = useState<{ 글: string; 번호들: number[] } | null>(null);
  const [세움, set세움] = useState(false);
  const 언어 = use언어();
  const 기다림 = 확인필요줄(now.items);
  const 반영 = 반영안됨줄(now);
  // 반영 PR 이 다시 쓰거나 지울 수 있는 케이스 — 에이전트도 같은 요구사항 표(지도 ① 의 원본)로 덮던 케이스를 고른다 (도메인/작성 §3.6 「고친 요구만 다시 작성」)
  const 덮던케이스 = [...new Set(반영.flatMap((x) => (now.cases[x.reqId] ?? []).map((c) => c.tcId)))].sort();

  // 찾은 화면이 하나라도 있으면 세 번째 카드는 그린다 — 크롤이 안 돈 서비스(0)만 안 그린다
  const 화면카드 = now.foundScreens > 0;
  if (기다림.length === 0 && 반영.length === 0 && !화면카드) return <p className="prd-clear">{t('확인할 요구도 테스트에 반영할 요구도 없습니다')}</p>;

  // 다시 읽은 판에서 이미 확정된 번호는 빼고 보낸다 — 남은 것을 보내면 서버가 BAD_CONFIRM 으로 통째 거절한다
  const 보낼것 = 기다림.filter((x) => 고른.has(x.reqId)).map((x) => x.reqId);
  const 오래된것 = 나이글(now.needsCheck.oldestSince);

  async function 확정() {
    setBusy(true);
    if (await 짓기((base) => prdApi.confirm(service, base, 보낼것))) set고른(new Set());
    setBusy(false);
  }

  // 반영은 새 판이 아니라 작성 요청이다 — 판을 다시 읽지 않는다. 반영 안 됨은 그 PR 이 병합돼야 준다 (§7 「표준 기획서 통로」 apply)
  async function 테스트에반영() {
    setBusy(true);
    try {
      const { id } = await prdApi.apply(service);
      set반영결과({ 글: t('작성 요청 {번호}번을 만들었습니다', { 번호: id }), 번호들: [id] });
      set세움(true);
    } catch (err) {
      // 열린 반영이 있으면 서버가 그 요청 번호들을 준다 — 글자로 오면 「12,15」다(케이스 고치기의 EDIT_OPEN 과 같다)
      const 열린 = err instanceof ApiError && err.code === 'APPLY_OPEN' ? err.message.split(',').map(Number).filter(Number.isSafeInteger) : [];
      set반영결과({ 글: 열린.length > 0 ? 요청오류문장('APPLY_OPEN', 언어) : message(err, 언어), 번호들: 열린 });
    }
    setBusy(false);
  }

  return (
    <div className="prd-todo">
      <section className="prd-card" aria-labelledby="prd-check-title">
        <header>
          <h2 id="prd-check-title">{t('확인 필요 {건수}건', { 건수: 기다림.length })}</h2>
          <small>
            {오래된것 === null ? null : <>{t('가장 오래된 것 {나이}', { 나이: 오래된것 })} · </>}
            {t('화면 기준으로 적었거나 문서끼리 달라 사람이 판단합니다')}
          </small>
        </header>
        {기다림.length === 0 ? (
          <p className="prd-card-empty">{t('확인할 요구가 없습니다')}</p>
        ) : (
          <ul className="prd-queue">
            {기다림.map((x) => (
              <li key={x.reqId}>
                {쓰나 ? (
                  <input
                    type="checkbox"
                    aria-label={t('{번호} 고르기', { 번호: x.reqId })}
                    checked={고른.has(x.reqId)}
                    onChange={() => set고른(뒤집은(고른, x.reqId))}
                  />
                ) : null}
                <span className="prd-id">{x.reqId}</span>
                <span className="prd-text">{x.text}</span>
                <span className="prd-age">{나이글(x.checkSince)}</span>
                <small>
                  {x.feature} · {근거자리(x.basis[0])}
                </small>
              </li>
            ))}
          </ul>
        )}
        {쓰나 && 기다림.length > 0 ? (
          <footer>
            <label className="prd-all-pick">
              <input
                type="checkbox"
                checked={보낼것.length === 기다림.length}
                onChange={() => set고른(보낼것.length === 기다림.length ? new Set() : new Set(기다림.map((x) => x.reqId)))}
              />
              {t('모두 고르기')}
            </label>
            <span className="note">{t('확정하면 바로 새 판이 됩니다. PR 은 없습니다')}</span>
            <button className="btn small" disabled={busy || 보낼것.length === 0} onClick={() => void 확정()}>
              {t('고른 {건수}건 확정', { 건수: 보낼것.length })}
            </button>
          </footer>
        ) : null}
      </section>

      <section className="prd-card" aria-labelledby="prd-apply-title">
        <header>
          <h2 id="prd-apply-title">{t('반영 안 됨 {건수}건', { 건수: 반영.length })}</h2>
          <small>{t('고친 요구가 아직 테스트에 없습니다')}</small>
        </header>
        {반영.length === 0 ? (
          <p className="prd-card-empty">{t('테스트와 어긋난 요구가 없습니다')}</p>
        ) : (
          <ul className="prd-unapplied">
            {반영.map((x) => (
              <li key={x.reqId}>
                <span className="prd-kind">{종류글[x.kind]}</span>
                <span className="prd-id">{x.reqId}</span>
                {x.text === null ? <span className="prd-gone">{t('지운 요구')}</span> : <span className="prd-text">{x.text}</span>}
              </li>
            ))}
          </ul>
        )}
        {쓰나 && 반영.length > 0 ? (
          <footer>
            <ScenarioUsage service={service} tcIds={덮던케이스} 반영 />
            {반영결과 === null ? null : (
              <span className="note" role="status">
                {반영결과.글}
                {반영결과.번호들.map((번호) => (
                  <a key={번호} href={`#/authoring/${String(번호)}`}>
                    {' '}
                    {t('#{번호} 요청 보기', { 번호 })}
                  </a>
                ))}
              </span>
            )}
            {/* 세운 뒤 또 누르면 자기가 세운 요청에 APPLY_OPEN 이 난다 — 막아 둔다. 판을 다시 읽어도 반영 안 됨은 병합 전까지 그대로다 */}
            <button className="btn small" disabled={busy || 세움} onClick={() => void 테스트에반영()}>
              {t('바뀐 요구 {건수}건 테스트에 반영', { 건수: 반영.length })}
            </button>
          </footer>
        ) : null}
      </section>
      {화면카드 ? <PrdUncovered now={now} /> : null}
    </div>
  );
}
