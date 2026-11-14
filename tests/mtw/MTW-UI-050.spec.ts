import { defineCase, test, verify } from '@platform/kit';

import { 로그인안내창 } from './components/interaction-modal.component.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-050',
  name: '프로필 「팔로우」에서 연 로그인 안내 창에 「{이름} 님을 팔로우하려면 사용중인 마스토돈 서버 계정으로 로그인해야 합니다.」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 프로필 = new 프로필화면(page);
  const 안내 = new 로그인안내창(page);
  let 이름 = '';

  await test.step('hana_photo 프로필을 연다', async () => {
    await 한국어로(page);
    await 프로필.열기('hana_photo');
    이름 = (await 프로필.표시이름.innerText()).replace(/\uFE0F/g, '').replace(/\s+/g, ' ').trim();
    await verify('프로필 머리에 「팔로우」 버튼이 보인다', await 프로필.팔로우버튼.isVisible(), true, { blocker: true });
  });

  await test.step('비회원으로 hana_photo 프로필의 「팔로우」를 누른다', async () => {
    await 프로필.팔로우누르기();
    const 떴다 = await 안내.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const 문장 = (await 안내.창.innerText()).replace(/\uFE0F/g, '').replace(/\s+/g, ' ');
    await verify('프로필 「팔로우」에서 연 로그인 안내 창에 「{이름} 님을 팔로우하려면 사용중인 마스토돈 서버 계정으로 로그인해야 합니다.」가 보인다', 떴다 && 문장.includes(`${이름} 님을 팔로우하려면 사용중인 마스토돈 서버 계정으로 로그인해야 합니다.`), true);
  });
});
