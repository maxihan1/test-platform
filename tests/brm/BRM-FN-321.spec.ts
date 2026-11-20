import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비준비 } from './helpers/social-tools.helper.js';
import { 게임다시켜기, 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-321',
  name: '다시 접속하면 지난 대화 「qa 이전 246」이 보이지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  techniques: ['상태 전이'],
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
  await test.step('「qa 이전 246」을 보낸 뒤 「메인 메뉴로」 나갔다 다시 로그인해 채팅 창을 연다', async () => {
    const 채팅 = await 채팅창.열기(game);
    await 채팅.보내기('qa 이전 246');
    await 채팅.글줄뜸('qa 이전 246');
    await 게임다시켜기(game, driver);
    await 로비로(game, driver, 나);
    const 새채팅 = await 채팅창.열기(game);
    await 새채팅.글줄뜸('님이 접속했습니다');
    await verify('다시 접속하면 지난 대화 「qa 이전 246」이 보이지 않는다', await 새채팅.글있는줄('qa 이전 246'), null);
  });
});
