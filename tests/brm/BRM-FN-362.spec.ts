import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비와봇준비, 봇장파티만들기, 접속중인가 } from './helpers/social-tools.helper.js';
import { 게임다시켜기, 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-362',
  name: '다시 접속하면 파티 머리줄에 「파티 없음」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 2명 파티다'],
  techniques: ['상태 전이'],
  elements: ['state:파티=없음'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 봇 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 쓴 계정 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 봇);
  });
  await test.step('두 번째 플레이어 봇을 켜고 일반 회원과 함께 2명 파티로 만든다', async () => {
    await 로비와봇준비(game, driver, admin, 나, [봇]);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    await verify('두 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇.아이디), true, { blocker: true });
    await verify('일반 회원과 두 번째 플레이어 봇이 2명 파티다', await 봇장파티만들기(game, admin, 나, 봇, []), true, { blocker: true });
  });
  await test.step('「메인 메뉴로」 나갔다 다시 로그인해 친구 · 파티 창을 연다', async () => {
    await 게임다시켜기(game, driver);
    await 로비로(game, driver, 나);
    const 창 = await 친구파티창.열기(game);
    await verify('다시 접속하면 파티 머리줄에 「파티 없음」이 보인다', await 창.파티없음머리(), '파티 없음');
  });
});
