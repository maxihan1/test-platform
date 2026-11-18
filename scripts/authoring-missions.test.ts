// 게임 시나리오 미션 — 미션 절 읽기 · 빠진 규칙 셈 · 승인된 미션 읽기 · 올리기 · 프롬프트 절
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { 원장 } from './authoring-ledger.js';
import { 미션올리기, 미션절, 미션절읽기, 미션준비, 빠진규칙, 승인미션읽기 } from './authoring-missions.js';
import { 줄프롬프트 } from './authoring-prompt.js';

const 표 = `# ARG 케이스

## 요구사항

| # | 축 | 단계 | 확인 | 내용 | 출처 | tcId | 날짜 |
|---|----|------|------|------|------|------|------|
| 1 | 정상 | a | b | c | ARG-REQ-001 | ARG-FN-001 | 2026-11-18 |

## 제외

| 요구 | 종류 | 사유 |
|------|------|------|

## 게임 시나리오 미션

### M01 레벨 1 탱커가 임프 3마리를 잡는다
\`\`\`
미션: 레벨 1 탱커가 임프 3마리를 잡는다
시작 조건: 탱커 · 레벨 1 · 혼자
할 일: 전투 망치로 임프 3마리 처치
성공 조건: 처치 줄 3줄
확인할 로그
 - 받은 피해 줄: 전부 6 (최소 1줄) — ARG-REQ-041
 - 처치 줄 경험치: 전부 12 (최소 3줄) — ARG-REQ-052
\`\`\`

### M02 머리 제목만 있는 미션
\`\`\`
시작 조건: 법사 · 레벨 5
할 일: 임프 1마리 처치
성공 조건: 처치 줄 1줄
확인할 로그
 - 골드 줄: 전부 5 — 공식 — 값 — ARG-REQ-060
\`\`\`

### 공식 빈칸
\`\`\`
 - ARG-REQ-070 — 공식에 보정 값이 비어 있다 — 기획서 확인 필요
\`\`\`
`;

const 원장값 = (): 원장 =>
  ({ 항목: ['ARG-REQ-001', 'ARG-REQ-041', 'ARG-REQ-052', 'ARG-REQ-080'].map((번호) => ({ 번호, 자료: 'x', 문장: `${번호} 문장` })), 가족: {}, 빠진자료: [], 모드: '번호', 경고: [] }) as unknown as 원장;

describe('미션절읽기', () => {
  it('절이 없으면 null', () => {
    expect(미션절읽기('## 요구사항\n\n| a |\n')).toBeNull();
  });

  it('미션 양식 · 공식 빈칸 줄을 읽는다 — title 은 미션 줄이 먼저고 없으면 머리 제목', () => {
    const r = 미션절읽기(표);
    expect(r?.못읽음).toEqual([]);
    expect(r?.items.map((m) => m.id)).toEqual(['M01', 'M02']);
    expect(r?.items[0]).toEqual({
      id: 'M01',
      title: '레벨 1 탱커가 임프 3마리를 잡는다',
      start: '탱커 · 레벨 1 · 혼자',
      todo: '전투 망치로 임프 3마리 처치',
      success: '처치 줄 3줄',
      logs: [
        { text: '받은 피해 줄: 전부 6 (최소 1줄)', reqId: 'ARG-REQ-041' },
        { text: '처치 줄 경험치: 전부 12 (최소 3줄)', reqId: 'ARG-REQ-052' },
      ],
    });
    expect(r?.items[1]?.title).toBe('머리 제목만 있는 미션');
    expect(r?.items[1]?.logs).toEqual([{ text: '골드 줄: 전부 5 — 공식 — 값', reqId: 'ARG-REQ-060' }]);
    expect(r?.gaps).toEqual([{ reqId: 'ARG-REQ-070', note: '공식에 보정 값이 비어 있다 — 기획서 확인 필요' }]);
  });

  it('다음 ## 절에서 멈춘다', () => {
    const r = 미션절읽기(`${표}\n## 다른 절\n\n### M03 안 읽는다\n\`\`\`\n미션: x\n\`\`\`\n`);
    expect(r?.items.map((m) => m.id)).toEqual(['M01', 'M02']);
  });

  it('코드 덩이 안의 # 줄에서는 멈추지 않는다 — 뒤 미션이 말없이 빠지지 않게', () => {
    const 앞 = '## 게임 시나리오 미션\n\n### M01 메모가 든 미션\n```\n# 참고 임프는 셋이다\n미션: 임프를 잡는다\n시작 조건: 혼자\n할 일: 임프 처치\n성공 조건: 처치 줄 1줄\n확인할 로그\n - 받은 피해 줄: 전부 6 — ARG-REQ-041\n```\n\n';
    const 뒤 = '### M02 뒤 미션\n```\n미션: 궁수가 잡는다\n시작 조건: 혼자\n할 일: 임프 처치\n성공 조건: 처치 줄 1줄\n확인할 로그\n - 준 피해 줄: 10 ~ 14 — ARG-REQ-043\n```\n';
    expect(미션절읽기(앞 + 뒤)?.items.map((m) => m.id)).toEqual(['M01', 'M02']);
  });

  it('틀린 미션은 빼고 까닭을 남긴다 — 번호 겹침 · 칸이 빔 · 로그 줄 꼴 · 로그 없음', () => {
    const 미션 = (제목: string, 줄들: string[]) => `### ${제목}\n\`\`\`\n${줄들.join('\n')}\n\`\`\`\n`;
    const 칸들 = ['시작 조건: a', '할 일: b', '성공 조건: c'];
    const r = 미션절읽기(
      [
        '## 게임 시나리오 미션',
        미션('M01 좋은 미션', [...칸들, '확인할 로그', ' - 글 — ARG-REQ-001']),
        미션('M01 겹침', [...칸들, '확인할 로그', ' - 글 — ARG-REQ-002']),
        미션('M02 성공 조건이 빔', ['시작 조건: a', '할 일: b', '확인할 로그', ' - 글 — ARG-REQ-003']),
        미션('M03 줄 꼴이 틀림', [...칸들, '확인할 로그', ' - 번호가 없는 줄']),
        미션('M04 로그가 없음', [...칸들, '확인할 로그']),
      ].join('\n'),
    );
    expect(r?.items.map((m) => m.id)).toEqual(['M01']);
    expect(r?.못읽음.map((x) => x.slice(0, 3))).toEqual(['M01', 'M02', 'M03', 'M04']);
  });
});

