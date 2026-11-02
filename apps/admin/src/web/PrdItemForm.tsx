// 요구 하나를 고치거나 더하는 칸 — 줄 안에서 펼쳐 쓴다. 가로막는 상자는 DESIGN.md 「모달」 목록에 없어 쓰지 않는다
// 지우기도 새 판이라 판 이력에서 되돌릴 수 있다 — 확인 상자 대신 그 자리에서 한 번 더 묻는다

import type { PrdBasis } from '@platform/kit';
import { useEffect, useId, useRef, useState } from 'react';

import { 상한, 직접근거 } from '../prd/rules.js';
import { use말 } from './i18n.js';
import { 떠나기상자 } from './leaveGuard.js';
import type { PrdItemDraft } from './prdApi.js';
import { 고치기검사, type 틀린칸 } from './prdView.js';

const 빈근거 = (): PrdBasis => ({ from: '', ref: '', quote: '' });
// 새 요구는 사람이 직접 쓰는 것이라 확정으로 시작하고 근거는 저장할 때 자동으로 단다 (점검 8.11)
export const 빈요구 = (): PrdItemDraft => ({ feature: '', text: '', basis: [], status: 'CONFIRMED' });

/** 빈 원본 번호는 키째 뺀다 — 서버는 빈 글자 칸을 BAD_PRD 로 거절한다 */
function 다듬기(x: PrdItemDraft): PrdItemDraft {
  return { ...x, basis: x.basis.map((b) => (b.ref === undefined || b.ref.trim() === '' ? { from: b.from, quote: b.quote } : b)) };
}

