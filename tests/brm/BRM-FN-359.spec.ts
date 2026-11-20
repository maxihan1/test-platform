import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비와봇준비, 봇장파티만들기, 접속중인가 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-359',
  name: '남은 사람이 1명이 되면 「파티가 해산되었습니다」 알림이 뜨고 파티 머리줄이 「파티 없음」이 된다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 2명 파티다'],
  elements: ['move:파티 있음→없음'],
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
  await test.step('두 번째 플레이어 봇이 파티를 나간다', async () => {
    const 창 = await 친구파티창.열기(game);
    await 봇시키기(admin, 봇.아이디, 'party_leave');
    const 알림 = await verify('「파티가 해산되었습니다」 알림이 뜬다', await 창.hud.알림뜸('파티가 해산되었습니다'), true);
    const 없음 = await verify('파티 머리줄이 「파티 없음」이 된다', await 창.파티없음머리(), '파티 없음');
    await verify('남은 사람이 1명이 되면 「파티가 해산되었습니다」 알림이 뜨고 파티 머리줄이 「파티 없음」이 된다', 알림 && 없음, true);
  });
});
