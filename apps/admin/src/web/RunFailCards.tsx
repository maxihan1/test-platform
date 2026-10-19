// 실행 결과 화면의 실패 케이스 카드 목록 — 깨진 디바이스는 모두 펼치고 통과 · 미실행 디바이스는 한 줄로 접는다 (실행 §8.3)

import { useEffect, useRef, useState } from 'react';

import { api, type FailureCase, type Platform, type RunItemSummary, type 실패유형, type 실패유형묶음 } from './api.js';
import { 실패유형이름 } from './DashboardTypes.js';
import { 회차요약 } from './group.js';
import { use말, use언어 } from './i18n.js';
import { ItemExpand } from './ItemExpand.js';
import type { 판정 } from './role.js';
import { RunFailJudge } from './RunFailJudge.js';
import { 관련요구줄 } from './RunFailedReqs.js';
import { 실패이유 } from './FailureWhy.js';
import { 같은실패끼리, RunFailDevice } from './RunFailDevice.js';
import { Failed, Loading, PLATFORM_LABEL, seconds, useAsync, Verdict, 디바이스순서 } from './ui.js';

interface Props {
  runId: number;
  env: string;
  /** 그 실행 응답의 항목 — 실패 케이스의 통과 · 미실행 디바이스 줄을 그리는 데 쓴다 */
  items: RunItemSummary[];
  platform: Platform | 'ALL';
  /** 그 실행 서비스의 권한 — 「화면이 맞음」 · 「버그」 버튼과 요구 고리를 가른다. 안 주면 아무것도 못 하는 것으로 본다 */
  권한?: 판정;
  /** insights 의 실패유형들 — 카드 위 「실패 유형」 칩 줄. 못 받았으면 줄을 안 그린다 */
  유형들?: 실패유형묶음[];
}

const 권한없음: 판정 = () => false;

export function RunFailCards(props: Props) {
  const t = use말();
  // 항목이 없으면 실패도 없다. 통로를 부르지 않는다
  if (props.items.length === 0) return <p className="empty">{t('실패한 케이스가 없습니다')}</p>;
  return <카드목록 {...props} />;
}

function 카드목록({ runId, env, items, platform, 권한 = 권한없음, 유형들 = [] }: Props) {
  const t = use말();
  const [쪽상태, set쪽상태] = useState({ 거르개: platform, 쪽: 1 });
  const [고른유형, set고른유형] = useState<실패유형 | null>(null);
  // 디바이스 거르개가 바뀌면 1쪽부터 — 앞 쪽 번호로 새 거르개를 부르면 쪽 수가 틀린다
  const 쪽 = 쪽상태.거르개 === platform ? 쪽상태.쪽 : 1;
  const 응답 = useAsync(() => api.failures(runId, 쪽, platform === 'ALL' ? undefined : platform), [runId, 쪽, platform]);
  const 머리 = useRef<HTMLHeadingElement>(null);
  const 넘김 = useRef(false);

  // 쪽을 넘기면 키보드 사용자가 새 목록의 처음으로 돌아가야 한다
  useEffect(() => {
    if (!넘김.current || 응답.data === null) return;
    넘김.current = false;
    머리.current?.focus();
  }, [응답.data]);

  const 다시읽기 = 응답.reload;

  if (응답.error !== null) return <Failed error={응답.error} />;
  if (응답.data === null) return <Loading />;

  const 이동 = (다음쪽: number) => {
    넘김.current = true;
    set쪽상태({ 거르개: platform, 쪽: 다음쪽 });
  };
  // 총수는 서버가 실패 케이스를 그룹으로 센 정확한 값이다. 받은 건수가 쪽 크기와 같다고 더 있다고 보면
  // 정확히 한 쪽 크기일 때 빈 다음 쪽이 열린다
  const 더있나 = 쪽 * 응답.data.pageSize < 응답.data.total;
  // ponytail: 유형 거르기는 받은 쪽 안에서만 한다 — 실패 카드 통로에 유형 조건이 없어서다(계약 밖). 쪽이 여럿이면 아래 한 줄이 전체 수를 알린다
  const 유형칸 = 유형들.find((u) => u.type === 고른유형) ?? null;
  const 보일카드 = 유형칸 === null ? 응답.data.items : 응답.data.items.filter((c) => 유형칸.tcIds.includes(c.tcId));

  return (
    <section className="fc-list">
      <h2 ref={머리} tabIndex={-1} className="fc-title">
        {t('실패한 케이스')} <span className="fc-count">{응답.data.total}</span>
      </h2>

      {/* 같은 유형끼리 훑는다 — 수는 카드(케이스) 수다. 앞 판의 「같은 사유로 실패」는 확인 문장마다 한 덩어리였다 (실행 §8.3 「실패 유형으로 묶는다」) */}
      {유형들.length === 0 ? null : (
        <div className="chip-group fc-types" role="group" aria-label={t('실패 유형')}>
          <button type="button" className="chip" aria-pressed={유형칸 === null} onClick={() => set고른유형(null)}>
            {t('전체')} <b className="num">{유형들.reduce((합, u) => 합 + u.count, 0)}</b>
          </button>
          {유형들.map((u) => (
            <button key={u.type} type="button" className="chip" aria-pressed={u.type === 고른유형} onClick={() => set고른유형(u.type)}>
              {t(실패유형이름[u.type])} <b className="num">{u.count}</b>
            </button>
          ))}
        </div>
      )}
      {유형칸 === null || 보일카드.length === 유형칸.count ? null : (
        <p className="hint">{t('이 쪽에 {보인}건 · 이 유형 전체 {전체}건', { 보인: 보일카드.length, 전체: 유형칸.count })}</p>
      )}

      {보일카드.length === 0 ? (
        <p className="empty">{t('실패한 케이스가 없습니다')}</p>
      ) : (
        보일카드.map((c) => (
          <카드 key={c.tcId} c={c} runId={runId} env={env} items={items} platform={platform} 권한={권한} on남김={다시읽기} />
        ))
      )}

      {쪽 === 1 && !더있나 ? null : (
        <div className="pager">
          <button type="button" onClick={() => 이동(쪽 - 1)} disabled={쪽 <= 1}>
            {t('이전')}
          </button>
          <span>{t('{쪽}쪽', { 쪽 })}</span>
          <button type="button" onClick={() => 이동(쪽 + 1)} disabled={!더있나}>
            {t('다음')}
          </button>
        </div>
      )}
    </section>
  );
}

