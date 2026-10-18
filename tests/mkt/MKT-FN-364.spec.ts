import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 로그인요청 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-364',
  name: '일반 회원이 /admin 에 들어가면 「권한이 없습니다」 화면이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 관리자 = new 관리자화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 방해창막기(page);
    await 로그인요청(page.request, params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('일반 회원으로 관리자 화면 /admin 을 연다', async () => {
    await 관리자.열기();
    await 관리자.머리글.로그인꼴일때까지();
    await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 관리자.머리글.로그아웃버튼.count(), 1, { blocker: true });
    await verify('일반 회원이 /admin 에 들어가면 「권한이 없습니다」 화면이 보인다', await 관리자.권한없음제목.isVisible(), true);
  });
});
