import { defineCase, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-267',
  name: '내용이 있는 글쓰기에서 닫기를 누르면 「작성 중인 글을 지우시겠습니까?」와 「지우기」 · 「취소」 창이 뜬다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    본문: z.string().min(1).describe('본문에 적을 글').default('작성 중인 글'),
  }),
  expected: z.object({
    처음글자수: z.string().describe('글쓰기를 막 열었을 때 남은 글자 수').default('500'),
    제목: z.string().describe('확인 창 제목').default('작성 중인 글을 지우시겠습니까?'),
    지우기: z.string().describe('확인 창 확인 버튼 글자').default('지우기'),
    취소: z.string().describe('확인 창 취소 버튼 글자').default('취소'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
  });

  await test.step('본문을 적은 글쓰기에서 닫기를 누른다', async () => {
    await 글쓰기.본문적기(params.본문);
    await 될때까지(driver, async () => (await 글쓰기.남은글자()) !== expected.처음글자수, 10_000);
    await driver.$(글쓰기.닫기).click();
    await verify('확인 창이 보인다', await 글쓰기.창.뜰때까지(), true, { blocker: true });
    const 제목 = await verify('확인 창 제목이 기대값과 같다', await driver.$(글쓰기.창.제목).getText(), expected.제목);
    const 지우기 = await verify('확인 버튼 글자가 기대값과 같다', await driver.$(글쓰기.창.확인버튼).getText(), expected.지우기);
    const 취소 = await verify('취소 버튼 글자가 기대값과 같다', await driver.$(글쓰기.창.취소버튼).getText(), expected.취소);
    await verify('내용이 있는 글쓰기에서 닫기를 누르면 「작성 중인 글을 지우시겠습니까?」와 「지우기」 · 「취소」 창이 뜬다', 제목 && 지우기 && 취소, true);
  });
});
