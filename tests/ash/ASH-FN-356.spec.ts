import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입만, 계정지우기, 오류코드, 임의글자 } from './helpers/game-state.helper.js';
import { 가입된수, 경계아이디 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-356',
  name: '3자 아이디로 가입하면 400 「VALIDATION_FAILED」다',
  platforms: ['android'],
  precondition: ['가입하지 않은 아이디가 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    짧은길이: z.number().int().min(1).max(3).describe('너무 짧은 아이디 글자 수 — 1자 이상 3자 이하').default(3),
    하한길이: z.number().int().min(4).max(16).describe('가장 짧게 가입되는 아이디 글자 수 — 4자 이상 16자 이하').default(4),
    상한길이: z.number().int().min(4).max(16).describe('가장 길게 가입되는 아이디 글자 수 — 4자 이상 16자 이하').default(16),
    긴길이: z.number().int().min(17).max(30).describe('너무 긴 아이디 글자 수 — 17자 이상 30자 이하').default(17),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  const 만든계정: string[] = [];
  let 짧은 = '';
  let 하한 = '';
  let 상한 = '';
  let 긴 = '';
  try {
    await test.step('가입하지 않은 아이디 넷을 짓는다', async () => {
      짧은 = 경계아이디(params.짧은길이);
      하한 = 경계아이디(params.하한길이);
      상한 = 경계아이디(params.상한길이);
      긴 = 경계아이디(params.긴길이);
    });

    await test.step('지은 아이디가 가입돼 있지 않은지 확인한다', async () => {
      const 이미: string[] = [];
      for (const 아이디 of [짧은, 하한, 상한, 긴]) {
        if ((await 가입된수(admin, 아이디)) > 0) 이미.push(아이디);
      }
      await verify('가입하지 않은 아이디가 있다', 이미.join(', '), '', { blocker: true });
    });

    await test.step('3자 아이디로 가입한다', async () => {
      const 응답 = await 가입만(request, 짧은, 임의글자(12));
      if (응답.status() === 201) 만든계정.push(짧은);
      const 코드 = await verify('3자 아이디의 응답 코드가 400 이다', 응답.status(), 400);
      const 이름 = await verify('3자 아이디의 오류 코드가 「VALIDATION_FAILED」다', await 오류코드(응답), 'VALIDATION_FAILED');
      await verify('3자 아이디로 가입하면 400 「VALIDATION_FAILED」다', 코드 && 이름, true);
    });

    await test.step('4자 아이디로 가입한다', async () => {
      const 응답 = await 가입만(request, 하한, 임의글자(12));
      if (응답.status() === 201) 만든계정.push(하한);
      await verify('4자 아이디로 가입하면 201 이다', 응답.status(), 201);
    });

    await test.step('16자 아이디로 가입한다', async () => {
      const 응답 = await 가입만(request, 상한, 임의글자(12));
      if (응답.status() === 201) 만든계정.push(상한);
      await verify('16자 아이디로 가입하면 201 이다', 응답.status(), 201);
    });

    await test.step('17자 아이디로 가입한다', async () => {
      const 응답 = await 가입만(request, 긴, 임의글자(12));
      if (응답.status() === 201) 만든계정.push(긴);
      const 코드 = await verify('17자 아이디의 응답 코드가 400 이다', 응답.status(), 400);
      const 이름 = await verify('17자 아이디의 오류 코드가 「VALIDATION_FAILED」다', await 오류코드(응답), 'VALIDATION_FAILED');
      await verify('17자 아이디로 가입하면 400 「VALIDATION_FAILED」다', 코드 && 이름, true);
    });
  } finally {
    for (const 계정 of 만든계정) await 계정지우기(admin, 계정);
  }
});
