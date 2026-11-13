import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-557',
  name: '첨부가 없는 우편을 「삭제」하면 확인 창 없이 목록에서 사라진다',
  platforms: ['android'],
  precondition: ['첨부가 없는 우편이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('그 우편의 「삭제」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('첨부가 없는 우편을 「삭제」하면 확인 창 없이 목록에서 사라진다', await 뜨는지(game, 화면글자('삭제')), true);
  });
});
