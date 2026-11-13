import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-484',
  name: '살아 있는 아군이 쓰러진 플레이어를 고르고 「부활」을 쓰면 체력 400 으로 일어난다(사거리 2, 시전 1초)',
  platforms: ['android'],
  precondition: ['던전에서 아군이 쓰러져 있다'],
  techniques: ['상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('쓰러진 아군을 선택하고 「부활」을 누른다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('살아 있는 아군이 쓰러진 플레이어를 고르고 「부활」을 쓰면 체력 400 으로 일어난다(사거리 2, 시전 1초)', await 뜨는지(game, 화면글자('부활')), true);
  });
});
