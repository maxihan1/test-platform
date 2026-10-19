// 한 건 실행 창의 「저장한 값」 줄 — 코드 기본값 · 저장값 · 묶음을 한 목록에서 고르고, 고친 값을 저장한다 (도메인/실행 §8.2 · §8.10)
// 앞 판은 저장값 · 묶음 불러오기 · 묶음 이름 · 묶음 저장 · 코드 기본값으로 · 다음에도 이 값, 여섯 조작이 한 줄에 섞여 있었다

import { useState } from 'react';

import { api, type CaseRow, type ParamSetRow, type SavedInput, type User } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 케이스서비스, 할수있나 } from './role.js';
import { initialText, schemaToFields } from './schema.js';
import { useAsync, when } from './ui.js';

type 값들 = Record<string, unknown>;
type 칸글자 = { params: Record<string, string>; expected: Record<string, string> };

/** 저장값(없으면 코드 기본값)으로 채웠을 때 칸이 들고 있어야 할 글자. 실행 창이 처음 칸을 채우는 규칙과 같다 */
function 채울글자(케이스: CaseRow, saved: SavedInput | undefined): 칸글자 {
  return {
    params: initialText(schemaToFields(케이스.paramSchema, saved?.params, saved?.savedSecrets.params)),
    expected: initialText(schemaToFields(케이스.expectedSchema, saved?.expected, saved?.savedSecrets.expected)),
  };
}

/** 묶음 값을 칸 글자로. 객체는 JSON 으로 편다 — `initialText` 와 같은 규칙이어야 손대지 않은 칸이 「바뀜」으로 안 보인다 */
function 글자로(값: 값들): Record<string, string> {
  const 글자: Record<string, string> = {};
  for (const [key, v] of Object.entries(값)) {
    글자[key] = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
  return 글자;
}

export function 저장한값줄({
  케이스,
  user,
  값,
  on불러오기,
  on다시읽기,
  on실패,
}: {
  케이스: CaseRow;
  user: User | null;
  /** 칸이 지금 들고 있는 값. 실행에 보낼 값과 같다 */
  값: { params: 값들; expected: 값들 };
  on불러오기: (글자: 칸글자) => void;
  on다시읽기: () => void;
  /** 서버가 칸별 사유를 주면 창이 그 칸 아래에 붙인다 */
  on실패: (err: unknown) => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const sets = useAsync<{ items: ParamSetRow[] }>(() => api.paramSets(케이스.tcId), [케이스.tcId]);
  const saved = 케이스.savedInput ?? undefined;
  // 창은 저장값(없으면 코드 기본값)으로 칸을 채워 열린다 — 목록의 처음 선택도 그것이다
  const [고른, set고른] = useState(saved === undefined ? 'code' : 'saved');
  const [저장칸, set저장칸] = useState(false);
  const [이름, set이름] = useState('');
  const [확인중, set확인중] = useState(false);
  const [알림, set알림] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const 저장된다 = 할수있나(user, 케이스서비스(케이스.tcId), '입력값저장');

  const 묶음들 = sets.data?.items ?? [];
  // 저장값을 지워 목록에서 사라졌는데 선택만 남지 않게 한다
  const 선택 = 고른 === 'saved' && saved === undefined ? 'code' : 고른;
  const 목록있나 = saved !== undefined || 묶음들.length > 0;

  function 고르기(다음: string) {
    set고른(다음);
    set알림(null);
    if (다음 === 'code') on불러오기(채울글자(케이스, undefined));
    else if (다음 === 'saved') on불러오기(채울글자(케이스, saved));
    else {
      const 묶음 = 묶음들.find((item) => `set:${item.id}` === 다음);
      if (묶음 !== undefined) on불러오기({ params: 글자로(묶음.params), expected: 글자로(묶음.expected) });
    }
  }

  async function 저장() {
    set알림(null);
    const 묶음이름 = 이름.trim();
    setBusy(true);
    try {
      if (묶음이름 === '') {
        // 안 고친 칸도 보이는 값 그대로 저장한다. 비워 둔 저장 비밀값은 값에 없어 서버가 앞 저장값을 이어받는다
        await api.saveInput(케이스.tcId, 값);
        set고른('saved');
        set알림(t('저장값으로 저장했습니다.'));
        on다시읽기();
      } else {
        await api.saveParamSet(케이스.tcId, { name: 묶음이름, ...값 });
        set알림(t('{이름}으로 저장했습니다.', { 이름: `'${묶음이름}'` }));
        sets.reload();
      }
      set이름('');
      set저장칸(false);
    } catch (err) {
      on실패(err);
    } finally {
      setBusy(false);
    }
  }

  async function 지우기() {
    setBusy(true);
    try {
      await api.clearInput(케이스.tcId);
      set확인중(false);
      on다시읽기();
    } catch (err) {
      on실패(err);
    } finally {
      setBusy(false);
    }
  }

  if (!목록있나 && !저장된다) return null;

  return (
    <div className="one-values">
      <div className="one-row">
        {!목록있나 ? null : (
          <>
            <label className="one-label" htmlFor="pick-saved">{t('저장한 값')}</label>
            <select id="pick-saved" value={선택} onChange={(e) => 고르기(e.target.value)}>
              <option value="code">{t('코드 기본값')}</option>
              {saved === undefined ? null : (
                <option value="saved">{t('저장값 · {누가} · {언제}', { 누가: saved.savedBy, 언제: when(saved.savedAt, 언어) })}</option>
              )}
              {묶음들.map((item) => (
                <option key={item.id} value={`set:${item.id}`}>
                  {item.name}
                </option>
              ))}
            </select>
          </>
        )}
        {!저장된다 ? null : (
          <>
            <button type="button" className="btn ghost" aria-expanded={저장칸} onClick={() => set저장칸((전) => !전)}>
              {t('이 값을 저장')}
            </button>
            {saved === undefined ? null : 확인중 ? (
              <>
                <button type="button" className="btn ghost" onClick={() => void 지우기()} disabled={busy}>
                  {t('지우기 확인')}
                </button>
                <button type="button" className="btn ghost" onClick={() => set확인중(false)} disabled={busy}>
                  {t('취소')}
                </button>
              </>
            ) : (
              <button type="button" className="btn ghost" onClick={() => set확인중(true)}>
                {t('저장값 지우기')}
              </button>
            )}
          </>
        )}
        {알림 === null ? null : <span className="hint" role="status">{알림}</span>}
      </div>
      {!저장된다 || !저장칸 ? null : (
        <div className="one-row one-save">
          <input
            type="text"
            autoFocus
            aria-label={t('묶음 이름')}
            placeholder={t('묶음 이름')}
            value={이름}
            onChange={(e) => set이름(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void 저장();
            }}
          />
          <button type="button" className="btn" onClick={() => void 저장()} disabled={busy}>
            {t('저장')}
          </button>
          {/* 이름이 없으면 팀이 같이 쓰는 저장값이 바뀐다 — 누르기 전에 알아야 한다 (도메인/실행 §8.2) */}
          <span className="hint">
            {이름.trim() === '' ? t('이름을 비우면 저장값으로 저장합니다. 팀 모두와 정기 실행에 쓰입니다') : t('이 이름의 묶음으로 따로 저장합니다')}
          </span>
        </div>
      )}
    </div>
  );
}
