// 증적 형식 이름 목록이 네 곳에서 갈라지지 않는지 본다. `npm run check:workflow` 가 돌린다.
//
// 왜 네 벌인가 — 정본은 `reporting/store.ts` 의 `EvidenceFormat` 이다.
// `generate.ts` 의 `형식표` 는 `Record<EvidenceFormat, …>` 라 tsc 가 양방향으로 이미 묶는다.
// `routes.ts` 의 `z.enum` 은 결과가 `claim()` 에 넘어가므로 **더 있는 것만** tsc 가 잡는다 —
// 빠진 것은 부분집합이라 조용히 통과한다. `web/evidence.ts` 의 `형식들` 은 번들이 달라
// 서버 타입을 가져올 수 없고 `api.makeEvidence(…, format: string)` 이라
// **타입으로 묶이는 자리가 하나도 없다.** 그래서 기계가 따로 본다.
//
// 왜 필요한가 — 2026-09-20 PR #32 의 치명 1 이 정확히 이 모양이었다.
// 서버는 셋을 다 받는데 화면만 `'PDF'` 를 박아 놔서, 완료 기준 상자 넷이 누를 버튼이 없어 못 열렸다.
// 형식이 하나 늘 때 화면 쪽을 안 고치면 같은 것이 그대로 재발한다 (CLAUDE.md §2.5).
//
// 왜 파싱하지 않는가 — `check-secret-names.mjs` 와 같은 이유다. 네 곳 다 리터럴 한 덩어리이고,
// TypeScript 파서를 끌어와도 잡는 것은 같다.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ROOT = new URL('../../', import.meta.url);

// 순서는 네 곳이 서로 다르다 (`형식표` 는 알파벳순). 집합으로 본다
const 정리 = (말들) =>
  [...new Set(말들.map((w) => w.trim().replace(/^['"]|['"]$/g, '')).filter((w) => w !== ''))].sort();

function 뽑기(rel, 무늬, 쪼개기) {
  const m = 무늬.exec(readFileSync(new URL(rel, ROOT), 'utf8'));
  return { file: rel, 이름들: m === null ? null : 정리(쪼개기(m[1])) };
}

/** 정본이 맨 앞이다. 어긋났을 때 무엇에 맞춰야 하는지가 순서로 보인다 */
function 사본들() {
  return [
    뽑기('apps/admin/src/reporting/store.ts', /export type EvidenceFormat\s*=\s*([^;]+);/, (s) => s.split('|')),
    // `증적본문` 에 앵커를 건다. 위에 다른 `z.enum` 이 생기면 엉뚱한 것을 읽고 조용히 통과한다
    뽑기('apps/admin/src/reporting/routes.ts', /증적본문\s*=\s*z\.object\([\s\S]*?z\.enum\(\[([^\]]*)\]\)/, (s) =>
      s.split(','),
    ),
    뽑기('apps/admin/src/reporting/generate.ts', /형식표[\s\S]*?=\s*\{([\s\S]*?)\n\};/, (s) =>
      [...s.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]),
    ),
    뽑기('apps/admin/src/web/evidence.ts', /const 형식들\s*=\s*\[([\s\S]*?)\n\];/, (s) =>
      [...s.matchAll(/format:\s*'([^']+)'/g)].map((m) => m[1]),
    ),
  ];
}

test('증적 형식 이름이 네 곳에서 같다', () => {
  const [정본, ...나머지] = 사본들();

  assert.notEqual(정본.이름들, null, `${정본.file} 에서 EvidenceFormat 을 못 찾았다`);
  // 비-공허 대조군 — 넷 다 빈 목록으로 뽑히면 이 검사는 구현이 어떻게 망가져도 참이다 (spec-review G8)
  assert.ok(정본.이름들.length >= 2, `정본이 ${String(정본.이름들.length)}개뿐이다 — 뽑기가 깨졌다`);

  for (const 사본 of 나머지) {
    assert.deepEqual(
      사본.이름들,
      정본.이름들,
      `${사본.file} 이 정본(${정본.file})과 다르다 — 형식이 늘거나 줄면 네 곳을 같이 고친다`,
    );
  }
});
