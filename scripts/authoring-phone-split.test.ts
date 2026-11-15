// 폰 나눠 돌리기 검사 — 폰마다 계정 · 혼자 도는 케이스 · 다시 보기 판정 · 묶음 짜기 · 덤 폰 잡기 (도메인/작성 §3.6 「폰 여러 대로 나눠 돌린다」)
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type 한판, type 일, 계정번호들, 기록자리, 끈묶음읽기, 끈묶음적기, 다음기록번호, 덤폰놓기, 덤폰수, 덤폰잡기, 묶음계정글, 묶음기록이름, 묶음짜기, 빈폰질의, 판정하기, 혼자도나,
} from './authoring-phone-split.js';

const 주소 = 'http://qa.app.test';
const 계정 = (role: string, loginId: string, baseUrl = 주소, loginPassword = 'pw-123456') => ({ baseUrl, role, loginId, loginPassword });

describe('계정번호들 · 묶음계정글 — 폰마다 일반 회원 계정', () => {
  it('원래 일반 회원이 1, 같은 줄의 「일반 회원 N」이 N — 다른 줄 · 비밀번호 없음 · 원래와 같은 아이디는 안 센다', () => {
    const 글 = JSON.stringify([
      계정('일반 회원', 'qa_user1'),
      계정('일반 회원 3', 'qa_par3'),
      계정('일반 회원 2', 'qa_par2'),
      계정('일반 회원 4', 'qa_par4', 'http://other.test'),
      계정('일반 회원 5', 'qa_par5', 주소, ''),
      계정('일반 회원 6', 'qa_user1'),
      계정('일반 회원 7', 'qa_par2'),
      계정('관리자', 'admin'),
    ]);
    expect(계정번호들(글, `${주소}/api`)).toEqual([1, 2, 3]);
    expect(계정번호들(JSON.stringify([계정('일반 회원 2', 'qa_par2')]), 주소)).toEqual([1]);
    expect(계정번호들(undefined, 주소)).toEqual([1]);
    expect(계정번호들('깨짐', 주소)).toEqual([1]);
  });

  it('k 번 묶음은 그 줄 일반 회원 자리에 「일반 회원 k」 계정을 넣고 다른 줄 · 다른 역할은 그대로 둔다', () => {
    const 글 = JSON.stringify([계정('일반 회원', 'qa_user1'), 계정('일반 회원', 'web_user', 'http://web.test'), 계정('관리자', 'admin'), 계정('일반 회원 2', 'qa_par2')]);
    expect(묶음계정글(글, 주소, 1)).toBe(글);
    const 바꾼 = JSON.parse(묶음계정글(글, 주소, 2)!) as { role: string; loginId: string; baseUrl: string }[];
    expect(바꾼[0]).toMatchObject({ role: '일반 회원', loginId: 'qa_par2', baseUrl: 주소 });
    expect(바꾼.filter((a) => a.role === '일반 회원').map((a) => a.loginId)).toEqual(['qa_par2', 'web_user']);
    expect(바꾼.some((a) => a.loginId === 'qa_user1')).toBe(false);
    expect(바꾼.some((a) => a.role === '관리자')).toBe(true);
    expect(묶음계정글(글, 주소, 3)).toBe(글);
  });
});

describe('혼자도나 — 일반 회원 · 일회용 밖의 역할 케이스', () => {
  it('관리자 같은 역할을 쓰면 혼자, 일반 회원 · 일회용 · 꼬리표 없음은 같이 돈다', () => {
    expect(혼자도나(`params: z.object({ id: z.string().meta({ secret: true, account: '관리자' }) })`)).toBe(true);
    expect(혼자도나(`account: "일회용 · 암호 변경"`)).toBe(false);
    expect(혼자도나(`account: '일반 회원'`)).toBe(false);
    expect(혼자도나(`loginId: z.string().meta({ secret: true })`)).toBe(false);
  });
});

describe('기록자리 · 다음기록번호 — 기록 이름에 폰 · 계정을 싣는다', () => {
  it('새 꼴은 폰 · 계정을 읽고 옛 꼴은 폰 모름 · 원래 계정, 번호는 옛 꼴 · 새 꼴 · 끊겨 버린 기록을 다 센다', () => {
    expect(기록자리(`${묶음기록이름('gate3-app', 4, 'RF9R408GKRR', 2)}.json`)).toEqual({ 폰: 'RF9R408GKRR', 계정: 2 });
    expect(기록자리('gate3-app-3.json')).toEqual({ 폰: null, 계정: 1 });
    expect(다음기록번호(['gate3-app-3.json', 'gate3-app-5~R3C~1.json', 'gate3-app-7~R3C~2.json.끊김', 'gate3-game-9.json'], 'gate3-app')).toBe(8);
  });
});

