// 요약 띠 직전 대비 줄 안의 「해결」 목록 (SPEC §7 `/runs/:runId/insights` · 도메인/실행 §8.3)
// 이전 버전은 결과 화면 옆 칸에 있었다. 2026-10-19 ⑫ 에 옆 칸을 걷으며 「해결」 수 아래 접힌 목록으로 옮겼다

import type { RunInsights as 비교 } from './api.js';
import { use말 } from './i18n.js';
import { PLATFORM_LABEL } from './ui.js';

/** 직전 실행에서 깨졌다가 이번에 통과한 (케이스, 디바이스). 줄마다 디바이스를 적는다 — 수는 케이스로 센다(아래) */
export function 해결들(견줌: 비교 | null) {
  return 견줌 === null ? [] : 견줌.케이스들.filter((c) => c.판정 === '고쳐짐');
}

/**
 * 견줌 자료를 받아 그리기만 한다 — 스스로 부르지 않는다. 결과 화면이 끝났을 때 한 번 불러 요약 띠와 나눠 쓴다.
 * 아직 도는 중이면 견주지 않는 규칙도 그쪽이 지킨다: 판정이 안 들어간 항목이 `NA` 로 읽혀
 * 앞 실행이 깨졌던 것이 전부 「고쳐짐」으로 보인다.
 * 접고 펴는 것은 브라우저가 하는 일이라 화면이 상태를 따로 들지 않는다 (§8.3)
 */
export function 해결목록({ insights, 열림, on토글 }: { insights: 비교 | null; 열림?: boolean; on토글?: (열림: boolean) => void }) {
  const t = use말();
  const 해결 = 해결들(insights);
  if (해결.length === 0) return null;
  // 바로 위 요약 띠의 「해결」 수와 같은 단위 — 케이스 수다 (§8.3 「큰 숫자는 케이스 수다」 · 점검 2.15)
  const 케이스수 = new Set(해결.map((c) => c.tcId)).size;

  return (
    <details className="rr-fold" {...(열림 === undefined ? {} : { open: 열림, onToggle: (e: React.SyntheticEvent<HTMLDetailsElement>) => on토글?.(e.currentTarget.open) })}>
      <summary>{t('해결 {건수}', { 건수: 케이스수 })}</summary>
      {해결.map((c) => (
        <div className="rr-fixed" key={`${c.tcId}\u0000${c.platform}`}>
          <span className="mono">{c.tcId}</span> {c.tcName} · {PLATFORM_LABEL[c.platform]}
        </div>
      ))}
    </details>
  );
}

/**
 * 요약 띠 아래 「통과 · 알림」 — 글자는 다르지만 낱말이 맞아 통과로 본 확인 문장을 모은다 (도메인/실행 §8.3 「통과 · 알림」).
 * 「로그인」과 「로그인 실패」도 통과로 보는 규칙이라 사람이 훑어볼 자리가 있어야 한다. 0건이면 그리지 않는다
 */
export function 통과알림목록({ insights, runId }: { insights: 비교 | null; runId: number }) {
  const t = use말();
  const 알림들 = insights?.통과알림들 ?? [];
  if (알림들.length === 0) return null;
  // 서버가 상한에서 잘라 보낸다 — 수는 자르기 전 전체로 적고 잘렸다고 알린다
  const 전체 = Math.max(insights?.통과알림수 ?? 0, 알림들.length);

  return (
    <details className="rr-fold rr-notice">
      <summary>{t('Pass · 알림 {건수}건', { 건수: 전체 })}</summary>
      {전체 > 알림들.length ? <p className="hint">{t('앞 {보인}건만 보입니다 — 나머지는 항목 상세에서 확인하세요', { 보인: 알림들.length })}</p> : null}
      {알림들.map((a, i) => (
        <div className="rr-fixed" key={`${String(a.historyId)}\u0000${String(i)}`}>
          <a href={`#/runs/${String(runId)}/items/${String(a.historyId)}`}>
            <span className="mono">{a.tcId}</span> {a.tcName} · {PLATFORM_LABEL[a.platform]}
          </a>
          <div>{a.statement}</div>
          <div className="hint">{a.notice}</div>
        </div>
      ))}
    </details>
  );
}
