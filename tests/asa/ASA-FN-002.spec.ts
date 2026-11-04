import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입, 본문, 새비밀번호, 새아이디, 오류코드 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-002',
  name: '아이디를 3자로 적어 가입하면 400 「VALIDATION_FAILED」로 막힌다',
  apiDoc: 2,
  techniques: ['경계값 분석'],
  precondition: ['가입하지 않은 새 아이디다'],
  params: z.object({
    짧은아이디길이: z.number().int().describe('막혀야 할 짧은 아이디 길이 — 3자 이하').default(3),
    가장짧은아이디길이: z.number().int().describe('가입돼야 할 가장 짧은 아이디 길이 — 4~16자').default(4),
    가장긴아이디길이: z.number().int().describe('가입돼야 할 가장 긴 아이디 길이 — 4~16자').default(16),
    긴아이디길이: z.number().int().describe('막혀야 할 긴 아이디 길이 — 17자 이상').default(17),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('아이디를 3자로 적어 가입한다', async () => {
    const 응답 = await 가입(request, 새아이디(params.짧은아이디길이), 새비밀번호());
    const 코드 = await verify('3자 아이디 가입 응답 코드가 400 이다', 응답.status(), 400);
    const 오류 = await verify('3자 아이디 가입 오류 코드가 「VALIDATION_FAILED」다', await 오류코드(응답), 'VALIDATION_FAILED');
    await verify('아이디를 3자로 적어 가입하면 400 「VALIDATION_FAILED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('아이디를 4자로 적어 가입한다', async () => {
    const 응답 = await 가입(request, 새아이디(params.가장짧은아이디길이), 새비밀번호());
    await verify('아이디를 4자로 적어 가입하면 「accountId」가 돌아온다', (await 본문(응답)).accountId !== undefined, true);
  });

  await test.step('아이디를 16자로 적어 가입한다', async () => {
    const 응답 = await 가입(request, 새아이디(params.가장긴아이디길이), 새비밀번호());
    await verify('아이디를 16자로 적어 가입하면 「accountId」가 돌아온다', (await 본문(응답)).accountId !== undefined, true);
  });

  await test.step('아이디를 17자로 적어 가입한다', async () => {
    const 응답 = await 가입(request, 새아이디(params.긴아이디길이), 새비밀번호());
    const 코드 = await verify('17자 아이디 가입 응답 코드가 400 이다', 응답.status(), 400);
    const 오류 = await verify('17자 아이디 가입 오류 코드가 「VALIDATION_FAILED」다', await 오류코드(응답), 'VALIDATION_FAILED');
    await verify('아이디를 17자로 적어 가입하면 400 「VALIDATION_FAILED」로 막힌다', 코드 && 오류, true);
  });
});