describe('판정하기 — 빨간 케이스는 다른 폰 · 원래 계정으로 두 번까지 다시 본다', () => {
  const 판 = (폰: string, 계정번호: number, 빨강: boolean, 시작: number): 한판 => ({ 폰, 계정: 계정번호, 빨강, 시작, 오류: 빨강 ? '요소를 못 찾았다' : null });
  const 둘 = ['S21', 'A32'];

  it('안 돌았으면 안돎, 다 초록이면 초록', () => {
    expect(판정하기([], 둘, [1, 2])).toEqual({ 상태: '안돎' });
    expect(판정하기([판('S21', 1, false, 1)], 둘, [1, 2])).toEqual({ 상태: '초록' });
  });

  it('A32 에서 빨가면 같은 계정으로 다른 폰 — 거기서 초록이면 폰차이', () => {
    expect(판정하기([판('A32', 2, true, 1)], 둘, [1, 2])).toEqual({ 상태: '다시', 계정: 2, 뺄폰: 'A32' });
    expect(판정하기([판('A32', 2, true, 1), 판('S21', 2, false, 2)], 둘, [1, 2])).toEqual({ 상태: '폰차이', 빨간폰들: ['A32'], 오류: '요소를 못 찾았다' });
  });

  it('두 폰 다 빨갛고 「일반 회원 2」였으면 원래 계정으로 — 초록이면 계정차이, 빨가면 빨강', () => {
    const 두폰빨강 = [판('A32', 2, true, 1), 판('S21', 2, true, 2)];
    expect(판정하기(두폰빨강, 둘, [1, 2])).toEqual({ 상태: '다시', 계정: 1, 뺄폰: null });
    expect(판정하기([...두폰빨강, 판('S21', 1, false, 3)], 둘, [1, 2])).toEqual({ 상태: '계정차이', 계정: 2, 오류: '요소를 못 찾았다' });
    expect(판정하기([...두폰빨강, 판('S21', 1, true, 3)], 둘, [1, 2])).toEqual({ 상태: '빨강', 오류: '요소를 못 찾았다' });
  });

  it('이 꼴 전 기록(폰 모름)은 다른 폰으로 세지 않는다 — 같은 폰에서 다시 초록이었을 수 있다', () => {
    const 옛빨강: 한판 = { 폰: null, 계정: 1, 빨강: true, 시작: 1, 오류: '요소를 못 찾았다' };
    expect(판정하기([옛빨강, 판('S21', 1, false, 2)], 둘, [1, 2]).상태).not.toBe('폰차이');
    expect(판정하기([옛빨강], 둘, [1, 2])).toEqual({ 상태: '다시', 계정: 1, 뺄폰: null });
  });

  it('원래 계정으로 두 폰 다 빨가면 빨강 — 지금 다른 폰이 없거나 그 계정을 이제 못 쓰면 폰 다시 보기를 건너뛴다', () => {
    expect(판정하기([판('S21', 1, true, 1), 판('A32', 1, true, 2)], 둘, [1])).toEqual({ 상태: '빨강', 오류: '요소를 못 찾았다' });
    expect(판정하기([판('S21', 1, true, 1)], ['S21'], [1])).toEqual({ 상태: '빨강', 오류: '요소를 못 찾았다' });
    expect(판정하기([판('A32', 2, true, 1)], 둘, [1])).toEqual({ 상태: '다시', 계정: 1, 뺄폰: null });
    expect(판정하기([판('A32', 2, true, 1)], [], [1])).toEqual({ 상태: '다시', 계정: 1, 뺄폰: null });
  });
});

describe('묶음짜기 · 덤폰수 — 폰 하나에 계정 하나', () => {
  const 처음 = (파일: string, 혼자 = false): 일 => ({ 파일, 계정: null, 뺄폰: null, 혼자 });

  it('처음 도는 케이스는 덜 찬 묶음에 하나씩 · 묶음마다 칸까지', () => {
    const 묶음들 = 묶음짜기(['a', 'b', 'c', 'd', 'e'].map((f) => 처음(f)), ['S21', 'A32'], [1, 2], 2);
    expect(묶음들).toEqual([
      { 폰: 'S21', 계정: 1, 파일들: ['a', 'c'] },
      { 폰: 'A32', 계정: 2, 파일들: ['b', 'd'] },
    ]);
  });

  it('다시 보기는 그 계정 묶음에 들고 뺄 폰을 피해 폰을 고른다', () => {
    const 일들: 일[] = [{ 파일: 'x', 계정: 2, 뺄폰: 'A32', 혼자: false }, 처음('y')];
    expect(묶음짜기(일들, ['S21', 'A32'], [1, 2], 5)).toEqual([
      { 폰: 'S21', 계정: 2, 파일들: ['x'] },
      { 폰: 'A32', 계정: 1, 파일들: ['y'] },
    ]);
    expect(묶음짜기([{ 파일: 'x', 계정: 1, 뺄폰: 'S21', 혼자: false }], ['S21'], [1], 5)).toEqual([]);
  });

  it('혼자 도는 케이스는 같이 도는 케이스가 남으면 안 돌고, 다 끝나면 폰 하나 · 원래 계정으로만', () => {
    expect(묶음짜기([처음('관리', true), 처음('보통')], ['S21', 'A32'], [1, 2], 5)).toEqual([{ 폰: 'S21', 계정: 1, 파일들: ['보통'] }]);
    expect(묶음짜기([처음('관리', true), 처음('관리2', true)], ['S21', 'A32'], [1, 2], 5)).toEqual([{ 폰: 'S21', 계정: 1, 파일들: ['관리', '관리2'] }]);
  });

  it('더 잡을 폰 — 계정 수만큼(일보다 많이는 안), 다시 보기가 잡은 폰을 빼야 하면 하나, 잡은 폰이 끊겼으면 그 자리도', () => {
    expect(덤폰수([처음('a'), 처음('b'), 처음('c')], [1, 2], 'S21')).toBe(1);
    expect(덤폰수([처음('a')], [1, 2], 'S21')).toBe(0);
    expect(덤폰수([처음('a')], [1], 'S21')).toBe(0);
    expect(덤폰수([{ 파일: 'a', 계정: 1, 뺄폰: 'S21', 혼자: false }], [1], 'S21')).toBe(1);
    expect(덤폰수([처음('a', true)], [1, 2], 'S21')).toBe(0);
    expect(덤폰수([처음('a'), 처음('b')], [1, 2], null)).toBe(2);
    expect(덤폰수([], [1, 2], 'S21')).toBe(0);
  });
});

