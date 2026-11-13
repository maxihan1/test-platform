import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-560',
  name: '보상을 받으면 「보상 받음 +<골드> 골드 · +<경험치> 경험치」 알림이 뜨고 버튼 자리에 초록 「받음」이 보인다',
  platforms: ['android'],
  precondition: ['오늘 목표를 채운 퀘스트의 보상을 아직 받지 않았다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 하루 첫 진행 상태를 만드는 길 없음(날짜가 지나야 진행이 0 으로 돌아간다)',
});

test(spec, async ({ game, params }) => {
  await test.step('「보상 받기」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('보상을 받으면 「보상 받음 +<골드> 골드 · +<경험치> 경험치」 알림이 뜨고 버튼 자리에 초록 「받음」이 보인다', await 뜨는지(game, 화면글자('보상 받음 +')), true);
  });
});
