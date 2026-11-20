import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비준비 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-560',
  name: '「파티」 탭을 고르면 그 탭이 밝게, 나머지 탭이 어둡게 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
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
  await test.step('채팅 창의 「파티」 탭을 누른다', async () => {
    const 채팅 = await 채팅창.열기(game);
    await 채팅.탭누르기('파티');
    const 파티 = await 채팅.탭밝기('파티');
    const 전체보다 = await verify('「파티」 탭이 「전체」 탭보다 밝다', 파티 > (await 채팅.탭밝기('전체')), true);
    const 길드보다 = await verify('「파티」 탭이 「길드」 탭보다 밝다', 파티 > (await 채팅.탭밝기('길드')), true);
    await verify('「파티」 탭을 고르면 그 탭이 밝게, 나머지 탭이 어둡게 보인다', 전체보다 && 길드보다, true);
  });
});
