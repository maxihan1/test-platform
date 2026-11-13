import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-552',
  name: '「받기」를 누르면 게임 API 아이템 기록에서 찾을 수 없는 첨부 아이템은 목록에 「알 수 없는 아이템」으로 보이고 받을 때 가방에 넣지 않고 우편에 남긴다',
  platforms: ['android'],
  precondition: ['기록에 없는 아이템이 첨부된 우편이 있다'],
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
    await verify('「받기」를 누르면 게임 API 아이템 기록에서 찾을 수 없는 첨부 아이템은 목록에 「알 수 없는 아이템」으로 보이고 받을 때 가방에 넣지 않고 우편에 남긴다', await 뜨는지(game, 화면글자('받기')), true);
  });
});
