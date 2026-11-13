import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-516',
  name: '보스를 처치하면 전리품 1개를 얻고 「불꽃의 검」 17.5%, 「용비늘 갑옷」 17.5%, 「보스의 왕관 조각」 65% 가운데 하나다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 던전에 들어가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('보스 임프를 여러 번 처치하고 전리품을 센다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('보스를 처치하면 전리품 1개를 얻고 「불꽃의 검」 17.5%, 「용비늘 갑옷」 17.5%, 「보스의 왕관 조각」 65% 가운데 하나다', await 뜨는지(game, 화면글자('불꽃의 검')), true);
  });
});
