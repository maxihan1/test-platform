// 실행 결과 표의 케이스 한 줄 — 줄 전체가 단추이고 누르면 그 자리에서 펼쳐진다 (SPEC 도메인/실행 §8.3 「결과 화면은 요약 한 줄 + 실행 차례 표다」)
// 앞 판은 「상세」 · 「펼치기」 단추 둘이 줄마다 섰고 실패는 따로 카드였다 (2026-11-24 사용자 · 시안 5판)

import { useEffect, useRef, useState } from 'react';

import { api, type Platform, type RunItemSummary } from './api.js';
import { 실패유형이름 } from './DashboardTypes.js';
import { type CaseGroup, 회차요약 } from './group.js';
import { use말, use언어 } from './i18n.js';
import { 상세본문 } from './ItemExpand.js';
import { 한줄로 } from './mask.js';
import { 판정표시, use막힘사유글 } from './proc.js';
import { 다시실행꼬리표, 항목실행번호 } from './RerunTag.js';
import type { 판정 } from './role.js';
import { 실패본문 } from './RunFailCard.js';
import { 다시돌림꼬리표, 판정꼬리표 } from './RunFailCardTags.js';
import { 막힌항목, 줄판정of } from './runFlow.js';
import { 칸사유 } from './runState.js';
import { Failed, Loading, PLATFORM_LABEL, seconds, useAsync } from './ui.js';
import type { 다시돌린결과 } from './useRerunResults.js';

export interface 줄바깥 {
  runId: number;
  env: string;
  /** 그 실행의 모든 항목 — 막은 케이스의 판정과 펼친 Fail 줄의 다른 디바이스 줄을 여기서 찾는다 */
  items: RunItemSummary[];
  columns: readonly Platform[];
  /** 디바이스 칩으로 고른 것 — 펼친 Fail 줄이 그 디바이스 것만 받는다 */
  device: Platform | 'ALL';
  권한: 판정;
  /** 끝난 실행인가. 도는 동안에는 실패 카드 통로가 409 라 펼친 줄이 항목 상세만 보인다 */
  끝났나: boolean;
  /** 실행 응답의 autoFixedCases — 이미 고쳐 통과한 케이스 (도메인/BTS §8.15 B) */
  자동수정: readonly string[];
  다시돌림?: ReadonlyMap<string, 다시돌린결과>;
}

/** 한 디바이스 칸 — 1회면 판정 표시, 반복이면 「3/5 Pass」 요약이다. 하나라도 통과가 아니면 통과 색으로 칠하지 않는다 (§8.3 「회차 요약」) */
function 결과칸({ 칸, 이름 }: { 칸: RunItemSummary[] | undefined; 이름: string | null }) {
  const t = use말();
  const 언어 = use언어();
  // 디바이스가 둘 이상인 표의 휴대폰 폭에서만 보인다 — 머리 줄이 없어 어느 디바이스 칸인지 여기서 말한다
  const 디바이스 = 이름 === null ? null : <small className="rf-devn">{이름}</small>;
  // 그 디바이스를 지원하지 않는 케이스는 칸을 —로 비운다 (§8.3). 아직 안 끝난 것이 하나라도 있으면 도는 중이다 — 실행이 끝나야 판정이 들어간다 (§3.2)
  const 빈글 = 칸 === undefined || 칸.length === 0 ? '—' : 칸.some((i) => i.finishedAt === null) ? t('진행 중') : null;
  if (칸 === undefined || 빈글 !== null) {
    return (
      <>
        <span className="rf-v">
          {디바이스}
          <span className="device-none">{빈글}</span>
        </span>
        <span className="rf-dur" />
      </>
    );
  }
  const 요약 = 회차요약(칸, 언어);
  return (
    <>
      <span className="rf-v">
        {디바이스}
        {요약.글 === null ? (
          <판정표시 결과={{ status: 요약.status, blocked: 칸.some(막힌항목) }} />
        ) : (
          <span className={요약.status === 'FAIL' ? 'verdict v-fail' : `vd vd-${요약.status === 'PASS' ? 'pass' : 'na'}`}>{요약.글}</span>
        )}
      </span>
      <span className="rf-dur num">{요약.회차수 > 1 ? t('평균 {시간}', { 시간: seconds(요약.평균소요ms, 언어) }) : seconds(요약.평균소요ms, 언어)}</span>
    </>
  );
}

