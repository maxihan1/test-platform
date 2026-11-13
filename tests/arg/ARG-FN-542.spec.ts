import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-542',
  name: '메뉴 「우편」을 확인하면 메뉴 「우편」 버튼에 안 읽었거나 첨부가 남아 있는 우편 수를 빨간 숫자로 붙여 「우편 <수>」로 보인다',
  platforms: ['android'],
  precondition: ['안 읽었거나 첨부가 남은 우편이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('메뉴 「우편」을 확인한다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('메뉴 「우편」을 확인하면 메뉴 「우편」 버튼에 안 읽었거나 첨부가 남아 있는 우편 수를 빨간 숫자로 붙여 「우편 <수>」로 보인다', await 뜨는지(game, 화면글자('우편')), true);
  });
});
