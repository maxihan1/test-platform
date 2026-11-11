import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 유행해시태그화면 } from './pages/trends-tags.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-220',
  name: '유행하는 해시태그 화면에 「전체」 · 「승인됨」 · 「거부됨」 · 「대기 중 (N)」과 「허용」 · 「금지」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 유행태그 = new 유행해시태그화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「유행하는 해시태그」 화면을 연다', async () => {
    await 유행태그.열기();
    const 전체 = await verify('「전체」가 보인다', await 유행태그.전체.isVisible(), true);
    const 승인됨 = await verify('「승인됨」이 보인다', await 유행태그.승인됨.isVisible(), true);
    const 거부됨 = await verify('「거부됨」이 보인다', await 유행태그.거부됨.isVisible(), true);
    const 대기중 = await verify('「대기 중 (N)」이 보인다', await 유행태그.대기중.isVisible(), true);
    const 허용 = await verify('「허용」이 보인다', await 유행태그.허용.isVisible(), true);
    const 금지 = await verify('「금지」가 보인다', await 유행태그.금지.isVisible(), true);
    await verify('유행하는 해시태그 화면에 「전체」 · 「승인됨」 · 「거부됨」 · 「대기 중 (N)」과 「허용」 · 「금지」가 보인다', 전체 && 승인됨 && 거부됨 && 대기중 && 허용 && 금지, true);
  });
});
