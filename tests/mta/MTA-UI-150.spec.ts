import { defineCase, test, verify } from '@platform/kit';
import { 길게누르기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-150',
  name: '글 상세에서 「좋아요」를 길게 누르면 「좋아요」 · 「보관」 · 「즐겨찾기 보기」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
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

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('글 상세에서 「좋아요」를 길게 누른다', async () => {
    await 글상세열기(driver, 'minjun_dev', '마스토돈 4.7 인용 기능');
    await 길게누르기(driver, 글상세.좋아요);
    const 좋아요 = await verify('「좋아요」가 보인다', await 글상세.메뉴.뜰때까지('좋아요'), true);
    const 보관 = await verify('「보관」이 보인다', await 글상세.메뉴.뜰때까지('보관'), true);
    const 즐겨찾기 = await verify('「즐겨찾기 보기」가 보인다', await 글상세.메뉴.뜰때까지('즐겨찾기 보기'), true);
    await verify('글 상세에서 「좋아요」를 길게 누르면 「좋아요」 · 「보관」 · 「즐겨찾기 보기」가 보인다', 좋아요 && 보관 && 즐겨찾기, true);
    await driver.back();
  });
});
