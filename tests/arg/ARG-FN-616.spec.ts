import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-616',
  name: '길드가 없는 사람이 이름을 짓고 「만들기 · 500G」를 누르면 500 골드가 줄고 만든 사람이 길드장이 되며 「길드 창설 완료: 「<이름>」」이 뜬다',
  platforms: ['android'],
  precondition: ['골드가 500 이상이고 길드가 없다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 골드를 다시 채우는 길 없음(운영 지급 API 경로가 가이드에 없어 길드 만들기 500 골드를 되풀이해 쓸 수 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('이름을 넣고 「만들기 · 500G」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('길드가 없는 사람이 이름을 짓고 「만들기 · 500G」를 누르면 500 골드가 줄고 만든 사람이 길드장이 되며 「길드 창설 완료: 「<이름>」」이 뜬다', await 뜨는지(game, 화면글자('만들기 · 500G')), true);
  });
});
