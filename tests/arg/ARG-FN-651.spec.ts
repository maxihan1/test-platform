import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-651',
  name: '행동 버튼마다 스킬 설명을 띄우면 「돌진」은 탱커의 버튼에 붙어 있지 않아 플레이어가 쓸 수 없다',
  platforms: ['android'],
  precondition: ['탱커로 던전에 들어가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 손가락을 올려 두는 동작이 게임 드라이버에 없다',
});

test(spec, async ({ game, params }) => {
  await test.step('행동 버튼마다 스킬 설명을 띄운다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('행동 버튼마다 스킬 설명을 띄우면 「돌진」은 탱커의 버튼에 붙어 있지 않아 플레이어가 쓸 수 없다', await 뜨는지(game, 화면글자('돌진')), true);
  });
});
