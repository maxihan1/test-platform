// 직전 실행과 견준 결과와 이번 실패의 사유 묶음을 리포트에 그린다 (SPEC §7 `/runs/:runId/insights` · §8.3)

import { api, type ItemStatus, type RunInsights as 비교, type RunItemSummary } from './api.js';
import { groupByCase, 회차요약 } from './group.js';
import { 도는중 } from './runState.js';
import { PLATFORM_LABEL, STATUS_COLOR, useAsync, when } from './ui.js';

const 키 = (tcId: string, platform: string): string => `${tcId}\u0000${platform}`;

/**
 * (케이스, 디바이스)마다 **이번 실행의** 판정.
 *
 * 회차가 여럿이면 목록과 같은 규칙으로 접는다 (`회차요약`) — 목록에 `3/5 통과` 로 보이는 칸이
 * 여기서만 통과로 읽히면 한 화면이 같은 것을 두 말로 한다.
 */
function 이번판정들(items: RunItemSummary[]): Map<string, ItemStatus> {
  const 표 = new Map<string, ItemStatus>();
  for (const 묶음 of groupByCase(items)) {
    for (const [platform, 칸] of Object.entries(묶음.byPlatform)) {
      if (칸 === undefined || 칸.length === 0) continue;
      표.set(키(묶음.tcId, platform), 회차요약(칸).status);
    }
  }
  return 표;
}

/**
 * 리포트의 비교 칸과 사유 묶음.
 *
 * **아직 도는 중이면 견주지 않는다.** 판정이 안 들어간 항목은 `NA` 로 읽혀
 * 앞 실행이 깨졌던 것이 전부 「고쳐짐」으로 보인다 — 끝나고 나서야 사실이 되는 값이다.
 */
export function RunInsights({
  runId,
  status,
  items,
}: {
  runId: number;
  status: string;
  items: RunItemSummary[];
}) {
  const 끝났나 = !도는중(status);
  const 견줌 = useAsync<비교 | null>(
    () => (끝났나 ? api.insights(runId) : Promise.resolve(null)),
    [runId, 끝났나],
  );

  // 견주기가 실패해도 결과 목록은 그대로 서야 한다. 대신 조용히 사라지지는 않는다
  if (견줌.error !== null) return <div className="sec hint">직전 실행과 견주지 못했습니다. {견줌.error}</div>;

  const 값 = 견줌.data;
  if (값 === null) return null;

  const 이번 = 이번판정들(items);
  const 앞 = 값.previous;
  // 「직전과 같은 통과」는 줄을 만들지 않는다. 대개 이것이 가장 많아서 달라진 것을 묻어 버린다
  const 볼것 = 값.케이스들.filter(
    (c) => !(c.판정 === '그대로' && 이번.get(키(c.tcId, c.platform)) === 'PASS'),
  );

  return (
    <>
      {앞 === null ? null : (
        <div className="sec">
          <div className="sec-h">
            직전 실행과 견줌
            <span>
              RUN {앞.runId} · {when(앞.startedAt)}
            </span>
          </div>
          {/* 주소를 바꿨다는 사실 자체가 봐야 할 정보다. 비교를 막지는 않는다 (SPEC §6) */}
          {!값.주소바뀜 ? null : <p className="hint">직전 실행은 다른 주소에서 돌았습니다</p>}
          {볼것.map((c) => (
            <div className="pre" key={키(c.tcId, c.platform)}>
              {c.tcId} {c.tcName} · {PLATFORM_LABEL[c.platform]} ·{' '}
              {/* 낱말은 앞 실행과 견준 변화, 색은 **이번 판정**이다. `그대로` 하나가 「통과→통과」와
                  「미실행→미실행」을 둘 다 덮는데 뒤엣것은 괜찮은 것이 아니다 (DESIGN.md 원칙 1) */}
              <span className="change" style={{ color: STATUS_COLOR[이번.get(키(c.tcId, c.platform)) ?? 'NA'] }}>
                {c.판정}
              </span>
            </div>
          ))}
          {볼것.length === 값.케이스들.length ? null : (
            <p className="hint">나머지 {값.케이스들.length - 볼것.length}건은 직전 실행과 같은 통과입니다</p>
          )}
          {/* 판정을 다섯째로 늘리지 않는다 — 넷의 뜻이 흐려진다. 수만 한 줄로 적는다 */}
          {값.빠진건수 === 0 ? null : (
            <p className="hint">직전 실행에 있었으나 이번에 돌지 않은 케이스 {값.빠진건수}건</p>
          )}
        </div>
      )}

      {값.실패덩어리들.length === 0 ? null : (
        <div className="sec">
          <div className="sec-h">같은 사유로 묶은 실패</div>
          {값.실패덩어리들.map((덩어리) => (
            <div className="pre" key={덩어리.대표문장}>
              {/* 「케이스 N건」이 아니다. 세는 단위는 실행 항목이라 5회 중 3회 실패가 3 으로 온다 */}
              {덩어리.대표문장} · 실패 항목 {덩어리.건수}건
              <div className="hint">
                {[
                  ...new Set(
                    덩어리.항목들.map((it) => `${it.tcId} ${it.tcName} (${PLATFORM_LABEL[it.platform]})`),
                  ),
                ].join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
