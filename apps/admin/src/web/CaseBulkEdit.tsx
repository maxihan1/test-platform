// 케이스 목록에서 고른 것으로 「삭제 요청」 · 「미확정 N건 확정 요청」 (도메인/카탈로그 §8.1 「여러 건 골라」 · 도메인/작성 §3.6 「★ 케이스 고치기」)
// 확정 요청의 N 은 케이스 파일 꼬리표로 미확정인 것만 센다 — 표준 기획서가 정한 미확정은 「PRD 관리」에서 확정한다 (caseEditView.ts)
// 둘 다 확인 상자(가로막는 상자)를 거친다. 확정은 화면에서 읽은 값을 정식 기대값으로 올리는 판단이라 상자에 케이스마다 근거를 싣는다

import { useState } from 'react';

import { 고치기상한, type 고칠것 } from '../authoring/edit.js';

import { api, type CaseRow } from './api.js';
import { 고치기오류문장, 기대값한줄, 꼬리표미확정인가 } from './caseEditView.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { ScenarioUsage } from './ScenarioUsage.js';

type 무엇 = 'delete' | 'confirm';


/**
 * 고른 것이 없으면 아무것도 안 그린다. 권한은 부르는 쪽이 본다(작성 쓰기).
 * `다되면` — 요청이 선 상자를 닫았다. 목록이 고른 것을 비운다. 상자가 떠 있는 동안 비우면 상자를 연 버튼이 사라져
 * 닫을 때 포커스가 돌아갈 자리가 없다 — 부르는 쪽이 갈 자리를 정한다 (2026-10-01 화면 QA)
 */
export function 고른것고치기({ service, 고른, 다되면 }: { service: string; 고른: ReadonlyMap<string, CaseRow>; 다되면: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [열린, set열린] = useState<무엇 | null>(null);
  const [담은, set담은] = useState<CaseRow[]>([]);
  const [빠진수, set빠진수] = useState(0);
  const [보내는중, set보내는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const [만든번호, set만든번호] = useState<number | null>(null);

  // 비활성 케이스는 서버가 거절한다(BAD_EDIT) — 버튼 글자의 수도 보낼 것만 센다
  const 살아있는 = [...고른.values()].filter((row) => row.isActive);
  const 미확정수 = 살아있는.filter(꼬리표미확정인가).length;
  if (고른.size === 0 && 열린 === null) return null;

  function 연다(어느: 무엇) {
    const 후보 = 어느 === 'delete' ? [...고른.values()] : [...고른.values()].filter(꼬리표미확정인가);
    const 대상 = 후보.filter((row) => row.isActive);
    set담은(대상);
    set빠진수(후보.length - 대상.length);
    set오류(null);
    set만든번호(null);
    set열린(어느);
  }

  // 보내는 동안은 닫지 않는다 — 닫으면 실패 까닭도, 만든 요청 번호도 볼 자리가 없이 고른 것만 비워진다
  function 닫는다() {
    if (보내는중) return;
    set열린(null);
    if (만든번호 !== null) 다되면();
  }

  function 보낸다() {
    const edits: 고칠것[] = 담은.map((row) => (열린 === 'delete' ? { tcId: row.tcId, delete: true } : { tcId: row.tcId, confirm: true }));
    set보내는중(true);
    set오류(null);
    void api
      .createAuthoringEdit(service, edits)
      .then(({ id }) => set만든번호(id))
      .catch((err: unknown) => set오류(고치기오류문장(err, 언어)))
      .finally(() => set보내는중(false));
  }

  const 넘침 = 담은.length > 고치기상한;
  const 보내기글 = 열린 === 'delete' ? t('삭제 요청 보내기') : t('확정 요청 보내기');

  return (
    <>
      {/* 비활성만 골랐으면 보낼 것이 없다 — 확정 버튼처럼 감춘다 */}
      {살아있는.length === 0 ? null : (
        <button className="btn ghost" type="button" onClick={() => 연다('delete')}>
          {t('삭제 요청')}
        </button>
      )}
      {미확정수 === 0 ? null : (
        <button className="btn ghost" type="button" onClick={() => 연다('confirm')}>
          {t('미확정 {건수}건 확정 요청', { 건수: 미확정수 })}
        </button>
      )}

      {열린 === null ? null : (
        <Modal
          제목={열린 === 'delete' ? t('고른 {건수}건 삭제 요청', { 건수: 담은.length }) : t('미확정 {건수}건 확정 요청', { 건수: 담은.length })}
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
                  {보내는중 ? t('보내는 중') : 보내기글}
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
                {열린 === 'delete'
                  ? t('케이스 파일을 지우는 PR 을 올립니다. 반영하면 실행 대상에서 빠지고, 이 케이스를 쓰는 E2E 시나리오도 더 돌지 않습니다. 실행 기록은 남습니다.')
                  : t('미확정 표시를 떼는 PR 을 올립니다. 케이스마다 지금 기대값이 맞는지 보고 보내세요.')}
              </p>
              {열린 === 'delete' ? <ScenarioUsage service={service} tcIds={담은.map((row) => row.tcId)} 대신문장={false} /> : null}
              {빠진수 === 0 ? null : <p className="hint">{t('비활성 {수}건은 뺐습니다', { 수: 빠진수 })}</p>}
              {넘침 ? <p className="error-text">{t('한 번에 {상한}건까지 요청할 수 있습니다. 고른 것을 줄이세요', { 상한: 고치기상한 })}</p> : null}
              <ul className="edit-list">
                {담은.map((row) => (
                  <li key={row.tcId}>
                    <span className="mono">{row.tcId}</span> {row.name}
                    {열린 === 'confirm' ? (
                      <>
                        <small>
                          {t('미확정 사유')} · {row.unconfirmed}
                        </small>
                        <small>
                          {t('지금 기대값')} · {기대값한줄(row.expectedSchema, 언어)}
                        </small>
                      </>
                    ) : null}
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
