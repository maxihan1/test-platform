// 통과하지 못한 android 항목만 팜 증적을 받는지 보는 단위 테스트. 팜은 appium-cli 가짜로 막는다

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { APPIUM_SESSION_ID_FILE, FARM_EVIDENCE_DIR, runDir } from '@platform/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const farmArtifacts = vi.fn();
vi.mock('appium-cli', () => ({ farmArtifacts: (...a: unknown[]) => farmArtifacts(...a) }));

const { 팜증적받기를줄세운다, 팜증적을받는다, 팜토큰을지운다 } = await import('./farmEvidence.js');

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
  delete process.env.PLATFORM_APPIUM_TOKEN;
  rmSync(임시, { recursive: true, force: true });
});

describe('팜증적을받는다', () => {
  it('실패 항목은 연결 번호로 옆 폴더에 받고, 다 받은 뒤에야 farm 으로 옮기고 번호 파일을 지운다', async () => {
    farmArtifacts.mockImplementation(async (_u: string, _s: string, 받는곳: string) => {
      mkdirSync(받는곳, { recursive: true });
      writeFileSync(join(받는곳, 'video-1.mp4'), '영상');
      // 받는 동안 admin 이 보는 farm 폴더는 아직 없다
      expect(existsSync(join(폴더(), FARM_EVIDENCE_DIR))).toBe(false);
      return { files: [], errors: [] };
    });
    await 팜증적을받는다(3, 9, 'FAIL');
    expect(farmArtifacts).toHaveBeenCalledWith('http://farm:4723/wd/hub', 'sess-1', join(폴더(), `${FARM_EVIDENCE_DIR}.part`), {});
    expect(existsSync(join(폴더(), FARM_EVIDENCE_DIR, 'video-1.mp4'))).toBe(true);
    expect(existsSync(idFile())).toBe(false);
  });

  it('PLATFORM_APPIUM_TOKEN 이 있으면 팜 토큰으로 받는다', async () => {
    process.env.PLATFORM_APPIUM_TOKEN = 'pat_abc';
    await 팜증적을받는다(3, 9, 'FAIL');
    expect(farmArtifacts).toHaveBeenCalledWith('http://farm:4723/wd/hub', 'sess-1', expect.any(String), { token: 'pat_abc' });
  });

  it('요청이 준 토큰이 있으면 환경값보다 앞선다 — 팜은 연결을 연 사람에게만 증적을 준다', async () => {
    process.env.PLATFORM_APPIUM_TOKEN = 'pat_server';
    await 팜증적을받는다(3, 9, 'FAIL', 'pat_kim');
    expect(farmArtifacts).toHaveBeenCalledWith('http://farm:4723/wd/hub', 'sess-1', expect.any(String), { token: 'pat_kim' });
  });

  it('답 안의 팜 토큰은 어디에 있든 별표로 바꾸고, 줄 글자 꼴(따옴표 · 줄바꿈 이스케이프)도 깨지지 않는다', () => {
    const 답 = { status: 'FAIL', error: { message: 'Bearer pat_kim 401', stack: 'env PLATFORM_APPIUM_TOKEN="pat_server"\n' }, steps: [{ name: 'pat_kim' }] };
    expect(팜토큰을지운다(답, ['pat_kim', 'pat_server', undefined])).toEqual({
      status: 'FAIL',
      error: { message: 'Bearer ******** 401', stack: 'env PLATFORM_APPIUM_TOKEN="********"\n' },
      steps: [{ name: '********' }],
    });
    expect(팜토큰을지운다(답, [undefined, ''])).toBe(답);
  });

  it('미실행(중단 · 시간 초과) 항목도 받는다', async () => {
    await 팜증적을받는다(3, 9, 'NA');
    expect(farmArtifacts).toHaveBeenCalledTimes(1);
  });

  it('통과 항목은 받지 않고 번호 파일을 남긴다 — 「영상 보기」가 그 번호로 팜에서 받는다', async () => {
    await 팜증적을받는다(3, 9, 'PASS');
    expect(farmArtifacts).not.toHaveBeenCalled();
    expect(existsSync(idFile())).toBe(true);
  });

  it('kit 이 farm 폴더에 먼저 둔 게임 증적과 부딪히지 않고 받은 파일을 옆에 더한다', async () => {
    mkdirSync(join(폴더(), FARM_EVIDENCE_DIR), { recursive: true });
    writeFileSync(join(폴더(), FARM_EVIDENCE_DIR, 'game-tree.txt'), '/Hud');
    farmArtifacts.mockImplementation(async (_u: string, _s: string, 받는곳: string) => {
      mkdirSync(받는곳, { recursive: true });
      writeFileSync(join(받는곳, 'logcat.txt'), '로그');
      return { files: [], errors: [] };
    });
    await 팜증적을받는다(3, 9, 'FAIL');
    expect(existsSync(join(폴더(), FARM_EVIDENCE_DIR, 'game-tree.txt'))).toBe(true);
    expect(existsSync(join(폴더(), FARM_EVIDENCE_DIR, 'logcat.txt'))).toBe(true);
    expect(existsSync(join(폴더(), `${FARM_EVIDENCE_DIR}.part`))).toBe(false);
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
    expect(existsSync(join(폴더(), `${FARM_EVIDENCE_DIR}.part`))).toBe(false);
    expect(existsSync(idFile())).toBe(false);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('HTTP 404'));
  });

  it('팜이 녹화를 못 했다고 하면 받은 것은 두고 까닭을 알린다', async () => {
    farmArtifacts.mockResolvedValue({ files: [], errors: ['녹화 실패: 폰이 뽑혔다'] });
    await 팜증적을받는다(3, 9, 'FAIL');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('녹화 실패: 폰이 뽑혔다'));
  });

  it('줄 세운 받기는 앞 받기가 끝난 뒤에 시작한다', async () => {
    mkdirSync(runDir('3', '10'), { recursive: true });
    writeFileSync(join(runDir('3', '10'), APPIUM_SESSION_ID_FILE), 'sess-2\n');
    let 놓기!: () => void;
    const 차례: string[] = [];
    farmArtifacts.mockImplementation(async (_u: string, sid: string) => {
      차례.push(`시작 ${sid}`);
      if (sid === 'sess-1') await new Promise<void>((ok) => { 놓기 = ok; });
      차례.push(`끝 ${sid}`);
      return { files: [], errors: [] };
    });
    팜증적받기를줄세운다(3, 9, 'FAIL');
    팜증적받기를줄세운다(3, 10, 'FAIL');
    await vi.waitFor(() => expect(차례).toEqual(['시작 sess-1']));
    놓기();
    await vi.waitFor(() => expect(차례).toEqual(['시작 sess-1', '끝 sess-1', '시작 sess-2', '끝 sess-2']));
  });
});
