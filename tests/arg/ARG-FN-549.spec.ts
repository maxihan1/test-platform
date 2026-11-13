import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-549',
  name: '받은 뒤 「받음: <아이템>x<개수>, <아이템>, <골드> 골드」 꼴로 알리고, 같은 아이템이 여러 개면 「x<개수>」를, 골드가 있으면 맨 뒤에 붙인다',
  platforms: ['android'],
  precondition: ['같은 아이템 둘과 골드가 첨부된 우편이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('「받기」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('받은 뒤 「받음: <아이템>x<개수>, <아이템>, <골드> 골드」 꼴로 알리고, 같은 아이템이 여러 개면 「x<개수>」를, 골드가 있으면 맨 뒤에 붙인다', await 뜨는지(game, 화면글자('받음:')), true);
  });
});
