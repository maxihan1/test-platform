// 반영 때 Page Object 를 AI 로 합치기 — 인자 · 프롬프트 · 답 풀기와 가짜 claude 로 도는 자리 · 환경을 본다 (작성 §3.6 「Page Object 합치기」)
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { AI부품합치기, 합친답풀기, 합치기인자, 합치기프롬프트 } from './authoring-po-merge.js';

const 모델 = { model: 'sonnet', effort: 'high', fallback: null };
const 답 = (structured_output: unknown, 더: Record<string, unknown> = {}) =>
  JSON.stringify({ type: 'result', is_error: false, structured_output, ...더 });

describe('합치기인자', () => {
  it('도구를 하나도 안 열고 설정 파일 · MCP 를 안 읽는다 — 에이전트가 root 로 돈다', () => {
    const 인자 = 합치기인자(모델);
    expect(인자[인자.indexOf('--tools') + 1]).toBe('');
    expect(인자).toEqual(expect.arrayContaining(['--restricted', '--strict-mcp-config', '--no-session-persistence']));
    expect(인자).not.toContain('--add-dir');
    expect(인자).not.toContain('--permission-mode');
  });
});

describe('합치기프롬프트', () => {
  it('경로와 세 판을 싣고 바탕이 없으면 없다고 적는다', () => {
    const 글 = 합치기프롬프트('tests/mkt/pages/login.page.ts', { 바탕: null, main: 'MAIN판', 요청: '요청판' });
    expect(글).toContain('tests/mkt/pages/login.page.ts');
    expect(글).toContain('<바탕>\n(없음)\n</바탕>');
    expect(글).toContain('<main>\nMAIN판\n</main>');
    expect(글).toContain('<요청>\n요청판\n</요청>');
  });
});

describe('합친답풀기', () => {
  it('합쳤으면 글을 내고 끝 줄바꿈을 붙인다', () => {
    expect(합친답풀기(답({ ok: true, content: 'export class A {}' }))).toEqual({ 글: 'export class A {}\n' });
  });

  it('못 합친다는 까닭은 한 줄로 줄여 싣는다', () => {
    const r = 합친답풀기(답({ ok: false, reason: `submit 을\n  다르게 찾는다${'가'.repeat(300)}` }));
    expect(r).toEqual({ 사유: expect.stringMatching(/^submit 을 다르게 찾는다가+$/) });
    expect('사유' in r && r.사유.length).toBe(200);
  });

  it.each([
    ['JSON 이 아니다', 'oops', 'AI 답을 읽지 못했다'],
    ['오류로 끝났다', 답({ ok: true, content: 'x' }, { is_error: true }), 'AI 가 오류로 끝났다'],
    ['구조화 답이 없다', JSON.stringify({ type: 'result', is_error: false, result: 'x' }), 'AI 답 모양이 틀렸다'],
    ['합쳤다면서 글이 비었다', 답({ ok: true, content: '  ' }), '합쳤다면서 글이 비었다'],
    ['까닭 없이 못 합쳤다', 답({ ok: false }), '까닭을 남기지 않았다'],
  ])('%s — 합치지 않는다', (_이름, 낸것, 사유) => {
    expect(합친답풀기(낸것)).toEqual({ 사유 });
  });
});

describe('AI부품합치기', () => {
  const 자리들: string[] = [];
  afterEach(() => {
    vi.unstubAllEnvs();
    for (const 자리 of 자리들.splice(0)) rmSync(자리, { recursive: true, force: true });
  });

  function 가짜claude(몸: string): void {
    const 폴더 = mkdtempSync(join(tmpdir(), 'fake-claude-'));
    자리들.push(폴더);
    writeFileSync(join(폴더, 'claude'), `#!/bin/sh\ncat >/dev/null\n${몸}\n`);
    chmodSync(join(폴더, 'claude'), 0o755);
    vi.stubEnv('PATH', `${폴더}:${process.env.PATH ?? ''}`);
    vi.stubEnv('AUTHORING_AGENT_TOKEN', '에이전트토큰');
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-api-돈');
  }

  it('빈 임시 폴더에서 에이전트 토큰 · API 키 없이 돌고 끝나면 그 폴더를 지운다', async () => {
    가짜claude(
      `printf '{"type":"result","is_error":false,"structured_output":{"ok":true,"content":"%s|%s|%s|%s"}}' ` +
        `"$(ls -A | wc -l | tr -d ' ')" "\${AUTHORING_AGENT_TOKEN:-없음}" "\${ANTHROPIC_API_KEY:-없음}" "$PWD"`,
    );
    const r = await AI부품합치기(모델)('tests/mkt/pages/login.page.ts', { 바탕: null, main: 'a', 요청: 'b' });
    expect(r).toEqual({ 글: expect.stringMatching(/^0\|없음\|없음\|.+\n$/) });
    const 자리 = '글' in r ? r.글.trim().split('|')[3] : '';
    expect(자리).toContain('po-merge-');
    expect(existsSync(자리)).toBe(false);
  });

  it('claude 가 실패하면 종료 코드와 오류 끝 줄을 사유로 낸다', async () => {
    가짜claude(`echo '한도에 닿았다' >&2\nexit 3`);
    expect(await AI부품합치기(모델)('p', { 바탕: null, main: 'a', 요청: 'b' })).toEqual({ 사유: 'AI 를 못 돌렸다 (종료 3): 한도에 닿았다' });
  });
});
