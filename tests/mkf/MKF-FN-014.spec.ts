import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-014',
  name: '홈을 79px 내리면 머리글 높이가 64px 그대로다',
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 홈 = new 홈화면(page);
  const 화면 = new 게시판목록화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('화면 높이를 400px 로 줄인 홈을 연다', async () => {
    await 방해막기(page);
    await page.setViewportSize({ width: 1280, height: 400 });
    await 홈.열기();
  });

  await test.step('홈이 열렸는지 확인한다', async () => {
    await 머리.로그인.waitFor();
    await verify('홈 화면이 열려 있다', await 홈.제목.isVisible(), true, { blocker: true });
  });

  await test.step('홈을 79px 내린다', async () => {
    await 화면.내리기(79);
    await verify('홈을 79px 내리면 머리글 높이가 64px 그대로다', await 화면.머리글높이(), 64);
  });

  await test.step('홈을 80px 내린다', async () => {
    await 화면.내리기(80);
    await verify('홈을 80px 내리면 머리글 높이가 48px 로 줄어든다', await 화면.머리글높이(), 48);
  });

  await test.step('홈을 80px 내린 채 머리글 자리를 확인한다', async () => {
    await verify(
      '홈을 80px 내리면 머리글이 화면 맨 위에 붙어 보인다',
      { 붙음표시: await 화면.머리글붙음.isVisible(), 위쪽: Math.round((await 머리.영역.boundingBox())?.y ?? -1) },
      { 붙음표시: true, 위쪽: 0 },
    );
  });
});
