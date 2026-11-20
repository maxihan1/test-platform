import { defineCase, test, verify } from '@platform/kit';
import { 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 안내창 } from './pages/popup.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-049',
  name: '와이파이를 끊고 다시 연결하는 중에 「확인」을 누르면 「연결 끊김」 창이 닫히지 않는다',
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
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 로비화면.열기(game).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('와이파이를 끊고 「연결 끊김」 창의 「확인」을 누른다', async () => {
    await 폰상태에서(driver, { 네트워크: '끊김' }, async () => {
      const 뜸 = await 안내창.제목이될때까지(game, '연결 끊김', 30_000);
      await verify('「연결 끊김」 창이 뜬다', 뜸, true, { blocker: true });
      const 창 = new 안내창(game);
      if (await 창.확인있나()) await 창.확인누르기();
      const 닫힘 = await 창.닫힐때까지(3_000);
      await verify('와이파이를 끊고 다시 연결하는 중에 「확인」을 누르면 「연결 끊김」 창이 닫히지 않는다', 닫힘, false);
    });
  });
});
