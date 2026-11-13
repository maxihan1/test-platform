import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-506',
  name: '최고 레벨이면 경험치 막대가 가득 찬 채 「최고 레벨」로 보인다',
  platforms: ['android'],
  precondition: ['레벨 30 캐릭터다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('상단 바 경험치 막대를 확인한다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('최고 레벨이면 경험치 막대가 가득 찬 채 「최고 레벨」로 보인다', await 뜨는지(game, 화면글자('최고 레벨')), true);
  });
});
