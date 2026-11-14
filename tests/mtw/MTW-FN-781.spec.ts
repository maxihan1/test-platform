import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 개인정보처리방침화면 } from './pages/privacy-policy.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-781',
  name: '비회원이 개인정보처리방침을 열면 본문과 「에 마지막으로 업데이트됨」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 개인정보처리방침화면(page);

  await test.step('비회원으로 개인정보처리방침을 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('개인정보처리방침 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    const 본문 = await verify('개인정보처리방침 본문이 보인다', await 화면.본문.waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    const 갱신 = await verify('「에 마지막으로 업데이트됨」이 보인다', await 화면.갱신일.isVisible(), true);
    await verify('비회원이 개인정보처리방침을 열면 본문과 「에 마지막으로 업데이트됨」이 보인다', 본문 && 갱신, true);
  });
});
