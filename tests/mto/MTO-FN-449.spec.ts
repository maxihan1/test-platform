import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-449',
  name: '없는 계정 번호로 계정 상세를 열면 「찾으려는 페이지가 존재하지 않습니다.」와 「Go home」이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 프로필 = new 공개프로필화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('주소 /admin/accounts/99999999 를 연다', async () => {
    await 관리.열기('/admin/accounts/99999999');
    const 안내 = await verify('「찾으려는 페이지가 존재하지 않습니다.」가 보인다', await 관리.오류.없는페이지.isVisible(), true);
    const 홈 = await verify('「Go home」이 보인다', await 관리.오류.홈으로.isVisible(), true);
    await verify('없는 계정 번호로 계정 상세를 열면 「찾으려는 페이지가 존재하지 않습니다.」와 「Go home」이 보인다', 안내 && 홈, true);
  });
  await test.step('주소 /admin/reports/99999999 를 연다', async () => {
    await 관리.열기('/admin/reports/99999999');
    await verify('없는 신고 번호의 신고 상세에는 「찾으려는 페이지가 존재하지 않습니다.」가 보인다', await 관리.오류.없는페이지.isVisible(), true);
  });
});
