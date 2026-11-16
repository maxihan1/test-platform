import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내프로필열기, 목록글을차례로열어보기 } from './helpers/post-flow.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 사람목록화면 } from './pages/account-list.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-291',
  name: '확장 푸터의 인용 수를 누르면 제목 「인용함」 인용 글 목록이 열린다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목: z.string().describe('인용 글 목록 제목에 든 글').default('인용함'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글상세 = new 글상세화면(driver);
  const 목록 = new 사람목록화면(driver);

  await test.step('일반 회원으로 로그인해 내 프로필을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('내 프로필이 열린다', await 내프로필열기(driver), true, { blocker: true });
  });

  await test.step('jiho_cafe 가 인용한 내 글 상세에서 인용 수를 누른다', async () => {
    const 열림 = await 목록글을차례로열어보기(driver, async () => (await 글상세.인용개수()) > 0);
    await verify('인용 수가 1 이상인 내 글 상세가 열린다', 열림, true, { blocker: true });
    await driver.$(글상세.인용수).click();
    const 제목 = await verify('목록 제목에 「인용함」이 든다', (await 목록.제목읽기()).includes(expected.제목), true);
    const 목록뜸 = await verify('인용 글 목록이 보인다', await 목록.목록이뜰때까지(), true);
    await verify('확장 푸터의 인용 수를 누르면 제목 「인용함」 인용 글 목록이 열린다', 제목 && 목록뜸, true);
  });
});
