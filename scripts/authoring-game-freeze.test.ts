// 멈춤 표시 검사 — 읽기 · 쓰기 · 지우기, 꼴이 틀리거나 링크이면 없는 것으로 (도메인/게임 §3.10 「조작 도우미」)
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { 멈춤표시읽기, 멈춤표시쓰기, 멈춤표시지우기 } from './authoring-game-freeze.js';

let 자료 = '';
afterEach(() => rmSync(자료, { recursive: true, force: true }));
const 새자료 = (): string => (자료 = mkdtempSync(join(tmpdir(), 'game-freeze-')));

describe('멈춤 표시', () => {
  it('쓴 것을 읽고 지우면 없다', () => {
    const d = 새자료();
    expect(멈춤표시읽기(d)).toBeNull();
    멈춤표시쓰기(d, 0.25, new Date('2026-11-25T01:00:00.000Z'));
    expect(멈춤표시읽기(d, Date.parse('2026-11-25T01:29:00.000Z'))).toEqual({ 배율: 0.25, 때: '2026-11-25T01:00:00.000Z' });
    // 잡기 한 번(30분)보다 오래된 표시는 남의 게임 것일 수 있다 — 없는 것으로 본다
    expect(멈춤표시읽기(d, Date.parse('2026-11-25T01:31:00.000Z'))).toBeNull();
    멈춤표시쓰기(d, 1);
    expect(멈춤표시읽기(d)?.배율).toBe(1);
    멈춤표시지우기(d);
    expect(멈춤표시읽기(d)).toBeNull();
    expect(() => 멈춤표시지우기(d)).not.toThrow();
  });

  it('꼴이 틀리거나 링크이면 없는 것으로 본다', () => {
    const d = 새자료();
    for (const 글 of ['깨진 글', 'null', '{"배율":"1","때":"t"}', '{"배율":1}', '[]', '{"배율":1,"때":"언젠가"}']) {
      writeFileSync(join(d, 'game-freeze.json'), 글);
      expect(멈춤표시읽기(d)).toBeNull();
    }
    rmSync(join(d, 'game-freeze.json'));
    writeFileSync(join(d, 'real.json'), '{"배율":1,"때":"t"}');
    symlinkSync(join(d, 'real.json'), join(d, 'game-freeze.json'));
    expect(멈춤표시읽기(d)).toBeNull();
    멈춤표시쓰기(d, 2);
    expect(멈춤표시읽기(d)?.배율).toBe(2);
  });
});
