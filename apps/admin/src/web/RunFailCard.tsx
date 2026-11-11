// 실패 케이스 카드 한 장 — 접힌 머리 한 줄로 서고, 펴면 깨진 디바이스와 통과 · 미실행 줄이 나온다 (실행 §8.3). 결과 화면 목록과 대시보드 서랍이 같이 쓴다

import { useEffect, useRef } from 'react';

import type { FailureCase, Platform, RunItemSummary } from './api.js';
import { 회차요약 } from './group.js';
import { use말, use언어 } from './i18n.js';
import { ItemExpand } from './ItemExpand.js';
import type { 판정 } from './role.js';
import { RunFailBts } from './RunFailBts.js';
import { RunFailJudge } from './RunFailJudge.js';
import { 다시실행꼬리표, 항목실행번호 } from './RerunTag.js';
import { 관련요구줄 } from './RunFailedReqs.js';
import { 실패이유 } from './FailureWhy.js';
import { 같은실패끼리, RunFailDevice, 변화글 } from './RunFailDevice.js';
import { 다시돌림꼬리표, 디바이스꼬리표, 판정꼬리표 } from './RunFailCardTags.js';
import { PLATFORM_LABEL, seconds, Verdict, 디바이스순서 } from './ui.js';
import type { 다시돌린결과 } from './useRerunResults.js';

