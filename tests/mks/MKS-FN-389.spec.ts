import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, 로그인한아이디, 테스트계정으로로그인 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-389',
  name: '문의 내용에 「안녕하세요」를 적으면 글자 수 표시가 「5/1000」으로 바뀐다',
  precondition: ['테스트 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 문의 = new 문의화면(page);

  await test.step('테스트 계정으로 로그인한다', async () => {
    await 방해막기(page);
    await 테스트계정으로로그인(page.request, params);
  });

  await test.step('테스트 계정으로 로그인했는지 확인한다', async () => {
    await verify('테스트 계정으로 로그인해 있다', await 로그인한아이디(page.request), 계정값(params).loginId, { blocker: true });
  });

  await test.step('1:1 문의 화면을 연다', async () => {
    await 문의.열기();
  });

  await test.step('1:1 문의 화면이 열렸는지 확인한다', async () => {
    await 문의.제목.waitFor();
    await verify('1:1 문의 화면이 열려 있다', 경로(page), 문의화면.주소, { blocker: true });
  });

  await test.step('1:1 문의 내용 칸에 「안녕하세요」를 적는다', async () => {
    await 문의.내용칸.fill('안녕하세요');
    await verify('문의 내용에 「안녕하세요」를 적으면 글자 수 표시가 「5/1000」으로 바뀐다', await 문의.글자수.innerText(), '5/1000');
  });
});
