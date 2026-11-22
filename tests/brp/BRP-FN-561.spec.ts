import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇과함께던전입장 } from './helpers/dungeon.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-561',
  name: '파티 초상화를 읽으면 함께 들어온 동료는 파티 초상화에 이름과 체력 막대로 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 함께 던전에 들어와 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  await test.cleanup('봇을 끄고 방을 로비로 돌리기', () => 로비로되돌리기(admin));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  let 봇 = '';
  await test.step('일반 회원과 두 번째 플레이어 봇이 함께 던전에 들어온 것을 확인한다', async () => {
    const 들어감 = await 봇과함께던전입장(admin, game, params.p2Id ?? '', params.p2Password ?? '');
    봇 = 들어감.봇;
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });

  await test.step('파티 초상화를 읽는다', async () => {
    const 이름뜸 = await game.waitFor(던전화면.동료이름, { text: 봇, timeoutMs: 15_000 }).then(
      () => true,
      () => false,
    );
    const 이름 = await verify('파티 초상화에 동료 이름이 보인다', 이름뜸, true);
    const 던전 = await 던전화면.열림(game);
    const 막대 = await verify('파티 초상화에 동료 체력 막대가 보인다', await 던전.동료체력막대있나(), true);
    await verify('파티 초상화를 읽으면 함께 들어온 동료는 파티 초상화에 이름과 체력 막대로 보인다', 이름 && 막대, true);
  });
});
