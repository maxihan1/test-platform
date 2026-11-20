// 상한 없는 crawl 을 뒤에 띄우고 나눠 기다리는 명령의 테스트
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 돌기, 실행, 크롤인자, 크롤자리 } from './authoring-app-crawl.js';

let 자료: string;
beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'app-crawl-'));
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  rmSync(자료, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const 판 = (글: string, 기다림_ms = 10_000) => ({ 명령: ['sh', '-c', 글, 'sh'], 기다림_ms, 쉬기: (ms: number) => new Promise<void>((r) => setTimeout(r, Math.min(ms, 50))) });

describe('크롤인자', () => {
  it('상한 없음 · 결과 폴더 · 저장본은 있을 때만 · 로그인 스크립트', () => {
    expect(크롤인자(자료)).toEqual(['-s=probe', 'crawl', '--max', '0', '--minutes', '0', '--out', join(자료, 'crawl')]);
    mkdirSync(join(자료, 'kept'));
    writeFileSync(join(자료, 'kept', 'index.json'), '{}');
    expect(크롤인자(자료, '/t/login.txt').slice(-4)).toEqual(['--keep', join(자료, 'kept', 'index.json'), '--login', '/t/login.txt']);
  });
});

describe('돌기', () => {
  it('끝나면 0 이고, 끝난 crawl 은 다시 불러도 다시 안 돈다', async () => {
    expect(await 돌기(자료, undefined, 판('echo 크롤: 다 봄'))).toBe(0);
    expect(await 돌기(자료, undefined, 판('exit 9'))).toBe(0);
  });

  it('실패하면 1 이고 자리를 지워 다음 부름이 처음부터 돈다', async () => {
    expect(await 돌기(자료, undefined, 판('echo 연결 끊김; exit 4'))).toBe(1);
    expect(existsSync(크롤자리(자료).폴더)).toBe(false);
    expect(await 돌기(자료, undefined, 판('true'))).toBe(0);
  });

  it('기다림을 넘기면 3 — 다시 부르면 띄운 것을 이어 기다린다', async () => {
    expect(await 돌기(자료, undefined, 판('sleep 1', 100))).toBe(3);
    expect(await 돌기(자료, undefined, 판('exit 9', 5_000))).toBe(0);
  });

  it('끝 기록 없이 꺼졌으면 1 이고 자리를 지운다', async () => {
    const 자리 = 크롤자리(자료);
    mkdirSync(자리.폴더);
    writeFileSync(자리.pid, '999999');
    expect(await 돌기(자료, undefined, 판('true'))).toBe(1);
    expect(existsSync(자리.폴더)).toBe(false);
  });
});

describe('실행', () => {
  it('자료 폴더가 없거나 인자가 틀리면 2', async () => {
    expect(await 실행([])).toBe(2);
    expect(await 실행([join(자료, '없음')])).toBe(2);
    expect(await 실행([자료, '--login'])).toBe(2);
    expect(await 실행([자료, '덤'])).toBe(2);
  });
});
