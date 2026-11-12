import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-039',
  name: '사용자 관리 권한이 없는 역할이 대시보드를 열면 「새 사용자」 · 「활성 사용자」 타일이 링크 없이 숫자만 보인다',
  precondition: ['사용자 관리 없이 대시보드 보기만 가진 역할 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    viewerId: z.string().describe('사용자 관리 없이 대시보드 보기만 가진 역할 아이디').optional().meta({ secret: true, account: '사용자 관리 없이 대시보드 보기만 가진 역할' }),
    viewerPassword: z.string().describe('사용자 관리 없이 대시보드 보기만 가진 역할 비밀번호').optional().meta({ secret: true, account: '사용자 관리 없이 대시보드 보기만 가진 역할' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 대시보드 = new 대시보드화면(page);

  await test.step('사용자 관리 없이 대시보드 보기만 가진 역할 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.viewerId, params.viewerPassword);
    await 프로필.열기();
    await verify('사용자 관리 없이 대시보드 보기만 가진 역할 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「대시보드」 화면을 연다', async () => {
    await 대시보드.열기();
    const 새숫자 = await verify('「새 사용자」 타일에 숫자가 보인다', await 대시보드.타일숫자('새 사용자').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    const 활성숫자 = await verify('「활성 사용자」 타일에 숫자가 보인다', await 대시보드.타일숫자('활성 사용자').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    const 새링크 = await verify('「새 사용자」 타일이 링크로 보이지 않는다', await 대시보드.새사용자타일.isVisible(), false);
    const 활성링크 = await verify('「활성 사용자」 타일이 링크로 보이지 않는다', await 대시보드.활성사용자타일.isVisible(), false);
    await verify('사용자 관리 권한이 없는 역할이 대시보드를 열면 「새 사용자」 · 「활성 사용자」 타일이 링크 없이 숫자만 보인다', 새숫자 && 활성숫자 && 새링크 && 활성링크, true);
  });
});
