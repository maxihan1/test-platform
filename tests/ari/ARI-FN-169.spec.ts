import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 운영자로그인 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-169',
  name: '틀린 비밀번호로 POST /opsapi/login 을 부르면 401 과 code UNAUTHORIZED · 「아이디 또는 비밀번호가 맞지 않습니다」가 돌아온다',
  apiDoc: 2,
  precondition: ['「운영자」 계정이 있다', '대상 서버에 접근할 수 있다'],
  params: z.object({
    opsId: z.string().describe('운영자 아이디').optional().meta({ secret: true, account: '운영자' }),
    opsPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true, account: '운영자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  await test.step('「운영자」 아이디와 틀린 비밀번호로 POST /opsapi/login 을 부른다', async () => {
    const 응답 = await 운영자로그인(request, params.opsId ?? '', 고유이름('틀린 비밀번호'));
    const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string; message?: string };
    const 코드 = await verify('틀린 비밀번호 로그인 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 종류 = await verify('응답 code 가 UNAUTHORIZED 다', 몸.code ?? '', 'UNAUTHORIZED');
    const 문구 = await verify('응답 message 가 「아이디 또는 비밀번호가 맞지 않습니다」다', 몸.message ?? '', '아이디 또는 비밀번호가 맞지 않습니다');
    await verify('틀린 비밀번호로 POST /opsapi/login 을 부르면 401 과 code UNAUTHORIZED · 「아이디 또는 비밀번호가 맞지 않습니다」가 돌아온다', 코드 && 종류 && 문구, true);
  });
  await test.step('없는 아이디로 POST /opsapi/login 을 부른다', async () => {
    const 응답 = await 운영자로그인(request, 고유이름('없는 운영자'), 고유이름('아무 비밀번호'));
    const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string };
    const 코드 = await verify('없는 아이디 로그인 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 종류 = await verify('없는 아이디 로그인 응답 code 가 UNAUTHORIZED 다', 몸.code ?? '', 'UNAUTHORIZED');
    await verify('없는 아이디일 때도 POST /opsapi/login 은 401 과 code UNAUTHORIZED 다', 코드 && 종류, true);
  });
});
