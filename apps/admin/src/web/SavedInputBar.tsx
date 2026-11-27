// 케이스 상세 칸의 저장값 저장 버튼과 「저장값 · 누가 · 언제」 표시 (도메인/실행 §8.2, 2026-09-29 시안 A)
// 한 건 실행 창의 저장은 RunPickSaved 로 옮겼다

import { useState } from 'react';

import { api, ApiError, type SavedInput } from './api.js';
import { 확인창 } from './ConfirmBox.js';
import { use말, use언어 } from './i18n.js';
import { initialText, type Field } from './schema.js';
import { message, when, 기다림글자 } from './ui.js';

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

/**
 * 상세 칸의 저장. 고친 칸이 있으면 「모두에게 저장」, 없으면 저장값이 누구 것인지.
 * 저장값은 팀 전체와 정기 실행이 쓴다 — **누르기 전에** 적는다. 이전 버전은 목록 줄의 「저장」 뒤에 4초만 떴다(점검 7.6)
 */
export function 값저장({
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
  // 서버에 남는 값을 바꾸고 그 값이 팀 전체에 쓰인다 — 누르기 전에 한 번 묻는다 (2026-11-26 사용자 · DESIGN.md 「모달」 ①)
  const [묻나, set묻나] = useState(false);

  async function 저장() {
    setBusy(true);
    set사유(null);
    try {
      await api.saveInput(tcId, 값);
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
  if (!버튼 && !저장값있나 && 사유 === null) return null;

  return (
    <div className="saved-row">
      {버튼 ? (
        <>
          <span className="hint">{t('팀 전체와 정기 실행에 쓰입니다')}</span>
          <button type="button" className="btn ghost" onClick={() => set묻나(true)} disabled={busy}>
            <기다림글자 중={busy} 평소={t('모두에게 저장')} 기다림={t('저장하는 중')} />
          </button>
        </>
      ) : 저장값있나 ? (
        <span className="saved-tag">
          <span aria-hidden="true">✓ </span>
          <저장값표시 saved={saved} className="" />
        </span>
      ) : null}
      {사유 === null ? null : <div className="err">{사유}</div>}
      {!묻나 ? null : (
        <확인창
          제목={t('수정한 입력값을 팀 전체에 저장할까요?')}
          확인={t('저장')}
          onClose={() => set묻나(false)}
          on확인={() => {
            set묻나(false);
            void 저장();
          }}
        >
          <p>{t('이 케이스의 입력값이 팀 전체와 정기 실행에 쓰입니다. 다시 수정해 저장할 수 있습니다')}</p>
        </확인창>
      )}
    </div>
  );
}