describe('빠진규칙', () => {
  const 미션 = 미션절읽기(표)?.items ?? [];
  const 있는 = new Set(['ARG-FN-001']);

  it('표가 안 덮고 미션 로그에도 없는 규칙만 — 문장은 원장 문장', () => {
    expect(빠진규칙(원장값(), 표, undefined, 미션, 있는)).toEqual([{ reqId: 'ARG-REQ-080', text: 'ARG-REQ-080 문장' }]);
  });

  it('미션이 없으면 표가 안 덮은 규칙 전부가 빠진 규칙이다', () => {
    expect(빠진규칙(원장값(), 표, undefined, [], 있는).map((x) => x.reqId)).toEqual(['ARG-REQ-041', 'ARG-REQ-052', 'ARG-REQ-080']);
  });

  it('원장이 없으면 빈 목록', () => {
    expect(빠진규칙({ 없음: '판 없음' }, 표, undefined, 미션)).toEqual([]);
  });
});

describe('승인미션읽기', () => {
  const 미션 = 미션절읽기(표)?.items ?? [];

  it('params.missions 가 없으면 null — 첫 작성', () => {
    expect(승인미션읽기({})).toBeNull();
    expect(승인미션읽기({ params: { prdApply: true } })).toBeNull();
  });

  it('from · items 를 읽는다', () => {
    expect(승인미션읽기({ params: { missions: { from: 12, items: 미션 } } })).toEqual({ from: 12, items: 미션 });
  });

  it('모양이 틀리면 사유 — null · from · 빈 items · 미션 칸', () => {
    const 틀림 = (missions: unknown) => 승인미션읽기({ params: { missions } });
    expect(틀림(null)).toHaveProperty('사유');
    expect(틀림({ from: 0, items: 미션 })).toHaveProperty('사유');
    expect(틀림({ from: 3, items: [] })).toHaveProperty('사유');
    expect(틀림({ from: 3, items: [{ ...미션[0], id: 'X1' }] })).toHaveProperty('사유');
  });
});

