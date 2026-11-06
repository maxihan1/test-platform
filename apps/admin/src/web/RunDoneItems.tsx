// 정식 실행 완료 창의 항목 목록 — 케이스 × 디바이스 한 줄, 실패를 위로 · 서른 줄까지 (도메인/실행 §8.16 ⑤ · 점검표 U3)

import { api, type FailureCase, type ItemStatus, type Platform, type RunItemSummary } from './api.js';
import { groupByCase, 회차요약 } from './group.js';
import { use말, use언어 } from './i18n.js';
import { 항목실행번호 } from './RerunTag.js';
import { 걸린글 } from './trialView.js';
import { PLATFORM_LABEL, useAsync, Verdict } from './ui.js';

const 최대줄 = 30;
const 판정차례: Record<ItemStatus, number> = { FAIL: 0, NA: 1, PASS: 2 };

interface 줄 {
  tcId: string;
  tcName: string;
  platform: Platform;
  status: ItemStatus;
  회차글: string | null;
  ms: number | null;
  /** 가장 먼저 돌린 깨진 회차 — 누르면 그 항목 상세로 간다 */
  깨진: RunItemSummary | undefined;
}

/** 케이스 × 디바이스 한 줄로 접는다. 회차는 줄을 늘리지 않는다 (SPEC §8.3) */
function 줄들(items: RunItemSummary[]): 줄[] {
  const 모두 = groupByCase(items).flatMap((묶음) =>
    (Object.entries(묶음.byPlatform) as [Platform, RunItemSummary[]][]).map(([platform, 칸]): 줄 => {
      const 요약 = 회차요약(칸);
      return {
        tcId: 묶음.tcId,
        tcName: 묶음.tcName,
        platform,
        status: 요약.status,
        회차글: 요약.글,
        ms: 칸.reduce<number | null>((합, i) => (i.durationMs === null ? 합 : (합 ?? 0) + i.durationMs), null),
        깨진: 칸.filter((i) => i.status === 'FAIL').sort((a, b) => a.historyId - b.historyId)[0],
      };
    }),
  );
  // 정렬은 안정이라 같은 판정끼리는 실행 차례가 남는다
  return 모두.sort((a, b) => 판정차례[a.status] - 판정차례[b.status]);
}

/** 목록은 서른 줄까지라 실패 케이스도 서른 건이면 된다 — 한 쪽이 스무 건이라 넘치면 둘째 쪽까지 받는다 */
async function 실패카드들(runId: number): Promise<{ items: FailureCase[] }> {
  const 첫쪽 = await api.failures(runId, 1);
  if (!(첫쪽.total > 첫쪽.pageSize)) return 첫쪽;
  const 둘쪽 = await api.failures(runId, 2);
  return { items: [...첫쪽.items, ...둘쪽.items] };
}

export function RunDoneItems({ runId, items, onClose }: { runId: number; items: RunItemSummary[]; onClose: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const 보일 = 줄들(items);
  const 실패있음 = 보일.some((줄) => 줄.status === 'FAIL');
  // 항목 요약에는 사람 말 이유가 없다 — 실패 카드와 같은 응답에서 한 줄 이유만 가져온다. 못 읽어도 목록은 그대로 선다
  const 카드 = useAsync(() => (실패있음 ? 실패카드들(runId) : Promise.resolve(null)), [runId, 실패있음]);
  const 이유: Record<string, string> = {};
  for (const 케이스 of 카드.data?.items ?? []) {
    for (const 칸 of 케이스.devices) {
      const 글 = 칸.item.failure?.reason;
      if (글 !== undefined && 글 !== '') 이유[`${케이스.tcId}:${칸.platform}`] = 글;
    }
  }
  if (보일.length === 0) return null;

  return (
    <>
      <ul className="trial-res done-items">
        {보일.slice(0, 최대줄).map((줄) => {
          const 사유 = 이유[`${줄.tcId}:${줄.platform}`];
          return (
            <li key={`${줄.tcId}:${줄.platform}`} className={줄.status === 'FAIL' ? 'bad' : undefined}>
              <div className="top">
                <span className="id mono">{줄.tcId}</span>
                <span className="nm">
                  {줄.깨진 === undefined ? (
                    줄.tcName
                  ) : (
                    <a href={`#/runs/${String(항목실행번호(줄.깨진, runId))}/items/${String(줄.깨진.historyId)}`} onClick={onClose}>
                      {줄.tcName}
                    </a>
                  )}
                  {줄.회차글 === null ? '' : ` · ${줄.회차글}`}
                </span>
                <span className="tag">{t(PLATFORM_LABEL[줄.platform])}</span>
                <span className="dur">{줄.ms === null ? '' : 걸린글(줄.ms, 언어)}</span>
                <Verdict status={줄.status} />
              </div>
              {사유 === undefined ? null : (
                <div className="why">
                  <span className="fail-reason">{사유}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {보일.length <= 최대줄 ? null : <p className="hint">{t('외 {건수}건', { 건수: 보일.length - 최대줄 })}</p>}
    </>
  );
}
