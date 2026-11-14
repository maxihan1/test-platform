import { defineCase, test, verify } from '@platform/kit';

import { 로그인안내창 } from './components/interaction-modal.component.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-192',
  name: '비회원이 프로필에서 「팔로우」를 누르면 로그인 안내 창이 뜬다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 프로필 = new 프로필화면(page);
  const 안내 = new 로그인안내창(page);

  await test.step('hana_photo 프로필을 연다', async () => {
    await 한국어로(page);
    await 프로필.열기('hana_photo');
    await verify('프로필 머리에 「팔로우」 버튼이 보인다', await 프로필.팔로우버튼.isVisible(), true, { blocker: true });
  });

  await test.step('비회원으로 hana_photo 프로필에서 「팔로우」를 누른다', async () => {
    await 프로필.팔로우누르기();
    const 떴다 = await 안내.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('비회원이 프로필에서 「팔로우」를 누르면 로그인 안내 창이 뜬다', 떴다, true);
  });

  await test.step('비회원으로 hana_photo 프로필의 「⋯」를 누른다', async () => {
    await 프로필.열기('hana_photo');
    await 프로필.더보기열기();
    const 떴다 = await 안내.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('비회원이 프로필 「⋯」를 눌러도 로그인 안내 창이 뜬다', 떴다, true);
  });
});
