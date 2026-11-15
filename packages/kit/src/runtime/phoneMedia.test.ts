// 폰에 파일 넣기 검사 — 종류별 폴더 · 작게 보내고 폰 안에서 늘리기 · 미디어 훑기 물러서기 · 지우기 · 받은 파일 있나
import { describe, expect, it, vi } from 'vitest';

import type { AppDriver } from './app.js';
import { 폰에파일넣기, 폰파일있나 } from './phoneMedia.js';

function 가짜폰(scanMedia: 'ok' | 'fail' = 'ok', 셸실패: string[] = []) {
  const 부름: { 명령: string; 값: unknown }[] = [];
  const driver = {
    pushFile: vi.fn(async (경로: string, 글: string) => void 부름.push({ 명령: 'push', 값: { 경로, 크기: Buffer.from(글, 'base64').length } })),
    execute: vi.fn(async (명령: string, 값: unknown) => {
      부름.push({ 명령, 값 });
      if (명령 === 'mobile: scanMedia' && scanMedia === 'fail') throw new Error('Unknown mobile command');
      const 셸 = (값 as { command?: string }).command;
      if (명령 === 'mobile: shell' && 셸 !== undefined && 셸실패.includes(셸)) {
        셸실패.splice(셸실패.indexOf(셸), 1);
        throw new Error(`adb_shell 이 꺼졌다(${셸})`);
      }
      return '';
    }),
  };
  return { driver: driver as unknown as AppDriver, 부름 };
}

describe('폰에파일넣기', () => {
  it('종류마다 사진첩 · 영상 · 다운로드 폴더에 qa- 이름으로 넣고 미디어 훑기를 부른다', async () => {
    for (const [종류, 꼴] of [['사진', /^\/sdcard\/Pictures\/qa-[a-z0-9]+-[a-z0-9]+\.png$/], ['영상', /^\/sdcard\/Movies\/qa-.+\.mp4$/], ['파일', /^\/sdcard\/Download\/qa-.+\.txt$/]] as const) {
      const { driver, 부름 } = 가짜폰();
      const 파일 = await 폰에파일넣기(driver, 종류);
      expect(파일.경로).toMatch(꼴);
      expect(부름.map((b) => b.명령)).toEqual(['push', 'mobile: scanMedia']);
      expect(부름[1]?.값).toEqual({ remotePath: 파일.경로 });
    }
  });

  it('보내는 사진 · 영상은 진짜 PNG · MP4 머리를 가진 작은 파일이다', async () => {
    const { driver } = 가짜폰();
    await 폰에파일넣기(driver, '사진');
    await 폰에파일넣기(driver, '영상');
    const [[, 사진], [, 영상]] = vi.mocked(driver.pushFile).mock.calls as unknown as [string, string][];
    expect(Buffer.from(사진, 'base64').subarray(1, 4).toString()).toBe('PNG');
    expect(Buffer.from(영상, 'base64').subarray(4, 8).toString()).toBe('ftyp');
    expect(Buffer.from(영상, 'base64').length).toBeLessThan(10_000);
  });

  it('크기를 주면 작게 보낸 뒤 폰 안에서 truncate 로 늘린다 — 팜 요청 상한 64MB 를 넘는 99MB 영상도 된다', async () => {
    const { driver, 부름 } = 가짜폰();
    const 파일 = await 폰에파일넣기(driver, '영상', { 크기: 99 * 1024 * 1024 });
    expect((부름[0]?.값 as { 크기: number }).크기).toBeLessThan(10_000);
    expect(부름[1]).toEqual({ 명령: 'mobile: shell', 값: { command: 'truncate', args: ['-s', String(99 * 1024 * 1024), 파일.경로] } });
  });

  it('바탕보다 작은 크기 · 정수가 아닌 크기는 보내기 전에 던진다', async () => {
    const { driver } = 가짜폰();
    await expect(폰에파일넣기(driver, '사진', { 크기: 10 })).rejects.toThrow('크기는');
    await expect(폰에파일넣기(driver, '영상', { 크기: 1.5e6 + 0.5 })).rejects.toThrow('크기는');
    expect(driver.pushFile).not.toHaveBeenCalled();
  });

  it('늘리기가 실패하면 넣은 작은 파일을 지우고 까닭을 붙여 던진다 — 사진첩에 남기지 않는다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { driver, 부름 } = 가짜폰('ok', ['truncate']);
    await expect(폰에파일넣기(driver, '영상', { 크기: 99 * 1024 * 1024 })).rejects.toThrow('못 늘렸다');
    const 경로 = (부름[0]?.값 as { 경로: string }).경로;
    expect(부름.slice(1)).toEqual([
      { 명령: 'mobile: shell', 값: { command: 'truncate', args: ['-s', String(99 * 1024 * 1024), 경로] } },
      { 명령: 'mobile: shell', 값: { command: 'rm', args: ['-f', 경로] } },
      { 명령: 'mobile: scanMedia', 값: { remotePath: 경로 } },
    ]);
  });

  it('지우기가 실패해도 던지지 않는다 — 케이스 결과를 가리지 않고, 다음 부름에서 다시 지운다', async () => {
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { driver, 부름 } = 가짜폰('ok', ['rm']);
    const 파일 = await 폰에파일넣기(driver, '사진');
    await expect(파일.지우기()).resolves.toBeUndefined();
    expect(오류.mock.calls[0]?.[0]).toContain('못 지웠다');
    await 파일.지우기();
    expect(부름.filter((b) => (b.값 as { command?: string }).command === 'rm')).toHaveLength(2);
    expect(부름.at(-1)).toEqual({ 명령: 'mobile: scanMedia', 값: { remotePath: 파일.경로 } });
  });

  it('mobile: scanMedia 가 없으면 미디어 훑기 방송으로 물러선다', async () => {
    const { driver, 부름 } = 가짜폰('fail');
    const 파일 = await 폰에파일넣기(driver, '사진');
    expect(부름.at(-1)).toEqual({ 명령: 'mobile: shell', 값: { command: 'am', args: ['broadcast', '-a', 'android.intent.action.MEDIA_SCANNER_SCAN_FILE', '-d', `file://${파일.경로}`] } });
  });

  it('지우기는 파일을 지우고 다시 훑는다 — 두 번 불러도 한 번만 지운다', async () => {
    const { driver, 부름 } = 가짜폰();
    const 파일 = await 폰에파일넣기(driver, '파일');
    await 파일.지우기();
    await 파일.지우기();
    const 뒤 = 부름.slice(2);
    expect(뒤).toEqual([
      { 명령: 'mobile: shell', 값: { command: 'rm', args: ['-f', 파일.경로] } },
      { 명령: 'mobile: scanMedia', 값: { remotePath: 파일.경로 } },
    ]);
  });
});

