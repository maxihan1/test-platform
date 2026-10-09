// 실행 창이 케이스 한 건으로 열렸을 때만 붙는 칸 — 사전조건 · 디바이스 · 제목 · 실행자 · 입력값 묶음 · 저장값 (도메인/실행 §8.10)
// 한 건짜리 실행 설정 화면이 하던 일을 창 안으로 옮겼다. 실행 문은 하나다 (2026-10-09 UI 개편 묶음 4)

import { useRef, useState } from 'react';

import { api, type CaseRow, type ParamSetRow, type Platform, type User } from './api.js';
import { use말 } from './i18n.js';
import { 케이스서비스, 할수있나 } from './role.js';
import { 저장값버튼들, 저장값표시 } from './SavedInputBar.js';
import { PLATFORM_LABEL, useAsync } from './ui.js';

type 값들 = Record<string, unknown>;

/**
 * 한 건일 때만 고르는 것. **여러 건이면 디바이스를 고르지 않는다** — 케이스마다 `platforms` 선언이 달라
 * 한 자리에서 고르게 하면 「그 케이스엔 없는 디바이스」를 고를 수 있게 된다 (§8.10)
 */
export function use한건(케이스: CaseRow | null) {
  const t = use말();
  const [디바이스, set디바이스] = useState<Platform[]>(케이스?.platforms ?? []);
  const [제목, set제목] = useState(케이스 === null ? '' : t('{케이스} 실행', { 케이스: 케이스.tcId }));
  return { 디바이스, set디바이스, 제목, set제목 };
}

/** 창 머리 아래 — 사전조건 · 디바이스 · 실행 제목 · 실행자 */
export function 한건머리({
  케이스,
  디바이스,
  on디바이스,
  제목,
  on제목,
  실행자,
}: {
  케이스: CaseRow;
  디바이스: Platform[];
  on디바이스: (다음: Platform[]) => void;
  제목: string;
  on제목: (글: string) => void;
  /** 고칠 수 없는 표시다. 사람이 적게 두면 남의 이름을 적을 수 있다 (SPEC §8.2) */
  실행자: string | null;
}) {
  const t = use말();

  return (
    <div className="one-head">
      <div className="one-pre">
        <span className="one-label">{t('사전조건')}</span>
        {케이스.precondition.length === 0 ? (
          <span className="hint">{t('선언된 사전조건이 없습니다.')}</span>
        ) : (
          케이스.precondition.map((line) => (
            <div className="pre" key={line}>
              {line}
            </div>
          ))
        )}
      </div>
      <div className="one-row">
        <span className="one-label" id="pick-devices">{t('디바이스')}</span>
        <div className="checks" role="group" aria-labelledby="pick-devices">
          {케이스.platforms.map((platform) => (
            <label key={platform}>
              <input
                type="checkbox"
                checked={디바이스.includes(platform)}
                onChange={(e) => on디바이스(e.target.checked ? [...디바이스, platform] : 디바이스.filter((p) => p !== platform))}
              />
              {PLATFORM_LABEL[platform]}
            </label>
          ))}
        </div>
      </div>
      <div className="mhead">
        <label htmlFor="pick-title">{t('실행 제목')}</label>
        <input id="pick-title" type="text" value={제목} onChange={(e) => on제목(e.target.value)} />
        {실행자 === null ? null : <span className="hint">{t('실행자 {이름}', { 이름: 실행자 })}</span>}
      </div>
    </div>
  );
}

/**
 * 입력값 칸 아래 — 저장값 표시 · 묶음 불러오기 한 줄, 묶음 저장 · 저장값 버튼 한 줄.
 * 묶음과 저장값은 그 케이스의 서비스에 남는다 — 띠가 아니라 tcId 접두사의 칸을 본다 (SPEC §1 · 화면공통 §8)
 */
export function 한건값줄({
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
  on불러오기: (글자: { params: Record<string, string>; expected: Record<string, string> }) => void;
  on다시읽기: () => void;
  /** 서버가 칸별 사유를 주면 창이 그 칸 아래에 붙인다 */
  on실패: (err: unknown) => void;
}) {
  const t = use말();
  const saved = useAsync<{ items: ParamSetRow[] }>(() => api.paramSets(케이스.tcId), [케이스.tcId]);
  const [이름, set이름] = useState('');
  // 이름이 비었다는 사유는 이름 칸 옆에 둔다. 아래 작은 글씨는 「눌러도 안 먹는다」로 읽혔다
  const [이름빔, set이름빔] = useState(false);
  const [저장함, set저장함] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const 이름칸 = useRef<HTMLInputElement>(null);
  const 저장된다 = 할수있나(user, 케이스서비스(케이스.tcId), '입력값저장');

  function 불러오기(id: string) {
    const 고른 = saved.data?.items.find((item) => String(item.id) === id);
    if (고른 !== undefined) on불러오기({ params: 글자로(고른.params), expected: 글자로(고른.expected) });
  }

  async function 묶음저장() {
    set저장함(null);
    if (이름.trim() === '') {
      set이름빔(true);
      이름칸.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await api.saveParamSet(케이스.tcId, { name: 이름.trim(), ...값 });
      set저장함(t('{이름}으로 저장했습니다.', { 이름: `'${이름.trim()}'` }));
      set이름('');
      saved.reload();
    } catch (err) {
      on실패(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="one-values">
      <div className="one-row">
        <저장값표시 saved={케이스.savedInput} />
        {saved.data === null || saved.data.items.length === 0 ? null : (
          <select defaultValue="" aria-label={t('저장된 입력값 세트 불러오기')} onChange={(e) => 불러오기(e.target.value)}>
            <option value="">{t('저장된 입력값 세트 불러오기')}</option>
            {saved.data.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {!저장된다 ? null : (
      <div className="one-row one-save">
        <input
          type="text"
          ref={이름칸}
          aria-label={t('묶음 이름')}
          placeholder={t('묶음 이름')}
          value={이름}
          onChange={(e) => {
            set이름(e.target.value);
            set이름빔(false);
          }}
        />
        {이름빔 ? <span className="err">{t('묶음 이름을 적으세요')}</span> : null}
        <button className="btn ghost" onClick={() => void 묶음저장()} disabled={busy}>
          {t('이 값을 묶음으로 저장')}
        </button>
        {저장함 === null ? null : <span className="hint" role="status">{저장함}</span>}
        <저장값버튼들 tcId={케이스.tcId} 값={값} saved={케이스.savedInput} on다시읽기={on다시읽기} on실패={on실패} />
      </div>
      )}
    </div>
  );
}

/** 묶음 값을 칸 글자로. 객체는 JSON 으로 편다 — `initialText` 와 같은 규칙이어야 손대지 않은 칸이 「바뀜」으로 안 보인다 */
function 글자로(값: 값들): Record<string, string> {
  const 글자: Record<string, string> = {};
  for (const [key, v] of Object.entries(값)) {
    글자[key] = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
  return 글자;
}
