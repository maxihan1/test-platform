import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇과던전입장, 불러낸임프잡기, 퀘스트처음으로 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기, 봇시키기 } from './helpers/game-state.helper.js';
import { GM모두처치, GM임프불러내기 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-293',
  name: '임프가 죽으면 「임프 30마리 처치」 진행이 1 오른다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있고 오늘 일일 퀘스트를 처음으로 돌려 두었다', '일반 회원과 두 번째 플레이어 봇이 던전에 있고 오늘 퀘스트를 처음으로 돌렸다'],
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
  let 봇 = '';
  await test.cleanup('봇을 끄고 방을 로비로 돌린 뒤 두 계정을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 봇아이디, 봇비밀번호, 'base');
  });

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('일반 회원과 두 번째 플레이어 봇이 던전에 있고 오늘 퀘스트를 처음으로 돌린 것을 확인한다', async () => {
    const 들어옴 = await 봇과던전입장(admin, game, 봇아이디, 봇비밀번호);
    봇 = 들어옴.봇;
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
    await GM모두처치(game);
    await 퀘스트처음으로(game);
    const 퀘스트 = await 퀘스트창.열기(game);
    await verify('「임프 30마리 처치」 진행이 0 이다', await 퀘스트.진행수('임프 30마리 처치'), 0, { blocker: true });
    await 퀘스트.닫기();
  });

  await test.step('던전에서 /gm spawn imp 로 불러낸 임프를 잡는다', async () => {
    const 던전 = await 던전화면.열림(game);
    await GM임프불러내기(game);
    await verify('불러낸 임프를 잡았다', await 불러낸임프잡기(던전), true, { blocker: true });
    const 퀘스트 = await 퀘스트창.열기(game);
    await 퀘스트.진행수가바뀔때까지('임프 30마리 처치', 0);
    const 수 = await 퀘스트.진행수('임프 30마리 처치');
    await 퀘스트.닫기();
    await verify('임프가 죽으면 「임프 30마리 처치」 진행이 1 오른다', 수, 1);
  });

  await test.step('봇이 /gm killall 로 적을 잡는다', async () => {
    await GM임프불러내기(game);
    const 퀘스트 = await 퀘스트창.열기(game);
    const 전 = await 퀘스트.진행수('임프 30마리 처치');
    await 봇시키기(admin, 봇, 'gm:killall');
    await 퀘스트.진행수가바뀔때까지('임프 30마리 처치', 전);
    const 후 = await 퀘스트.진행수('임프 30마리 처치');
    await 퀘스트.닫기();
    await verify('다른 사람이 임프를 잡아도 서버에 접속한 나의 「임프 30마리 처치」 진행이 오른다', 후 > 전, true);
  });
});
