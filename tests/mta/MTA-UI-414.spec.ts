import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로, 서버 } from './helpers/app.helper.js';
import { 탭주소글 } from './helpers/settings.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-414',
  name: '「계정 삭제」를 누르면 앱 안 웹 화면으로 https://<서버>/settings/delete가 열린다',
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
  const 계정설정 = new 계정설정화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  await test.step('설정에서 계정 설정을 연다', async () => {
    await 설정.계정줄누르기();
    await verify('계정 설정 화면에 계정 이름 제목이 보인다', await 계정설정.떴나(), true, { blocker: true });
  });
  try {
    await test.step('계정 설정에서 「계정 삭제」를 누른다', async () => {
      await 계정설정.줄누르기('계정 삭제');
      const 열림 = await verify('앱 안 웹 화면이 열린다', (await 탭주소글(driver)) !== '', true);
      const 도메인 = await verify('웹 화면 주소에 서버 도메인이 들어 있다', (await 탭주소글(driver)).includes(서버), true);
      await verify('「계정 삭제」를 누르면 앱 안 웹 화면으로 https://<서버>/settings/delete가 열린다', 열림 && 도메인, true);
    }, { capture: true });
  } finally {
    await 뒤로(driver);
  }
});
