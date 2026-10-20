// 판정을 막대로 그리는 조각 — 최근 판정 흐름 (SPEC §8). 숫자 띠(칸띠)는 2026-10-20 ⑬-5 에 마지막 쓰던 곳(E2E 집계 띠)이 빠져 지웠다
// 색은 거들기만 한다 — 판정은 늘 글자로도 적고, 막대는 판정마다 높이가 다르다 (DESIGN.md 접근성)

import type { ItemStatus } from './api.js';
import { use말 } from './i18n.js';
import { STATUS_LABEL } from './ui.js';

/** 판정 하나가 네모 하나. 색과 **높이**가 같이 바뀐다 — 색을 못 봐도 모양으로 읽힌다 */
const 판정글자: Record<ItemStatus, string> = { PASS: 'p', FAIL: 'f', NA: 'n' };

/** 흐름 막대가 지키는 칸 수. 서버의 `최근몇건` 과 같은 값이다 (execution/history.ts) */
export const 흐름칸수 = 5;

/**
 * 최근 판정 흐름 (SPEC §8.1).
 *
 * **디바이스마다 하나다.** 데이터가 `(케이스, 디바이스)` 단위로 오고 줄도 디바이스마다 배지를 그린다 —
 * 줄에 하나만 그리면 PC 와 모바일의 흐름이 한 줄로 뭉개진다.
 *
 * 다섯에 못 미치면 **남는 자리를 빈 칸으로 채운다.** 안 채우면 두 번 돌린 케이스와
 * 다섯 번 돌린 케이스의 막대 길이가 달라져 세로로 훑을 수가 없다 (DESIGN.md 원칙 3).
 */
export function 판정흐름({ recent, 앞말 }: { recent: ItemStatus[]; 앞말?: string }) {
  const t = use말();
  // 한 번도 안 돌렸으면 그릴 것이 없다. 빈 칸 다섯만 그리면 「돌렸는데 결과가 없다」로 읽힌다
  if (recent.length === 0) return null;

  const 칸들 = recent.slice(0, 흐름칸수);
  const 빈칸 = 흐름칸수 - 칸들.length;
  const 셈 = new Map<ItemStatus, number>();
  for (const 것 of 칸들) 셈.set(것, (셈.get(것) ?? 0) + 1);

  return (
    <>
      {/* 실패 카드의 막대는 대상 서버 · 이 실행까지다. 케이스 목록 막대와 뜻이 달라 앞에 말을 붙인다 (실행 §8.3) */}
      {앞말 === undefined ? null : <span className="flow-lead" aria-hidden="true">{앞말}</span>}
      {/* 앞말이 있는 막대(실패 카드)는 그림 하나로 읽힌다 — 이름이 어느 서버 · 몇 회 · 어느 쪽이 이번인지 말한다.
          케이스 목록 막대는 옆의 개수 글자가 읽어 주므로 그대로 숨긴다 */}
      <span
        className="spark"
        {...(앞말 === undefined
          ? { 'aria-hidden': true }
          : {
              role: 'img',
              'aria-label': t('{앞말} 최근 {회}회, 맨 앞이 이번 실행: {판정}', {
                앞말,
                회: 칸들.length,
                판정: 칸들.map((것) => t(STATUS_LABEL[것])).join(', '),
              }),
            })}
      >
        {칸들.map((것, i) => (
          <i key={`${것}-${String(i)}`} className={판정글자[것]} />
        ))}
        {Array.from({ length: 빈칸 }, (_, i) => (
          <i key={`e-${String(i)}`} className="e" />
        ))}
      </span>
      {/* 막대만 두면 색을 못 보는 사람에게는 회색 네모다. 개수를 글자로 같이 적는다.
          판정마다 한 줄 — 한 줄로 이으면 60px 디바이스 칸을 넘어 옆 디바이스 글자와 겹쳤다 (2026-10-05) */}
      <span className="sparktext">
        {[...셈.entries()].map(([것, 수]) => (
          <b key={것} className={판정글자[것]}>
            {t(STATUS_LABEL[것])} {수}
          </b>
        ))}
      </span>
    </>
  );
}
