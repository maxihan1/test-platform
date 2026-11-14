import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 정보화면 } from './pages/about.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-024',
  name: '정보 화면에 서버 이름 「mastodon.maxihan.com」과 소개 「Mastodon으로 구동되는 분산 소셜 미디어」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 정보화면(page);

  await test.step('정보 화면을 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('로그인 전 화면 오른쪽 하단에 「로그인」이 보인다', await 화면.틀.로그인.isVisible(), true, { blocker: true });
    const 이름 = await verify('서버 이름 「mastodon.maxihan.com」이 보인다', await 화면.서버이름.isVisible(), true);
    const 소개 = await verify('소개 「Mastodon으로 구동되는 분산 소셜 미디어」가 보인다', await 화면.소개.isVisible(), true);
    await verify('정보 화면에 서버 이름 「mastodon.maxihan.com」과 소개 「Mastodon으로 구동되는 분산 소셜 미디어」가 보인다', 이름 && 소개, true);
  });
});
