import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 큰제목들 } from './helpers/html.helper.js';
import { 본문글 } from './helpers/api.helper.js';
import { 가입제출 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-519',
  name: '가입 중 예상 밖 예외가 나면 200 으로 가입 화면이 다시 보인다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: z.object({
    예외를낼아이디: z.string().describe('가입 중 예상 밖 예외가 나는 아이디'),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
  held: '보류 — 가입 중 예상 밖 예외를 낼 길',
});

test(spec, async ({ request, params, expected }) => {
  await test.step('가입 중 예상 밖 예외가 나게 계정 만들기를 제출한다', async () => {
    const 응답 = await 가입제출(request, { userName: params.예외를낼아이디, email: `${params.예외를낼아이디}@example.invalid`, password: 'Qa123456x!' });
    const 코드 = await verify('계정 만들기 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 화면 = await verify('큰 제목 「Create Account」가 보인다', 큰제목들(await 본문글(응답)).includes('Create Account'), true);
    await verify('가입 중 예상 밖 예외가 나면 200 으로 가입 화면이 다시 보인다', 코드 && 화면, true);
  });
});
