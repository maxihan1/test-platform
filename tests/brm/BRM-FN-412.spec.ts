import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 허드공지띠가될때까지, 허드공지띠자리 } from './helpers/login-tools.helper.js';
import { 게임다시켜기, 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { QA공지모두지우기, 공지만들기, 계정꺼내기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-412',
  name: '공지가 켜져 있으면 로비 위쪽 공지 띠에 보인다',
  platforms: ['android'],
  precondition: ['[QA] 공지가 켜져 있다'],
  elements: ['state:장소=로비'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('시험 공지 지우기', () => QA공지모두지우기(admin));
  const 제목 = '[QA] 공지 412';
  await test.step('공지를 켜 둔다', async () => {
    await 공지만들기(admin, 제목, '로비 공지 띠 시험');
    await 게임다시켜기(game, driver);
  });
  await test.step('일반 회원으로 로그인해 로비 위쪽을 본다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
    const 뜸 = await 허드공지띠가될때까지(game, 제목, 30_000);
    const 위 = (await 허드공지띠자리(game))?.세로;
    const 보임 = await verify('로비 공지 띠에 공지가 보인다', 뜸, true);
    const 위쪽 = await verify('공지 띠가 화면 위쪽에 있다', 위, '위');
    await verify('공지가 켜져 있으면 로비 위쪽 공지 띠에 보인다', 보임 && 위쪽, true);
  });
});
