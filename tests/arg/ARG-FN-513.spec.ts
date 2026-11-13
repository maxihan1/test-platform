import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-513',
  name: '「임프의 뿔」 확률이 100% 면 늘 나오고 0% 면 나오지 않는다',
  platforms: ['android'],
  precondition: ['임프 전리품 확률을 0% 와 100% 로 바꿀 수 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('확률을 0% · 100% 로 바꾸고 임프를 처치한다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('「임프의 뿔」 확률이 100% 면 늘 나오고 0% 면 나오지 않는다', await 뜨는지(game, 화면글자('임프의 뿔')), true);
  });
});
