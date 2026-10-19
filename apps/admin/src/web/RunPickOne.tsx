// 실행 창이 케이스 한 건으로 열렸을 때만 붙는 칸 — 사전조건 · 디바이스 · 실행자 (도메인/실행 §8.10, 저장한 값 줄은 RunPickSaved)
// 한 건짜리 실행 설정 화면이 하던 일을 창 안으로 옮겼다. 실행 문은 하나다 (2026-10-09 UI 개편 묶음 4)

import { useState } from 'react';

import type { CaseRow, Platform } from './api.js';
import { use말 } from './i18n.js';
import { PLATFORM_LABEL } from './ui.js';

/**
 * 한 건일 때만 고르는 것. **여러 건이면 디바이스를 고르지 않는다** — 케이스마다 `platforms` 선언이 달라
 * 한 자리에서 고르게 하면 「그 케이스엔 없는 디바이스」를 고를 수 있게 된다 (§8.10)
 */
export function use한건(케이스: CaseRow | null) {
  const [디바이스, set디바이스] = useState<Platform[]>(케이스?.platforms ?? []);
  return { 디바이스, set디바이스 };
}

/**
 * 창 머리 아래 — 사전조건 · 디바이스 · 실행자.
 * 실행 제목 칸은 없다 — 서버가 시작 방식과 담긴 케이스로 짓는다 (§8.10 · 2026-10-19 ⑫). 앞 판의 칸은 거의 안 고쳐졌다
 */
export function 한건머리({
  케이스,
  디바이스,
  on디바이스,
  실행자,
}: {
  케이스: CaseRow;
  디바이스: Platform[];
  on디바이스: (다음: Platform[]) => void;
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
      {실행자 === null ? null : (
        <div className="mhead">
          <span className="hint">{t('실행자 {이름}', { 이름: 실행자 })}</span>
        </div>
      )}
    </div>
  );
}
