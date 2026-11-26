// 케이스 상세의 「코드 기본값 바꾸기 요청」 — 기대값 · 삭제를 작성 에이전트에 요청한다 (도메인/카탈로그 §8.1 · 도메인/작성 §3.6 「★ 케이스 고치기」)
//
// 위의 기대결과 칸(이번 실행 값 · 저장값)과 **이름을 가른다.** 거기는 다음 실행에 쓸 값이고 여기는 저장소의 코드다 —
// 섞이면 이번 실행만 바꾸려던 값이 코드에 반영된다.
// 요청 보내기 · 삭제 요청은 저장소를 그 자리에서 안 바꾸고 작성 요청만 만들지만, 그것도 서버를 바꾸는 일이라 확인 창으로 한 번 묻는다 (2026-11-26 사용자).
// 삭제 요청은 지울 케이스를 쓰는 시나리오를 상자 안에 보여 묻기 전에 영향을 보게 한다

import { useEffect, useRef, useState } from 'react';

import type { 고칠것 } from '../authoring/edit.js';

import { api, type CaseRow } from './api.js';
import { 고치기오류문장, 고칠칸들, 기대값들, 바꾼값, 저장값지울칸 } from './caseEditView.js';
import { 확인창 } from './ConfirmBox.js';
import { use첫오류 } from './FieldError.js';
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
  const [지우려나, set지우려나] = useState(false);
  const [보내는중, set보내는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const [만든번호, set만든번호] = useState<number | null>(null);
  const [묻나, set묻나] = useState(false);
  // 보내면 누른 버튼이 사라진다 — 결과 줄로 포커스를 옮겨야 body 로 빠지지 않는다
  const [결과로, set결과로] = useState(false);
  const 결과줄 = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!결과로) return;
    결과줄.current?.focus();
    set결과로(false);
  }, [결과로]);

  const { 상자, 첫오류로 } = use첫오류();
  const 바꾼 = 바꾼값(칸들, 글);
  // 바꾼 칸만 본다 — 손대지 않은 칸은 지금 코드 값이라 사유를 낼 까닭이 없다. 「반드시 채울 칸」도 안 본다(안 보낸 칸은 코드 그대로다)
  const 칸오류 = fieldErrors({ ...row.expectedSchema, required: [] }, 바꾼);
  const 지울칸 = 저장값지울칸(row, 칸들, Object.keys(바꾼));
  const 보낼것있나 = Object.keys(바꾼).length > 0;

  function 보낸다(고칠: 고칠것) {
    set보내는중(true);
    set오류(null);
    void api
      .createAuthoringEdit(service, [고칠])
      .then(({ id }) => {
        set만든번호(id);
        set결과로(true);
      })
      .catch((err: unknown) => set오류(고치기오류문장(err, 언어)))
      .finally(() => set보내는중(false));
  }

  // 칸이 틀렸으면 상자를 열기 전에 그 칸으로 간다 — 상자를 띄웠다 닫으면 무엇을 고칠지 다시 찾아야 한다
  function 요청누름() {
    if (Object.keys(칸오류).length > 0) return 첫오류로();
    set묻나(true);
  }

  function 기본값요청() {
    보낸다({
      tcId: row.tcId,
      ...(Object.keys(바꾼).length > 0 ? { expected: 기대값들(바꾼) } : {}),
    });
  }

  return (
    <div className="dsec case-edit" ref={상자} role="group" aria-label={t('코드 기본값 변경 요청')}>
      <div className="dlabel">{t('코드 기본값 변경 요청')}</div>
      <p className="hint">{t('케이스에 적힌 기대 결과입니다. 변경한 칸만 작성 요청으로 보내고, 반영하면 다음 실행부터 이 값이 기본값이 됩니다')}</p>
      {칸들.length === 0 ? (
        <p className="hint">{t('코드에서 변경할 수 있는 기대 결과 칸이 없습니다')}</p>
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
        <p className="hint">{t('{칸들} — 반영되면 이 저장값은 삭제됩니다', { 칸들: 지울칸.join(', ') })}</p>
      )}

      {만든번호 !== null ? (
        <p role="status" tabIndex={-1} ref={결과줄}>
          {t('요청을 보냈습니다.')} <a href={`#/authoring/${String(만든번호)}`}>{t('작성 요청 {번호}번', { 번호: 만든번호 })}</a>{' '}
          <span className="hint">{t('반영은 테스트 작성 화면에서 합니다.')}</span>
        </p>
      ) : (
        <>
          {/* 바꿀 칸이 없는데 「요청 보내기」를 살려 두면 누를 수 없는 단추가 선다(점검 N8). 삭제 요청은 칸과 상관없이 남는다 */}
          {칸들.length === 0 ? null : (
            <div className="btns">
              <button className="btn" type="button" disabled={!보낼것있나 || 보내는중} onClick={요청누름}>
                {보내는중 ? t('보내는 중') : t('요청 보내기')}
              </button>
            </div>
          )}
          <div className="edit-delete">
            <div className="btns">
              <button className="btn ghost" type="button" disabled={보내는중} onClick={() => set지우려나(true)}>
                {t('케이스 삭제 요청')}
              </button>
            </div>
          </div>
        </>
      )}
      {오류 === null ? null : <p className="error-text">{오류}</p>}
      {!지우려나 ? null : (
        <확인창
          제목={t('{번호} 케이스 삭제를 요청할까요?', { 번호: row.tcId })}
          확인={t('삭제 요청')}
          onClose={() => set지우려나(false)}
          on확인={() => {
            set지우려나(false);
            보낸다({ tcId: row.tcId, delete: true });
          }}
        >
          <p>{t('케이스를 삭제하는 작성 요청을 만들고 반영은 테스트 작성 화면에서 합니다. 잘못 보냈으면 그 화면에서 요청을 삭제할 수 있습니다')}</p>
          {row.procId != null ? (
            <p className="hint">{t('테스트 프로시저의 케이스라 작성 요청으로 보냅니다. 프로시저에서 제거하고 다시 실행한 뒤 PR 을 등록합니다')}</p>
          ) : null}
          <ScenarioUsage service={service} tcIds={[row.tcId]} />
        </확인창>
      )}
      {!묻나 ? null : (
        <확인창
          제목={t('코드 기본값 변경을 요청할까요?')}
          확인={t('변경 요청')}
          onClose={() => set묻나(false)}
          on확인={() => {
            set묻나(false);
            기본값요청();
          }}
        >
          <p>
            {t(
              '변경한 기대 결과 칸만 담아 작성 요청을 만들고 반영은 테스트 작성 화면에서 합니다. 잘못 보냈으면 그 화면에서 요청을 삭제하고 값을 수정해 다시 보낼 수 있습니다',
            )}
          </p>
        </확인창>
      )}
    </div>
  );
}
