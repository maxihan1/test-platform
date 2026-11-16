import { defineCase, test, verify } from '@platform/kit';
import { 보이나, 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 앱id, 굴려서글자포함 } from './helpers/app.helper.js';
import { 내글모두지우기 } from './helpers/compose-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-245',
  name: '「열람 주의」를 켜고 문구 없이 게시하면 내 프로필의 그 글에 경고 문구가 보이지 않는다',
  platforms: ['android'],
  held: '보류 — 앱 화면에서 글 카드의 경고 문구 영역 주소를 못 읽었다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    경고영역: z.string().min(1).describe('글 카드의 경고 문구 영역 요소 주소'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 본문 = 표시글('경고 문구 없는 글');

  try {
    await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
      await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
    });

    await test.step('「열람 주의」를 켜고 문구 없이 게시한다', async () => {
      await 글쓰기.본문적기(본문);
      await verify('경고 문구 칸이 보인다', await 글쓰기.열람주의열기(), true, { blocker: true });
      await verify('「게시」가 켜진다', await 뜰때까지(driver, 글쓰기.게시켜짐, 10_000), true, { blocker: true });
      await driver.$(글쓰기.게시).click();
      await verify('게시가 끝나 홈 화면이 보인다', await 뜰때까지(driver, 글쓰기.글쓰기버튼, 30_000), true, { blocker: true });
      await driver.$(앱id('tab_profile')).click();
      await verify('내 프로필에 그 글이 보인다', await 뜰때까지(driver, 굴려서글자포함(본문), 20_000), true, { blocker: true });
      await verify('「열람 주의」를 켜고 문구 없이 게시하면 내 프로필의 그 글에 경고 문구가 보이지 않는다', await 보이나(driver, params.경고영역), false);
    });
  } finally {
    await 내글모두지우기(driver, 본문);
  }
});
