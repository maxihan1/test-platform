// 화면 문구 · Grafana 대시보드 글자가 docs/WORDS.md §1 「쓰지 않는 말」을 쓰지 않는지 본다
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { 낱말표, 정본 } from '../wordTable.fixture.js';
import { 표들 } from './messages.js';
import { Scout말 } from './messages/scout.js';

// API 가 주는 값이라 바꾸지 않는다(CLAUDE.md §3). 화면에는 「회귀 실패」 · 「기존 실패」로 옮겨 나간다(RunFailDevice.tsx)
// 「러너」는 runState.ts 가 서버 글 속 그 낱말을 찾아 「테스트 실행기」로 바꾸는 데만 쓴다 — 화면에 그대로 나가지 않는다
// 「실패 {건수}」는 기록(trace) 탭의 요청 · 조작 실패 수다 — 케이스 판정값이 아니라 Fail 로 안 바꾼다(ItemTrace.tsx · WORDS 「테스트 판정이 아닌 일의 성패」)
// 「선행 케이스 {케이스} 실패」는 Blocked 의 사유 문장이다 — 판정 이름표가 아니고 WORDS 「판정과 테스트 프로시저 화면에서 쓰는 말」이 그 글자로 정했다
const 예외 = new Set(['새로깨짐', '계속깨짐', '고쳐짐', '러너', '실패 {건수}', '선행 케이스 {케이스} 실패']);

/**
 * Grafana 대시보드의 화면 글자 — 제목 · 설명 · 칸 이름. SQL 은 큰따옴표 칸 이름과 작은따옴표 값만 화면에 찍힌다.
 * DB 와 견주는 값은 영문 코드('DONE')라 걸리지 않는다 (2026-11-08 사용자 — Grafana 도 같은 낱말)
 */
function 대시보드글(json: string): string[] {
  const 글: string[] = [];
  const 걷기 = (v: unknown, 키: string): void => {
    if (typeof v === 'string') {
      if (!/[가-힣]/u.test(v)) return;
      if (키 !== 'rawSql') {
        글.push(v);
        return;
      }
      for (const m of v.replace(/--[^\n]*/gu, '').matchAll(/"([^"]*)"|'([^']*)'/gu)) {
        const 값 = m[1] ?? m[2] ?? '';
        if (/[가-힣]/u.test(값)) 글.push(값);
      }
    } else if (Array.isArray(v)) v.forEach((x) => 걷기(x, 키));
    else if (v !== null && typeof v === 'object') for (const [k, x] of Object.entries(v)) 걷기(x, k);
  };
  걷기(JSON.parse(json), '');
  return 글;
}

const 대시보드폴더 = join(dirname(fileURLToPath(import.meta.url)), '../../../../infra/grafana/provisioning/dashboards');
const 대시보드문구 = readdirSync(대시보드폴더)
  .filter((n) => n.endsWith('.json'))
  .flatMap((n) => 대시보드글(readFileSync(join(대시보드폴더, n), 'utf8')));

const 줄들 = 낱말표(readFileSync(정본, 'utf8'));
// 자리표시 이름(`{덮음}`)은 화면에 안 나온다
const 문구들 = [...new Set([...표들.flatMap((표) => Object.keys(표)), ...대시보드문구])].filter((k) => !예외.has(k));
const 보이는글 = (k: string) => k.replace(/\{[^}]*\}/gu, '');

describe('화면 낱말 (docs/WORDS.md §1)', () => {
  it('정본 표를 읽는다', () => {
    expect(줄들.length).toBeGreaterThanOrEqual(10);
  });

  it.each(줄들.map((z) => [z.무늬.source, z] as const))('%s 를 화면에 쓰지 않는다', (_무늬, z) => {
    // Scout 가 말을 거는 글은 해요체다 — 말끝 줄만 Scout 문구를 건너뛴다 (WORDS.md §1 「안내 · 오류 문장의 말끝」)
    const 어긴것 = 문구들.filter((k) => z.무늬.test(보이는글(k)) && !(z.쓰는말 === '~합니다' && k in Scout말));
    expect(어긴것, `「${z.쓰는말}」으로 바꾼다 — docs/WORDS.md §1`).toEqual([]);
  });
});
