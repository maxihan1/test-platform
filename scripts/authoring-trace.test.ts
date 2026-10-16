// 작성 중 실패 요약 스크립트 — zip 찾기 · zip 없음 · 계정 비밀번호(못 읽으면 멈춤). 가르기는 execution/traceSummary.test.ts

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { 계정비밀번호, zip찾기 } from './authoring-trace.js';

describe('zip찾기', () => {
  it('폴더 아래 zip 을 다 모으고(받아 둔 RUN 파일도), 없는 경로는 빈 목록이다', () => {
    const 뿌리 = mkdtempSync(join(tmpdir(), 'trace-find-'));
    mkdirSync(join(뿌리, 'a'));
    writeFileSync(join(뿌리, 'a', 'trace.zip'), '');
    writeFileSync(join(뿌리, 'RUN42-X-FN-007.zip'), '');
    writeFileSync(join(뿌리, 'a', 'other.txt'), '');
    expect(zip찾기([뿌리])).toEqual([join(뿌리, 'RUN42-X-FN-007.zip'), join(뿌리, 'a', 'trace.zip')]);
    expect(zip찾기([join(뿌리, '없음')])).toEqual([]);
  });
});

describe('계정비밀번호', () => {
  it('PLATFORM_ACCOUNTS 의 비밀번호만 · 없으면 빈 목록', () => {
    expect(계정비밀번호({ PLATFORM_ACCOUNTS: '[{"role":"일반 회원","loginId":"u","loginPassword":"pw1234"},{"role":"관리자","loginPassword":""}]' })).toEqual(['pw1234']);
    expect(계정비밀번호({})).toEqual([]);
  });

  it('값이 있는데 못 읽으면 던진다 — 빈 목록으로 넘어가면 비밀번호를 안 가린 채 찍는다', () => {
    expect(() => 계정비밀번호({ PLATFORM_ACCOUNTS: '{"loginPassword":"pw' })).toThrow('PLATFORM_ACCOUNTS가 JSON이 아니다');
    expect(() => 계정비밀번호({ PLATFORM_ACCOUNTS: '{}' })).toThrow('배열이 아니다');
  });
});
