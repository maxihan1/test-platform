// 직전 실행과 견준 결과와 이번 실패의 사유 묶음을 리포트에 그린다 (SPEC §7 `/runs/:runId/insights` · §8.3)

import { api, type ItemStatus, type RunInsights as 비교, type RunItemSummary, type 변화 } from './api.js';
import { groupByCase, 회차요약 } from './group.js';
import { t, use말, use언어, type 언어 } from './i18n.js';
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
 * 앞 실행과 견준 변화 한 낱말.
 *
 * 서버가 준 **값**이지만 자리 자체가 화면 글자다 (`api.ts` 의 `변화`).
 * 표를 돌려 `t(변수)` 로 넘기지 않는다 — 키가 정적이어야 그물이 본다.
 */
function 변화글자(판정: 변화, 언어: 언어): string {
  if (판정 === '새로깨짐') return t('새로깨짐', 언어);
  if (판정 === '계속깨짐') return t('계속깨짐', 언어);
  if (판정 === '고쳐짐') return t('고쳐짐', 언어);
  return t('그대로', 언어);
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
  const t말 = use말();
  const 언어 = use언어();
  const 끝났나 = !도는중(status);
  const 견줌 = useAsync<비교 | null>(
    () => (끝났나 ? api.insights(runId) : Promise.resolve(null)),
    [runId, 끝났나],
  );

  // 견주기가 실패해도 결과 목록은 그대로 서야 한다. 대신 조용히 사라지지는 않는다
  if (견줌.error !== null)
    // 접지 않는다 — 오류는 펴야 보이면 안 된다. 대신 구획 여백을 줄여 자리를 덜 먹는다
    return <div className="sec tight hint">{t말('직전 실행과 견주지 못했습니다.')} {견줌.error}</div>;

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
      {/* **접기는 `앞 === null` 검사 **뒤**에 있어야 한다.** 바깥에서 감싸면 첫 실행에
          내용 없는 `<summary>` 한 줄이 남는데, SPEC 공통/7-데모와-완료 §7 이
          「첫 실행에서는 그 칸이 **아예 없다**」를 규정한다.
          펴고 접는 상태를 React 로 들지 않는다 — `<details>` 가 이미 한다 */}
      {앞 === null ? null : (
        <details className="sec fold">
          <summary className="sec-h">
            {t말('직전 실행과 견줌')}
            <span>
              RUN {앞.runId} · {when(앞.startedAt, 언어)}
            </span>
            {/* 주소를 바꿨다는 사실은 **접어서 숨기면 안 된다** — 「봐야 할 정보」다 (SPEC §6).
                접힌 줄에서 안 보이면 다른 서버에서 돈 결과를 같은 조건으로 읽는다.
                그래서 펴야 보이는 안이 아니라 `summary` 안에 둔다 (2026-09-22 자기검토) */}
            {!값.주소바뀜 ? null : (
              <span className="change" style={{ color: 'var(--na)' }}>
                {t말('직전 실행은 다른 주소에서 돌았습니다')}
              </span>
            )}
          </summary>
          {볼것.map((c) => (
            <div className="pre" key={키(c.tcId, c.platform)}>
              {c.tcId} {c.tcName} · {PLATFORM_LABEL[c.platform]} ·{' '}
              {/* 낱말은 앞 실행과 견준 변화, 색은 **이번 판정**이다. `그대로` 하나가 「통과→통과」와
                  「미실행→미실행」을 둘 다 덮는데 뒤엣것은 괜찮은 것이 아니다 (DESIGN.md 원칙 1) */}
              <span className="change" style={{ color: STATUS_COLOR[이번.get(키(c.tcId, c.platform)) ?? 'NA'] }}>
                {변화글자(c.판정, 언어)}
              </span>
            </div>
          ))}
          {볼것.length === 값.케이스들.length ? null : (
            <p className="hint">
              {t말('나머지 {건수}건은 직전 실행과 같은 통과입니다', { 건수: 값.케이스들.length - 볼것.length })}
            </p>
          )}
          {/* 판정을 다섯째로 늘리지 않는다 — 넷의 뜻이 흐려진다. 수만 한 줄로 적는다 */}
          {값.빠진건수 === 0 ? null : (
            <p className="hint">
              {t말('직전 실행에 있었으나 이번에 돌지 않은 케이스 {건수}건', { 건수: 값.빠진건수 })}
            </p>
          )}
        </details>
      )}

      {값.실패덩어리들.length === 0 ? null : (
        <details className="sec fold">
          <summary className="sec-h">{t말('같은 사유로 묶은 실패')}</summary>
          {값.실패덩어리들.map((덩어리) => (
            <div className="pre" key={덩어리.대표문장}>
              {/* 「케이스 N건」이 아니다. 세는 단위는 실행 항목이라 5회 중 3회 실패가 3 으로 온다 */}
              {덩어리.대표문장} · {t말('실패 항목 {건수}건', { 건수: 덩어리.건수 })}
              <div className="hint">
                {[
                  ...new Set(
                    덩어리.항목들.map((it) => `${it.tcId} ${it.tcName} (${PLATFORM_LABEL[it.platform]})`),
                  ),
                ].join(', ')}
              </div>
            </div>
          ))}
        </details>
      )}
    </>
  );
}
