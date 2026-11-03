import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입, 본문, 새비밀번호, 새아이디, 오류코드 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-008',
  name: '비밀번호를 5자로 적어 가입하면 400 「VALIDATION_FAILED」로 막힌다',
  apiDoc: 1,
  techniques: ['경계값 분석'],
  precondition: ['가입하지 않은 새 아이디다'],
  params: z.object({
    짧은비밀번호길이: z.number().int().describe('막혀야 할 짧은 비밀번호 길이 — 5자 이하').default(5),
    가장짧은비밀번호길이: z.number().int().describe('가입돼야 할 가장 짧은 비밀번호 길이 — 6~64자').default(6),
    가장긴비밀번호길이: z.number().int().describe('가입돼야 할 가장 긴 비밀번호 길이 — 6~64자').default(64),
    긴비밀번호길이: z.number().int().describe('막혀야 할 긴 비밀번호 길이 — 65자 이상').default(65),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('비밀번호를 5자로 적어 가입한다', async () => {
    const 응답 = await 가입(request, 새아이디(), 새비밀번호(params.짧은비밀번호길이));
    const 코드 = await verify('5자 비밀번호 가입 응답 코드가 400 이다', 응답.status(), 400);
    const 오류 = await verify('5자 비밀번호 가입 오류 코드가 「VALIDATION_FAILED」다', await 오류코드(응답), 'VALIDATION_FAILED');
    await verify('비밀번호를 5자로 적어 가입하면 400 「VALIDATION_FAILED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('비밀번호를 6자로 적어 가입한다', async () => {
    const 응답 = await 가입(request, 새아이디(), 새비밀번호(params.가장짧은비밀번호길이));
    await verify('비밀번호를 6자로 적어 가입하면 「accountId」가 돌아온다', (await 본문(응답)).accountId !== undefined, true);
  });

  await test.step('비밀번호를 64자로 적어 가입한다', async () => {
    const 응답 = await 가입(request, 새아이디(), 새비밀번호(params.가장긴비밀번호길이));
    await verify('비밀번호를 64자로 적어 가입하면 「accountId」가 돌아온다', (await 본문(응답)).accountId !== undefined, true);
  });

  await test.step('비밀번호를 65자로 적어 가입한다', async () => {
    const 응답 = await 가입(request, 새아이디(), 새비밀번호(params.긴비밀번호길이));
    const 코드 = await verify('65자 비밀번호 가입 응답 코드가 400 이다', 응답.status(), 400);
    const 오류 = await verify('65자 비밀번호 가입 오류 코드가 「VALIDATION_FAILED」다', await 오류코드(응답), 'VALIDATION_FAILED');
    await verify('비밀번호를 65자로 적어 가입하면 400 「VALIDATION_FAILED」로 막힌다', 코드 && 오류, true);
  });
});
