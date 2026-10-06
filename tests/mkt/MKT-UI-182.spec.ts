import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 관리자계정값 } from './components/account.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-182',
  name: '회원 목록은 높이 600px 영역 안에서 스크롤로 보이고 표 위에 「총 {N}명」이 보인다',
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminLoginId: z.string().describe('관리자 아이디').default('admin'),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 계정 = 관리자계정값(params);
  const 관리자 = new 관리자화면(page);
  const 헤더 = new 머리글(page);

  await test.step('로그인 요청으로 관리자 계정에 로그인한다', async () => {
    await API로그인(page.request, 계정.loginId, 계정.password);
  });

  await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
    await 안내창끄기(page);
    await page.goto('/');
    await 헤더.로그아웃버튼.waitFor();
    await verify('로그인한 머리글에 「관리자」 링크가 보인다', await 헤더.관리자링크.isVisible(), true, { blocker: true });
  });

  await test.step('관리자 화면 회원 관리를 연다', async () => {
    await 관리자.회원관리열기();
    await verify(
      '회원 목록은 높이 600px 영역 안에서 스크롤로 보이고 표 위에 「총 {N}명」이 보인다',
      await 관리자.회원목록측정(),
      { 높이: 600, 넘침: true, 합계문구: true, 합계위: true },
    );
  });
});
