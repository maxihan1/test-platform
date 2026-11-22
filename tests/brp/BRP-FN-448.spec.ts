import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 상점에서사기, 장비끼기, 퀘스트처음으로 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM골드, GM퀘스트완료, 색글떼기 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-448',
  name: '그 퀘스트의 「보상 받기」를 누르면 골드 획득 장비를 끼고 퀘스트 보상을 받아도 골드가 보상 그대로 50 만 는다',
  platforms: ['windows'],
  precondition: ['일반 회원이 「행운의 반지」를 장착하고 「상점에서 물건 구매」 목표를 채웠다', '일반 회원이 「행운의 반지」를 장착했고 가방에 「조약돌」이 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('「행운의 반지」를 장착하고 가방에 「조약돌」이 있고 구매 퀘스트 목표를 채운 것을 확인한다', async () => {
    await GM골드(game, 1000);
    await 상점에서사기(game, ['조약돌']);
    await 장비끼기(game, '행운의 반지');
    const 가방 = await 가방창.열기(game);
    await verify('장신구 칸에 「행운의 반지」가 있다', 색글떼기(await 가방.칸글('장신구')).includes('행운의 반지'), true, { blocker: true });
    await verify('가방에 「조약돌」 줄이 있다', await 가방.줄이생길때까지('조약돌'), true, { blocker: true });
    await 가방.닫기();
    await 퀘스트처음으로(game);
    await GM퀘스트완료(game);
    const 퀘스트 = await 퀘스트창.열기(game);
    await verify('「상점에서 물건 구매」 진행이 「1/1」이다', await 퀘스트.진행글('상점에서 물건 구매'), '1/1', { blocker: true });
    await 퀘스트.닫기();
  });

  await test.step('그 퀘스트의 「보상 받기」를 누른다', async () => {
    const 상단 = new 공통HUD(game);
    const 전 = await 상단.골드();
    const 퀘스트 = await 퀘스트창.열기(game);
    await 퀘스트.보상받기('상점에서 물건 구매');
    await 퀘스트.받음이될때까지('상점에서 물건 구매');
    await 퀘스트.닫기();
    await 상단.골드가될때까지(전 + 50);
    await verify('그 퀘스트의 「보상 받기」를 누르면 골드 획득 장비를 끼고 퀘스트 보상을 받아도 골드가 보상 그대로 50 만 는다', (await 상단.골드()) - 전, 50);
  });

  await test.step('「조약돌」을 판다', async () => {
    const 상단 = new 공통HUD(game);
    const 전 = await 상단.골드();
    const 가방 = await 가방창.열기(game);
    await 가방.판매하기('조약돌');
    await 가방.줄이사라질때까지('조약돌');
    await 가방.닫기();
    await 상단.골드가될때까지(전 + 1);
    await verify('골드 획득 장비를 끼고 팔아도 판매가 1 골드만 는다', (await 상단.골드()) - 전, 1);
  });
});
