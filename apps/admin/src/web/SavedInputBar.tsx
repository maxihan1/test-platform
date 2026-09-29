// 케이스 저장값(case_input)을 저장·지우는 버튼과 「저장값 · 누가 · 언제」 표시 (도메인/실행 §8.2, 2026-09-29 시안 A)
// 목록 줄과 실행 설정 화면이 같이 쓴다. RunSetup·CaseList 가 이미 300줄을 넘어 여기로 뺐다

import { useState } from 'react';

import { api, ApiError, type SavedInput } from './api.js';
import { use말, use언어 } from './i18n.js';
import { initialText, type Field } from './schema.js';
import { message, when } from './ui.js';

type 값들 = Record<string, unknown>;

/** 칸이 처음 들고 있던 글자(저장값 또는 코드 기본값)와 다른 글자가 하나라도 있나. 쳤다가 되돌린 칸은 고친 것이 아니다 */
export function 고쳤나(fields: Field[], 고친: Record<string, string> | undefined): boolean {
  const 처음 = initialText(fields);
  return Object.entries(고친 ?? {}).some(([key, value]) => 처음[key] !== undefined && 처음[key] !== value);
}

export function 저장값표시({ saved, className = 'hint' }: { saved: SavedInput | null | undefined; className?: string }) {
  const t = use말();
  const 언어 = use언어();
  if (saved === null || saved === undefined) return null;
  return (
    <span className={className}>{t('저장값 · {누가} · {언제}', { 누가: saved.savedBy, 언제: when(saved.savedAt, 언어) })}</span>
  );
}

/** 목록 줄 끝. 고친 칸이 있으면 「저장」, 없으면 저장값이 누구 것인지 */
export function 줄저장({
  tcId,
  값,
  고침,
  saved,
  된다,
  on저장됨,
}: {
  tcId: string;
  값: { params: 값들; expected: 값들 };
  고침: boolean;
  saved: SavedInput | null | undefined;
  된다: boolean;
  on저장됨: () => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const [busy, setBusy] = useState(false);
  const [사유, set사유] = useState<string | null>(null);
  const [저장함, set저장함] = useState(false);

  async function 저장() {
    setBusy(true);
    set사유(null);
    try {
      await api.saveInput(tcId, 값);
      set저장함(true);
      // 저장한 값이 나 혼자 것이 아니라는 것을 잠깐 알린다. 늘 떠 있으면 목록 줄마다 같은 글이 쌓인다
      setTimeout(() => set저장함(false), 4000);
      on저장됨();
    } catch (err) {
      // 줄에는 칸별 자리가 없다. 첫 사유 한 줄이면 무엇을 고칠지 안다
      set사유(err instanceof ApiError && err.violations[0] !== undefined ? err.violations[0].message : message(err, 언어));
    } finally {
      setBusy(false);
    }
  }

  const 버튼 = 고침 && 된다;
  const 저장값있나 = saved !== null && saved !== undefined;
  if (!버튼 && !저장값있나 && !저장함 && 사유 === null) return null;

  return (
    <div className="saved-row">
      {버튼 ? (
        <>
          <button type="button" className="btn small ghost" onClick={() => void 저장()} disabled={busy}>
            {t('저장')}
          </button>
          <span className="hint">{t('안 저장한 값이 있습니다')}</span>
        </>
      ) : 저장값있나 ? (
        <span className="saved-tag">
          <span aria-hidden="true">✓ </span>
          <저장값표시 saved={saved} className="" />
        </span>
      ) : null}
      {저장함 ? <span className="hint">{t('팀 모두와 정기 실행에 쓰입니다')}</span> : null}
      {사유 === null ? null : <div className="err">{사유}</div>}
    </div>
  );
}

/** 실행 설정 화면 버튼 줄. 실패는 화면이 칸 아래에 붙이도록 그대로 넘긴다 */
export function 저장값버튼들({
  tcId,
  값,
  saved,
  on다시읽기,
  on실패,
}: {
  tcId: string;
  값: { params: 값들; expected: 값들 };
  saved: SavedInput | null | undefined;
  on다시읽기: () => void;
  on실패: (err: unknown) => void;
}) {
  const t = use말();
  const [busy, setBusy] = useState(false);
  // 확인 상자 대신 그 자리에서 한 번 더 묻는다. 지운 뒤 되돌리기는 못 한다 — 화면이 저장된 비밀값을 모른다
  const [확인중, set확인중] = useState(false);

  async function 한다(일: () => Promise<unknown>) {
    setBusy(true);
    try {
      await 일();
      set확인중(false);
      on다시읽기();
    } catch (err) {
      on실패(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <span className="hint">{t('팀 모두와 정기 실행에 쓰입니다')}</span>
      {saved === null || saved === undefined ? null : 확인중 ? (
        <>
          <button className="btn ghost" onClick={() => void 한다(() => api.clearInput(tcId))} disabled={busy}>
            {t('지우기 확인')}
          </button>
          <button className="btn ghost" onClick={() => set확인중(false)} disabled={busy}>
            {t('취소')}
          </button>
        </>
      ) : (
        <button className="btn ghost" onClick={() => set확인중(true)}>
          {t('코드 기본값으로')}
        </button>
      )}
      <button className="btn ghost" onClick={() => void 한다(() => api.saveInput(tcId, 값))} disabled={busy}>
        {t('다음에도 이 값으로 채우기')}
      </button>
    </>
  );
}
