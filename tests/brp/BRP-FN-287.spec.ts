import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇과파티로던전입장, 불러낸임프잡기, 장비끼기, 퀘스트처음으로 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM골드, GM모두처치, GM임프불러내기, 색글떼기 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-287',
  name: '파티 · 장비와 상관없이 임프 1마리를 잡으면 「임프 30마리 처치」 진행이 1 오른다',
  platforms: ['windows'],
  precondition: ['일반 회원이 「현자의 목걸이」를 끼고 두 번째 플레이어와 파티로 던전에 있고 오늘 퀘스트를 처음으로 돌렸다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  const 봇아이디 = params.p2Id ?? '';
  const 봇비밀번호 = params.p2Password ?? '';
  await test.cleanup('봇을 끄고 방을 로비로 돌린 뒤 두 계정을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 봇아이디, 봇비밀번호, 'base');
  });

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('「현자의 목걸이」를 끼고 두 번째 플레이어와 파티로 던전에 들어온 것을 확인한다', async () => {
    await GM골드(game, 1000);
    await 장비끼기(game, '현자의 목걸이');
    const 가방 = await 가방창.열기(game);
    await verify('장신구 칸에 「현자의 목걸이」가 있다', 색글떼기(await 가방.칸글('장신구')).includes('현자의 목걸이'), true, { blocker: true });
    await 가방.닫기();
    await 봇과파티로던전입장(admin, game, 봇아이디, 봇비밀번호, 아이디);
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });

  await test.step('오늘 일일 퀘스트를 처음으로 돌린 것을 확인한다', async () => {
    await GM모두처치(game);
    await 퀘스트처음으로(game);
    const 퀘스트 = await 퀘스트창.열기(game);
    await verify('「임프 30마리 처치」 진행이 0 이다', await 퀘스트.진행수('임프 30마리 처치'), 0, { blocker: true });
    await 퀘스트.닫기();
  });

  await test.step('/gm spawn imp 로 임프 하나를 불러 잡는다', async () => {
    const 던전 = await 던전화면.열림(game);
    await GM임프불러내기(game);
    await verify('불러낸 임프를 잡았다', await 불러낸임프잡기(던전), true, { blocker: true });
    const 퀘스트 = await 퀘스트창.열기(game);
    await 퀘스트.진행수가바뀔때까지('임프 30마리 처치', 0);
    const 수 = await 퀘스트.진행수('임프 30마리 처치');
    await 퀘스트.닫기();
    await verify('파티 · 장비와 상관없이 임프 1마리를 잡으면 「임프 30마리 처치」 진행이 1 오른다', 수, 1);
  });
});
