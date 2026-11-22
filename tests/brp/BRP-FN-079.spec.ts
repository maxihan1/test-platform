import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-079',
  name: '던전에 들어가면 조작 안내 창이 뜨고 제목이 「보스를 쓰러뜨리세요!」다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('방을 로비로 돌리고 일반 회원을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  });

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('자리를 고르고 「준비!」를 눌러 던전에 들어간다', async () => {
    const 로비 = await 로비화면.열림(game);
    await 로비.던전들어가기(0);
    const 던전 = await 던전화면.안내창뜸(game);
    await verify('던전에 들어가면 조작 안내 창이 뜨고 제목이 「보스를 쓰러뜨리세요!」다', await game.text(던전화면.안내제목), '보스를 쓰러뜨리세요!');
    const 설명 = await 던전.안내그림설명글들();
    const 이동 = await verify('조작 안내 창에 「이동 · 대상」 그림 설명이 보인다', 설명.includes('이동 · 대상'), true);
    const 공격 = await verify('조작 안내 창에 「기본 공격」 그림 설명이 보인다', 설명.includes('기본 공격'), true);
    const 확대 = await verify('조작 안내 창에 「확대」 그림 설명이 보인다', 설명.includes('확대'), true);
    const 스킬 = await verify('조작 안내 창에 「스킬」 그림 설명이 보인다', 설명.includes('스킬'), true);
    await verify('조작 안내 창에 「이동 · 대상」 · 「기본 공격」 · 「확대」 · 「스킬」 그림 설명이 보인다', 이동 && 공격 && 확대 && 스킬, true);
    await verify('조작 안내 창에 「확인」 버튼이 보인다', await game.text(던전화면.안내확인글), '확인');
  });
});
