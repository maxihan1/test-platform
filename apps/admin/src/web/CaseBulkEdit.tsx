// 케이스 목록에서 고른 것으로 「삭제 요청」 (도메인/카탈로그 §8.1 「여러 건 골라」 · 도메인/작성 §3.6 「★ 케이스 고치기」)
// 확인 상자(가로막는 상자)를 거친다. 미확정 확정은 여기 없다 — 표준 기획서 항목 상태라 「PRD 관리」에서 한다

import { useState } from 'react';

import { 고치기상한, type 고칠것 } from '../authoring/edit.js';

import { api, type CaseRow } from './api.js';
import { 고치기오류문장 } from './caseEditView.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { ScenarioUsage } from './ScenarioUsage.js';

/**
 * 고른 것이 없으면 아무것도 안 그린다. 권한은 부르는 쪽이 본다(작성 쓰기).
 * `다되면` — 요청이 선 상자를 닫았다. 목록이 고른 것을 비운다. 상자가 떠 있는 동안 비우면 상자를 연 버튼이 사라져
 * 닫을 때 포커스가 돌아갈 자리가 없다 — 부르는 쪽이 갈 자리를 정한다 (2026-10-01 화면 QA)
 */
export function 고른것고치기({ service, 고른, 다되면 }: { service: string; 고른: ReadonlyMap<string, CaseRow>; 다되면: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [열린, set열린] = useState(false);
  const [담은, set담은] = useState<CaseRow[]>([]);
  const [빠진수, set빠진수] = useState(0);
  const [보내는중, set보내는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const [만든번호, set만든번호] = useState<number | null>(null);

  // 비활성 케이스는 서버가 거절한다(BAD_EDIT) — 버튼 글자의 수도 보낼 것만 센다
  const 살아있는 = [...고른.values()].filter((row) => row.isActive);
  if (고른.size === 0 && !열린) return null;

  function 연다() {
    const 후보 = [...고른.values()];
    const 대상 = 후보.filter((row) => row.isActive);
    set담은(대상);
    set빠진수(후보.length - 대상.length);
    set오류(null);
    set만든번호(null);
    set열린(true);
  }

  // 보내는 동안은 닫지 않는다 — 닫으면 실패 까닭도, 만든 요청 번호도 볼 자리가 없이 고른 것만 비워진다
  function 닫는다() {
    if (보내는중) return;
    set열린(false);
    if (만든번호 !== null) 다되면();
  }

  function 보낸다() {
    const edits: 고칠것[] = 담은.map((row) => ({ tcId: row.tcId, delete: true }));
    set보내는중(true);
    set오류(null);
    void api
      .createAuthoringEdit(service, edits)
      .then(({ id }) => set만든번호(id))
      .catch((err: unknown) => set오류(고치기오류문장(err, 언어)))
      .finally(() => set보내는중(false));
  }

  // 「상한 < 길이」로 쓴다 — `>` 뒤 한글 이름을 문구 검사(messages.test.ts)가 JSX 글로 읽는다
  const 넘침 = 고치기상한 < 담은.length;

  return (
    <>
      {/* 비활성만 골랐으면 보낼 것이 없다 — 버튼을 감춘다 */}
      {살아있는.length === 0 ? null : (
        <button className="btn ghost" type="button" onClick={연다}>
          {t('삭제 요청')}
        </button>
      )}

      {!열린 ? null : (
        <Modal
          제목={t('고른 {건수}건 삭제 요청', { 건수: 담은.length })}
          onClose={닫는다}
          버튼={
            만든번호 !== null ? (
              // 누른 보내기 버튼이 사라진다 — 닫기로 포커스를 받는다. key 로 새로 그려야 autoFocus 가 걸린다
              <button key="close" className="btn" type="button" autoFocus onClick={닫는다}>
                {t('닫기')}
              </button>
            ) : (
              <>
                <button className="btn ghost" type="button" onClick={닫는다}>
                  {t('취소')}
                </button>
                <button className="btn" type="button" disabled={보내는중 || 넘침 || 담은.length === 0} onClick={보낸다}>
                  {보내는중 ? t('보내는 중') : t('삭제 요청 보내기')}
                </button>
              </>
            )
          }
        >
          {만든번호 !== null ? (
            <p role="status">
              {t('요청을 보냈습니다.')} <a href={`#/authoring/${String(만든번호)}`}>{t('작성 요청 {번호}번', { 번호: 만든번호 })}</a>{' '}
              {t('반영은 테스트 작성 화면에서 합니다.')}
            </p>
          ) : (
            <>
              <p>
                {t('케이스 파일을 지우는 PR 을 올립니다. 반영하면 실행 대상에서 빠지고, 이 케이스를 쓰는 E2E 시나리오도 더 돌지 않습니다. 실행 기록은 남습니다.')}
              </p>
              <ScenarioUsage service={service} tcIds={담은.map((row) => row.tcId)} 대신문장={false} />
              {빠진수 === 0 ? null : <p className="hint">{t('비활성 {수}건은 뺐습니다', { 수: 빠진수 })}</p>}
              {넘침 ? <p className="error-text">{t('한 번에 {상한}건까지 요청할 수 있습니다. 고른 것을 줄이세요', { 상한: 고치기상한 })}</p> : null}
              <ul className="edit-list">
                {담은.map((row) => (
                  <li key={row.tcId}>
                    <span className="mono">{row.tcId}</span> {row.name}
                  </li>
                ))}
              </ul>
            </>
          )}
          {오류 === null ? null : <p className="error-text">{오류}</p>}
        </Modal>
      )}
    </>
  );
}
