// 색인 분량 검사의 판별식. 이 단언이 없으면 판별식이 되돌아가도 `check:spec` 은 초록이다 —
// 「경로가 적힌 행만 센다」로 좁아져 39줄 틀린 채 통과하던 것이 정확히 그 병이었다 (LEARNINGS 4회차).
// 검사기가 ROOT 를 `process.cwd()` 로 잡으므로 임시 방에 최소 SPEC 을 지어 cwd 로 준다.
// 진짜 docs/ 를 복사하지 않는 이유 — 다른 세션이 장을 늘리는 중이면 이 검사가 남의 사정으로 빨개진다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const 검사기 = fileURLToPath(new URL('./check-spec-refs.mjs', import.meta.url));

// 검사기의 0건 방어 때문에 최소 SPEC 에도 [계약 변경 필요] 블록이 하나 있어야 한다.
// 분량 검사가 같이 걸리지 않게 줄 수는 10 그대로 둔다
const 가 = ['[계약 변경 필요]', '상태: 대기', ...Array(8).fill('가'), ''].join('\n'); // spec/공통/가.md — 10줄
const 나 = '나\n'.repeat(5); // spec/도메인/나.md — 5줄
const 색인 = [
  '# 색인',
  '',
  '## 1. 갈래별로 읽을 장',
  '',
  '| 갈래 | 읽을 장 | 분량 |',
  '|------|--------|------|',
  '| **WS-X** 한장 | `spec/공통/가` | 10줄 |',
  '| **WS-0** 골격 | 2장 전부 | 15줄 |',
  '',
].join('\n');

function 검사(고치기, 가고치기) {
  const 방 = mkdtempSync(join(tmpdir(), 'spec-refs-'));
  try {
    mkdirSync(join(방, 'docs/spec/공통'), { recursive: true });
    mkdirSync(join(방, 'docs/spec/도메인'), { recursive: true });
    writeFileSync(join(방, 'docs/spec/공통/가.md'), 가고치기 ? 가고치기(가) : 가);
    writeFileSync(join(방, 'docs/spec/도메인/나.md'), 나);
    writeFileSync(join(방, 'docs/SPEC.md'), 고치기 ? 고치기(색인) : 색인);
    const r = spawnSync(process.execPath, [검사기], { cwd: 방, encoding: 'utf8' });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  } finally {
    rmSync(방, { recursive: true, force: true });
  }
}

test('분량이 맞는 색인은 통과한다', () => {
  const { code, out } = 검사(null);
  assert.equal(code, 0, out);
});

test('경로가 적힌 분량 행이 어긋나면 종료코드 1', () => {
  const { code, out } = 검사((s) => s.replace('`spec/공통/가` | 10줄', '`spec/공통/가` | 99줄'));
  assert.equal(code, 1);
  assert.match(out, /적힌 99줄 · 실제 10줄/);
});

test('경로가 안 적힌 분량 행(「N장 전부」)이 어긋나도 종료코드 1', () => {
  // 이 행이 빠져나가던 것이 4회차 병이다. 판별식이 `spec/` 있는 행만 보면 여기서 걸린다
  const { code, out } = 검사((s) => s.replace('2장 전부 | 15줄', '2장 전부 | 99줄'));
  assert.equal(code, 1, '경로 없는 행이 검사를 빠져나갔다 — 판별식이 `spec/` 있는 행만 본다');
  assert.match(out, /적힌 99줄 · 실제 15줄/);
});

test('장 수가 바뀌어도(「13장 전부」) 그 행은 여전히 검사된다', () => {
  // 판별식이 「12장 전부」라는 글자였을 때, 장이 늘어 이 한 글자를 고치는 순간
  // 행이 통째로 검사를 빠져나갔다 — 2026-09-22 에 9999줄이 그대로 통과했다(EXIT=0)
  const { code, out } = 검사((s) => s.replace('2장 전부 | 15줄', '13장 전부 | 9999줄'));
  assert.equal(code, 1, `장 이름을 바꾸니 행이 검사를 빠져나갔다\n${out}`);
  assert.match(out, /적힌 9999줄 · 실제 15줄/);
  assert.match(out, /적힌 13장 · 실제 2장/);
});

test('표 서식이 달라져 행을 못 알아보면 초록으로 넘기지 않고 터진다', () => {
  // 판정이 여전히 「모양」 키다. 굵게를 떼거나 「N장 전부」에 괄호를 붙이면 그 행이 조용히 빠져나가,
  // 9999줄이 적혀 있어도 「틀린 분량 0건」이 뜬다 — 2026-09-22 에 둘 다 재현했다.
  // 같은 병이 2026-09-19 · 2026-09-22 에 이어 세 번째라 「0건이면 터뜨린다」로 막는다
  const 굵게뗌 = 검사((s) => s.replace('| **WS-0** 골격 | 2장 전부 | 15줄 |', '| WS-0 골격 | 2장 전부 | 9999줄 |'));
  assert.equal(굵게뗌.code, 1, `굵게를 떼니 분량 행이 통째로 빠져나갔다\n${굵게뗌.out}`);
  assert.match(굵게뗌.out, /「N장 전부」 행이 0건이다/);

  const 괄호붙임 = 검사((s) => s.replace('2장 전부 | 15줄', '2장 전부 (공통·도메인) | 9999줄'));
  assert.equal(괄호붙임.code, 1, `괄호 하나로 그 행이 빠져나갔다\n${괄호붙임.out}`);
  assert.match(괄호붙임.out, /「N장 전부」 행이 0건이다/);
});

test('경로도 「N장 전부」도 없는 분량 행은 전장합과 대조하지 않는다', () => {
  // 판별식이 넓으면 관계없는 행을 전장합(15줄)과 대조해 터지고, 문구가 원인을 안 가리킨다
  const { code, out } = 검사((s) => `${s}| **DESIGN.md** | 화면 기준 | 240줄 |\n`);
  assert.equal(code, 0, `분량 행 판별식이 너무 넓다\n${out}`);
});

test('[계약 변경 필요] 블록에 상태 줄이 없으면 종료코드 1', () => {
  const { code, out } = 검사(null, (s) => s.replace('상태: 대기', '이유: 아무거나'));
  assert.equal(code, 1, `상태 줄을 지워도 초록이다\n${out}`);
  assert.match(out, /상태 줄이 없는 곳 1건/);
});

test('상태 줄 값이 세 모양 밖이면 종료코드 1', () => {
  // 「반영 완료」만 적고 날짜와 어디에 반영했는지를 빼면 다음 세션이 확인할 상대가 없다
  const { code, out } = 검사(null, (s) => s.replace('상태: 대기', '상태: 반영 완료'));
  assert.equal(code, 1, `모양이 틀린 상태 줄이 통과한다\n${out}`);
  assert.match(out, /상태 줄이 없는 곳 1건/);
});

test('[계약 변경 필요] 블록이 하나도 없으면 종료코드 1', () => {
  // 블록이 사라지면 이 검사는 아무것도 안 지키면서 초록만 낸다
  const { code, out } = 검사(null, (s) => s.replace('[계약 변경 필요]', '가'));
  assert.equal(code, 1, `블록 0건인데 초록이다\n${out}`);
  assert.match(out, /블록이 하나도 없다/);
});
