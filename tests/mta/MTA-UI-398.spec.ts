import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로 } from './helpers/app.helper.js';
import { 홈으로돌아가기 } from './helpers/settings.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 인용글쓰기화면 } from './pages/quote-compose.page.js';
import { 동작설정화면 } from './pages/set-behavior.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-398',
  name: '「부스트 전에 묻기」 기본값은 꺼짐이고 이 서버(API 7 이상)에서는 부스트 시트가 대신 떠서 영향이 없다',
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
  const 동작 = new 동작설정화면(driver);
  const 인용 = new 인용글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  await test.step('설정 「동작」을 연다', async () => {
    await 설정.줄누르기('동작');
    await verify('동작 화면이 열린다', await 동작.떴나(), true);
    const 꺼짐 = await verify('「부스트 전에 묻기」가 꺼져 있다', await 동작.꺼졌나('부스트 전에 묻기'), true);
    await 홈으로돌아가기(driver);
    await 인용.홈첫글부스트시트열기();
    const 시트 = await verify('부스트 시트에 「인용하기」가 보인다', (await 인용.시트항목글자()).includes('인용하기'), true);
    await verify('「부스트 전에 묻기」 기본값은 꺼짐이고 이 서버(API 7 이상)에서는 부스트 시트가 대신 떠서 영향이 없다', 꺼짐 && 시트, true);
    await 뒤로(driver);
  }, { capture: true });
});
