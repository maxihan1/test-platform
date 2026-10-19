// 항목 상세 위쪽 줄 — 몇 번째 회차인지 · 이전/다음 실패로 이동 · 증적 · 관련 요구 · 판정 (도메인/리포팅 §8.4 · 점검 3.2 · 3.4)
// 항목 하나만 보면 같은 실행의 다른 실패로 가는 길도, 판정을 남길 자리도 없었다

import { useEffect, useState } from 'react';

import { api, type FailureCase, type RunItemDetail, type RunItemSummary } from './api.js';
import { use증적, 증적만들기버튼들, 증적알림과목록 } from './EvidenceSection.js';
import { 카드찾기 } from './failureFind.js';
import { use말 } from './i18n.js';
import { 관련요구줄 } from './RunFailedReqs.js';
import { RunFailJudge } from './RunFailJudge.js';
import { 실행판정, type 판정하기 } from './runJudge.js';
import { useAsync } from './ui.js';

/** 같은 케이스 · 디바이스를 몇 번 돌렸는지. 반복 실행이 아니면 1 이라 회차를 적지 않는다 */
export function 회차글(item: RunItemDetail, 항목들: RunItemSummary[]): { 번째: number; 전체: number } {
  const 같은것 = 항목들.filter((it) => it.tcId === item.tcId && it.platform === item.platform);
  return { 번째: item.attempt, 전체: Math.max(같은것.length, 1) };
}

/** 케이스 · 디바이스마다 처음 실패한 항목 하나씩, 돌린 차례로 — 이전/다음 실패의 길이 된다 */
export function 실패길(항목들: RunItemSummary[]): RunItemSummary[] {
  const 봤다 = new Set<string>();
  return 항목들
    .filter((it) => it.status === 'FAIL')
    .sort((a, b) => a.historyId - b.historyId)
    .filter((it) => {
      const 키 = `${it.tcId}\u0000${it.platform}`;
      if (봤다.has(키)) return false;
      봤다.add(키);
      return true;
    });
}

function use실패카드(runId: number, tcId: string, 찾을까: boolean) {
  const [카드, set카드] = useState<FailureCase | null>(null);
  const [다시, set다시] = useState(0);
  useEffect(() => {
    if (!찾을까) return;
    let 살아있다 = true;
    카드찾기(runId, tcId).then(
      (찾음) => {
        if (살아있다) set카드(찾음?.카드 ?? null);
      },
      (err: unknown) => {
        // 판정은 덤이다 — 못 찾아도 항목 상세는 선다. 원인은 콘솔에 남긴다
        console.error('[item] loading the failure card failed; the verdict row is hidden', err);
      },
    );
    return () => {
      살아있다 = false;
    };
  }, [runId, tcId, 찾을까, 다시]);
  return { 카드, 다시읽기: () => set다시((값) => 값 + 1) };
}

export function 항목실행줄({ item, 판정하기 }: { item: RunItemDetail; 판정하기: 판정하기 }) {
  const t = use말();
  const 실행 = useAsync(() => api.run(item.runId), [item.runId]);
  const 데이터 = 실행.data;
  const 권한 = 실행판정(판정하기, 데이터);
  const 증적칸 = use증적(데이터, 권한, 실행.reload);
  // 도는 실행은 카드 통로가 409 다 — 끝난 실행의 실패 항목만 찾는다
  const { 카드, 다시읽기 } = use실패카드(item.runId, item.tcId, item.status === 'FAIL' && 데이터 !== null && 데이터.status !== 'RUNNING');

  if (데이터 === null) return null;

  const 회차 = 회차글(item, 데이터.items);
  const 길 = 실패길(데이터.items);
  const 지금 = 길.findIndex((it) => it.tcId === item.tcId && it.platform === item.platform);
  const 앞 = 지금 === -1 ? [...길].reverse().find((it) => it.historyId < item.historyId) : 길[지금 - 1];
  const 뒤 = 지금 === -1 ? 길.find((it) => it.historyId > item.historyId) : 길[지금 + 1];
  const 주소 = (it: RunItemSummary) => `#/runs/${String(item.runId)}/items/${String(it.historyId)}`;

  return (
    <div className="sec item-run">
      <div className="item-run-line">
        {회차.전체 > 1 ? <span className="case-tag">{t('{번째}/{전체}회차', { 번째: 회차.번째, 전체: 회차.전체 })}</span> : null}
        {길.length === 0 ? null : (
          <nav className="item-run-nav" aria-label={t('실패 항목 이동')}>
            {앞 === undefined ? null : <a href={주소(앞)}>{t('← 이전 실패')}</a>}
            {지금 === -1 ? null : <span>{t('실패 {전체}건 중 {번째}번째', { 전체: 길.length, 번째: 지금 + 1 })}</span>}
            {뒤 === undefined ? null : <a href={주소(뒤)}>{t('다음 실패 →')}</a>}
          </nav>
        )}
        <증적만들기버튼들 칸={증적칸} />
      </div>
      <증적알림과목록 칸={증적칸} 한줄로 />
      {카드 === null ? null : (
        <>
          <관련요구줄 reqs={카드.reqs} 권한={권한} />
          <RunFailJudge c={카드} runId={item.runId} 권한={권한} on남김={다시읽기} />
        </>
      )}
    </div>
  );
}
