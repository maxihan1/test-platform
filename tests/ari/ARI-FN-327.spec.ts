import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 이동경로, 일회용회원로그인 } from './helpers/html.helper.js';
import { 정보수정제출 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-327',
  name: '형식이 틀린 이메일로 정보 수정을 저장하면 302 로 대시보드로 이동한다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(302),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('일회용 회원으로 정보 수정에 형식이 틀린 이메일을 저장한다', async () => {
    const { 회원, 로그인 } = await 일회용회원로그인(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    await verify('일회용 회원 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    const 응답 = await 정보수정제출(request, { email: 'not-an-email' });
    const 코드 = await verify('정보 수정 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 주소 = await verify('이동 주소가 「/Account/Dashboard」다', 이동경로(응답), '/Account/Dashboard');
    await verify('형식이 틀린 이메일로 정보 수정을 저장하면 302 로 대시보드로 이동한다', 코드 && 주소, true);
  });
});
