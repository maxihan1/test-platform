import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-234',
  name: '글 상세 확장 푸터에 시간 · 날짜 · 「개의 좋아요」 · 「님이 부스트했습니다」 · 「인용함」이 보인다',
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

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('minjun_dev 글 상세를 연다', async () => {
    await 글상세열기(driver, 'minjun_dev', '마스토돈 4.7 인용 기능');
    const 시간 = await verify('시간이 보인다', await 뜰때까지(driver, 글상세.시간, 10_000), true);
    const 날짜 = await verify('날짜가 보인다', await 뜰때까지(driver, 글상세.날짜, 10_000), true);
    const 좋아요 = await verify('「개의 좋아요」가 보인다', (await driver.$(글상세.좋아요수).getText()).includes('개의 좋아요'), true);
    const 부스트 = await verify('「님이 부스트했습니다」가 보인다', (await driver.$(글상세.부스트수).getText()).includes('님이 부스트했습니다'), true);
    const 인용 = await verify('「인용함」이 보인다', (await driver.$(글상세.인용수).getText()).includes('인용함'), true);
    await verify('글 상세 확장 푸터에 시간 · 날짜 · 「개의 좋아요」 · 「님이 부스트했습니다」 · 「인용함」이 보인다', 시간 && 날짜 && 좋아요 && 부스트 && 인용, true);
  });
});