function 카드({
  c,
  runId,
  env,
  items,
  platform,
  권한,
  on남김,
}: {
  c: FailureCase;
  runId: number;
  env: string;
  items: RunItemSummary[];
  platform: Platform | 'ALL';
  권한: 판정;
  on남김: () => void;
}) {
  const t = use말();
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

  return (
    <article className="fc-card">
      <div className="fc-head">
        <Verdict status="FAIL" />
        <span className="mono fc-tc">{c.tcId}</span>
        {/* 카드 하나의 유형은 디바이스 차례로 첫 깨진 디바이스의 처음 실패한 회차 것이다 — 서버가 그 차례로 싣는다 (실행 §8.3) */}
        <실패이유 failure={머리이유} />
      </div>
      <h3 className="fc-name-h">{c.tcName}</h3>
      {미확정사유 === null ? null : (
        <p className="fc-unconf">
          {t('미확정')} · {미확정사유}
        </p>
      )}

      <관련요구줄 reqs={c.reqs} 권한={권한} />

      {같은실패끼리(c.devices).map((묶음) => (
        <RunFailDevice key={묶음.map((d) => d.platform).join('-')} devices={묶음} env={env} items={items} 머리이유={머리이유} />
      ))}

      {나머지.map((칸) => (
        <통과줄 key={칸[0]!.platform} 칸={칸} runId={runId} />
      ))}

      <RunFailJudge c={c} runId={runId} 권한={권한} on남김={on남김} />
    </article>
  );
}

function 통과줄({ 칸, runId }: { 칸: RunItemSummary[]; runId: number }) {
  const t = use말();
  const 언어 = use언어();
  const 요약 = 회차요약(칸);
  const 처음 = 칸[0]!;

  return (
    <ItemExpand className="fc-pass" runId={runId} historyId={처음.historyId} tcId={처음.tcId} platform={처음.platform}>
      <b>{PLATFORM_LABEL[처음.platform]}</b>
      {요약.글 === null ? (
        <Verdict status={요약.status} />
      ) : (
        <span className={`verdict ${요약.status === 'PASS' ? 'v-pass' : 요약.status === 'FAIL' ? 'v-fail' : 'v-na'}`}>{요약.글}</span>
      )}
      <span>{요약.회차수 > 1 ? t('{시간} 평균', { 시간: seconds(요약.평균소요ms, 언어) }) : seconds(요약.평균소요ms, 언어)}</span>
    </ItemExpand>
  );
}
