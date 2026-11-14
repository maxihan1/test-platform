import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정찾기API } from './helpers/api.helper.js';
import { 관계API } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈링크화면 } from './pages/home-links.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-664',
  name: '홈을 열면 뮤트한 noisy_cho 의 글이 보이지 않는다',
  precondition: ['일반 회원이 noisy_cho 를 팔로우하고 뮤트해 두었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 링크 = new 홈링크화면(page);
  let 대상id = '';

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    대상id = (await 계정찾기API(page, 'noisy_cho')).id;
    const 관계 = await 관계API(page, 대상id);
    await verify('일반 회원이 noisy_cho 를 뮤트해 두었다', 관계.muting, true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 홈.열기();
    await 링크.첫글카드그려질때까지();
    await verify('홈에 글이 보인다', await 링크.첫글카드.isVisible(), true, { blocker: true });
    await verify('홈을 열면 뮤트한 noisy_cho 의 글이 보이지 않는다', await 홈.글('@noisy_cho').count(), 0);
  });

  await test.step('noisy_cho 와의 관계를 읽는다', async () => {
    await verify('뮤트한 noisy_cho 와의 팔로우 관계는 그대로다', (await 관계API(page, 대상id)).following, true);
  });
});
