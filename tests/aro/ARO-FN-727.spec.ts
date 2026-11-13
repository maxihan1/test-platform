import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 기록찾기 } from './helpers/ops-api.helper.js';
import { 비밀키있나 } from './helpers/maintenance-dash.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-727',
  name: '맞는 계정으로 로그인 API 를 부르면 응답 본문에 비밀번호가 들어 있지 않다',
  precondition: ['로그인하지 않았다', '운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  await test.step('맞는 아이디와 비밀번호로 로그인 API 를 부른다', async () => {
    const 응답 = await request.post('/api/login', { data: { userName: params.loginId, password: params.loginPassword } });
    const 글 = await 응답.text();
    await verify('로그인 API 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const 원문 = await verify('로그인 응답 본문에 비밀번호 원문이 없다', 글.includes(params.loginPassword ?? ''), false);
    const 칸 = await verify('로그인 응답 본문에 비밀번호 칸이 없다', 비밀키있나(JSON.parse(글)), false);
    await verify('맞는 계정으로 로그인 API 를 부르면 응답 본문에 비밀번호가 들어 있지 않다', 원문 && 칸, true);
  });

  await test.step('운영자 계정으로 로그인하고 기록 API 에서 로그인 줄을 찾는다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    const 기록 = await 기록찾기(page, 'audit', 'qa_ops');
    await verify('기록에 로그인 줄이 있다', 기록.items.filter((줄) => 줄.area === 'AUTH').length > 0, true, { blocker: true });
  });

  await test.step('「기록」의 로그인 줄을 API 로 읽는다', async () => {
    const 기록 = await 기록찾기(page, 'audit', 'qa_ops');
    const 줄들 = 기록.items.filter((줄) => 줄.area === 'AUTH');
    const 원문 = await verify('로그인 기록 줄에 비밀번호 원문이 없다', JSON.stringify(줄들).includes(params.loginPassword ?? ''), false);
    const 칸 = await verify('로그인 기록 줄에 비밀번호 칸이 없다', 비밀키있나(줄들), false);
    await verify('로그인 기록 줄에도 비밀번호가 없다', 원문 && 칸, true);
  });
});
