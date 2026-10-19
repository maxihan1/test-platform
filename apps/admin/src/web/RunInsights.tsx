// 결과 화면 옆 칸의 「해결」 (SPEC §7 `/runs/:runId/insights` · 도메인/실행 §8.3)
// 「같은 사유로 실패」는 2026-10-19 ⑫ 에 실패 카드 위 「실패 유형」 칩 줄(RunFailCards.tsx)로 갔다

import type { RunInsights as 비교 } from './api.js';
import { use말 } from './i18n.js';
import { PLATFORM_LABEL } from './ui.js';

/** 직전 실행에서 깨졌다가 이번에 통과한 (케이스, 디바이스). 요약 띠의 「해결」 수와 같은 값이다 */
export function 해결들(견줌: 비교 | null) {
  return 견줌 === null ? [] : 견줌.케이스들.filter((c) => c.판정 === '고쳐짐');
}

/**
 * 견줌 자료를 받아 그리기만 한다 — 스스로 부르지 않는다. 결과 화면이 끝났을 때 한 번 불러 요약 띠와 나눠 쓴다.
 * 아직 도는 중이면 견주지 않는 규칙도 그쪽이 지킨다: 판정이 안 들어간 항목이 `NA` 로 읽혀
 * 앞 실행이 깨졌던 것이 전부 「고쳐짐」으로 보인다.
 */
export function RunInsights({ insights }: { insights: 비교 | null }) {
  const t = use말();
  if (insights === null) return null;
  const 해결 = 해결들(insights);

  return (
    <>
      {해결.length === 0 ? null : (
        <section className="rr-flat">
          <h2 className="rr-h">{t('해결')}</h2>
          {해결.map((c) => (
            <div className="rr-fixed" key={`${c.tcId}\u0000${c.platform}`}>
              <span className="mono">{c.tcId}</span> {c.tcName} · {PLATFORM_LABEL[c.platform]}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
