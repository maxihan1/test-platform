// 실행 창이 케이스 한 건으로 열렸을 때만 붙는 칸 — 사전조건 (도메인/실행 §8.10, 저장한 값 줄은 RunPickSaved)
// 한 건짜리 실행 설정 화면이 하던 일을 창 안으로 옮겼다. 실행 문은 하나다 (2026-10-09 UI 개편 묶음 4)

import type { CaseRow } from './api.js';
import { use말 } from './i18n.js';

/**
 * 창 머리 아래 사전조건. 실행자는 늘 누른 사람 자신이라 그 줄을 뺐다 (2026-11-05 WEB-F9-01).
 * 디바이스는 여러 건과 같은 머리 줄 체크칸으로 고른다 (2026-11-06 WEB-F9-16 — 도메인/실행 §8.16 ①).
 * 실행 제목 칸은 없다 — 서버가 시작 방식과 담긴 케이스로 짓는다 (§8.10 · 2026-10-19 ⑫). 앞 판의 칸은 거의 안 고쳐졌다
 */
export function 한건머리({ 케이스 }: { 케이스: CaseRow }) {
  const t = use말();

  return (
    <div className="one-head">
      <div className="one-pre">
        <span className="one-label">{t('사전조건')}</span>
        {케이스.precondition.length === 0 ? (
          <span className="hint">{t('사전조건 없음')}</span>
        ) : (
          케이스.precondition.map((line) => (
            <div className="pre" key={line}>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
