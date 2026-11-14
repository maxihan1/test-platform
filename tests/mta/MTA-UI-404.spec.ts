import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈으로돌아가기 } from './helpers/settings.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 디스플레이설정화면 } from './pages/set-display.page.js';
import { 설정화면 } from './pages/settings.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-404',
  name: '「게시물 상호작용 수」 기본값은 켜짐이고 푸터 숫자를 보인다',
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
  const 설정 = new 설정화면(driver);
  const 디스플레이 = new 디스플레이설정화면(driver);
  const 상세 = new 글상세화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  await test.step('설정 「디스플레이」를 연다', async () => {
    await 설정.줄누르기('디스플레이');
    await verify('디스플레이 화면이 열린다', await 디스플레이.떴나(), true);
    const 켜짐 = await verify('「게시물 상호작용 수」가 켜져 있다', await 디스플레이.켜졌나('게시물 상호작용 수'), true);
    await 홈으로돌아가기(driver);
    const 숫자 = await verify('홈 글 푸터에 숫자가 보인다', await 상세.푸터숫자보이나(), true);
    await verify('「게시물 상호작용 수」 기본값은 켜짐이고 푸터 숫자를 보인다', 켜짐 && 숫자, true);
  }, { capture: true });
});
