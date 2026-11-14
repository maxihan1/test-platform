import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로, 문구가보이나, 서버 } from './helpers/app.helper.js';
import { 누르기, 앱밖으로나갔나 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-151',
  name: '글 카드 「공유」를 누르면 기기 공유 시트(글 주소)가 뜬다',
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

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈 글 카드 「공유」를 누른다', async () => {
    await 누르기(driver, 홈.공유들);
    const 시트 = await verify('기기 공유 시트가 뜬다', await 앱밖으로나갔나(driver), true);
    const 주소 = await verify('기기 공유 시트에 글 주소가 보인다', await 문구가보이나(driver, 'https://' + 서버 + '/'), true);
    await verify('글 카드 「공유」를 누르면 기기 공유 시트(글 주소)가 뜬다', 시트 && 주소, true);
    await 뒤로(driver);
  }, { capture: true });
});
