// 호환성 항목의 AI 점검 결과를 점검이 끝날 때까지 받는지 보는 단위 테스트. 팜은 가짜 fetch 로 막는다

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FARM_EVIDENCE_DIR } from '@platform/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 다시_ms, 상한_ms, 점검결과를기다린다 } from './farmUiCheck.js';

const 팜 = 'http://farm:4723/wd/hub';
const 목록주소 = `${팜}/api/sessions/sess-1/artifacts`;
const 파일 = (name: string) => ({ name, bytes: 1, url: `/wd/hub/api/sessions/sess-1/artifacts/${name}` });
const 완료 = { version: 1, status: 'done', screens: [{ before: 'element/click', status: 'done', file: 'ui-001.png', issues: [{ kind: 'overlap' }] }, { status: 'done', issues: [] }] };

let 폴더: string;
let 점검: { status: string; screens?: unknown[] };
let 목록: { ready: boolean; files: ReturnType<typeof 파일>[] };
const 부른곳: string[] = [];
const 받은머리: (string | null)[] = [];

const 답 = (body: string, status = 200) => new Response(body, { status });

beforeEach(() => {
  폴더 = mkdtempSync(join(tmpdir(), 'farm-ui-'));
  mkdirSync(폴더, { recursive: true });
  점검 = 완료;
  목록 = { ready: true, files: [파일('logcat.txt'), 파일('video-1.mp4'), 파일('ui-check.json'), 파일('ui-001.png')] };
  부른곳.length = 0;
  받은머리.length = 0;
  vi.stubGlobal('fetch', async (주소: string, init: RequestInit) => {
    부른곳.push(주소);
    받은머리.push(new Headers(init.headers).get('authorization'));
    if (주소 === 목록주소) return 답(JSON.stringify({ value: 목록 }));
    if (주소.endsWith('/ui-check.json')) return 답(JSON.stringify(점검));
    if (주소.endsWith('/ui-001.png')) return 답('PNG');
    return 답('', 404);
  });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rmSync(폴더, { recursive: true, force: true });
});

const 둔곳 = (이름: string) => join(폴더, FARM_EVIDENCE_DIR, 이름);

describe('점검결과를기다린다', () => {
  it('점검이 끝났으면 점검 파일과 그것이 가리키는 의심 화면만 farm 에 받는다 — 영상 · logcat 은 안 받는다', async () => {
    await 점검결과를기다린다(폴더, 팜, 'sess-1', 'pat_a', Date.now());
    expect(JSON.parse(readFileSync(둔곳('ui-check.json'), 'utf8'))).toEqual(완료);
    expect(readFileSync(둔곳('ui-001.png'), 'utf8')).toBe('PNG');
    expect(부른곳.some((u) => u.includes('video') || u.includes('logcat'))).toBe(false);
    expect(받은머리.every((h) => h === 'Bearer pat_a')).toBe(true);
    expect(existsSync(join(폴더, `${FARM_EVIDENCE_DIR}.ui.part`))).toBe(false);
  });

  it('점검 중이면 두지 않고 1분 뒤 다시 받는다', async () => {
    vi.useFakeTimers();
    점검 = { status: 'checking', screens: [] };
    const 끝 = 점검결과를기다린다(폴더, 팜, 'sess-1', undefined, Date.now());
    await vi.advanceTimersByTimeAsync(0);
    expect(existsSync(둔곳('ui-check.json'))).toBe(false);
    점검 = 완료;
    await vi.advanceTimersByTimeAsync(다시_ms);
    await 끝;
    expect(existsSync(둔곳('ui-check.json'))).toBe(true);
    expect(부른곳.filter((u) => u === 목록주소)).toHaveLength(2);
  });

  it('세션이 아직 안 닫혀 ready 가 false 면 점검 중과 같다', async () => {
    vi.useFakeTimers();
    목록 = { ...목록, ready: false };
    const 끝 = 점검결과를기다린다(폴더, 팜, 'sess-1', undefined, Date.now());
    await vi.advanceTimersByTimeAsync(0);
    expect(부른곳.some((u) => u.endsWith('/ui-check.json'))).toBe(false);
    목록 = { ...목록, ready: true };
    await vi.advanceTimersByTimeAsync(다시_ms);
    await 끝;
    expect(existsSync(둔곳('ui-check.json'))).toBe(true);
  });

  it('항목이 끝난 뒤 60분이 지나면 그만 받는다 — 점검 중 파일은 끝까지 안 둔다', async () => {
    vi.useFakeTimers();
    점검 = { status: 'checking', screens: [] };
    const 끝 = 점검결과를기다린다(폴더, 팜, 'sess-1', undefined, Date.now());
    await vi.advanceTimersByTimeAsync(상한_ms + 다시_ms);
    await 끝;
    expect(부른곳.filter((u) => u === 목록주소).length).toBe(상한_ms / 다시_ms + 1);
    expect(existsSync(둔곳('ui-check.json'))).toBe(false);
  });

  it('팜이 점검 파일을 안 주면(비전 꺼짐) 한 번 묻고 그만 받는다', async () => {
    목록 = { ready: true, files: [파일('logcat.txt')] };
    await 점검결과를기다린다(폴더, 팜, 'sess-1', undefined, Date.now());
    expect(부른곳).toEqual([목록주소]);
  });

  it('모르는 세션(404)이면 다시 묻지 않는다', async () => {
    await 점검결과를기다린다(폴더, 팜, 'sess-9', undefined, Date.now());
    expect(부른곳).toHaveLength(1);
  });

  it('잠깐의 오류는 1분 뒤 다시 받는다', async () => {
    vi.useFakeTimers();
    const 진짜 = globalThis.fetch;
    let 처음 = true;
    vi.stubGlobal('fetch', async (주소: string, init: RequestInit) => {
      if (처음) { 처음 = false; throw new Error('ECONNRESET'); }
      return 진짜(주소, init);
    });
    const 끝 = 점검결과를기다린다(폴더, 팜, 'sess-1', undefined, Date.now());
    await vi.advanceTimersByTimeAsync(다시_ms);
    await 끝;
    expect(existsSync(둔곳('ui-check.json'))).toBe(true);
  });

  it('팜 밖 주소 · 폴더 밖 이름은 받지 않는다 — 토큰이 새거나 다른 곳에 파일이 써지지 않게', async () => {
    점검 = { status: 'done', screens: [{ file: '../x.png' }, { file: 'ui-002.png' }] };
    목록 = { ready: true, files: [파일('ui-check.json'), { name: 'ui-002.png', bytes: 1, url: 'http://evil.test/ui-002.png' }] };
    await 점검결과를기다린다(폴더, 팜, 'sess-1', 'pat_a', 0);
    expect(부른곳.some((u) => u.includes('evil') || u.includes('x.png'))).toBe(false);
    expect(existsSync(둔곳('ui-check.json'))).toBe(false);
  });
});
