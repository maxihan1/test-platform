import { defineCase, test, verify } from '@platform/kit';

import { 두프레임기다리기 } from './helpers/common-tools.helper.js';
import { 글작성시각들 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-042',
  name: '「최신글」을 누르면 가장 최근에 쓴 순으로 글 5건이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('홈 화면이 보인다', await 홈.추천제목.isVisible(), true, { blocker: true });
  });

  await test.step('홈 화면에서 「최신글」을 누른다', async () => {
    const 응답 = page.waitForResponse((r) => r.url().includes('sort=latest'));
    await 홈.최신글탭.click();
    await 응답;
    await 두프레임기다리기(page);
    const 시각표 = await 글작성시각들(request);
    const 화면시각들 = (await 홈.글번호들()).map((번호) => 시각표.get(번호) ?? -1);
    const 가장최근 = [...시각표.values()].sort((앞, 뒤) => 뒤 - 앞).slice(0, 5);
    const 건수 = await verify('「최신글」에 글 5건이 보인다', 화면시각들.length, 5);
    const 순서 = await verify('「최신글」의 글이 가장 최근에 쓴 순이다', 화면시각들, 가장최근);
    await verify('「최신글」을 누르면 가장 최근에 쓴 순으로 글 5건이 보인다', 건수 && 순서, true);
  });
});
