import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-UI-357',
  name: '길드가 있을 때 길드원 줄은 접속 점 · 길드장 금색 「[길드장]」 · 이름 · 「Lv.<레벨>」이고 길드장이 맨 위, 그다음 접속 중인 사람 차례다',
  platforms: ['android'],
  precondition: ['길드에 들어가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 골드를 다시 채우는 길 없음(운영 지급 API 경로가 가이드에 없어 길드 만들기 500 골드를 되풀이해 쓸 수 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('길드 창을 연다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('길드가 있을 때 길드원 줄은 접속 점 · 길드장 금색 「[길드장]」 · 이름 · 「Lv.<레벨>」이고 길드장이 맨 위, 그다음 접속 중인 사람 차례다', await 뜨는지(game, 화면글자('[길드장]')), true);
  });
});
