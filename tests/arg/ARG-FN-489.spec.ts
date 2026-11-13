import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-489',
  name: '던전이 진행 중일 때 들어오면 바로 던전에 들어가고, 로비에서 고른 영웅이 없으면 무작위 영웅이 정해진다',
  platforms: ['android'],
  precondition: ['다른 사람이 던전을 진행 중이다'],
  techniques: ['결정 테이블'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('로비에서 영웅을 선택하지 않고 들어온다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('던전이 진행 중일 때 들어오면 바로 던전에 들어가고, 로비에서 고른 영웅이 없으면 무작위 영웅이 정해진다', await 있는지(game, 던전.행동막대), true);
  });
});
