import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임토큰, 본문글, 인증헤더 } from './helpers/api.helper.js';
import { 일회용회원로그인 } from './helpers/html.helper.js';
import { 비밀번호바꾸기제출 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-342',
  name: '비밀번호를 바꾼 뒤 이전 게임 계정 토큰으로 데이터 API 를 부르면 서명 오류가 아닌 401 「invalid shared secret」이다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('비밀번호를 바꾼 뒤 바꾸기 전에 받은 게임 계정 토큰으로 POST /api/getguilds 를 부른다', async () => {
    const { 회원, 로그인 } = await 일회용회원로그인(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    await verify('일회용 회원 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    const 받음 = await 게임토큰(request, 회원.아이디, 회원.비밀번호);
    await verify('바꾸기 전 게임 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
    const 변경 = await 비밀번호바꾸기제출(request, { oldPassword: 회원.비밀번호, newPassword: 'Zz654321y!' });
    await verify('비밀번호 바꾸기 응답 코드가 302 다', 변경.status(), 302, { blocker: true });
    const 응답 = await request.post('/api/getguilds', { headers: 인증헤더(받음.token), data: {} });
    const 코드 = await verify('이전 토큰의 /api/getguilds 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('응답 본문이 「invalid shared secret」이다', (await 본문글(응답)).trim(), 'invalid shared secret');
    await verify('비밀번호를 바꾼 뒤 이전 게임 계정 토큰으로 데이터 API 를 부르면 서명 오류가 아닌 401 「invalid shared secret」이다', 코드 && 본문, true);
  });
});
