import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-526',
  name: '운영툴 우편으로 게임에 없는 이름의 아이템이 들어오면 그 이름 그대로 가방에 넣고 설명은 「알 수 없는 아이템」이다',
  platforms: ['android'],
  precondition: ['게임에 없는 이름의 아이템이 든 우편이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('우편 첨부를 받고 가방을 연다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('운영툴 우편으로 게임에 없는 이름의 아이템이 들어오면 그 이름 그대로 가방에 넣고 설명은 「알 수 없는 아이템」이다', await 뜨는지(game, 화면글자('알 수 없는 아이템')), true);
  });
});
