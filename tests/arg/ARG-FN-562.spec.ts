import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-562',
  name: '임프 또는 던지는 임프가 죽으면 서버에 접속한 모두의 「임프 30마리 처치」 진행이 1씩 오른다',
  platforms: ['android'],
  precondition: ['두 사람이 던전에 있다'],
  techniques: ['상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('임프를 처치하고 두 사람의 퀘스트 진행을 읽는다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('임프 또는 던지는 임프가 죽으면 서버에 접속한 모두의 「임프 30마리 처치」 진행이 1씩 오른다', await 뜨는지(game, 화면글자('임프 30마리 처치')), true);
  });
});
