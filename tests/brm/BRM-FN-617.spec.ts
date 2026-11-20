import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비준비, 알림이뜨나, 알림이모두사라질때까지 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-617',
  name: '이름 칸에 공백만 넣고 「친구 신청」을 누르면 알림이 뜨지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  techniques: ['오류 추정'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('「캐릭터 이름」 칸에 공백만 넣고 「친구 신청」을 누른다', async () => {
    const 창 = await 친구파티창.열기(game);
    await 알림이모두사라질때까지(game);
    await 창.이름넣기('   ');
    await 창.친구신청누르기();
    await verify('이름 칸에 공백만 넣고 「친구 신청」을 누르면 알림이 뜨지 않는다', await 알림이뜨나(game, 3_000), false);
  });
});
