import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-025',
  name: '대시보드에 「가입 출처」 · 「상위 활성 언어」 · 「상위 활성 서버」 · 「소프트웨어」 · 「디스크 사용량」 표가 보인다',
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
    await 대시보드.그려질때까지();
    const 표1 = await verify('「가입 출처」 표가 보인다', await 대시보드.소제목('가입 출처').isVisible(), true);
    const 표2 = await verify('「상위 활성 언어」 표가 보인다', await 대시보드.소제목('상위 활성 언어').isVisible(), true);
    const 표3 = await verify('「상위 활성 서버」 표가 보인다', await 대시보드.소제목('상위 활성 서버').isVisible(), true);
    const 표4 = await verify('「소프트웨어」 표가 보인다', await 대시보드.소제목('소프트웨어').isVisible(), true);
    const 표5 = await verify('「디스크 사용량」 표가 보인다', await 대시보드.소제목('디스크 사용량').isVisible(), true);
    await verify('대시보드에 「가입 출처」 · 「상위 활성 언어」 · 「상위 활성 서버」 · 「소프트웨어」 · 「디스크 사용량」 표가 보인다', 표1 && 표2 && 표3 && 표4 && 표5, true);
  });
});
