import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입만, 계정지우기, 오류코드, 임의글자, 임의아이디 } from './helpers/game-state.helper.js';
import { 가입된수 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-362',
  name: '5자 비밀번호로 가입하면 400 「VALIDATION_FAILED」다',
  platforms: ['android'],
  precondition: ['가입하지 않은 아이디가 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    짧은글자수: z.number().int().min(1).max(5).describe('너무 짧은 비밀번호 글자 수 — 1자 이상 5자 이하').default(5),
    하한글자수: z.number().int().min(6).max(64).describe('가장 짧게 가입되는 비밀번호 글자 수 — 6자 이상 64자 이하').default(6),
    상한글자수: z.number().int().min(6).max(64).describe('가장 길게 가입되는 비밀번호 글자 수 — 6자 이상 64자 이하').default(64),
    긴글자수: z.number().int().min(65).max(100).describe('너무 긴 비밀번호 글자 수 — 65자 이상 100자 이하').default(65),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  const 만든계정: string[] = [];
  let 아이디들: string[] = [];
  try {
    await test.step('가입하지 않은 아이디 넷을 짓는다', async () => {
      아이디들 = [임의아이디('zqa362'), 임의아이디('zqa362'), 임의아이디('zqa362'), 임의아이디('zqa362')];
    });

    await test.step('지은 아이디가 가입돼 있지 않은지 확인한다', async () => {
      const 이미: string[] = [];
      for (const 아이디 of 아이디들) {
        if ((await 가입된수(admin, 아이디)) > 0) 이미.push(아이디);
      }
      await verify('가입하지 않은 아이디가 있다', 이미.join(', '), '', { blocker: true });
    });

    await test.step('5자 비밀번호로 가입한다', async () => {
      const 응답 = await 가입만(request, 아이디들[0]!, 임의글자(params.짧은글자수));
      if (응답.status() === 201) 만든계정.push(아이디들[0]!);
      const 코드 = await verify('5자 비밀번호의 응답 코드가 400 이다', 응답.status(), 400);
      const 이름 = await verify('5자 비밀번호의 오류 코드가 「VALIDATION_FAILED」다', await 오류코드(응답), 'VALIDATION_FAILED');
      await verify('5자 비밀번호로 가입하면 400 「VALIDATION_FAILED」다', 코드 && 이름, true);
    });

    await test.step('6자 비밀번호로 가입한다', async () => {
      const 응답 = await 가입만(request, 아이디들[1]!, 임의글자(params.하한글자수));
      if (응답.status() === 201) 만든계정.push(아이디들[1]!);
      await verify('6자 비밀번호로 가입하면 201 이다', 응답.status(), 201);
    });

    await test.step('64자 비밀번호로 가입한다', async () => {
      const 응답 = await 가입만(request, 아이디들[2]!, 임의글자(params.상한글자수));
      if (응답.status() === 201) 만든계정.push(아이디들[2]!);
      await verify('64자 비밀번호로 가입하면 201 이다', 응답.status(), 201);
    });

    await test.step('65자 비밀번호로 가입한다', async () => {
      const 응답 = await 가입만(request, 아이디들[3]!, 임의글자(params.긴글자수));
      if (응답.status() === 201) 만든계정.push(아이디들[3]!);
      const 코드 = await verify('65자 비밀번호의 응답 코드가 400 이다', 응답.status(), 400);
      const 이름 = await verify('65자 비밀번호의 오류 코드가 「VALIDATION_FAILED」다', await 오류코드(응답), 'VALIDATION_FAILED');
      await verify('65자 비밀번호로 가입하면 400 「VALIDATION_FAILED」다', 코드 && 이름, true);
    });
  } finally {
    for (const 계정 of 만든계정) await 계정지우기(admin, 계정);
  }
});
