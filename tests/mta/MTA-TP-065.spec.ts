import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 꾸러미, 서버 } from './helpers/app.helper.js';
import { 로그인서버고르기로가기 } from './helpers/flow-start.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 로그인서버고르기 } from './pages/server-pick.page.js';
import { 시작화면 } from './pages/start.page.js';

const 인증준비 = defineCase({
  tcId: 'MTA-FN-612',
  name: '로그인 경로에서 진행하면 「인증 준비 중…」 진행 창에서 앱을 서버에 등록한다',
  platforms: ['android'],
  precondition: ['로그인용 서버 고르기에서 우리 서버를 골랐다'],
  held: '보류 — 다른 앱 로그인 — 서버 로그인 화면이 Chrome 으로 열린다',
  params: z.object({}),
  expected: z.object({ 진행글: z.string().describe('진행 창 문구').default('인증 준비 중…') }),
});

const 승인화면 = defineCase({
  tcId: 'MTA-UI-513',
  name: '로그인 승인 화면에 앱 이름 「Mastodon for Android」가 보인다',
  platforms: ['android'],
  precondition: ['Chrome 의 서버 승인 화면이 열려 있다'],
  held: '보류 — 다른 앱 로그인 — 승인 화면은 Chrome 안이다',
  params: z.object({}),
  expected: null,
});

const 브라우저창 = defineCase({
  tcId: 'MTA-FN-613',
  name: '로그인 경로에서 진행하면 앱 안 브라우저 창으로 서버 로그인 화면이 열린다',
  platforms: ['android'],
  precondition: ['로그인용 서버 고르기에서 우리 서버를 골랐다'],
  held: '보류 — 다른 앱 로그인 — 서버 로그인 화면이 Chrome 으로 열린다',
  params: z.object({}),
  expected: null,
});

const 코드검증자 = defineCase({
  tcId: 'MTA-FN-614',
  name: 'PKCE 를 지원하는 서버면 코드 검증자를 함께 보낸다',
  platforms: ['android'],
  precondition: ['PKCE 를 지원하는 서버다'],
  held: '보류 — 다른 앱 로그인 — 로그인 요청이 Chrome 으로 오간다',
  params: z.object({}),
  expected: null,
});

const 웹로그인승인 = defineCase({
  tcId: 'MTA-FN-615',
  name: '서버 웹 화면에서 로그인하고 승인하면 「인증을 끝마치는 중…」 뒤에 앱 홈이 새로 열린다',
  platforms: ['android'],
  precondition: ['Chrome 서버 로그인 화면이 열려 있다'],
  held: '보류 — 다른 앱 로그인 — Chrome 에서 로그인해야 한다',
  params: z.object({}),
  expected: null,
});

const 승인거부 = defineCase({
  tcId: 'MTA-FN-616',
  name: '로그인 승인을 거부하면 오류 설명 토스트 뒤 메인 화면으로 간다',
  platforms: ['android'],
  precondition: ['Chrome 승인 화면이 열려 있다'],
  techniques: ['동등 분할'],
  held: '보류 — 다른 앱 로그인 — Chrome 에서 거부해야 한다',
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-065',
  name: '로그인 — OAuth 브라우저 왕복',
  platforms: ['android'],
  precondition: ['로그인한 계정이 없다'],
  cases: [인증준비, 승인화면, 브라우저창, 코드검증자, 웹로그인승인, 승인거부],
});

test(procedure, async ({ driver }) => {
  const 고르기 = new 로그인서버고르기(driver);

  await test.case(인증준비, async ({ expected }) => {
    await test.step('「다음」을 누른다', async () => {
      await 시작화면열기(driver);
      await verify('시작 화면이 열려 있다', await new 시작화면(driver).떴나(), true, { blocker: true });
      await verify('로그인용 서버 고르기 화면이 열려 있다', await 로그인서버고르기로가기(driver), true, { blocker: true });
      await 고르기.적기(서버);
      await verify('로그인용 서버 고르기에서 우리 서버 카드가 보인다', await 고르기.카드있나(서버, 20_000), true, { blocker: true });
      await 고르기.카드고르기(서버);
      await verify('로그인용 서버 고르기에서 우리 서버를 골라 「다음」이 켜진다', await 고르기.다음켜질때까지(), true, { blocker: true });
      await 고르기.다음누르기();
      const 글 = await 고르기.진행창글();
      await driver.activateApp(꾸러미);
      await verify('로그인 경로에서 진행하면 「인증 준비 중…」 진행 창에서 앱을 서버에 등록한다', 글, expected.진행글);
    });
  });

  await test.case(승인화면, async () => {
    await test.step('승인 화면을 확인한다', async () => {
      await 시작화면열기(driver);
      await verify('시작 화면이 열려 있다', await new 시작화면(driver).떴나(), true, { blocker: true });
      await verify('로그인 승인 화면에 앱 이름 「Mastodon for Android」가 보인다', await 로그인서버고르기로가기(driver), true);
    });
  });

  await test.case(브라우저창, async () => {
    await test.step('「다음」을 눌러 브라우저 창을 확인한다', async () => {
      await 시작화면열기(driver);
      await verify('시작 화면이 열려 있다', await new 시작화면(driver).떴나(), true, { blocker: true });
      await verify('로그인 경로에서 진행하면 앱 안 브라우저 창으로 서버 로그인 화면이 열린다', await 로그인서버고르기로가기(driver), true);
    });
  });

  await test.case(코드검증자, async () => {
    await test.step('로그인 요청의 코드 검증자를 확인한다', async () => {
      await 시작화면열기(driver);
      await verify('시작 화면이 열려 있다', await new 시작화면(driver).떴나(), true, { blocker: true });
      await verify('PKCE 를 지원하는 서버면 코드 검증자를 함께 보낸다', await 로그인서버고르기로가기(driver), true);
    });
  });

  await test.case(웹로그인승인, async () => {
    await test.step('이메일과 비밀번호로 로그인하고 승인한다', async () => {
      await 시작화면열기(driver);
      await verify('시작 화면이 열려 있다', await new 시작화면(driver).떴나(), true, { blocker: true });
      await verify('서버 웹 화면에서 로그인하고 승인하면 「인증을 끝마치는 중…」 뒤에 앱 홈이 새로 열린다', await 로그인서버고르기로가기(driver), true);
    });
  });

  await test.case(승인거부, async () => {
    await test.step('승인을 거부한다', async () => {
      await 시작화면열기(driver);
      await verify('시작 화면이 열려 있다', await new 시작화면(driver).떴나(), true, { blocker: true });
      await verify('로그인 승인을 거부하면 오류 설명 토스트 뒤 메인 화면으로 간다', await 로그인서버고르기로가기(driver), true);
    });
  });
});
