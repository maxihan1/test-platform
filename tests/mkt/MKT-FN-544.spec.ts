import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 관리자계정값 } from './components/account.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-544',
  name: '잠기지 않은 회원 줄에는 「잠금 해제」 버튼이 보이지 않는다',
  techniques: ['상태 전이'],
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

  await test.step('회원 관리 표에서 잠기지 않은 회원 줄을 찾는다', async () => {
    await 관리자.회원관리열기();
    const 줄 = 관리자.회원줄들.filter({ hasText: '정상' }).first();
    await verify('회원 관리 표에 잠기지 않은 회원 줄이 있다', await 줄.count(), 1, { blocker: true });
    await verify('잠기지 않은 회원 줄에는 「잠금 해제」 버튼이 보이지 않는다', await 관리자.잠금해제버튼(줄).isVisible(), false);
  });
});
