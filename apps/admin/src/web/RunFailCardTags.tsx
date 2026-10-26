// 실패 카드 머리의 꼬리표 — 판정을 남겼나 · 다시 돌린 결과 · 디바이스마다의 판정 (도메인/실행 §8.3 · 점검 2.17 · 2.24)

import type { FailureJudgment, RunItemSummary } from './api.js';
import { 회차요약 } from './group.js';
import { use말 } from './i18n.js';
import { 실행기록주소 } from './route.js';
import { PLATFORM_LABEL, Verdict, 돈디바이스들 } from './ui.js';
import type { 다시돌린결과 } from './useRerunResults.js';

/**
 * 디바이스가 둘 이상인 실행에서 디바이스마다 이 케이스의 판정 (실행 §8.3 표 2번 줄).
 * 디바이스 칩으로 걸러도 모든 디바이스를 적는다 — 「PC 에서만 깨졌나」를 펼치지 않고 보려는 칸이다
 */
export function 디바이스꼬리표({ tcId, items }: { tcId: string; items: RunItemSummary[] }) {
  const t = use말();
  // 실제로 돈 디바이스로 센다 — 칩 칸(실행디바이스들)은 PC 만 돌아도 모바일 칸을 두어 꼬리표가 하나짜리에도 붙었다
  const 돈 = 돈디바이스들(items);
  if (돈.length < 2) return null;
  // 회차는 펼친 카드의 통과 · 미실행 줄과 같은 규칙으로 접는다 — 한 번이라도 실패면 실패, 모두 통과면 통과, 그 밖은 미실행
  const 칸들 = 돈.flatMap((p) => {
    const 칸 = items.filter((i) => i.tcId === tcId && i.platform === p);
    return 칸.length === 0 ? [] : [{ p, 판정: 회차요약(칸).status }];
  });
  return (
    <span className="fc-devs">
      {칸들.map(({ p, 판정 }) => (
        <span key={p} className="fc-dev">
          {t(PLATFORM_LABEL[p])} <Verdict status={판정} />
        </span>
      ))}
    </span>
  );
}

/** 판정한 카드와 아직 안 본 카드를 가른다. 안 본 카드에는 꼬리표를 달지 않는다 — 대부분이 안 본 카드다 */
export function 판정꼬리표({ judgment }: { judgment: FailureJudgment }) {
  const t = use말();
  if (judgment === null) return null;
  return <span className="fc-tag">{judgment.kind === 'BUG' ? t('판정함 · 버그') : t('판정함 · 화면이 맞음')}</span>;
}

/** 이 케이스를 「실패 다시 실행」으로 다시 돌린 결과. 누르면 그 실행에서 이 케이스 카드가 펼쳐진 채 열린다 */
export function 다시돌림꼬리표({ tcId, 결과 }: { tcId: string; 결과: 다시돌린결과 | undefined }) {
  const t = use말();
  if (결과 === undefined) return null;
  const 글 =
    결과.status === 'PASS'
      ? t('RUN {번호}에서 통과', { 번호: 결과.runId })
      : 결과.status === 'FAIL'
        ? t('RUN {번호}에서도 실패', { 번호: 결과.runId })
        : t('RUN {번호}에서 미실행', { 번호: 결과.runId });
  return (
    <a className="fc-tag" href={실행기록주소(tcId, 결과.runId, true)}>
      {글}
    </a>
  );
}
