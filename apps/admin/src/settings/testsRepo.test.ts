// 테스트 저장소 주소 맞추기 · 받아 둔 자리 · 서비스 폴더 검사
import { describe, expect, it } from 'vitest';

import { 서비스폴더, 저장소자리, 저장소주소맞추기 } from './testsRepo.js';

describe('저장소주소맞추기', () => {
  it('끝의 / 와 .git 을 떼고 앞뒤 공백을 지운다', () => {
    expect(저장소주소맞추기(' https://github.com/maxihan1/demo-market.git ')).toBe('https://github.com/maxihan1/demo-market');
    expect(저장소주소맞추기('https://github.com/maxihan1/demo-market/')).toBe('https://github.com/maxihan1/demo-market');
    expect(저장소주소맞추기('https://github.com/Max-1/a_b.c')).toBe('https://github.com/Max-1/a_b.c');
  });

  it('빈 칸은 빈 칸이다', () => {
    expect(저장소주소맞추기('  ')).toBe('');
  });

  it.each([
    'git@github.com:maxihan1/demo-market.git',
    'http://github.com/maxihan1/demo-market',
    'https://gitlab.com/maxihan1/demo-market',
    'https://github.com/maxihan1',
    'https://github.com/maxihan1/demo-market/tree/main',
    'https://github.com/maxihan1/..',
    'https://github.com/-bad/x',
    'https://github.com/a/b c',
  ])('다른 꼴 %s 는 null', (주소) => {
    expect(저장소주소맞추기(주소)).toBeNull();
  });
});

describe('저장소자리 · 서비스폴더', () => {
  it('자리는 <소유자>/<이름> 이고 폴더는 그 아래 tests/<폴더> 다', () => {
    expect(저장소자리('https://github.com/maxihan1/demo-market.git')).toBe('maxihan1/demo-market');
    expect(서비스폴더('https://github.com/maxihan1/demo-market', 'dmw')).toBe('maxihan1/demo-market/tests/dmw');
  });

  it('비었거나 꼴이 틀리면 자리가 없다', () => {
    expect(저장소자리('')).toBeNull();
    expect(서비스폴더('git@github.com:a/b', 'dmw')).toBeNull();
  });
});
