import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 먼저뜨는것 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 알림글 } from './components/toast.component.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-593',
  name: '서버 번역이 꺼진 채 영어 글 번역을 누르면 번역 실패 안내가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  techniques: ['결정 테이블'],
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
  const 알림 = new 알림글(driver);
  const 창 = new 확인창(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('minjun_dev 의 영어 글 더보기에서 번역을 누른다', async () => {
    await 글상세열기(driver, 'minjun_dev', 'Spent the weekend');
    await 글상세.더보기열기();
    await 뜰때까지(driver, 글상세.메뉴.항목포함('번역'), 10_000);
    await driver.$(글상세.메뉴.항목포함('번역')).click();
    const 안내 = await 먼저뜨는것(driver, { 토스트: 알림.시스템토스트, 스낵바: 알림.스낵바, 창: 창.내용 }, 10_000);
    await verify('서버 번역이 꺼진 채 영어 글 번역을 누르면 번역 실패 안내가 보인다', 안내 !== undefined, true);
  });
});