export function 실패카드({
  c,
  runId,
  env,
  items,
  platform,
  권한,
  on남김,
  열기,
  맞추기 = false,
  on맞춤,
  on펼침,
  다시돌림,
}: {
  c: FailureCase;
  runId: number;
  env: string;
  items: RunItemSummary[];
  platform: Platform | 'ALL';
  권한: 판정;
  on남김: () => void;
  /** 펼친 채 선다 — 주소에 펼친 카드로 남았거나 링크로 온 카드 */
  열기: boolean;
  /** 서면서 화면을 이 카드로 옮긴다 */
  맞추기?: boolean;
  /** 화면을 옮긴 뒤 불린다 — 목록이 다시 옮기지 않게 */
  on맞춤?: () => void;
  /** 사람이 접고 편 것을 주소에 남긴다 */
  on펼침?: (열림: boolean) => void;
  다시돌림: 다시돌린결과 | undefined;
}) {
  const t = use말();
  const 접이 = useRef<HTMLDetailsElement>(null);
  // 화면이 편 것의 toggle 은 한 박자 늦게 온다 — 그사이 쪽을 넘겨 펼친 카드를 비우면 그 신호가 지운 카드를 주소에 되살린다
  const 스스로폈다 = useRef(false);
  // 설 때 한 번만 편다. 그 뒤의 접고 펴기는 브라우저 몫이고 toggle 로 듣기만 한다 — 편 것이 주소에 들어 열기가 바뀔 때마다 펴고 옮기면 누를 때마다 화면이 뛴다
  useEffect(() => {
    if (!열기 || 접이.current === null) return;
    스스로폈다.current = true;
    접이.current.open = true;
    if (!맞추기) return;
    접이.current.scrollIntoView?.({ block: 'start' });
    on맞춤?.();
  }, []);
  const 깨진 = new Set(c.devices.map((d) => d.platform));
  // 디바이스를 거른 동안에는 그 디바이스만 낸다. 깨진 디바이스는 서버가 카드에 안 실었어도 접힌 줄에 넣지 않는다 —
  // 실패가 「통과 · 미실행」 줄처럼 접혀 보이면 안 된다
  const 나머지 = 디바이스순서.flatMap((칸디바이스) => {
    if (깨진.has(칸디바이스) || (platform !== 'ALL' && platform !== 칸디바이스)) return [];
    const 칸 = items
      .filter((i) => i.tcId === c.tcId && i.platform === 칸디바이스)
      .sort((a, b) => a.attempt - b.attempt);
    return 칸.length === 0 || 칸.some((i) => i.status === 'FAIL') ? [] : [칸];
  });
  // 사유는 실행 때 박제한 값이다 — 케이스 줄과 같은 꼬리 글이다 (도메인/실행 §8.3)
  const 미확정사유 = c.devices.map((d) => d.item.unconfirmed).find((글) => typeof 글 === 'string') ?? null;
  const 머리이유 = c.devices[0]?.item.failure;
  // 접힌 머리에는 기존 실패만 단다(실행 §8.3 표 2번 줄) — 디바이스 차례로 처음 이어진 것 하나. 회귀 실패 · 디바이스마다의 글은 펼친 디바이스 머리에 있다
  const 머리변화 = c.devices.flatMap((d) => (d.change === '계속깨짐' ? [변화글(d, t)] : [])).find((글) => 글 !== null) ?? null;

  // 접고 펴는 것은 브라우저가 한다. 편 카드는 주소에 남아 돌아와도 펼쳐 선다. 쪽을 넘기면 다른 카드라 다시 접혀 선다 (실행 §8.3 「실패 카드는 접어 둔다」)
  return (
    // 자동 수정 카드는 고치기 전 실패 원인 글을 흐리게 줄 긋는다 — 지운 것이 아니라 고치기 전 기록이다 (도메인/BTS §8.15 B)
    <article className={c.autoFix == null ? 'fc-card' : 'fc-card fc-fixed'}>
      <details
        className="fc-fold"
        ref={접이}
        onToggle={(e) => {
          if (스스로폈다.current) 스스로폈다.current = false;
          else on펼침?.(e.currentTarget.open);
        }}
      >
        <summary className="fc-sum">
          <div className="fc-head">
            {c.autoFix == null ? <Verdict status="FAIL" /> : <span className="fix-tag">{t('수정 후 통과')}</span>}
            <span className="mono fc-tc">{c.tcId}</span>
            {/* 카드 하나의 유형은 디바이스 차례로 첫 깨진 디바이스의 처음 실패한 회차 것이다 — 서버가 그 차례로 싣는다 (실행 §8.3) */}
            <실패이유 failure={머리이유} />
            {머리변화 === null ? null : <span className="fc-tag">{머리변화}</span>}
            <판정꼬리표 judgment={c.judgment} />
            <다시돌림꼬리표 tcId={c.tcId} 결과={다시돌림} />
            <디바이스꼬리표 tcId={c.tcId} items={items} 통과로바뀐={c.autoFix == null ? [] : [...깨진]} />
          </div>
          <h3 className="fc-name-h">{c.tcName}</h3>
          {미확정사유 === null ? null : (
            <p className="fc-unconf">
              {t('미확정')} · {미확정사유}
            </p>
          )}
        </summary>

        <div className="fc-body">
          <관련요구줄 reqs={c.reqs} 권한={권한} />

          {같은실패끼리(c.devices).map((묶음) => (
            <RunFailDevice key={묶음.map((d) => d.platform).join('-')} runId={runId} devices={묶음} env={env} items={items} 머리이유={머리이유} />
          ))}

          {나머지.map((칸) => (
            <통과줄 key={칸[0]!.platform} 칸={칸} runId={runId} />
          ))}

          <RunFailJudge c={c} runId={runId} 권한={권한} on남김={on남김} />
          <RunFailBts c={c} runId={runId} env={env} 권한={권한} />
        </div>
      </details>
    </article>
  );
}

function 통과줄({ 칸, runId }: { 칸: RunItemSummary[]; runId: number }) {
  const t = use말();
  const 언어 = use언어();
  const 요약 = 회차요약(칸);
  const 처음 = 칸[0]!;

  return (
    <ItemExpand className="fc-pass" runId={항목실행번호(처음, runId)} historyId={처음.historyId} tcId={처음.tcId} platform={처음.platform}>
      <b>{PLATFORM_LABEL[처음.platform]}</b>
      {요약.글 === null ? (
        <Verdict status={요약.status} />
      ) : (
        <span className={`verdict ${요약.status === 'PASS' ? 'v-pass' : 요약.status === 'FAIL' ? 'v-fail' : 'v-na'}`}>{요약.글}</span>
      )}
      <span>{요약.회차수 > 1 ? t('{시간} 평균', { 시간: seconds(요약.평균소요ms, 언어) }) : seconds(요약.평균소요ms, 언어)}</span>
      {처음.rerun == null ? null : <다시실행꼬리표 rerun={처음.rerun} status={처음.status} />}
    </ItemExpand>
  );
}
