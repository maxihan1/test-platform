import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-480',
  name: '다른 플레이어를 고르고 있으면 「공격」 버튼이 「부활」이 된다',
  platforms: ['android'],
  precondition: ['던전에서 다른 플레이어를 선택하고 있다'],
  techniques: ['상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('「공격」 버튼을 확인한다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('다른 플레이어를 고르고 있으면 「공격」 버튼이 「부활」이 된다', await 뜨는지(game, 화면글자('공격')), true);
  });
});
