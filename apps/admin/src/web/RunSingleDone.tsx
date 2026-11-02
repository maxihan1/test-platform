// 한 건 실행이 끝났을 때 진행 창이 적는 「어디에 붙었나」 한 줄과 「결과 보기」가 갈 곳 (도메인/실행 §8.9 「완료 모달」 · §3.2)
// 한 건 실행은 결과 화면이 없다 — 붙은 실행의 그 케이스 카드로, 붙은 곳이 없으면 케이스 상세 「실행 이력」으로 간다

import { useEffect, useState } from 'react';

import { api } from './api.js';
import { use말 } from './i18n.js';
import { 실행기록주소, 케이스주소 } from './route.js';
import type { RunDetail } from './runProgress.js';
import { useAsync } from './ui.js';

export const 한건인가 = (data: RunDetail): boolean => data.origin === 'SINGLE';

export function 한건갈곳(data: RunDetail): string {
  const tcId = data.items[0]?.tcId ?? '';
  return data.rerunOf == null ? 케이스주소(tcId) : 실행기록주소(tcId, data.rerunOf, true);
}

/**
 * 「실패 11 → 10」의 앞 수 — 한 건이 도는 동안 붙은 실행의 실패 수를 한 번 쥔다. 끝난 뒤에는 앞 수를 알 길이 없어 null 이다
 * (새로 고친 뒤 끝난 실행을 열었을 때). 읽은 것에 이미 이 한 건이 덮은 항목이 있으면 끝난 뒤의 수라 버린다
 */
export function use앞실패(data: RunDetail | null, 도는가: boolean): number | null {
  const [앞, set앞] = useState<number | null>(null);
  const 붙은 = data !== null && 한건인가(data) ? (data.rerunOf ?? null) : null;
  const runId = data?.runId;
  const 쥘때 = 도는가 && 붙은 !== null && 앞 === null;
  useEffect(() => {
    if (!쥘때 || 붙은 === null) return;
    let 살아있음 = true;
    // 못 읽으면 앞 수 없이 적는다 — 끝 글이 화살표만 뺀다
    api.run(붙은).then(
      (r) => {
        if (살아있음 && !r.items.some((it) => it.rerun?.runId === runId)) set앞(r.counts.fail);
      },
      () => undefined,
    );
    return () => {
      살아있음 = false;
    };
  }, [쥘때, 붙은, runId]);
  return 앞;
}

export function 한건끝글({ data, 앞실패 }: { data: RunDetail; 앞실패: number | null }) {
  const t = use말();
  const 붙은 = data.rerunOf ?? null;
  const 뒤 = useAsync(() => (붙은 === null ? Promise.resolve(null) : api.run(붙은)), [붙은]);
  if (붙은 === null) return <p>{t('이 케이스 상세의 「실행 기록」에 남았습니다')}</p>;
  const 뒤실패 = 뒤.data?.counts.fail ?? null;
  return (
    <p>
      {앞실패 === null || 뒤실패 === null
        ? t('RUN {번호} 결과에 다시 실행으로 붙었습니다', { 번호: 붙은 })
        : t('RUN {번호} 결과에 다시 실행으로 붙었습니다 · 실패 {앞} → {뒤}', { 번호: 붙은, 앞: 앞실패, 뒤: 뒤실패 })}
    </p>
  );
}
