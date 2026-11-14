import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-320',
  name: '실시간 피드 버튼 반응',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 실시간피드화면(page);
  const 이서버안내 = '여기 있는 것들은 계정이 mastodon.maxihan.com에 있는 사람들의 최근 공개 게시물들입니다.';
  const 다른서버안내 = '이 게시물들은 mastodon.maxihan.com에 있는 사람들이 팔로우하는 페디버스 사용자들의 최신 공개 게시물입니다.';

  await test.step('실시간 피드에서 「다른 서버」 탭을 누른다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await 화면.다른서버탭.click();
    await 화면.머리말(다른서버안내).waitFor();
    await verify('실시간 피드에서 「다른 서버」 탭을 누르면 /public/remote 로 간다', new URL(page.url()).pathname, '/public/remote');
  });

  await test.step('실시간 피드에서 「모두」 탭을 누른다', async () => {
    await 화면.열기();
    await 화면.모두탭.click();
    await 화면.머리말(다른서버안내).waitFor();
    await verify('실시간 피드에서 「모두」 탭을 누르면 /public 으로 간다', new URL(page.url()).pathname, '/public');
  });

  await test.step('실시간 피드에서 「이 서버」 탭을 누른다', async () => {
    await 화면.모두열기();
    await 화면.이서버탭.click();
    await 화면.머리말(이서버안내).waitFor();
    await verify('실시간 피드에서 「이 서버」 탭을 누르면 /public/local 로 간다', new URL(page.url()).pathname, '/public/local');
  });
});
