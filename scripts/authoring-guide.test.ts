// 서비스 가이드 받아 두기 검사 — guide/ 에 글 셋 · 첨부 · 판 번호 · 「비밀번호: 값」 가림 · 워드 원본 지우기 · 못 받아도 간다
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 가이드글, 가이드받기, 가이드읽기 } from './authoring-guide.js';

const 서버 = { 주소기지: 'http://admin:3000', 토큰: 't' };
const 판 = { version: 3, intro: '데모마켓 쇼핑몰', policy: '', rules: '테스트 주문은 qa- 로 시작한다\n관리자 비밀번호: Adm1n!pass', files: [] as { id: number; name: string; section: string }[] };

let 자료 = '';
beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'guide-'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rmSync(자료, { recursive: true, force: true });
});

/** 가이드는 JSON, 파일은 바이트로 답한다 */
const 서버답 = (가이드: unknown, 파일들: Record<number, string | number> = {}) => {
  const 건것: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    건것.push(url);
    const 파일 = /\/guide\/files\/(\d+)/.exec(url);
    if (파일 === null) return new Response(JSON.stringify(가이드), { status: 200 });
    const 몸 = 파일들[Number(파일[1])];
    return typeof 몸 === 'number' ? new Response('{}', { status: 몸 }) : new Response(몸 ?? '', { status: 200 });
  });
  return 건것;
};
const 안바꿈 = () => ({ ok: true, 까닭: '' });
const 글 = (이름: string) => readFileSync(join(자료, 'guide', 이름), 'utf8');

describe('가이드읽기', () => {
  it('모양이 맞으면 그대로, 칸이 빠지거나 틀리면 null', () => {
    expect(가이드읽기(판)).toEqual(판);
    expect(가이드읽기({ ...판, version: -1 })).toBeNull();
    expect(가이드읽기({ ...판, intro: null })).toBeNull();
    expect(가이드읽기({ ...판, files: [{ id: '1', name: 'a.md', section: 'intro' }] })).toBeNull();
    expect(가이드읽기(null)).toBeNull();
  });
});

describe('가이드글', () => {
  it('첫 줄이 판 번호 · 구획 셋 · 빈 구획은 글 없음 · 첨부는 구획 아래 읽을 자리와 원래 이름, 못 읽은 것은 까닭', () => {
    const 글 = 가이드글(판, [
      { 구획: 'policy', 이름: '결제.docx', 자리: '/자료/guide/7.txt' },
      { 구획: 'policy', 이름: '옛.doc', 자리: null, 까닭: '옛 워드' },
    ]);
    expect(글.split('\n')[0]).toBe('<!-- guide-version: 3 -->');
    expect(글).toContain('## 서비스 소개\n\n데모마켓 쇼핑몰');
    expect(글).toContain('## 정책\n\n(글 없음)\n\n첨부:\n- /자료/guide/7.txt  (원래 이름: 결제.docx)\n- 「옛.doc」 — 못 읽었다: 옛 워드');
    expect(글).toContain('## 프로젝트 규칙\n\n테스트 주문은 qa- 로 시작한다');
  });
});

describe('가이드받기', () => {
  it('판을 받아 guide/guide.md 에 두고 판 번호를 돌려준다 · 「비밀번호: 값」 꼴을 가린다', async () => {
    const 건것 = 서버답(판);
    expect(await 가이드받기(서버, 'MKT', 7, 자료, 안바꿈, null)).toBe(3);
    expect(건것).toEqual(['http://admin:3000/api/authoring/requests/7/guide?service=MKT']);
    expect(글('guide.md')).toContain('관리자 비밀번호: ••••••');
    expect(글('guide.md')).not.toContain('Adm1n!pass');
  });

  it('판이 0 이면 아무것도 안 둔다', async () => {
    서버답({ ...판, version: 0, intro: '', rules: '' });
    expect(await 가이드받기(서버, 'MKT', 7, 자료, 안바꿈, null)).toBe(0);
    expect(existsSync(join(자료, 'guide'))).toBe(false);
  });

  it('첨부를 파일 번호 이름으로 받고 글자 첨부도 가린다 · 워드는 글자로 바꾼 뒤 원본을 지운다', async () => {
    const 건것 = 서버답(
      { ...판, files: [{ id: 11, name: '../소개.md', section: 'intro' }, { id: 12, name: '결제.docx', section: 'policy' }] },
      { 11: '# 소개\npw=qa1234!x', 12: 'PK워드' },
    );
    const 바꾼것: string[][] = [];
    const 바꾸기 = (변환: { 명령: string; 인자: string[] }) => {
      바꾼것.push(변환.인자);
      writeFileSync(join(자료, 'guide', '12.txt'), '결제는 테스트 카드만 · 비밀번호: card9999z');
      return { ok: true, 까닭: '' };
    };
    expect(await 가이드받기(서버, 'MKT', 7, 자료, 바꾸기, null, 'linux')).toBe(3);
    expect(건것.slice(1)).toEqual([
      'http://admin:3000/api/authoring/requests/7/guide/files/11?service=MKT',
      'http://admin:3000/api/authoring/requests/7/guide/files/12?service=MKT',
    ]);
    expect(바꾼것).toEqual([['-t', 'plain', '--wrap=none', '-o', join(자료, 'guide', '12.txt'), join(자료, 'guide', '12.docx')]]);
    expect(readdirSync(join(자료, 'guide')).sort()).toEqual(['11.md', '12.txt', 'guide.md']);
    expect(글('11.md')).toBe('# 소개\npw=••••••');
    expect(글('12.txt')).toBe('결제는 테스트 카드만 · 비밀번호: ••••••');
    expect(글('guide.md')).toContain(`- ${join(자료, 'guide', '12.txt')}  (원래 이름: 결제.docx)`);
  });

  it('못 받은 첨부 · 못 바꾼 워드 · 서버의 옛 워드는 건너뛰고 guide.md 에 까닭을 적는다', async () => {
    서버답(
      { ...판, files: [{ id: 1, name: 'a.pdf', section: 'rules' }, { id: 2, name: 'b.docx', section: 'rules' }, { id: 3, name: 'c.doc', section: 'rules' }] },
      { 1: 404, 2: 'PK' },
    );
    expect(await 가이드받기(서버, 'MKT', 7, 자료, () => ({ ok: false, 까닭: '깨진 파일' }), null, 'linux')).toBe(3);
    expect(readdirSync(join(자료, 'guide'))).toEqual(['guide.md']);
    expect(글('guide.md')).toContain('- 「a.pdf」 — 못 읽었다: 서버 404\n- 「b.docx」 — 못 읽었다: 글자로 못 바꿨다 — 깨진 파일\n- 「c.doc」 — 못 읽었다: 옛 워드(.doc)라 서버가 못 읽는다');
  });

  it('가이드를 못 받으면 0 이고 앞 실행이 남긴 guide/ 도 지운다 — 작성은 간다', async () => {
    서버답(판);
    await 가이드받기(서버, 'MKT', 7, 자료, 안바꿈, null);
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 500 }));
    expect(await 가이드받기(서버, 'MKT', 7, 자료, 안바꿈, null)).toBe(0);
    expect(existsSync(join(자료, 'guide'))).toBe(false);
  });

  it('거절(401)은 다시 던진다 — 줄 돌기가 보고 멈춘다', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 401 }));
    await expect(가이드받기(서버, 'MKT', 7, 자료, 안바꿈, null)).rejects.toThrow();
  });
});
