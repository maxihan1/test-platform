import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-038',
  name: '실시간 피드에 「이 서버」 · 「다른 서버」 · 「모두」 탭이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 실시간피드화면(page);

  await test.step('실시간 피드를 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('실시간 피드가 열려 있다', new URL(page.url()).pathname, '/public/local', { blocker: true });
    const 이서버 = await verify('「이 서버」 탭이 보인다', await 화면.이서버탭.isVisible(), true);
    const 다른서버 = await verify('「다른 서버」 탭이 보인다', await 화면.다른서버탭.isVisible(), true);
    const 모두 = await verify('「모두」 탭이 보인다', await 화면.모두탭.isVisible(), true);
    await verify('실시간 피드에 「이 서버」 · 「다른 서버」 · 「모두」 탭이 보인다', 이서버 && 다른서버 && 모두, true);
  });
});
