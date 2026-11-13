import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-UI-361',
  name: '전용 서버에서는 결과 화면에 「다시 하기」가 보이지 않는다',
  platforms: ['android'],
  precondition: ['결과 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('결과 화면 버튼을 확인한다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('전용 서버에서는 결과 화면에 「다시 하기」가 보이지 않는다', await 뜨는지(game, 화면글자('다시 하기')), true);
  });
});
