// 돌려 보기 브라우저 번호표 검사 — 자리 수 · 잡고 놓기 · 버려진 자리 치우기 · 기다리기 (작성 §3.6 「돌려 보기 명령」)
import { existsSync, lstatSync, mkdirSync, mkdtempSync, statSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { 자리기다리기, 자리놓기, 자리수, 자리잡기, 자리폴더열기 } from './authoring-slot.js';

const 새폴더 = () => join(mkdtempSync(join(tmpdir(), 'slot-')), '자리');
/** 리눅스 pid 상한(4194304) · macOS 상한(99999) 밖이라 늘 없는 번호 */
const 죽은pid = 4_194_399;

describe('자리수 — CPU 3개마다 1개 (2026-10-22 사용자)', () => {
  it('8코어는 2개 · 3코어 아래도 1개', () => {
    expect([2, 3, 8, 12].map((cpu) => 자리수(cpu))).toEqual([1, 1, 2, 4]);
  });
});

describe('자리잡기 · 자리놓기', () => {
  it('자리 수만큼만 잡히고 놓으면 다음이 받는다', () => {
    const 폴더 = 새폴더();
    const 하나 = 자리잡기(폴더, 2);
    const 둘 = 자리잡기(폴더, 2);
    expect([하나, 둘]).toEqual([join(폴더, '1'), join(폴더, '2')]);
    expect(자리잡기(폴더, 2)).toBeNull();
    자리놓기(하나!);
    expect(자리잡기(폴더, 2)).toBe(join(폴더, '1'));
  });

  it('놓을 때 남이 다시 잡은 자리는 안 지운다', () => {
    const 폴더 = 새폴더();
    const 잡은 = 자리잡기(폴더, 1)!;
    writeFileSync(잡은, String(process.ppid));
    자리놓기(잡은);
    expect(existsSync(잡은)).toBe(true);
  });

  it('주인이 죽었거나 15분 넘게 쥔 자리는 치우고 잡는다 — 살아 있는 주인의 자리는 안 건드린다', () => {
    const 폴더 = 새폴더();
    mkdirSync(폴더, { recursive: true });
    writeFileSync(join(폴더, '1'), String(process.ppid));
    expect(자리잡기(폴더, 1)).toBeNull();
    writeFileSync(join(폴더, '1'), String(죽은pid));
    expect(자리잡기(폴더, 1)).toBe(join(폴더, '1'));
    writeFileSync(join(폴더, '1'), String(process.ppid));
    const 옛날 = (Date.now() - 16 * 60_000) / 1000;
    utimesSync(join(폴더, '1'), 옛날, 옛날);
    expect(자리잡기(폴더, 1)).toBe(join(폴더, '1'));
  });

  it('남의 uid 가 주인 번호를 읽게 자리 파일은 0644 · 폴더는 0777 — 잡던 임시 파일은 남기지 않는다', () => {
    const 폴더 = 새폴더();
    const 잡은 = 자리잡기(폴더, 1)!;
    expect(statSync(잡은).mode & 0o777).toBe(0o644);
    expect(statSync(폴더).mode & 0o777).toBe(0o777);
    expect(existsSync(join(폴더, `.잡는중-${process.pid}`))).toBe(false);
  });
});

describe('자리기다리기', () => {
  it('마감까지 안 나면 null, 기다리는 사이 놓이면 받는다', async () => {
    const 폴더 = 새폴더();
    const 잡은 = 자리잡기(폴더, 1)!;
    expect(await 자리기다리기(Date.now() + 50, 폴더, 1, 20)).toBeNull();
    setTimeout(() => 자리놓기(잡은), 30);
    expect(await 자리기다리기(Date.now() + 2_000, 폴더, 1, 20)).toBe(잡은);
  });
});

describe('자리폴더열기 — root', () => {
  it.skipIf(process.getuid?.() === 0)('자식이 심은 링크를 따라가 남의 폴더를 열지 않고 지운 뒤 새로 만든다 (root 가 아니면 그 폴더도 못 믿어 멈춘다)', () => {
    const 바탕 = mkdtempSync(join(tmpdir(), 'slot-'));
    const 남의 = join(바탕, '남의');
    mkdirSync(남의, { mode: 0o700 });
    const 자리 = join(바탕, '자리');
    symlinkSync(남의, 자리);
    expect(() => 자리폴더열기(자리, true)).toThrow();
    expect(lstatSync(자리).isSymbolicLink()).toBe(false);
    expect(statSync(남의).mode & 0o777).toBe(0o700);
  });
});
