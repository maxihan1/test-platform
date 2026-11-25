// 배운 조작 도우미 이어 쓰기 — 남기기 · 없는 것만 가져오기 · 링크와 비밀번호 거르기 (도메인/게임 §3.10 「게임 배우기」)
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 도우미가져오기, 도우미남기기, type 도우미자리 } from './authoring-learn-helpers.js';

let 뿌리 = '';
beforeEach(() => void (뿌리 = mkdtempSync(join(tmpdir(), 'learn-helpers-'))));
afterEach(() => rmSync(뿌리, { recursive: true, force: true }));

const 자리 = (번호: number): 도우미자리 => ({ 바탕: 뿌리, 접두사: 'CGP', 트리: join(뿌리, `author-${번호}`, 'tree'), 폴더: 'cgp' });
const 도우미폴더 = (o: 도우미자리): string => join(o.트리, 'tests', 'cgp', 'helpers');
const 새트리 = (번호: number, 파일: Record<string, string> = {}): 도우미자리 => {
  const o = 자리(번호);
  mkdirSync(join(o.트리, 'tests'), { recursive: true });
  for (const [이름, 글] of Object.entries(파일)) {
    mkdirSync(도우미폴더(o), { recursive: true });
    writeFileSync(join(도우미폴더(o), 이름), 글);
  }
  return o;
};

describe('조작 도우미 이어 쓰기', () => {
  it('앞 작성의 도우미를 다음 작성의 새 트리에 가져온다 — 트리에 있는 것은 안 덮는다', () => {
    const 앞 = 새트리(1, { 'stage.helper.ts': '앞 판', 'menu.helper.ts': '앞 메뉴', 'note.txt': 'ㄱ' });
    expect(도우미남기기(앞, [])).toEqual(['menu.helper.ts', 'stage.helper.ts']);
    const 뒤 = 새트리(2, { 'menu.helper.ts': 'main 메뉴' });
    expect(도우미가져오기(뒤, null)).toEqual(['stage.helper.ts']);
    expect(readFileSync(join(도우미폴더(뒤), 'stage.helper.ts'), 'utf8')).toBe('앞 판');
    expect(readFileSync(join(도우미폴더(뒤), 'menu.helper.ts'), 'utf8')).toBe('main 메뉴');
    expect(existsSync(join(도우미폴더(뒤), 'note.txt'))).toBe(false);
    // 도우미 폴더가 없는 새 트리에는 만들어 준다 · 다른 애플리케이션 것은 안 가져온다
    expect(도우미가져오기(새트리(3), null)).toEqual(['menu.helper.ts', 'stage.helper.ts']);
    expect(도우미가져오기({ ...새트리(4), 접두사: 'ARG' }, null)).toEqual([]);
  });

  it('더 나아진 것으로 바꿔 남긴다', () => {
    도우미남기기(새트리(1, { 'stage.helper.ts': '옛것' }), []);
    도우미남기기(새트리(2, { 'stage.helper.ts': '새것' }), []);
    expect(도우미가져오기(새트리(3), null)).toEqual(['stage.helper.ts']);
    expect(readFileSync(join(도우미폴더(자리(3)), 'stage.helper.ts'), 'utf8')).toBe('새것');
  });

  it('비밀번호가 든 파일 · 링크는 남기지 않고, 링크로 바꾼 폴더에는 쓰지 않는다', () => {
    const 앞 = 새트리(1, { 'a.helper.ts': 'pw-secret-1', 'b.helper.ts': 'ㄱ' });
    writeFileSync(join(뿌리, '밖'), '밖');
    symlinkSync(join(뿌리, '밖'), join(도우미폴더(앞), 'c.helper.ts'));
    expect(도우미남기기(앞, ['pw-secret-1'])).toEqual(['b.helper.ts']);
    const 뒤 = 새트리(2);
    mkdirSync(join(뿌리, '남의것'));
    symlinkSync(join(뿌리, '남의것'), join(뒤.트리, 'tests', 'cgp'));
    expect(도우미가져오기(뒤, null)).toEqual([]);
    expect(existsSync(join(뿌리, '남의것', 'helpers'))).toBe(false);
    expect(도우미남기기(뒤, [])).toEqual([]);
  });
});
