import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-477',
  name: '「공격」 버튼의 스킬 설명을 띄우면 「공격」 버튼은 직업의 첫 번째 스킬(기본 공격)을 쓴다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 던전에 들어가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 손가락을 올려 두는 동작이 게임 드라이버에 없다',
});

test(spec, async ({ game, params }) => {
  await test.step('「공격」 버튼의 스킬 설명을 띄운다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('「공격」 버튼의 스킬 설명을 띄우면 「공격」 버튼은 직업의 첫 번째 스킬(기본 공격)을 쓴다', await 뜨는지(game, 화면글자('공격')), true);
  });
});
