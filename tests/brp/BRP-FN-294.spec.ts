import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 퀘스트처음으로 } from './helpers/items.helper.js';
import { 던전입장, 로그인하기, 방로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM보스방가기, GM보스처치 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-294',
  name: '보스 임프가 죽으면 「던전 보스 처치」 진행이 「1/1」이 된다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있고 오늘 일일 퀘스트를 처음으로 돌려 두었다'],
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

  await test.step('오늘 일일 퀘스트를 처음으로 돌려 둔 것을 확인한다', async () => {
    const 글 = await 퀘스트처음으로(game);
    await verify('퀘스트 진행이 모두 0 에서 시작한다', 글.split(' · ').every((칸) => 칸.startsWith('0/')), true, { blocker: true });
  });

  await test.step('던전에서 /gm tp boss 뒤 /gm killboss 로 보스를 잡는다', async () => {
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
    await GM보스방가기(game);
    await GM보스처치(game);
    await 방로비로(admin, game);
    const 퀘스트 = await 퀘스트창.열기(game);
    await 퀘스트.진행이될때까지('던전 보스 처치', '1/1', 30_000);
    const 글 = await 퀘스트.진행글('던전 보스 처치');
    await 퀘스트.닫기();
    await verify('보스 임프가 죽으면 「던전 보스 처치」 진행이 「1/1」이 된다', 글, '1/1');
  });
});
