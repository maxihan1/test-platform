// 실행 결과 목록의 케이스 한 줄 (SPEC §8.3). 판단은 RunResult 에 두고 그리는 쪽만 여기로 옮겼다
// CaseList → CaseListParts 와 같은 이유다 — RunResult 가 300줄을 넘었다 (CLAUDE.md §3)

import type { ItemStatus, Platform, RunItemSummary } from './api.js';
import { type CaseGroup, 회차요약 } from './group.js';
import { 한줄로 } from './mask.js';
import { 칸사유 } from './runState.js';
import { PLATFORM_LABEL, seconds, STATUS_COLOR, Verdict } from './ui.js';

// 행의 거터 색. 디바이스 하나라도 깨졌으면 실패로 보여야 한다.
// 회차가 여럿인 칸은 요약 판정을 쓴다 — 목록에 보이는 글자와 색이 같은 값을 봐야 한다
function worst(칸들: RunItemSummary[][]): ItemStatus {
  const 판정 = 칸들.map((칸) => 회차요약(칸).status);
  if (판정.includes('FAIL')) return 'FAIL';
  if (판정.length > 0 && 판정.every((s) => s === 'PASS')) return 'PASS';
  return 'NA';
}

export function 결과줄({
  group,
  columns,
  runId,
}: {
  group: CaseGroup;
  columns: Platform[];
  runId: number;
}) {
  const 칸들 = columns
    .map((platform) => group.byPlatform[platform])
    .filter((칸): 칸 is RunItemSummary[] => 칸 !== undefined && 칸.length > 0);
  const 첫항목 = 칸들[0]?.[0];
  const 입력줄 = 첫항목 === undefined ? '' : 한줄로(첫항목.params, 첫항목.paramSchema);
  // 사유 없이 미실행으로 두면 러너 고장과 구분되지 않는다 (SPEC §8.3)
  const 사유 = 칸사유(칸들.flat());

  return (
    <div className="row">
      <div className="gutter" style={{ background: STATUS_COLOR[worst(칸들)] }} />
      <div className="tcid">{group.tcId}</div>
      <div className="title">
        {group.tcName}
        {/* 상세로 들어가야만 보이면 「어떤 값에서 깨졌는가」를 줄 사이에서 비교할 수 없다 (SPEC §8.3).
            입력이 없는 케이스는 줄 자체를 안 만든다 */}
        {입력줄 === '' ? null : <small>{입력줄}</small>}
        {사유 === null ? null : <small className="why">{사유}</small>}
      </div>
      <div className="right">
        <div className="devices">
          {columns.map((platform) => {
            const 칸 = group.byPlatform[platform];
            return (
              <div className="device" key={platform}>
                <span className="device-name">{PLATFORM_LABEL[platform]}</span>
                {/* 그 디바이스를 지원하지 않는 케이스는 칸을 —로 비운다 (SPEC §8.3) */}
                {칸 === undefined || 칸.length === 0 ? (
                  <span className="device-none">—</span>
                ) : (
                  <Verdicts 칸={칸} runId={runId} />
                )}
              </div>
            );
          })}
        </div>
        {첫항목 === undefined ? null : (
          <a className="btn small" href={`#/runs/${runId}/items/${첫항목.historyId}`}>
            상세
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * 한 디바이스 칸의 판정.
 *
 * 1회면 판정 배지, 반복이면 `3/5 통과` 요약이다. **행 구조는 바뀌지 않는다** (SPEC §8.3).
 * 어느 회차가 깨졌는지는 상세에서 본다 — 목록은 회차를 펼치지 않는다.
 */
function Verdicts({ 칸, runId }: { 칸: RunItemSummary[]; runId: number }) {
  // 아직 안 끝난 것이 하나라도 있으면 도는 중이다. 실행이 끝나야 판정이 들어간다 (SPEC §3.2)
  if (칸.some((item) => item.finishedAt === null)) {
    return <span className="device-none">진행 중</span>;
  }

  const 요약 = 회차요약(칸);
  const 처음 = 칸[0]!;

  return (
    <>
      <a href={`#/runs/${runId}/items/${처음.historyId}`}>
        {요약.글 === null ? (
          <Verdict status={요약.status} />
        ) : (
          <span className={`verdict ${요약.status === 'PASS' ? 'v-pass' : 요약.status === 'FAIL' ? 'v-fail' : 'v-na'}`}>
            {요약.글}
          </span>
        )}
      </a>
      <span className="device-dur">
        {seconds(요약.평균소요ms)}
        {요약.회차수 > 1 ? ' 평균' : ''}
      </span>
    </>
  );
}
