import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-619',
  name: '이미 있는 길드와 이름이 똑같으면 「이미 있는 길드 이름입니다」가 뜬다',
  platforms: ['android'],
  precondition: ['이미 있는 길드 이름을 안다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 조건에 맞는 캐릭터나 길드 이름을 찾을 길 없음(목록 API 가 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('그 이름으로 「만들기 · 500G」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('이미 있는 길드와 이름이 똑같으면 「이미 있는 길드 이름입니다」가 뜬다', await 뜨는지(game, 화면글자('이미 있는 길드 이름입니다')), true);
  });
});
