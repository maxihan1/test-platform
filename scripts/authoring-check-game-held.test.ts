// 게임 규칙 보류 확인 검사 — 이번 케이스 세션의 판 기록을 댄 보류만 통과 · 환경 보류는 그대로 · 학습 때 기록 · 지켜보기 기록은 안 받음 (tpx-author game.md §6)
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { 안해본보류 } from './authoring-check-game-held.js';

let 자리들: string[] = [];
afterEach(() => {
  for (const d of 자리들) rmSync(d, { recursive: true, force: true });
  자리들 = [];
});

const 표 = (...출처들: string[]): string =>
  ['## 요구사항', '', '| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |', '|---|---|---|---|---|---|---|---|', ...출처들.map((x, i) => `| ${i + 1} | 정상 | 전 | 조 | 결 | ${x} | \`CGP-FN-${i + 1}\` | 2026-11-26 |`)].join('\n');

function 자료(학습끝?: Date): string {
  const d = mkdtempSync(join(tmpdir(), 'held-'));
  자리들.push(d);
  mkdirSync(join(d, 'game-play'));
  if (학습끝 !== undefined) {
    writeFileSync(join(d, 'game-learn.json'), '{"끝":true}');
    utimesSync(join(d, 'game-learn.json'), 학습끝, 학습끝);
  }
  return d;
}
const 기록 = (d: string, 이름: string, 때: Date): void => {
  writeFileSync(join(d, 'game-play', 이름), '{}');
  utimesSync(join(d, 'game-play', 이름), 때, 때);
};

describe('게임 규칙 보류에 해 본 기록', () => {
  const 학습끝 = new Date('2026-11-26T03:00:00Z');
  const 뒤 = new Date('2026-11-26T04:00:00Z');
  const 앞 = new Date('2026-11-26T02:00:00Z');

  it('해 본 기록 없이 적은 게임 규칙 보류는 걸리고, 보류 아닌 줄 · 환경 보류는 안 걸린다', () => {
    const d = 자료(학습끝);
    const 줄 = 안해본보류(표('CGP-REQ-1', 'CGP-REQ-13 · 보류 — 기절 상태를 읽는 주소를 모른다', 'CGP-REQ-5 · 보류 — 창을 못 엶(강화 창)', 'CGP-REQ-6 · 보류 — 게임 글과 잰 값이 다름'), d);
    expect(줄).toHaveLength(1);
    expect(줄[0]).toMatch(/^요구 2\(CGP-FN-2\) — 「기절 상태를 읽는 주소를 모른다」 보류에 이번 케이스 세션의 판 기록이 없다/);
  });

  it('학습을 마친 뒤 남은 판 기록을 대면 통과 — 학습 때 기록 · 지켜보기 기록 · 없는 기록 · 「해 본 것」 없이 이름만은 안 받는다', () => {
    const d = 자료(학습끝);
    기록(d, '20261126040000000-기절시키기.json', 뒤);
    기록(d, '20261126020000000-배울때.json', 앞);
    기록(d, '20261126040100000-지켜보기.json', 뒤);
    const 줄 = 안해본보류(
      표(
        'CGP-REQ-13 · 보류 — 기절이 안 보임(해 본 것: 20261126040000000-기절시키기.json 3번)',
        'CGP-REQ-14 · 보류 — 기절이 안 보임(해 본 것: 20261126020000000-배울때.json)',
        'CGP-REQ-15 · 보류 — 기절이 안 보임(해 본 것: 20261126040100000-지켜보기.json)',
        'CGP-REQ-16 · 보류 — 기절이 안 보임(해 본 것: 20261126050000000-없음.json)',
        'CGP-REQ-17 · 보류 — 기절이 안 보임 20261126040000000-기절시키기.json',
      ),
      d,
    );
    expect(줄.map((x) => x.split(' — ')[0])).toEqual(['요구 2(CGP-FN-2)', '요구 3(CGP-FN-3)', '요구 4(CGP-FN-4)', '요구 5(CGP-FN-5)']);
  });

  it('바뀐 tcId 만 보고, 학습이 없었으면 기록은 다 이번 것이다. 디바이스를 못 잡음은 이번 기록이 0 일 때만 환경이다', () => {
    const d = 자료();
    const 보류표 = 표('CGP-REQ-1 · 보류 — 작전이 없다', 'CGP-REQ-2 · 보류 — 디바이스를 못 잡음');
    expect(안해본보류(보류표, d, new Set(['CGP-FN-2']))).toEqual([]);
    expect(안해본보류(보류표, d).map((x) => x.split(' — ')[0])).toEqual(['요구 1(CGP-FN-1)']);
    기록(d, '20261126010000000-판.json', 앞);
    expect(안해본보류(보류표, d)).toHaveLength(2);
    expect(안해본보류(표('CGP-REQ-1 · 보류 — 작전이 없다(해 본 것: 20261126010000000-판.json 1번)'), d)).toEqual([]);
  });
});
