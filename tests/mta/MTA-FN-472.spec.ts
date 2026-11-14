import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 홈으로돌아가기 } from './helpers/settings.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 디스플레이설정화면 } from './pages/set-display.page.js';
import { 설정화면 } from './pages/settings.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-472',
  name: '「열람 주의 표시」 기본값은 켜짐이고 끄면 내용 경고 글이 접히지 않고 펼쳐 보인다',
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
  await test.step('seoyeon_books 프로필에서 접힌 내용 경고 글을 확인한다', async () => {
    await 프로필열기(driver, 'seoyeon_books');
    await verify('프로필에 접힌 내용 경고 글이 보인다', await 상세.접힌글보이나(), true, { blocker: true });
  });

  await test.step('설정에서 「디스플레이」를 연다', async () => {
    await 홈으로돌아가기(driver);
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
    await 설정.줄누르기('디스플레이');
    await verify('디스플레이 화면이 열린다', await 디스플레이.떴나(), true, { blocker: true });
  });

  await test.step('설정 「열람 주의 표시」를 끄고 seoyeon_books 의 내용 경고 글을 본다', async () => {
    const 기본 = await verify('「열람 주의 표시」 기본값이 켜짐이다', await 디스플레이.켜졌나('열람 주의 표시'), true);
    await 디스플레이.줄누르기('열람 주의 표시');
    await 홈으로돌아가기(driver);
    await 프로필열기(driver, 'seoyeon_books');
    const 펼침 = await verify('내용 경고 글이 접히지 않고 펼쳐 보인다', await 상세.접힌글사라졌나(), true);
    await verify('「열람 주의 표시」 기본값은 켜짐이고 끄면 내용 경고 글이 접히지 않고 펼쳐 보인다', 기본 && 펼침, true);
  }, { capture: true });
});