describe('미션준비 · 미션절', () => {
  let 자료 = '';
  beforeEach(() => {
    자료 = mkdtempSync(join(tmpdir(), 'mission-'));
  });
  afterEach(() => rmSync(자료, { recursive: true, force: true }));
  const 미션 = 미션절읽기(표)?.items ?? [];

  it('승인 요청이 아니면 null · 승인 요청이면 missions.json 에 items 그대로 쓴다', () => {
    expect(미션준비({}, 자료)).toBeNull();
    const r = 미션준비({ params: { missions: { from: 12, items: 미션 } } }, 자료);
    expect(r).toEqual({ 파일: join(자료, 'missions.json'), 번호들: ['M01', 'M02'], from: 12 });
    expect(JSON.parse(readFileSync(join(자료, 'missions.json'), 'utf8'))).toEqual(미션);
  });

  it('모양이 틀린 승인은 사유로 돌려준다', () => {
    expect(미션준비({ params: { missions: { from: 12 } } }, 자료)).toHaveProperty('사유');
  });

  it('프롬프트 절 — 줄프롬프트 끝에 붙고 미션만 쓰라고 한다', () => {
    const 입력 = { 파일: join(자료, 'missions.json'), 번호들: ['M01', 'M02'], from: 12 };
    const 절 = 미션절(입력, 'ARG').join('\n');
    expect(절).toContain('--- 게임 시나리오 미션 ---');
    expect(절).toContain('M01 · M02');
    expect(절).toContain('ARG-GS-<3자리>');
    const 것 = { id: 3, kind: 'AUTHOR', specText: '본문' } as const;
    const 글 = 줄프롬프트(것, 'ARG', [], undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 입력);
    expect(글).toContain('--- 게임 시나리오 미션 ---');
    expect(줄프롬프트(것, 'ARG', [])).not.toContain('게임 시나리오 미션');
  });
});

describe('미션올리기', () => {
  let 트리 = '';
  let 부름: ReturnType<typeof vi.fn>;
  const 통로 = { 주소기지: 'http://admin:3000', 토큰: 't', 번호: 7 };
  const 부르기 = (비밀: string[] = []) => 미션올리기(통로, { 트리, 서비스: 'ARG', 케이스폴더: join(트리, 'tests', 'arg'), 원장값: 원장값(), 비밀 });
  const 서버 = (status: number, 몸: unknown = {}) => {
    부름 = vi.fn(async () => new Response(status === 204 ? null : JSON.stringify(몸), { status }));
    vi.stubGlobal('fetch', 부름);
  };
  const 표쓰기 = (글: string) => {
    mkdirSync(join(트리, 'docs', 'cases'), { recursive: true });
    writeFileSync(join(트리, 'docs', 'cases', 'ARG.md'), 글);
    mkdirSync(join(트리, 'tests', 'arg'), { recursive: true });
    writeFileSync(join(트리, 'tests', 'arg', 'fn-001.spec.ts'), "export const spec = defineCase({ tcId: 'ARG-FN-001' });\n");
  };
  beforeEach(() => {
    트리 = mkdtempSync(join(tmpdir(), 'mission-up-'));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    rmSync(트리, { recursive: true, force: true });
  });

  it('절이 없으면 안 올리고 줄도 없다', async () => {
    서버(204);
    표쓰기('## 요구사항\n');
    expect(await 부르기()).toEqual([]);
    expect(부름).not.toHaveBeenCalled();
  });

  it('표 파일이 없어도 던지지 않는다', async () => {
    서버(204);
    expect(await 부르기()).toEqual([]);
  });

  it('미션 · 공식 빈칸 · 빠진 규칙을 PUT 으로 올리고 머리 줄을 돌려준다', async () => {
    서버(204);
    표쓰기(표);
    expect(await 부르기()).toEqual(['게임 시나리오 미션: 2개 올림 · 공식 빈칸 1개 · 미션도 테스트도 없는 규칙 1개']);
    const [url, init] = 부름.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://admin:3000/api/authoring/requests/7/missions');
    expect(init.method).toBe('PUT');
    const 몸 = JSON.parse(init.body as string) as { items: unknown[]; uncovered: unknown[]; gaps: unknown[] };
    expect(몸.items).toHaveLength(2);
    expect(몸.uncovered).toEqual([{ reqId: 'ARG-REQ-080', text: 'ARG-REQ-080 문장' }]);
    expect(몸.gaps).toEqual([{ reqId: 'ARG-REQ-070', note: '공식에 보정 값이 비어 있다 — 기획서 확인 필요' }]);
  });

  it('서버가 거절하면 까닭을 줄에 싣는다 — PR 은 간다', async () => {
    서버(400, { error: 'INVALID_MISSIONS', detail: 'items[0].logs' });
    표쓰기(표);
    expect(await 부르기()).toEqual(['게임 시나리오 미션: 못 올림 — 서버 400 (items[0].logs)']);
  });

  it('통신이 터져도 던지지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('연결 끊김'))));
    표쓰기(표);
    const [줄] = await 부르기();
    expect(줄).toContain('게임 시나리오 미션: 못 올림');
  });

  it('테스트 계정 비밀번호가 든 목록은 올리지 않는다', async () => {
    서버(204);
    표쓰기(표);
    expect(await 부르기(['전투 망치'])).toEqual(['게임 시나리오 미션: 목록에 테스트 계정 비밀번호가 들어 있어 안 올림']);
    expect(부름).not.toHaveBeenCalled();
  });
});
