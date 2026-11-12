import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기, 새창으로로그인 } from './helpers/login.helper.js';
import { 역할폼화면 } from './pages/role-form.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 웹훅폼화면 } from './pages/webhook-form.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-438',
  name: 'Admin 이 새 웹훅 화면에서 「status.created」를 누르면 체크되지 않는다',
  precondition: ['Admin 역할 계정으로 로그인해 있다', 'Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('Admin 역할 아이디').optional().meta({ secret: true, account: 'Admin' }),
    adminPassword: z.string().describe('Admin 역할 비밀번호').optional().meta({ secret: true, account: 'Admin' }),
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 웹훅폼 = new 웹훅폼화면(page);
  const 역할폼 = new 역할폼화면(page);
  let Owner창: Page | undefined;

  try {
    await test.step('Admin 역할 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.adminId, params.adminPassword);
      await 프로필.열기();
      await verify('Admin 역할 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
    });
    await test.step('Owner 창에 로그인한다', async () => {
      Owner창 = await 새창으로로그인(page, params.loginId, params.loginPassword);
      await new 공개프로필화면(Owner창).열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await new 공개프로필화면(Owner창).로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
    });
    await test.step('「웹훅」 › 「엔드포인트 추가」 화면에서 「status.created」를 누른다', async () => {
      await 웹훅폼.열기();
      await 웹훅폼.이벤트누르기('status.created');
      await verify('Admin 이 새 웹훅 화면에서 「status.created」를 누르면 체크되지 않는다', await 웹훅폼.이벤트('status.created').isChecked(), false);
      const Owner웹훅폼 = new 웹훅폼화면(Owner창 as Page);
      await Owner웹훅폼.열기();
      await Owner웹훅폼.이벤트누르기('status.created');
      await verify('Owner 는 새 웹훅 화면에서 「status.created」를 체크할 수 있다', await Owner웹훅폼.이벤트('status.created').isChecked(), true);
    });
    await test.step('「역할 추가」 화면을 연다', async () => {
      await 역할폼.추가폼열기();
      const 관리자 = await verify('「관리자」 체크박스가 비활성이다', await 역할폼.권한전체('관리자').isDisabled(), true);
      const 데브옵스 = await verify('「데브옵스」 체크박스가 비활성이다', await 역할폼.권한전체('데브옵스').isDisabled(), true);
      const 구독관리 = await verify('「이메일 구독 관리」 체크박스가 비활성이다', await 역할폼.권한전체('이메일 구독 관리').isDisabled(), true);
      const 초대 = await verify('「심사 없이 사용자 초대」 체크박스가 비활성이다', await 역할폼.권한전체('심사 없이 사용자 초대').isDisabled(), true);
      await verify('Admin 의 「역할 추가」 화면에서 「관리자」 · 「데브옵스」 · 「이메일 구독 관리」 · 「심사 없이 사용자 초대」 체크박스가 비활성이다', 관리자 && 데브옵스 && 구독관리 && 초대, true);
    });
  } finally {
    if (Owner창 !== undefined) await Owner창.context().close();
  }
});
