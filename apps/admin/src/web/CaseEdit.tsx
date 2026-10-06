// 케이스 상세의 「코드 기본값 바꾸기 요청」 — 기대값 · 확정 · 삭제를 작성 에이전트에 요청한다 (도메인/카탈로그 §8.1 · 도메인/작성 §3.6 「★ 케이스 고치기」)
//
// 위의 기대결과 칸(이번 실행 값 · 저장값)과 **이름을 가른다.** 거기는 다음 실행에 쓸 값이고 여기는 저장소의 코드다 —
// 섞이면 이번 실행만 바꾸려던 값이 PR 로 올라간다.
// 삭제는 상자가 아니라 **이 자리에서 두 번** 누른다. 이 상자는 「열어서 보는 상자」라 안에 가로막는 상자를 띄우지 않는다 (DESIGN.md 「모달」)

import { useEffect, useRef, useState } from 'react';

import type { 고칠것 } from '../authoring/edit.js';

import { api, type CaseRow } from './api.js';
import { 고치기오류문장, 고칠칸들, 기대값들, 기대값한줄, 바꾼값, 저장값지울칸 } from './caseEditView.js';
import { Form } from './Form.js';
import { use말, use언어 } from './i18n.js';
import { initialText } from './schema.js';
import { ScenarioUsage } from './ScenarioUsage.js';
import { fieldErrors } from './validation.js';

export function 코드기본값고치기({ row, service }: { row: CaseRow; service: string }) {
  const t = use말();
  const 언어 = use언어();
  const 칸들 = 고칠칸들(row.expectedSchema);
  const [글, set글] = useState(initialText(칸들));
  const [확정, set확정] = useState(false);
  const [지우려나, set지우려나] = useState(false);
  const [보내는중, set보내는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const [만든번호, set만든번호] = useState<number | null>(null);
  // 누른 버튼이 사라지는 자리마다 포커스를 옮긴다 — 안 옮기면 body 로 빠져 키보드로 다시 찾아 들어와야 한다.
  // 삭제 확인 줄에서는 취소로 간다: 더블클릭 · Enter 두 번의 두 번째 누름이 삭제로 새지 않게 (2026-10-01 화면 QA)
  const [포커스, set포커스] = useState<'cancel' | 'ask' | 'status' | null>(null);
  const 묻기단추 = useRef<HTMLButtonElement>(null);
  const 취소단추 = useRef<HTMLButtonElement>(null);
  const 결과줄 = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (포커스 === null) return;
    (포커스 === 'cancel' ? 취소단추 : 포커스 === 'ask' ? 묻기단추 : 결과줄).current?.focus();
    set포커스(null);
  }, [포커스]);

  const 미확정 = typeof row.unconfirmed === 'string';
  const 바꾼 = 바꾼값(칸들, 글);
  // 바꾼 칸만 본다 — 손대지 않은 칸은 지금 코드 값이라 사유를 낼 까닭이 없다. 「반드시 채울 칸」도 안 본다(안 보낸 칸은 코드 그대로다)
  const 칸오류 = fieldErrors({ ...row.expectedSchema, required: [] }, 바꾼);
  const 지울칸 = 저장값지울칸(row, 칸들, Object.keys(바꾼));
  const 보낼것있나 = Object.keys(바꾼).length > 0 || (미확정 && 확정);

  function 보낸다(고칠: 고칠것) {
    set보내는중(true);
    set오류(null);
    void api
      .createAuthoringEdit(service, [고칠])
      .then(({ id }) => {
        set만든번호(id);
        set포커스('status');
      })
      .catch((err: unknown) => set오류(고치기오류문장(err, 언어)))
      .finally(() => set보내는중(false));
  }

  function 기본값요청() {
    if (Object.keys(칸오류).length > 0) return;
    보낸다({
      tcId: row.tcId,
      ...(Object.keys(바꾼).length > 0 ? { expected: 기대값들(바꾼) } : {}),
      ...(미확정 && 확정 ? { confirm: true as const } : {}),
    });
  }

  return (
    <div className="dsec case-edit" role="group" aria-label={t('코드 기본값 바꾸기 요청')}>
      <div className="dlabel">{t('코드 기본값 바꾸기 요청')}</div>
      <p className="hint">{t('테스트 코드에 적힌 기대결과입니다. 바꾼 칸만 PR 로 올라가고, 반영하면 다음 실행부터 이 값이 기본값이 됩니다')}</p>
      {칸들.length === 0 ? (
        <p className="hint">{t('코드에서 바꿀 수 있는 기대결과 칸이 없습니다')}</p>
      ) : (
        <Form
          idPrefix={`edit-${row.tcId}`}
          fields={칸들}
          text={글}
          errors={칸오류}
          onChange={(key, value) => set글((전) => ({ ...전, [key]: value }))}
        />
      )}
      {지울칸.length === 0 ? null : (
        <p className="hint">{t('{칸들} — 반영되면 이 저장값은 지워집니다', { 칸들: 지울칸.join(', ') })}</p>
      )}

      {/* 확정은 화면에서 읽은 값을 정식 기대값으로 올리는 사람의 판단이다 — 그 근거(사유 · 지금 값)를 곁에 둔다 */}
      {!미확정 ? null : (
        <div className="edit-confirm">
          <label>
            <input type="checkbox" checked={확정} onChange={(e) => set확정(e.target.checked)} />
            {t('확정 — 지금 기대값이 맞다고 판정합니다')}
          </label>
          <p className="hint">
            {t('미확정 사유')} · {row.unconfirmed}
          </p>
          <p className="hint">
            {t('지금 기대값')} · {기대값한줄(row.expectedSchema, 언어)}
          </p>
        </div>
      )}

      {만든번호 !== null ? (
        <p role="status" tabIndex={-1} ref={결과줄}>
          {t('요청을 보냈습니다.')} <a href={`#/authoring/${String(만든번호)}`}>{t('작성 요청 {번호}번', { 번호: 만든번호 })}</a>{' '}
          <span className="hint">{t('반영은 테스트 작성 화면에서 합니다.')}</span>
        </p>
      ) : (
        <>
          <div className="btns">
            <button className="btn" type="button" disabled={!보낼것있나 || 보내는중} onClick={기본값요청}>
              {보내는중 ? t('보내는 중') : t('요청 보내기')}
            </button>
          </div>
          <div className="edit-delete">
            {/* 취소가 앞자리다 — 「케이스 삭제 요청」이 있던 자리에 「삭제 확인」이 서면 더블클릭 한 번이 두 번 누름이 된다 */}
            {지우려나 ? (
              <div className="btns">
                <button
                  key="cancel"
                  className="btn ghost"
                  type="button"
                  ref={취소단추}
                  onClick={() => {
                    set지우려나(false);
                    set포커스('ask');
                  }}
                >
                  {t('취소')}
                </button>
                <button className="btn" type="button" disabled={보내는중} onClick={() => 보낸다({ tcId: row.tcId, delete: true })}>
                  {t('삭제 확인')}
                </button>
              </div>
            ) : (
              <div className="btns">
                <button
                  key="ask"
                  className="btn ghost"
                  type="button"
                  ref={묻기단추}
                  onClick={() => {
                    set지우려나(true);
                    set포커스('cancel');
                  }}
                >
                  {t('케이스 삭제 요청')}
                </button>
              </div>
            )}
            {지우려나 ? <ScenarioUsage service={service} tcIds={[row.tcId]} /> : null}
          </div>
        </>
      )}
      {오류 === null ? null : <p className="error-text">{오류}</p>}
    </div>
  );
}
