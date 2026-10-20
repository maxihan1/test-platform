// 통과하지 못한 android 항목만 팜 증적을 받는지 보는 단위 테스트. 팜은 appium-cli 가짜로 막는다

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { APPIUM_SESSION_ID_FILE, FARM_EVIDENCE_DIR, runDir } from '@platform/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const farmArtifacts = vi.fn();
vi.mock('appium-cli', () => ({ farmArtifacts: (...a: unknown[]) => farmArtifacts(...a) }));

const { 팜증적을받는다 } = await import('./farmEvidence.js');

let 임시: string;
const 폴더 = () => runDir('3', '9');
const idFile = () => join(폴더(), APPIUM_SESSION_ID_FILE);

beforeEach(() => {
  임시 = mkdtempSync(join(tmpdir(), 'farm-evidence-'));
  process.env.PLATFORM_ARTIFACTS_DIR = 임시;
  process.env.PLATFORM_APPIUM_URL = 'http://farm:4723/wd/hub';
  mkdirSync(폴더(), { recursive: true });
  writeFileSync(idFile(), 'sess-1\n');
  farmArtifacts.mockReset();
  farmArtifacts.mockResolvedValue({ files: [], errors: [] });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.PLATFORM_ARTIFACTS_DIR;
  delete process.env.PLATFORM_APPIUM_URL;
  rmSync(임시, { recursive: true, force: true });
});

describe('팜증적을받는다', () => {
  it('실패 항목은 연결 번호로 받아 실행 폴더의 farm 에 두고 번호 파일을 지운다', async () => {
    await 팜증적을받는다(3, 9, 'FAIL');
    expect(farmArtifacts).toHaveBeenCalledWith('http://farm:4723/wd/hub', 'sess-1', join(폴더(), FARM_EVIDENCE_DIR));
    expect(existsSync(idFile())).toBe(false);
  });

  it('미실행(중단 · 시간 초과) 항목도 받는다', async () => {
    await 팜증적을받는다(3, 9, 'NA');
    expect(farmArtifacts).toHaveBeenCalledTimes(1);
  });

  it('통과 항목은 받지 않고 번호 파일만 지운다', async () => {
    await 팜증적을받는다(3, 9, 'PASS');
    expect(farmArtifacts).not.toHaveBeenCalled();
    expect(existsSync(idFile())).toBe(false);
  });

  it('케이스 테스트 실행(runId 0)은 받지 않는다', async () => {
    mkdirSync(runDir('0', '9'), { recursive: true });
    writeFileSync(join(runDir('0', '9'), APPIUM_SESSION_ID_FILE), 'sess-1\n');
    await 팜증적을받는다(0, 9, 'FAIL');
    expect(farmArtifacts).not.toHaveBeenCalled();
    expect(existsSync(join(runDir('0', '9'), APPIUM_SESSION_ID_FILE))).toBe(false);
  });

  it('연결을 못 열어 번호 파일이 없으면 아무것도 안 한다', async () => {
    rmSync(idFile());
    await expect(팜증적을받는다(3, 9, 'FAIL')).resolves.toBeUndefined();
    expect(farmArtifacts).not.toHaveBeenCalled();
  });

  it('받다 실패하면(팜이 아닌 Appium 의 404 등) 던지지 않고 반쯤 받은 폴더를 지운다', async () => {
    farmArtifacts.mockImplementation(async (_u: string, _s: string, 받을곳: string) => {
      mkdirSync(받을곳, { recursive: true });
      writeFileSync(join(받을곳, 'video-1.mp4'), '반쯤');
      throw new Error('Appium 이 HTTP 404 로 답했다');
    });
    await expect(팜증적을받는다(3, 9, 'FAIL')).resolves.toBeUndefined();
    expect(existsSync(join(폴더(), FARM_EVIDENCE_DIR))).toBe(false);
    expect(existsSync(idFile())).toBe(false);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('HTTP 404'));
  });

  it('팜이 녹화를 못 했다고 하면 받은 것은 두고 까닭을 알린다', async () => {
    farmArtifacts.mockResolvedValue({ files: [], errors: ['녹화 실패: 폰이 뽑혔다'] });
    await 팜증적을받는다(3, 9, 'FAIL');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('녹화 실패: 폰이 뽑혔다'));
  });
});
