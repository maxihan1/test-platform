import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 유행게시물화면 } from './pages/trends-statuses.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-219',
  name: '유행하는 게시물 화면에 「모두」 · 「허용된 것만」과 「게시물 허용」 · 「작성자 허용」 · 「게시물 비허용」 · 「작성자 금지」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 유행게시물 = new 유행게시물화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「유행하는 게시물」 화면을 연다', async () => {
    await 유행게시물.열기();
    const 모두 = await verify('「모두」가 보인다', await 유행게시물.모두.isVisible(), true);
    const 허용된것만 = await verify('「허용된 것만」이 보인다', await 유행게시물.허용된것만.isVisible(), true);
    const 게시물허용 = await verify('「게시물 허용」이 보인다', await 유행게시물.게시물허용.isVisible(), true);
    const 작성자허용 = await verify('「작성자 허용」이 보인다', await 유행게시물.작성자허용.isVisible(), true);
    const 게시물비허용 = await verify('「게시물 비허용」이 보인다', await 유행게시물.게시물비허용.isVisible(), true);
    const 작성자금지 = await verify('「작성자 금지」가 보인다', await 유행게시물.작성자금지.isVisible(), true);
    await verify('유행하는 게시물 화면에 「모두」 · 「허용된 것만」과 「게시물 허용」 · 「작성자 허용」 · 「게시물 비허용」 · 「작성자 금지」가 보인다', 모두 && 허용된것만 && 게시물허용 && 작성자허용 && 게시물비허용 && 작성자금지, true);
  });
});
