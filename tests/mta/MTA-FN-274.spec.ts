import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 인용글쓰기열기 } from './helpers/compose-flow.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 공개범위시트 } from './pages/visibility-sheet.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-274',
  name: '남의 글을 인용하며 팔로워 공개로 「게시」를 누르면 「Share with followers and mentioned users?」 창에 「Publish post」 · 「Back to editing」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    글일부: z.string().min(1).describe('인용할 minjun_dev 글의 일부 — 그 글을 찾는 낱말').default('마스토돈 4.7 인용 기능'),
    본문: z.string().min(1).describe('인용 글쓰기 본문에 적을 글').default('인용 확인 글'),
  }),
  expected: z.object({
    팔로워: z.string().describe('고를 공개 범위').default('팔로워'),
    제목: z.string().describe('확인 창 제목').default('Share with followers and mentioned users?'),
    게시: z.string().describe('확인 창 단추 글자').default('Publish post'),
    돌아가기: z.string().describe('확인 창 단추 글자').default('Back to editing'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 시트 = new 공개범위시트(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('minjun_dev 글을 인용하며 팔로워 공개로 「게시」를 누른다', async () => {
    await 인용글쓰기열기(driver, 'minjun_dev', params.글일부);
    await verify('인용 글쓰기 본문 칸이 보인다', await 글쓰기.그려질때까지(), true, { blocker: true });
    await 글쓰기.본문적기(params.본문);

    await driver.$(글쓰기.공개범위버튼).click();
    await verify('공개 범위 시트가 열린다', await 시트.그려질때까지(), true, { blocker: true });
    await 시트.공개고르기(expected.팔로워);
    await 시트.저장하기();
    await 사라질때까지(driver, 시트.저장, 10_000);
    await verify('「게시」가 켜진다', await 뜰때까지(driver, 글쓰기.게시켜짐, 10_000), true, { blocker: true });
    await driver.$(글쓰기.게시).click();
    const 제목 = await verify('확인 창 제목이 보인다', await 뜰때까지(driver, 글쓰기.창.안의글자(expected.제목), 10_000), true);
    const 게시 = await verify('「Publish post」가 보인다', await 뜰때까지(driver, 글쓰기.창단추(expected.게시), 10_000), true);
    const 돌아가기 = await verify('「Back to editing」이 보인다', await 뜰때까지(driver, 글쓰기.창단추(expected.돌아가기), 10_000), true);
    await verify('남의 글을 인용하며 팔로워 공개로 「게시」를 누르면 「Share with followers and mentioned users?」 창에 「Publish post」 · 「Back to editing」이 보인다', 제목 && 게시 && 돌아가기, true);
    await driver.$(글쓰기.창단추(expected.돌아가기)).click();
    await 글쓰기.나가기();
  });
});
