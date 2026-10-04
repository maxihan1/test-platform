// 화면 기록 저장본 디스크 일 검사 — 넣기 · 갈기 · 링크를 따라가지 않기 (도메인/작성 §3.6 「★ 역방향」 · 2026-10-04 검토 BLOCKER 3)
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { 저장본갈기, 저장본넣기, 저장폴더 } from './authoring-screens-keep-io.js';

function 판차리기() {
  const 바탕 = mkdtempSync(join(tmpdir(), 'keep-'));
  const 자료 = join(바탕, 'author-1', 'assets');
  mkdirSync(join(자료, 'crawl'), { recursive: true });
  mkdirSync(join(자료, 'screens'), { recursive: true });
  const 목록 = [
    { 주소: 'https://s.test/', 상태: '로그아웃', 틀: '/', 지문: 'a', 글자지문: 'g1', 파일: '로그아웃/001.yml' },
    { 주소: 'https://s.test/login', 상태: '로그아웃', 틀: '/login', 지문: 'b', 글자지문: 'g2', 파일: '로그아웃/002.yml' },
  ];
  writeFileSync(join(자료, 'crawl', 'list.json'), JSON.stringify(목록));
  writeFileSync(join(자료, 'crawl', 'summary.json'), JSON.stringify({ 멈춘까닭: null, 따라가기: true, 상태들: ['로그아웃'], 예외: false }));
  writeFileSync(join(자료, 'screens', 'out-001.md'), '# https://s.test/\n홈 기록');
  writeFileSync(join(자료, 'screens', 'out-002.md'), '# https://s.test/login\n로그인 기록');
  return { 바탕, 자료 };
}

