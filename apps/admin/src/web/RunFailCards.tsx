// 실행 결과 화면의 실패 케이스 카드 목록 — 깨진 디바이스는 모두 펼치고 통과 · 미실행 디바이스는 한 줄로 접는다 (실행 §8.3)

import { useEffect, useRef, useState } from 'react';

import { api, type FailureCase, type Platform, type RunItemSummary } from './api.js';
import { 회차요약 } from './group.js';
import { use말, use언어 } from './i18n.js';
import { ItemExpand } from './ItemExpand.js';
import { 같은실패끼리, RunFailDevice } from './RunFailDevice.js';
import { Failed, Loading, PLATFORM_LABEL, seconds, useAsync, Verdict, 디바이스순서 } from './ui.js';

interface Props {
  runId: number;
  env: string;
  /** 그 실행 응답의 항목 — 실패 케이스의 통과 · 미실행 디바이스 줄을 그리는 데 쓴다 */
  items: RunItemSummary[];
  platform: Platform | 'ALL';
}

export function RunFailCards(props: Props) {
  const t = use말();
  // 항목이 없으면 실패도 없다. 통로를 부르지 않는다
  if (props.items.length === 0) return <p className="empty">{t('실패한 케이스가 없습니다')}</p>;
  return <카드목록 {...props} />;
}

function 카드목록({ runId, env, items, platform }: Props) {
  const t = use말();
  const [쪽상태, set쪽상태] = useState({ 거르개: platform, 쪽: 1 });
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

  if (응답.error !== null) return <Failed error={응답.error} />;
  if (응답.data === null) return <Loading />;

  const 이동 = (다음쪽: number) => {
    넘김.current = true;
    set쪽상태({ 거르개: platform, 쪽: 다음쪽 });
  };
  // 총수는 서버가 실패 케이스를 그룹으로 센 정확한 값이다. 받은 건수가 쪽 크기와 같다고 더 있다고 보면
  // 정확히 한 쪽 크기일 때 빈 다음 쪽이 열린다
  const 더있나 = 쪽 * 응답.data.pageSize < 응답.data.total;

  return (
    <section className="fc-list">
      <h2 ref={머리} tabIndex={-1} className="fc-title">
        {t('실패한 케이스')} <span className="fc-count">{응답.data.total}</span>
      </h2>

      {응답.data.items.length === 0 ? (
        <p className="empty">{t('실패한 케이스가 없습니다')}</p>
      ) : (
        응답.data.items.map((c) => <카드 key={c.tcId} c={c} runId={runId} env={env} items={items} platform={platform} />)
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
}: {
  c: FailureCase;
  runId: number;
  env: string;
  items: RunItemSummary[];
  platform: Platform | 'ALL';
}) {
  const t = use말();
  const 깨진 = new Set(c.devices.map((d) => d.platform));
  // 미확정 항목은 확정 판정과 상관없이 미확정 묶음에 모은다 — 여기서 또 그리면 같은 항목이 두 번 나온다.
  // 디바이스를 거른 동안에는 그 디바이스만 낸다. 깨진 디바이스는 서버가 카드에 안 실었어도 접힌 줄에 넣지 않는다 —
  // 실패가 「통과 · 미실행」 줄처럼 접혀 보이면 안 된다
  const 나머지 = 디바이스순서.flatMap((칸디바이스) => {
    if (깨진.has(칸디바이스) || (platform !== 'ALL' && platform !== 칸디바이스)) return [];
    const 칸 = items
      .filter((i) => i.tcId === c.tcId && i.platform === 칸디바이스 && typeof i.unconfirmed !== 'string')
      .sort((a, b) => a.attempt - b.attempt);
    return 칸.length === 0 || 칸.some((i) => i.status === 'FAIL') ? [] : [칸];
  });
  const 상세 = c.devices[0]?.item.historyId;

  return (
    <article className="fc-card">
      <div className="fc-head">
        <Verdict status="FAIL" />
        <span className="mono fc-tc">{c.tcId}</span>
        {상세 === undefined ? null : (
          <a className="fc-detail" href={`#/runs/${String(runId)}/items/${String(상세)}`}>
            {t('상세 보기')}
          </a>
        )}
      </div>
      <h3 className="fc-name-h">{c.tcName}</h3>

      {같은실패끼리(c.devices).map((묶음) => (
        <RunFailDevice key={묶음.map((d) => d.platform).join('-')} devices={묶음} env={env} />
      ))}

      {나머지.map((칸) => (
        <통과줄 key={칸[0]!.platform} 칸={칸} runId={runId} />
      ))}
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
