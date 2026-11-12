import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-016',
  name: '사이드바에서 「계정」과 「신고」를 누르면 본문 맨 위 제목이 「계정」 · 「신고」로 바뀐다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/reports');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.메뉴('로그아웃').waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('사이드바에서 「계정」과 「신고」를 차례로 누른다', async () => {
    await 관리.누르기(관리.묶음메뉴('중재', '계정'));
    const 계정 = await verify('본문 맨 위 제목이 「계정」으로 바뀐다', await 관리.제목이('계정').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    await 관리.누르기(관리.묶음메뉴('중재', '신고'));
    const 신고 = await verify('본문 맨 위 제목이 「신고」로 바뀐다', await 관리.제목이('신고').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    await verify('사이드바에서 「계정」과 「신고」를 누르면 본문 맨 위 제목이 「계정」 · 「신고」로 바뀐다', 계정 && 신고, true);
  });
});
