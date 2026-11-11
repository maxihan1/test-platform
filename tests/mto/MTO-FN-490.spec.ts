import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창받기 } from './helpers/dialog.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 유행해시태그화면 } from './pages/trends-tags.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-490',
  name: '유행하는 해시태그에서 아무것도 고르지 않고 「허용」을 누르면 「아무 것도 선택 되지 않아」로 시작하는 안내가 보인다',
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
  await test.step('「유행하는 해시태그」 화면에서 아무것도 고르지 않고 「허용」을 누른다', async () => {
    await 유행태그.열기();
    const 창 = 확인창받기(page, '확인');
    await 유행태그.허용.click();
    await 창;
    await 유행태그.알림.모두.first().waitFor();
    await verify('유행하는 해시태그에서 아무것도 고르지 않고 「허용」을 누르면 「아무 것도 선택 되지 않아」로 시작하는 안내가 보인다', (await 유행태그.알림.모두.first().innerText()).trim().startsWith('아무 것도 선택 되지 않아'), true);
  });
});
