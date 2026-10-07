// 결과 화면 옆 칸의 「같은 사유로 실패」 · 「해결」 (SPEC §7 `/runs/:runId/insights` · 도메인/실행 §8.3)

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
      {insights.실패덩어리들.length === 0 ? null : (
        <section className="rr-flat">
          <h2 className="rr-h">{t('같은 사유로 실패')}</h2>
          {insights.실패덩어리들.map((덩어리) => (
            <div className="rr-cause" key={덩어리.대표문장}>
              {/* 「케이스 N건」이 아니다. 세는 단위는 실행 항목이라 5회 중 3회 실패가 3 으로 온다 */}
              <span className="rr-cause-head">
                <span>{덩어리.대표문장}</span>
                <span className="rr-cause-n">{t('실패 항목 {건수}건', { 건수: 덩어리.건수 })}</span>
              </span>
              {/* 케이스 이름은 요약 띠와 실패 카드에 이미 있다. 같은 (TC ID, 디바이스)는 회차 때문에 여럿이어도 한 번만 */}
              <span className="rr-cause-list mono">
                {[...new Set(덩어리.항목들.map((it) => `${it.tcId} ${PLATFORM_LABEL[it.platform]}`))].join(' · ')}
              </span>
            </div>
          ))}
        </section>
      )}

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
