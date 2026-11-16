import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 목록안글자 } from './helpers/app.helper.js';
import { 글상세열기 } from './helpers/nav.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-276',
  name: '조용한 공개 글을 인용하러 들어오면 「조용한 공개 게시물 인용하기」 창에 「무시」 · 「다시 알리지 않습니다」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    글일부: z.string().min(1).describe('인용할 seoyeon_books 조용한 공개 글의 일부 — 그 글을 찾는 낱말').default('조용한 공개'),
  }),
  expected: z.object({
    제목: z.string().describe('확인 창 제목').default('조용한 공개 게시물 인용하기'),
    무시: z.string().describe('확인 창 단추 글자').default('무시'),
    다시안알림: z.string().describe('확인 창 단추 글자').default('다시 알리지 않습니다'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글상세 = new 글상세화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('seoyeon_books 의 조용한 공개 글에서 「인용하기」를 누른다', async () => {
    await 글상세열기(driver, 'seoyeon_books', params.글일부);
    await verify('글 상세 화면이 보인다', await 글상세.그려질때까지(), true, { blocker: true });
    await driver.$(글상세.부스트).click();
    await 뜰때까지(driver, 목록안글자('인용하기'), 10_000);
    await driver.$(목록안글자('인용하기')).click();
    const 제목 = await verify('확인 창 제목이 보인다', await 뜰때까지(driver, 글쓰기.창.안의글자(expected.제목), 10_000), true);
    const 무시 = await verify('「무시」가 보인다', await 뜰때까지(driver, 글쓰기.창단추(expected.무시), 10_000), true);
    const 다시 = await verify('「다시 알리지 않습니다」가 보인다', await 뜰때까지(driver, 글쓰기.창단추(expected.다시안알림), 10_000), true);
    await verify('조용한 공개 글을 인용하러 들어오면 「조용한 공개 게시물 인용하기」 창에 「무시」 · 「다시 알리지 않습니다」가 보인다', 제목 && 무시 && 다시, true);
  });
});
