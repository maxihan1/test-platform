// 폰에 파일 넣기 검사 — 종류별 폴더 · 작게 보내고 폰 안에서 늘리기 · 미디어 훑기 물러서기 · 지우기
import { describe, expect, it, vi } from 'vitest';

import type { AppDriver } from './app.js';
import { 폰에파일넣기 } from './phoneMedia.js';

function 가짜폰(scanMedia: 'ok' | 'fail' = 'ok') {
  const 부름: { 명령: string; 값: unknown }[] = [];
  const driver = {
    pushFile: vi.fn(async (경로: string, 글: string) => void 부름.push({ 명령: 'push', 값: { 경로, 크기: Buffer.from(글, 'base64').length } })),
    execute: vi.fn(async (명령: string, 값: unknown) => {
      부름.push({ 명령, 값 });
      if (명령 === 'mobile: scanMedia' && scanMedia === 'fail') throw new Error('Unknown mobile command');
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

  it('바탕보다 작은 크기 · 정수가 아닌 크기 · 경로를 흔드는 확장자는 보내기 전에 던진다', async () => {
    const { driver } = 가짜폰();
    await expect(폰에파일넣기(driver, '사진', { 크기: 10 })).rejects.toThrow('크기는');
    await expect(폰에파일넣기(driver, '영상', { 크기: 1.5e6 + 0.5 })).rejects.toThrow('크기는');
    await expect(폰에파일넣기(driver, '파일', { 확장자: '../x' })).rejects.toThrow('확장자는');
    expect(driver.pushFile).not.toHaveBeenCalled();
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