export function 케이스줄({
  g,
  seq,
  열림,
  on펼침,
  맞추기 = false,
  on맞춤,
  ...바깥
}: 줄바깥 & { g: CaseGroup; seq: number | null; 열림: boolean; on펼침: (열림: boolean) => void; 맞추기?: boolean; /** 화면을 이 줄로 옮긴 뒤 불린다 — 표가 다시 서도 또 옮기지 않게 */ on맞춤?: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const 막힘사유글 = use막힘사유글();
  const { runId, items, columns, 자동수정, 다시돌림 } = 바깥;
  const 것 = columns.flatMap((p) => g.byPlatform[p] ?? []);
  const 판정 = 줄판정of(g, columns);
  const 깨진 = 것.find((i) => i.status === 'FAIL');
  const 고쳐짐 = 자동수정.includes(g.tcId);
  // 접어도 지우지 않고 가려 둔다 — 다시 펴도 상세를 다시 부르지 않는다
  const [불렀나, set불렀나] = useState(열림);
  // 누르지 않고 펼쳐진 줄(주소의 `open=` · 보기 복원)도 본문을 불러야 한다 — 누를 때만 부르면 펼쳐진 채 빈 자리가 선다
  if (열림 && !불렀나) set불렀나(true);
  const 줄 = useRef<HTMLDivElement>(null);
  // 다른 화면의 고리(`&tc=`)로 온 줄은 설 때 한 번 화면을 그 줄로 옮긴다
  useEffect(() => {
    if (!맞추기) return;
    줄.current?.scrollIntoView?.({ block: 'start' });
    on맞춤?.();
  }, []);

  const 입력줄 = 한줄로((깨진 ?? 것[0])?.params, (깨진 ?? 것[0])?.paramSchema, 언어);
  const 막은 = 것.find((i) => 막힌항목(i) && i.blockedBy != null);
  // 막은 케이스가 같은 실행 · 같은 디바이스 · 같은 회차에서 어떻게 끝났는지로 까닭을 붙인다
  const 막은판정 = 막은 === undefined ? undefined : items.find((i) => i.tcId === 막은.blockedBy && i.platform === 막은.platform && i.attempt === 막은.attempt)?.status;
  const 사유 = 깨진 !== undefined ? null : 막은 !== undefined ? 막힘사유글(막은.blockedBy!, 막은판정) : 판정.blocked ? null : 칸사유(것, 언어);
  const 미확정사유 = 것.find((i) => typeof i.unconfirmed === 'string')?.unconfirmed ?? null;
  const 덮인 = 것.find((i) => i.rerun != null);
  const 다시 = 다시돌림?.get(g.tcId);
  const 패널 = `rf-open-${String(runId)}-${g.tcId}`;

  return (
    <div ref={줄} className={판정.status === 'FAIL' ? (고쳐짐 ? 'rf-row fail fc-fixed' : 'rf-row fail') : 'rf-row'}>
      <button
        type="button"
        className="rf-line"
        aria-expanded={열림}
        aria-controls={패널}
        onClick={() => on펼침(!열림)}
      >
        <span className="rf-seq num">{seq ?? ''}</span>
        <span className="mono rf-id">{g.tcId}</span>
        <span className="rf-name">
          <span>
            {g.tcName}
            {/* 이미 고쳐 통과한 케이스다 — 판정은 고치기 전 기록 그대로 Fail 이다 (도메인/BTS §8.15 B) */}
            {고쳐짐 ? <span className="fix-tag">{t('수정 후 Pass')}</span> : null}
          </span>
          <small className="mono rf-idm">{g.tcId}</small>
          {/* 상세로 들어가야만 보이면 「어떤 값에서 깨졌는가」를 줄 사이에서 비교할 수 없다 (§8.3). 입력이 없는 케이스는 줄 자체를 안 만든다 */}
          {입력줄 === '' ? null : <small className="rf-why">{입력줄}</small>}
          {깨진?.failure == null ? null : (
            <small className="rf-why f fail-reason">
              {t(실패유형이름[깨진.failure.type])} — {깨진.failure.reason}
            </small>
          )}
          {사유 === null ? null : <small className="rf-why">{사유}</small>}
          {/* 사유는 실행 때 박제한 값이다 — 미확정은 판정이 아니라 꼬리표라 판정 색을 쓰지 않는다 (DESIGN.md 「판정 표기」 미확정) */}
          {미확정사유 === null ? null : (
            <small className="rf-why">
              {t('미확정')} · {미확정사유}
            </small>
          )}
          {/* 한 건 실행이 덮은 줄 — 지금 판정은 다시 돈 결과다 (§8.3 「한 건 실행이 붙은 실행」) */}
          {덮인?.rerun == null ? null : (
            <small>
              <다시실행꼬리표 rerun={덮인.rerun} status={덮인.status} />
            </small>
          )}
        </span>
        {columns.map((p) => (
          <결과칸 key={p} 칸={g.byPlatform[p]} 이름={columns.length > 1 ? PLATFORM_LABEL[p] : null} />
        ))}
        <span className="rf-caret" aria-hidden="true">
          {열림 ? '▾' : '▸'}
        </span>
      </button>
      {/* 고리는 단추 안에 못 넣는다 — 줄 아래에 따로 선다 */}
      {다시 === undefined ? null : (
        <div className="rf-tags">
          <다시돌림꼬리표 tcId={g.tcId} 결과={다시} />
        </div>
      )}
      <div id={패널} className="rf-open" hidden={!열림}>
        {!불렀나 ? null : 깨진 !== undefined && 바깥.끝났나 ? <실패펼침 g={g} 깨진={깨진} {...바깥} /> : <항목펼침 g={g} runId={runId} columns={columns} />}
      </div>
    </div>
  );
}

/** Pass · Not tested 줄을 편 자리 — 디바이스마다 항목 상세의 사전 조건 · 입력값 · 절차다. 깨진 회차가 있으면 그 회차다 */
function 항목펼침({ g, runId, columns }: { g: CaseGroup; runId: number; columns: readonly Platform[] }) {
  const t = use말();
  return (
    <>
      {columns.flatMap((p) => {
        const 칸 = g.byPlatform[p];
        if (칸 === undefined || 칸.length === 0) return [];
        const 볼 = 칸.find((i) => i.status === 'FAIL') ?? 칸[0]!;
        return [
          <div className="rf-dev" key={p}>
            <div className="rf-devh">
              {columns.length > 1 ? <b>{PLATFORM_LABEL[p]}</b> : null}
              {/* 코드 보기 · 다른 회차는 항목 상세에만 있다 */}
              <a className="fc-detail" href={`#/runs/${String(항목실행번호(볼, runId))}/items/${String(볼.historyId)}`}>
                {t('상세')}
              </a>
            </div>
            <상세본문 runId={항목실행번호(볼, runId)} historyId={볼.historyId} />
          </div>,
        ];
      })}
    </>
  );
}

/**
 * Fail 줄을 편 자리 — 앞 판 실패 카드의 증거 · 판정 · 이슈 등록이다. 그 케이스의 카드만 받는다(`?tc=`).
 * 한 건 실행이 덮어 지금은 실패가 아니게 된 케이스처럼 카드가 없으면 항목 상세로 물러선다
 */
function 실패펼침({ g, 깨진, runId, env, items, columns, device, 권한 }: 줄바깥 & { g: CaseGroup; 깨진: RunItemSummary }) {
  const t = use말();
  const 응답 = useAsync(() => api.failures(runId, 1, device === 'ALL' ? undefined : device, false, g.tcId), [runId, g.tcId, device]);
  if (응답.error !== null) return <Failed error={응답.error} />;
  if (응답.data === null) return <Loading />;
  const c = 응답.data.items.find((카드) => 카드.tcId === g.tcId);
  if (c === undefined) return <항목펼침 g={g} runId={runId} columns={columns} />;
  const 고치는중 = c.autoFixing?.state;
  return (
    <>
      <div className="rf-devh">
        <판정꼬리표 judgment={c.judgment} />
        {고치는중 === 'FAILED' || 고치는중 === 'GAVE_UP' ? (
          <span className="fix-tag">{t('자동 수정 실패')}</span>
        ) : 고치는중 === 'FIXING' || 고치는중 === 'WAIT_MERGE' || 고치는중 === 'RERUNNING' ? (
          <span className="fix-tag">{t('자동 수정 중')}</span>
        ) : null}
      </div>
      <실패본문 c={c} runId={runId} env={env} items={items} platform={device} 권한={권한} on남김={응답.reload} 머리이유={깨진.failure} />
    </>
  );
}
