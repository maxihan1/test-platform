// E2E 장면 자리 — 폰 장면을 거는 사이 단계가 닫히면 건 것을 바로 끄는지 본다 (SPEC 도메인/러너 §5.2 「테스트 모드 — 실시간 장면」)

import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { 장면자리 } from './scene.js';

let 폴더 = '';

afterEach(() => {
  vi.unstubAllEnvs();
  if (폴더 !== '') rmSync(폴더, { recursive: true, force: true });
});

describe('장면자리', () => {
  it('폰 장면을 거는 사이 단계가 닫히면 건 것을 끄고 더 안 찍는다', async () => {
    폴더 = mkdtempSync(join(tmpdir(), 'scn-scene-'));
    const 파일 = join(폴더, 'live', '0b7e2c1a-0000-4000-8000-000000000007.jpg');
    vi.stubEnv('PLATFORM_LIVE_FILE', 파일);
    vi.stubEnv('PLATFORM_SLOW_MO', '1000');
    const takeScreenshot = vi.fn(async () => Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64'));
    const 자리 = 장면자리();
    let 닫음 = false;

    const 거는중 = 자리.폰에({ takeScreenshot }, () => 닫음);
    닫음 = true;
    await 자리.끄기();
    await 거는중;
    const 찍은수 = takeScreenshot.mock.calls.length;
    await new Promise((끝) => setTimeout(끝, 1_200));

    expect(takeScreenshot.mock.calls.length).toBe(찍은수);
    expect(existsSync(파일)).toBe(false);
  });

  it('닫힌 단계에는 폰 장면을 걸지 않는다', async () => {
    vi.stubEnv('PLATFORM_LIVE_FILE', join(tmpdir(), 'scn-scene-none.jpg'));
    vi.stubEnv('PLATFORM_SLOW_MO', '1000');
    const takeScreenshot = vi.fn(async () => '');

    await 장면자리().폰에({ takeScreenshot }, () => true);

    expect(takeScreenshot).not.toHaveBeenCalled();
  });

  it('정식 실행(늦추기 값이 빔)에는 폰 장면을 걸지 않는다 — 찍는 동안 단계 명령이 선다', async () => {
    vi.stubEnv('PLATFORM_LIVE_FILE', join(tmpdir(), 'scn-scene-formal.jpg'));
    vi.stubEnv('PLATFORM_SLOW_MO', '');
    const takeScreenshot = vi.fn(async () => '');

    await 장면자리().폰에({ takeScreenshot }, () => false);

    expect(takeScreenshot).not.toHaveBeenCalled();
  });
});
