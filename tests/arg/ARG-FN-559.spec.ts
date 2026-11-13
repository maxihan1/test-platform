import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-559',
  name: '상점에서 물건을 하나 사면 목표를 채우는 순간 「퀘스트 완료: <이름> — 퀘스트 창에서 보상을 받으세요」 알림이 뜬다',
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
  await test.step('상점에서 물건을 하나 산다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('상점에서 물건을 하나 사면 목표를 채우는 순간 「퀘스트 완료: <이름> — 퀘스트 창에서 보상을 받으세요」 알림이 뜬다', await 뜨는지(game, 화면글자('퀘스트 완료:')), true);
  });
});
