import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-002',
  name: '역할이 없는 사용자가 「서버 설정」 · 「역할」 · 「웹훅」 · 「이의제기」 주소를 열면 화면마다 「이 페이지를 표시할 권한이 없습니다.」가 보인다',
  precondition: ['역할이 없는 사용자(qa_user1) 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    userId: z.string().describe('역할 없는 사용자 아이디').optional().meta({ secret: true, account: '사용자' }),
    userPassword: z.string().describe('역할 없는 사용자 비밀번호').optional().meta({ secret: true, account: '사용자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 프로필 = new 공개프로필화면(page);

  await test.step('역할이 없는 사용자 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.userId, params.userPassword);
    await 프로필.열기();
    await verify('역할이 없는 사용자(qa_user1) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「서버 설정」 · 「역할」 · 「웹훅」 · 「이의제기」 주소를 차례로 연다', async () => {
    await 관리.열기('/admin/settings');
    const 화면1 = await verify('「서버 설정」 화면에 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.isVisible(), true);
    await 관리.열기('/admin/roles');
    const 화면2 = await verify('「역할」 화면에 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.isVisible(), true);
    await 관리.열기('/admin/webhooks');
    const 화면3 = await verify('「웹훅」 화면에 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.isVisible(), true);
    await 관리.열기('/admin/disputes/appeals');
    const 화면4 = await verify('「이의제기」 화면에 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.isVisible(), true);
    await verify('역할이 없는 사용자가 「서버 설정」 · 「역할」 · 「웹훅」 · 「이의제기」 주소를 열면 화면마다 「이 페이지를 표시할 권한이 없습니다.」가 보인다', 화면1 && 화면2 && 화면3 && 화면4, true);
  });
});
