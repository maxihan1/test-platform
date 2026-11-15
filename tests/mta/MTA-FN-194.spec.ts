import { defineCase, test, verify } from '@platform/kit';
import { 될때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글, 내글쓰기, 내프로필에서글열기, 내글지우기 } from './helpers/post.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글카드 } from './pages/post-card.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-194',
  name: '삭제 확인 창에서 「삭제」를 누르면 그 글이 내 프로필에서 보이지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글상세 = new 글상세화면(driver);
  const 카드 = new 글카드(driver);
  const 창 = new 확인창(driver);
  const 본문 = 표시글('삭제 확인');
  let 지움 = false;

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  try {
    await test.step('내 새 글 삭제 창에서 「삭제」를 누른다', async () => {
      await 내글쓰기(driver, 본문);
      await 내프로필에서글열기(driver, 본문);
      await 글상세.더보기열기();
      await 글상세.메뉴.고르기('삭제');
      await verify('삭제 확인 창이 뜬다', await 창.뜰때까지(), true, { blocker: true });
      await 창.확인();
      const 사라짐 = await 될때까지(driver, async () => !(await 보이나(driver, 카드.굴려서글자포함(본문, 4))), 20_000);
      지움 = 사라짐;
      await verify('삭제 확인 창에서 「삭제」를 누르면 그 글이 내 프로필에서 보이지 않는다', 사라짐, true);
    });
  } finally {
    if (!지움) await 내글지우기(driver, 본문);
  }
});
