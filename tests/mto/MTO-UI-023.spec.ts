import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-023',
  name: '대시보드에 「새 사용자」 · 「활성 사용자」 · 「상호 작용」 · 「신고 열림」 · 「해결된 신고」 타일이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 대시보드 = new 대시보드화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「대시보드」 화면을 연다', async () => {
    await 대시보드.열기();
    const 타일1 = await verify('「새 사용자」 타일이 보인다', await 대시보드.타일('새 사용자').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    const 타일2 = await verify('「활성 사용자」 타일이 보인다', await 대시보드.타일('활성 사용자').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    const 타일3 = await verify('「상호 작용」 타일이 보인다', await 대시보드.타일('상호 작용').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    const 타일4 = await verify('「신고 열림」 타일이 보인다', await 대시보드.타일('신고 열림').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    const 타일5 = await verify('「해결된 신고」 타일이 보인다', await 대시보드.타일('해결된 신고').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    await verify('대시보드에 「새 사용자」 · 「활성 사용자」 · 「상호 작용」 · 「신고 열림」 · 「해결된 신고」 타일이 보인다', 타일1 && 타일2 && 타일3 && 타일4 && 타일5, true);
  });
});
