import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 로그인전화면 } from './pages/landing.page.js';
import { 키보드단축키화면 } from './pages/keyboard-shortcuts.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-013',
  name: '로그인 전 왼쪽 하단에 「Mastodon」 · 「앱 다운로드하기」 · 「키보드 단축키」 · 「소스코드 보기」 · 「v4.7.5」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 전 = new 로그인전화면(page);
  const 단축키 = new 키보드단축키화면(page);

  await test.step('로그인 전 화면을 연다', async () => {
    await 한국어로(page);
    await 전.열기();
    await verify('로그인 전 오른쪽 하단에 「로그인」이 보인다', await 전.로그인.isVisible(), true, { blocker: true });
    const 제목 = await verify('왼쪽 하단에 「Mastodon」이 보인다', await 전.마스토돈제목.isVisible(), true);
    const 앱 = await verify('왼쪽 하단에 「앱 다운로드하기」가 보인다', await 전.앱다운로드.isVisible(), true);
    const 단축 = await verify('왼쪽 하단에 「키보드 단축키」가 보인다', await 전.키보드단축키.isVisible(), true);
    const 소스 = await verify('왼쪽 하단에 「소스코드 보기」가 보인다', await 전.소스코드.isVisible(), true);
    const 버전 = await verify('왼쪽 하단에 「v4.7.5」가 보인다', await 전.버전.isVisible(), true);
    await verify('로그인 전 왼쪽 하단에 「Mastodon」 · 「앱 다운로드하기」 · 「키보드 단축키」 · 「소스코드 보기」 · 「v4.7.5」가 보인다', 제목 && 앱 && 단축 && 소스 && 버전, true);
  });

  await test.step('로그인 전 왼쪽 하단에서 「키보드 단축키」를 누른다', async () => {
    await 전.키보드단축키.click();
    await 단축키.제목.waitFor();
    await verify('「키보드 단축키」 링크는 /keyboard-shortcuts 로 이어진다', new URL(page.url()).pathname, '/keyboard-shortcuts');
  });
});