describe('저장본갈기 · 저장본넣기', () => {
  it('이번에 본 화면을 저장하고, 다음 작성 자료 폴더 kept/ 로 넣는다', () => {
    const { 바탕, 자료 } = 판차리기();
    expect(저장본갈기(바탕, 'CDY', 자료, true, '2026-10-04')).toContain('새로 저장 2장');
    const 다음자료 = join(바탕, 'author-2', 'assets');
    mkdirSync(다음자료, { recursive: true });
    expect(저장본넣기(바탕, 'CDY', 다음자료)).toBe(2);
    const 넣은것 = readdirSync(join(다음자료, 'kept')).sort();
    expect(넣은것).toHaveLength(3);
    expect(JSON.parse(readFileSync(join(다음자료, 'kept', 'index.json'), 'utf8')).항목).toHaveLength(2);
  });

  it('자료 폴더의 기록이 링크면 따라가지 않는다 — 트리 밖 파일이 저장본에 안 들어간다', () => {
    const { 바탕, 자료 } = 판차리기();
    const 밖 = join(바탕, '비밀.txt');
    writeFileSync(밖, '# https://s.test/login\n비밀');
    symlinkSync(밖, join(자료, 'screens', 'link.md'));
    writeFileSync(join(자료, 'screens', 'out-002.md'), '첫 줄 주소 없음');
    expect(저장본갈기(바탕, 'CDY', 자료, true, '2026-10-04')).toContain('새로 저장 1장');
    const 폴더 = 저장폴더(바탕, 'CDY')!;
    const 글 = readdirSync(폴더).filter((x) => x.endsWith('.md')).map((x) => readFileSync(join(폴더, x), 'utf8')).join('\n');
    expect(글).not.toContain('비밀');
  });

  it('크롤 목록이 없으면 아무것도 안 한다 · 다 보지 않았으면 못 본 화면을 안 지운다', () => {
    const { 바탕, 자료 } = 판차리기();
    저장본갈기(바탕, 'CDY', 자료, true, '2026-10-04');
    writeFileSync(join(자료, 'crawl', 'list.json'), JSON.stringify([{ 주소: 'https://s.test/', 상태: '로그아웃', 틀: '/', 지문: 'a', 글자지문: 'g9' }]));
    writeFileSync(join(자료, 'crawl', 'summary.json'), JSON.stringify({ 멈춘까닭: '로그아웃 몫 시간', 따라가기: true }));
    expect(저장본갈기(바탕, 'CDY', 자료, true, '2026-10-05')).toContain('저장본 2장');
    const 빈자료 = join(바탕, 'author-3', 'assets');
    mkdirSync(빈자료, { recursive: true });
    expect(저장본갈기(바탕, 'CDY', 빈자료, true)).toContain('건너뜀');
  });

  it('「같음」으로 재사용한 화면은 지워지지 않고 훑은 날도 그대로다 — 스킬대로 첫 줄을 이번 주소로 바꿔 복사해도 (검사 BLOCKER 2)', () => {
    const { 바탕, 자료 } = 판차리기();
    저장본갈기(바탕, 'CDY', 자료, true, '2026-10-04');
    const 읽기 = () => JSON.parse(readFileSync(join(저장폴더(바탕, 'CDY')!, 'index.json'), 'utf8')) as { 항목: { 주소: string; 기록: string; 훑은날: string }[] };
    const 로그인기록 = 읽기().항목.find((x) => x.주소 === 'https://s.test/login')!.기록;
    writeFileSync(
      join(자료, 'crawl', 'list.json'),
      JSON.stringify([
        { 주소: 'https://s.test/', 상태: '로그아웃', 틀: '/', 지문: 'a', 글자지문: 'g1' },
        { 주소: 'https://s.test/login', 상태: '로그아웃', 틀: '/login', 지문: 'b', 글자지문: 'g2', 저장본: '같음', 저장기록: 로그인기록 },
      ]),
    );
    writeFileSync(join(자료, 'screens', 'out-002.md'), '# https://s.test/login\n재사용해 복사한 기록');
    const 줄 = 저장본갈기(바탕, 'CDY', 자료, true, '2026-10-20');
    expect(줄).toContain('재사용 1장(가장 오래된 것 16일)');
    expect(읽기().항목.find((x) => x.주소 === 'https://s.test/login')!.훑은날).toBe('2026-10-04');
  });

  it('로그아웃만 돌았으면 다 봤어도 로그인 기록은 안 지운다 · 크롤 예외면 안 지운다 (검사 주의 1)', () => {
    const { 바탕, 자료 } = 판차리기();
    writeFileSync(join(자료, 'crawl', 'list.json'), JSON.stringify([{ 주소: 'https://s.test/my', 상태: '로그인', 틀: '/my', 지문: 'm', 글자지문: 'gm' }]));
    writeFileSync(join(자료, 'screens', 'in-001.md'), '# https://s.test/my\n내 정보');
    writeFileSync(join(자료, 'crawl', 'summary.json'), JSON.stringify({ 멈춘까닭: null, 따라가기: true, 상태들: ['로그아웃', '로그인'], 예외: false }));
    저장본갈기(바탕, 'CDY', 자료, true, '2026-10-04');
    writeFileSync(join(자료, 'crawl', 'list.json'), JSON.stringify([{ 주소: 'https://s.test/', 상태: '로그아웃', 틀: '/', 지문: 'a', 글자지문: 'g1' }]));
    writeFileSync(join(자료, 'crawl', 'summary.json'), JSON.stringify({ 멈춘까닭: null, 따라가기: true, 상태들: ['로그아웃'], 예외: false }));
    expect(저장본갈기(바탕, 'CDY', 자료, true, '2026-10-05')).toContain('저장본 2장');
    writeFileSync(join(자료, 'crawl', 'summary.json'), JSON.stringify({ 멈춘까닭: null, 따라가기: true, 상태들: ['로그아웃', '로그인'], 예외: true }));
    expect(저장본갈기(바탕, 'CDY', 자료, true, '2026-10-06')).not.toContain('지움');
  });

  it('저장 폴더가 링크면 쓰지 않는다 · 접두사 꼴이 틀리면 자리가 없다', () => {
    const { 바탕, 자료 } = 판차리기();
    const 엉뚱 = join(바탕, '엉뚱');
    mkdirSync(엉뚱);
    mkdirSync(join(바탕, 'screens'));
    symlinkSync(엉뚱, join(바탕, 'screens', 'CDY'));
    expect(저장본갈기(바탕, 'CDY', 자료, true)).toContain('건너뜀');
    expect(readdirSync(엉뚱)).toEqual([]);
    expect(저장폴더(바탕, '../x')).toBeNull();
  });
});
