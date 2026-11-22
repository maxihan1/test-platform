import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상점에서사기 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 캐릭터값기다리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-236',
  name: '팔면 운영 API 의 캐릭터 아이템에서도 「조약돌」이 사라진다',
  platforms: ['windows'],
  precondition: ['일반 회원 가방에 「조약돌」이 하나 있다'],
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

  await test.step('일반 회원 가방에 「조약돌」이 하나 있는 것을 확인한다', async () => {
    await 상점에서사기(game, ['조약돌']);
    const 가방 = await 가방창.열기(game);
    await 가방.줄이생길때까지('조약돌');
    await verify('가방에 「조약돌」이 하나 있다', (await 가방.줄찾기('조약돌'))?.개수 ?? 0, 1, { blocker: true });
    await 가방.닫기();
  });

  await test.step('운영 API 에 「조약돌」이 저장된 것을 확인한다', async () => {
    const 저장 = await 캐릭터값기다리기(admin, 아이디, (값) => (값.items['조약돌'] ?? 0) === 1);
    await verify('운영 API 캐릭터 아이템에 「조약돌」이 하나 있다', 저장.items['조약돌'] ?? 0, 1, { blocker: true });
  });

  await test.step('「조약돌」을 팔고 저장을 기다려 운영 API 아이템을 읽는다', async () => {
    const 가방 = await 가방창.열기(game);
    await 가방.판매하기('조약돌');
    await 가방.줄이사라질때까지('조약돌');
    await 가방.닫기();
    const 값 = await 캐릭터값기다리기(admin, 아이디, (c) => (c.items['조약돌'] ?? 0) === 0);
    await verify('팔면 운영 API 의 캐릭터 아이템에서도 「조약돌」이 사라진다', 값.items['조약돌'] ?? 0, 0);
  });
});
