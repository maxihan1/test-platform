import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호찾기 } from './helpers/api.helper.js';
import { 가입제출, 일회용아이디, 일회용회원만들기 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-306',
  name: '형식이 틀린 이메일로 계정 만들기를 제출하면 302 로 가입된다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다', '케이스가 가입한 일회용 회원이 있다'],
  params: z.object({
    틀린이메일: z.string().describe('형식이 틀린 이메일 — @ 가 없는 글자').default('not-an-email'),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(302),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, admin, params, expected }) => {
  await test.step('형식이 틀린 이메일 「not-an-email」로 계정 만들기를 제출한다', async () => {
    const 아이디 = 일회용아이디();
    const 응답 = await 가입제출(request, { userName: 아이디, email: params.틀린이메일, password: 'Qa123456x!' });
    const 코드 = await verify('계정 만들기 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 계정 = await verify('틀린 이메일 계정이 만들어졌다', (await 계정번호찾기(admin, 아이디)) > 0, true);
    await verify('형식이 틀린 이메일로 계정 만들기를 제출하면 302 로 가입된다', 코드 && 계정, true);
  });
  await test.step('일회용 회원과 같은 이메일로 계정 만들기를 제출한다', async () => {
    const 회원 = await 일회용회원만들기(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    const 아이디 = 일회용아이디();
    const 응답 = await 가입제출(request, { userName: 아이디, email: 회원.이메일, password: 'Qa123456x!' });
    const 코드 = await verify('같은 이메일 계정 만들기 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 계정 = await verify('같은 이메일 계정이 만들어졌다', (await 계정번호찾기(admin, 아이디)) > 0, true);
    await verify('다른 계정과 같은 이메일일 때도 302 로 가입된다', 코드 && 계정, true);
  });
});
