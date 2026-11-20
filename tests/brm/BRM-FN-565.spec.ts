import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비준비 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-565',
  name: '채팅을 보내면 입력 칸이 비고 입력 칸에 커서가 남는다',
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
  await test.step('「qa 453」을 넣고 「보내기」를 누른다', async () => {
    const 채팅 = await 채팅창.열기(game);
    await 채팅.글넣기('qa 453');
    await 채팅.보내기누르기();
    await 채팅.글줄뜸('qa 453');
    const 비어 = await verify('입력 칸이 빈다', await 채팅.입력칸값(), '');
    const 커서 = await verify('입력 칸에 커서가 남는다', await 채팅.입력칸골라짐(), true);
    await verify('채팅을 보내면 입력 칸이 비고 입력 칸에 커서가 남는다', 비어 && 커서, true);
  });
});
