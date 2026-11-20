import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 허드공지띠가보이나 } from './helpers/login-tools.helper.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { QA공지모두지우기, 공지만들기, 계정꺼내기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-413',
  name: '던전에 들어가면 공지 띠가 보이지 않는다',
  platforms: ['android'],
  precondition: ['[QA] 공지가 켜져 있다'],
  elements: ['state:장소=던전'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('시험 공지 지우기', () => QA공지모두지우기(admin));
  await test.step('공지를 켜 둔다', async () => {
    await 공지만들기(admin, '[QA] 공지 413', '던전 공지 띠 시험');
  });
  await test.step('일반 회원으로 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
    await verify('던전에 들어가면 공지 띠가 보이지 않는다', await 허드공지띠가보이나(game), false);
  });
});
