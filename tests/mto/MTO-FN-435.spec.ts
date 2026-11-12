import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-435',
  name: '규칙 관리 권한만 가진 역할이 「서버 규칙」 화면을 열면 사이드바 「관리」 묶음에 「이용 약관」이 보인다',
  precondition: ['규칙 관리만 가진 역할 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    rulesId: z.string().describe('규칙 관리만 가진 역할 아이디').optional().meta({ secret: true, account: '규칙 관리만 가진 역할' }),
    rulesPassword: z.string().describe('규칙 관리만 가진 역할 비밀번호').optional().meta({ secret: true, account: '규칙 관리만 가진 역할' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 프로필 = new 공개프로필화면(page);

  await test.step('규칙 관리만 가진 역할 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.rulesId, params.rulesPassword);
    await 프로필.열기();
    await verify('규칙 관리만 가진 역할 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('「서버 규칙」 화면을 연다', async () => {
    await 관리.열기('/admin/rules');
    await verify('「서버 규칙」 화면에 제목이 보인다', await 관리.제목이('서버 규칙').isVisible(), true, { blocker: true });
    await verify('규칙 관리 권한만 가진 역할이 「서버 규칙」 화면을 열면 사이드바 「관리」 묶음에 「이용 약관」이 보인다', await 관리.묶음메뉴('관리', '이용 약관').isVisible(), true);
  });

  await test.step('사이드바 「관리」 › 「이용 약관」을 누른다', async () => {
    await 관리.누르기(관리.묶음메뉴('관리', '이용 약관'));
    await 관리.제목.waitFor();
    await verify('「이용 약관」 화면 대신 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.isVisible(), true);
  });
});
