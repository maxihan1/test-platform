import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 메뉴 } from './components/menu.component.js';
import { 글카드 } from './components/status-card.component.js';
import { 문구가보이나 } from './helpers/app.helper.js';
import { 내글남김없이지우기, 문구가사라질때까지, 설정스위치바꾸기, 설정줄열기, 홈탭으로 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글올리기, 테스트글 } from './helpers/post.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-195',
  name: '설정 「게시물 삭제 전 묻기」가 꺼져 있으면 확인 창 없이 지운다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  const 확인 = new 확인창(driver);
  const 팝업 = new 메뉴(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  const 본문 = 테스트글('삭제 확인 끄기');
  await test.step('내 새 글을 올린다', async () => {
    await 글올리기(driver, 본문);
  });
  try {
    await test.step('올린 글이 홈에 보이는지 확인한다', async () => {
      await verify('올린 글이 홈에 보인다', await 문구가보이나(driver, 본문), true, { blocker: true });
    });
    await test.step('설정 「게시물 삭제 전 묻기」를 끄고 내 새 글을 지운다', async () => {
      await 설정줄열기(driver, ['동작']);
      await 설정스위치바꾸기(driver, '게시물 삭제 전 묻기', false);
      await 홈탭으로(driver);
      await 카드.누르기(본문, 'more');
      await 팝업.고르기('삭제');
      const 창없음 = await verify('삭제를 눌러도 확인 창이 뜨지 않는다', !(await 확인.떴나(3_000)), true);
      const 지워짐 = await verify('삭제를 누른 뒤 글이 지워진다', await 문구가사라질때까지(driver, 본문), true);
      await verify('설정 「게시물 삭제 전 묻기」가 꺼져 있으면 확인 창 없이 지운다', 창없음 && 지워짐, true);
    }, { capture: true });
  } finally {
    await 홈탭으로(driver);
    await 설정줄열기(driver, ['동작']);
    await 설정스위치바꾸기(driver, '게시물 삭제 전 묻기', true);
    await 홈탭으로(driver);
    await 내글남김없이지우기(driver, 본문);
  }
});
