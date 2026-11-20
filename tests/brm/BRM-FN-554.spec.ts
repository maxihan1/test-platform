import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비준비 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-554',
  name: '길드가 없으면 「아직 길드가 없습니다」 다음 줄에 「길드를 만들거나 길드장의 초대를 받아 보세요」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['state:길드=없음'],
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
  await test.step('길드 없이 길드 창을 연다', async () => {
    const 길드 = await 길드창.열기(game);
    await 길드.글줄뜸('아직 길드가 없습니다');
    const 줄들 = ((await 길드.없음안내()) ?? '').split(/\r?\n/);
    const 첫줄 = await verify('「아직 길드가 없습니다」가 보인다', 줄들[0], '아직 길드가 없습니다');
    const 다음줄 = await verify('다음 줄에 「길드를 만들거나 길드장의 초대를 받아 보세요」가 보인다', 줄들[1], '길드를 만들거나 길드장의 초대를 받아 보세요');
    await verify('길드가 없으면 「아직 길드가 없습니다」 다음 줄에 「길드를 만들거나 길드장의 초대를 받아 보세요」가 보인다', 첫줄 && 다음줄, true);
  });
});