export function PrdItemForm({
  열쇠,
  새요구 = false,
  처음,
  기능들,
  on저장,
  on취소,
  on지우기,
}: {
  /** 새 요구 칸이다 — 근거 칸이 없고 저장할 때 「직접 작성」 근거를 단다. 고치는 줄이면 기존 근거를 그대로 보낸다 */
  새요구?: boolean;
  /** 고치는 줄의 요구 번호. 줄 접기 · 다른 줄 고치기는 이 칸에만 묻는다 — 새 요구 칸은 없다 */
  열쇠?: string;
  처음: PrdItemDraft;
  /** 지금 판의 기능 묶음 — 고르면 같은 묶음으로 접힌다. 글자가 한 자만 달라도 다른 묶음이 된다 */
  기능들: string[];
  /** 실패하면 까닭 글을 두 번째 인자로 알려 준다 — 이 칸 옆에 보이려고 (점검 8.3) */
  on저장: (x: PrdItemDraft, 실패: (글: string) => void) => Promise<boolean>;
  on취소: () => void;
  /** 없으면 새 요구라 지우기가 없다 */
  on지우기?: (실패: (글: string) => void) => Promise<boolean>;
}) {
  const t = use말();
  const id = useId();
  const [x, setX] = useState(처음);
  const [틀림, set틀림] = useState<틀린칸 | null>(null);
  const [저장오류, set저장오류] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [지우기확인, set지우기확인] = useState(false);
  const 새것 = 새요구;
  const 첫칸 = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (새것) 첫칸.current?.focus();
  }, [새것]);
  // 쓴 것이 있으면 떠나거나 · 서비스를 바꾸거나 · 줄을 접기 전에 묻는다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
  const 바뀜 = JSON.stringify(x) !== JSON.stringify(처음);

  const 틀림말: Record<틀린칸, string> = {
    feature: t('기능 묶음을 적습니다'),
    text: t('요구 문장을 적습니다'),
    basis: t('출처를 하나 이상 적습니다'),
    from: t('출처마다 자료 이름을 적습니다'),
    quote: t('출처마다 원본 문장을 적습니다'),
    long: t('글자 수 상한을 넘었습니다 — 기능 묶음 {묶음}자 · 요구 문장 {문장}자 · 출처 {근거}개 · 자료 이름 · 원본 번호 {자리}자 · 출처 문장 {근거문장}자', {
      묶음: 상한.기능묶음,
      문장: 상한.요구문장,
      근거: 상한.근거,
      자리: 상한.근거자리,
      근거문장: 상한.근거문장,
    }),
  };

  // 성공하면 이 칸이 닫혀 사라진다. 실패했을 때만 버튼을 다시 푼다
  async function 한다(일: () => Promise<boolean>) {
    setBusy(true);
    set저장오류(null);
    if (!(await 일())) setBusy(false);
  }

  function 근거고침(i: number, 칸: keyof PrdBasis, 값: string) {
    setX({ ...x, basis: x.basis.map((b, j) => (j === i ? { ...b, [칸]: 값 } : b)) });
  }

  return (
    <form
      className="prd-form"
      onSubmit={(e) => {
        e.preventDefault();
        const 보낼것 = 새것 ? { ...x, basis: 직접근거(x.text) } : x;
        const 칸 = 고치기검사(보낼것);
        set틀림(칸);
        if (칸 === null) void 한다(() => on저장(다듬기(보낼것), set저장오류));
      }}
    >
      <div className="field">
        <label htmlFor={`${id}-f`}>{t('기능 묶음')}</label>
        <input ref={첫칸} id={`${id}-f`} type="text" list={`${id}-fl`} value={x.feature} onChange={(e) => setX({ ...x, feature: e.target.value })} />
        <datalist id={`${id}-fl`}>
          {기능들.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </div>
      <div className="field">
        <label htmlFor={`${id}-t`}>{t('요구 문장')}</label>
        <textarea id={`${id}-t`} rows={2} value={x.text} onChange={(e) => setX({ ...x, text: e.target.value })} />
      </div>
      <p className="hint prd-form-hint">{t('규칙 하나만 적습니다. 숫자 · 조건 낱말(이상 · 미만 · 까지)은 원문 그대로 둡니다')}</p>
      {새것 ? (
        <p className="hint prd-form-hint">{t('출처는 「직접 작성」으로 자동으로 달립니다. 저장한 뒤 요구 줄의 고치기에서 더할 수 있습니다')}</p>
      ) : (
        <fieldset className="prd-basis-edit">
          <legend>{t('출처')}</legend>
          {x.basis.map((b, i) => (
            <div className="prd-basis-row" key={i}>
              <input type="text" aria-label={t('자료 이름')} placeholder={t('자료 이름')} value={b.from} onChange={(e) => 근거고침(i, 'from', e.target.value)} />
              <input type="text" aria-label={t('원본 번호')} placeholder={t('원본 번호 · 화면 주소')} value={b.ref ?? ''} onChange={(e) => 근거고침(i, 'ref', e.target.value)} />
              <input type="text" aria-label={t('원본 문장')} placeholder={t('원본 문장')} value={b.quote} onChange={(e) => 근거고침(i, 'quote', e.target.value)} />
              <button type="button" className="btn ghost small" disabled={x.basis.length === 1} onClick={() => setX({ ...x, basis: x.basis.filter((_, j) => j !== i) })}>
                {t('빼기')}
              </button>
            </div>
          ))}
          {x.basis.length >= 상한.근거 ? null : (
            <button type="button" className="btn ghost small" onClick={() => setX({ ...x, basis: [...x.basis, 빈근거()] })}>
              {t('출처 추가')}
            </button>
          )}
        </fieldset>
      )}
      <div className="field">
        <label htmlFor={`${id}-s`}>{t('상태')}</label>
        <select id={`${id}-s`} value={x.status} onChange={(e) => setX({ ...x, status: e.target.value === 'CONFIRMED' ? 'CONFIRMED' : 'NEEDS_CHECK' })}>
          <option value="NEEDS_CHECK">{t('확인 필요')}</option>
          <option value="CONFIRMED">{t('확정§상태')}</option>
        </select>
      </div>
      {틀림 === null ? null : <p className="prd-note bad">{틀림말[틀림]}</p>}
      {저장오류 === null ? null : (
        <p role="alert" className="prd-note bad">
          {저장오류}
        </p>
      )}
      <떠나기상자 막나={바뀜} 버리기도 {...(열쇠 === undefined ? {} : { 열쇠 })} />
      <div className="prd-form-acts">
        {on지우기 === undefined ? null : 지우기확인 ? (
          <>
            <button type="button" className="btn ghost small set-warn" disabled={busy} onClick={() => void 한다(() => on지우기(set저장오류))}>
              {t('삭제 확인§요구')}
            </button>
            <button type="button" className="btn ghost small" onClick={() => set지우기확인(false)}>
              {t('지우지 않기')}
            </button>
          </>
        ) : (
          <button type="button" className="btn ghost small set-warn" onClick={() => set지우기확인(true)}>
            {t('이 요구 삭제')}
          </button>
        )}
        <span className="prd-sp" />
        <button type="button" className="btn ghost small" onClick={on취소}>
          {t('취소')}
        </button>
        <button type="submit" className="btn small" disabled={busy}>
          {t('저장')}
        </button>
      </div>
    </form>
  );
}