describe('덤폰잡기 · 덤폰놓기 — 팜에서 빈 폰을 더 잡고 기록을 남긴다', () => {
  let 폴더 = '';
  afterEach(() => rmSync(폴더, { recursive: true, force: true }));

  it('팜이 고르고 잡는 조건 잡기로 몇 대까지 잡고 빈 폰이 없다(409)면 멈춘다 · 놓으면 기록을 지운다', async () => {
    폴더 = mkdtempSync(join(tmpdir(), 'phone-split-'));
    const 남은 = ['RF9R408GKRR'];
    const 부름 = vi.fn(async (주소값: string, _설정?: RequestInit) => {
      if (!주소값.endsWith('/acquire')) return new Response('{}', { status: 200 });
      const 폰 = 남은.shift();
      return 폰 === undefined ? new Response('{"refused":"빈 폰 없음"}', { status: 409 }) : new Response(JSON.stringify({ held: { serial: 폰 } }), { status: 200 });
    });
    const 팜값 = { 부르기: 부름 as unknown as typeof fetch, 주소: 'http://farm.test', 토큰: 'pat_x' };
    expect(await 덤폰잡기(팜값, 3, 'com.shop.app', 폴더)).toEqual(['RF9R408GKRR']);
    expect(JSON.parse(String(부름.mock.calls[0]?.[1]?.body))).toEqual({ minutes: 30, app: 'com.shop.app' });
    expect(new Headers(부름.mock.calls[0]?.[1]?.headers).get('authorization')).toBe('Bearer pat_x');
    expect(existsSync(join(폴더, 'held-RF9R408GKRR'))).toBe(true);
    await 덤폰놓기(팜값, ['RF9R408GKRR'], 폴더);
    expect(부름.mock.calls.at(-1)?.[0]).toBe('http://farm.test/api/devices/RF9R408GKRR/hold');
    expect(부름.mock.calls.at(-1)?.[1]?.method).toBe('DELETE');
    expect(existsSync(join(폴더, 'held-RF9R408GKRR'))).toBe(false);
  });

  it('팜이 준 번호가 폰 번호 꼴이 아니면 기록을 안 쓰고 바로 놓는다', async () => {
    폴더 = mkdtempSync(join(tmpdir(), 'phone-split-'));
    const 부름 = vi.fn(async (주소값: string, _설정?: RequestInit) => new Response(주소값.endsWith('/acquire') ? JSON.stringify({ held: { serial: 'a/../x' } }) : '{}', { status: 200 }));
    expect(await 덤폰잡기({ 부르기: 부름 as unknown as typeof fetch, 주소: 'http://farm.test' }, 1, undefined, 폴더)).toEqual([]);
    expect(부름.mock.calls.at(-1)?.[1]?.method).toBe('DELETE');
  });

  it('결과를 못 낸 덤 폰 · 폰마다 계정을 적어 두면 다음 차례가 뺀다 — 잡은 폰 · 원래 계정은 안 적는다', () => {
    폴더 = mkdtempSync(join(tmpdir(), 'phone-split-'));
    expect(끈묶음읽기(폴더)).toEqual({ 폰들: new Set(), 계정들: new Set() });
    끈묶음적기(폴더, 'RF9R408GKRR', 2);
    끈묶음적기(폴더, null, 3);
    끈묶음적기(폴더, null, null);
    expect(끈묶음읽기(폴더)).toEqual({ 폰들: new Set(['RF9R408GKRR']), 계정들: new Set([2, 3]) });
  });

  it('스토어 앱이면 그 앱이 남는 빈 폰만 찾는다', () => {
    expect(빈폰질의('com.shop.app')).toBe('?app=com.shop.app&status=idle');
    expect(빈폰질의('https://qa.test/api/builds/1/apk')).toBe('?status=idle');
    expect(빈폰질의(undefined)).toBe('?status=idle');
  });
});
