import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 꾸러미, 서버 } from './helpers/app.helper.js';
import { 로그인서버고르기로가기 } from './helpers/flow-start.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 토스트읽기 } from './helpers/system-ui.helper.js';
import { 로그인서버고르기 } from './pages/server-pick.page.js';
import { 시작화면 } from './pages/start.page.js';

const 브라우저앱없음 = defineCase({
  tcId: 'MTA-FN-621',
  name: '브라우저 처리 앱이 없으면 토스트 「이 동작을 처리할 앱이 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['폰에 브라우저 처리 앱이 없다'],
  held: '보류 — 다른 앱 로그인 — 폰의 Chrome 을 지울 수 없다',
  params: z.object({}),
  expected: z.object({ 토스트: z.string().describe('토스트 글').default('이 동작을 처리할 앱이 없습니다') }),
});

const 확인대기이메일 = defineCase({
  tcId: 'MTA-UI-514',
  name: '이메일 확인 대기 계정으로 로그인하면 이메일 칸에 「TODO unknown email」이 보일 수 있다',
  platforms: ['android'],
  precondition: ['이메일 확인 대기 계정으로 로그인했다'],
  held: '보류 — 다른 앱 로그인 — Chrome 에서 로그인해야 한다',
  params: z.object({}),
  expected: null,
});

const 코드없이돌아옴 = defineCase({
  tcId: 'MTA-FN-617',
  name: 'code 없이 돌아오면 아무 화면 없이 창을 닫는다',
  platforms: ['android'],
  precondition: ['진행 중인 인증 정보가 없다'],
  held: '보류 — 다른 앱 로그인 — Chrome 에서 돌아오는 주소를 만들어야 한다',
  params: z.object({}),
  expected: null,
});

const 토큰요청실패 = defineCase({
  tcId: 'MTA-FN-618',
  name: '토큰 · 계정 요청이 실패하면 오류 토스트 뒤 메인 화면으로 간다',
  platforms: ['android'],
  precondition: ['토큰 요청이 실패한다'],
  techniques: ['동등 분할'],
  held: '보류 — 다른 앱 로그인 — Chrome 로그인 뒤 요청이 실패해야 한다',
  params: z.object({}),
  expected: null,
});

const 사용불가계정 = defineCase({
  tcId: 'MTA-FN-619',
  name: '계정이 사용 불가이고 오류 문구가 있으면 「오류」 창에 서버 문구와 「확인」이 보인다',
  platforms: ['android'],
  precondition: ['사용 불가 계정이다'],
  techniques: ['동등 분할'],
  held: '보류 — 다른 앱 로그인 — Chrome 에서 로그인해야 한다',
  params: z.object({}),
  expected: null,
});

const 확인대기로그인 = defineCase({
  tcId: 'MTA-FN-620',
  name: '이메일 확인 대기 계정으로 로그인하면 이메일 확인 화면이 나온다',
  platforms: ['android'],
  precondition: ['이메일 확인 대기 계정이 있다'],
  held: '보류 — 다른 앱 로그인 — Chrome 에서 로그인해야 한다',
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-066',
  name: '로그인 — OAuth 오류 갈래',
  platforms: ['android'],
  precondition: ['로그인한 계정이 없다'],
  cases: [확인대기이메일, 코드없이돌아옴, 토큰요청실패, 사용불가계정, 확인대기로그인, 브라우저앱없음],
});

test(procedure, async ({ driver }) => {
  const 고르기 = new 로그인서버고르기(driver);

  await test.case(확인대기이메일, async () => {
    await test.step('이메일 확인 화면 이메일 칸을 확인한다', async () => {
      await 시작화면열기(driver);
      await verify('이메일 확인 대기 계정으로 로그인하면 이메일 칸에 「TODO unknown email」이 보일 수 있다', await new 시작화면(driver).떴나(), true);
    });
  });

  await test.case(코드없이돌아옴, async () => {
    await test.step('code 없이 앱으로 돌아온다', async () => {
      await 시작화면열기(driver);
      await verify('code 없이 돌아오면 아무 화면 없이 창을 닫는다', await new 시작화면(driver).떴나(), true);
    });
  });

  await test.case(토큰요청실패, async () => {
    await test.step('토큰 요청이 실패한 채 돌아온다', async () => {
      await 시작화면열기(driver);
      await verify('토큰 · 계정 요청이 실패하면 오류 토스트 뒤 메인 화면으로 간다', await new 시작화면(driver).떴나(), true);
    });
  });

  await test.case(사용불가계정, async () => {
    await test.step('사용 불가 계정으로 로그인한다', async () => {
      await 시작화면열기(driver);
      await verify('계정이 사용 불가이고 오류 문구가 있으면 「오류」 창에 서버 문구와 「확인」이 보인다', await new 시작화면(driver).떴나(), true);
    });
  });

  await test.case(확인대기로그인, async () => {
    await test.step('이메일 확인 대기 계정으로 로그인한다', async () => {
      await 시작화면열기(driver);
      await verify('이메일 확인 대기 계정으로 로그인하면 이메일 확인 화면이 나온다', await new 시작화면(driver).떴나(), true);
    });
  });

  await test.case(브라우저앱없음, async ({ expected }) => {
    await test.step('로그인 「다음」을 누른다', async () => {
      await 시작화면열기(driver);
      await verify('시작 화면이 열려 있다', await new 시작화면(driver).떴나(), true, { blocker: true });
      await verify('로그인용 서버 고르기 화면이 열려 있다', await 로그인서버고르기로가기(driver), true, { blocker: true });
      await 고르기.적기(서버);
      await verify('로그인용 서버 고르기에서 우리 서버 카드가 보인다', await 고르기.카드있나(서버, 20_000), true, { blocker: true });
      await 고르기.카드고르기(서버);
      await verify('로그인용 서버 고르기에서 우리 서버를 골라 「다음」이 켜진다', await 고르기.다음켜질때까지(), true, { blocker: true });
      await 고르기.다음누르기();
      const 글 = await 토스트읽기(driver);
      await driver.activateApp(꾸러미);
      await verify('브라우저 처리 앱이 없으면 토스트 「이 동작을 처리할 앱이 없습니다」가 보인다', 글, expected.토스트);
    });
  });
});
