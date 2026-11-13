import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-564',
  name: '상점에서 구매에 성공하면 일일 퀘스트 「상점에서 물건 구매」 진행이 1 오른다',
  platforms: ['android'],
  precondition: ['오늘 아직 아무것도 사지 않았다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 하루 첫 진행 상태를 만드는 길 없음(날짜가 지나야 진행이 0 으로 돌아간다)',
});

test(spec, async ({ game, params }) => {
  await test.step('상점에서 물건을 사고 퀘스트 진행을 읽는다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('상점에서 구매에 성공하면 일일 퀘스트 「상점에서 물건 구매」 진행이 1 오른다', await 뜨는지(game, 화면글자('상점에서 물건 구매')), true);
  });
});