describe('폰파일있나', () => {
  const 셸폰 = (답: () => Promise<unknown>) => {
    const execute = vi.fn(async (_명령: string, _값: unknown) => 답());
    const waitUntil = vi.fn(async (조건: () => Promise<boolean>, { timeout }: { timeout: number }) => {
      for (let 번 = 0; 번 < timeout / 300; 번 += 1) if (await 조건()) return true;
      throw new Error('waitUntil timeout');
    });
    return { driver: { execute, waitUntil } as unknown as AppDriver, execute };
  };

  it('폴더를 작은따옴표로 싸서 ls 로 읽고 이름을 글자 그대로 맞춘다', async () => {
    const { driver, execute } = 셸폰(async () => 'receipt.pdf\r\n영수증 1.pdf\n');
    expect(await 폰파일있나(driver, "/sdcard/Download/내 문서's", '영수증 1.pdf')).toBe(true);
    expect(execute).toHaveBeenCalledWith('mobile: shell', { command: 'ls', args: ['-1', "'/sdcard/Download/내 문서'\\''s'"] });
    expect(await 폰파일있나(driver, '/sdcard/Download', 'receipt')).toBe(false);
    expect(await 폰파일있나(driver, '/sdcard/Download', 'receipt (1).pdf')).toBe(false);
    expect(await 폰파일있나(driver, '/sdcard/Download', ' receipt.pdf')).toBe(false);
  });

  it('폴더가 없으면 없음이다 — 앱이 아직 한 번도 안 받았다', async () => {
    const { driver } = 셸폰(async () => {
      throw new Error("Cannot execute the 'ls' shell command. Original error: ls: /sdcard/Android/data/com.shop/files: No such file or directory");
    });
    expect(await 폰파일있나(driver, '/sdcard/Android/data/com.shop/files', 'a.pdf')).toBe(false);
  });

  it('다른 항목의 No such file 은 없음으로 읽지 않고 던진다', async () => {
    const { driver } = 셸폰(async () => {
      throw new Error('ls: /sdcard/Download/.pending-1-a.pdf: No such file or directory');
    });
    await expect(폰파일있나(driver, '/sdcard/Download', 'a.pdf')).rejects.toThrow('폰파일있나: /sdcard/Download 를 못 읽었다');
  });

  it('시간을 주면 나타날 때까지 기다리고, 끝내 없으면 거짓이다', async () => {
    let 번 = 0;
    const { driver, execute } = 셸폰(async () => ((번 += 1) >= 3 ? 'receipt.pdf\n' : ''));
    expect(await 폰파일있나(driver, '/sdcard/Download', 'receipt.pdf', 3000)).toBe(true);
    expect(execute).toHaveBeenCalledTimes(3);
    const 빈폰 = 셸폰(async () => '');
    expect(await 폰파일있나(빈폰.driver, '/sdcard/Download', 'receipt.pdf', 900)).toBe(false);
    expect(빈폰.execute).toHaveBeenCalledTimes(3);
  });

  it('기다리는 중에 셸이 막히면 거짓으로 삼키지 않고 바로 던진다', async () => {
    const { driver, execute } = 셸폰(async () => {
      throw new Error('Potentially insecure feature adb_shell has not been enabled');
    });
    await expect(폰파일있나(driver, '/sdcard/Download', 'a.pdf', 10_000)).rejects.toThrow('폰파일있나: /sdcard/Download 를 못 읽었다');
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('폰 셸이 막혔으면 없음으로 넘기지 않고 까닭을 붙여 던진다 · 상대 경로는 안 보낸다', async () => {
    const { driver, execute } = 셸폰(async () => {
      throw new Error('Potentially insecure feature adb_shell has not been enabled');
    });
    await expect(폰파일있나(driver, '/sdcard/Download', 'a.pdf')).rejects.toThrow('폰파일있나: /sdcard/Download 를 못 읽었다(폰 셸 — Appium adb_shell 이 닫혔거나 폰이 그 폴더 읽기를 막았다) — Potentially insecure');
    execute.mockClear();
    await expect(폰파일있나(driver, 'Download', 'a.pdf')).rejects.toThrow('절대 경로');
    expect(execute).not.toHaveBeenCalled();
  });
});
