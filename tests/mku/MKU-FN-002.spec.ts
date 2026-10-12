import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 경로, 보이는이름들, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-002',
  name: '「커뮤니티」 메뉴에 마우스를 올리면 하위 메뉴 「자유게시판」 · 「질문게시판」 · 「후기게시판」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page);
    await 홈.열기();
  });

  await test.step('홈이 열렸는지 확인한다', async () => {
    await 머리.로그인.waitFor();
    await verify('홈 화면이 열려 있다', 경로(page), '/', { blocker: true });
  });

  await test.step('홈에서 머리글 「커뮤니티」 메뉴에 마우스를 올린다', async () => {
    await 머리.커뮤니티.hover();
    await 머리.하위메뉴항목('자유게시판').waitFor();
    await verify(
      '「커뮤니티」 메뉴에 마우스를 올리면 하위 메뉴 「자유게시판」 · 「질문게시판」 · 「후기게시판」이 보인다',
      await 보이는이름들({
        '「자유게시판」': 머리.하위메뉴항목('자유게시판'),
        '「질문게시판」': 머리.하위메뉴항목('질문게시판'),
        '「후기게시판」': 머리.하위메뉴항목('후기게시판'),
      }),
      '「자유게시판」, 「질문게시판」, 「후기게시판」',
    );
  });
});
