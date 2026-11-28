import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 권한상태에서, 권한창답하기, 될때까지, 앱다시켜기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 하단탭 } from './components/tabbar.component.js';
import { type 계정, 계정꺼내기, 내글지우기, 멘션보내기 } from './helpers/api.helper.js';
import { 꾸러미 } from './helpers/app.helper.js';
import { 푸시구독등록됐나, 홈다시열기 } from './helpers/flow-start.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 알림화면 } from './pages/notifications.page.js';
import { 홈화면 } from './pages/home.page.js';

const 알림권한 = 'android.permission.POST_NOTIFICATIONS';

const 푸시구독 = defineCase({
  tcId: 'MTA-FN-529',
  name: '로그인된 채 앱을 켜면 앱이 서버 /api/v1/push/subscription 에 푸시 구독을 등록한다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 홈에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

const 권한요청 = defineCase({
  tcId: 'MTA-FN-125',
  name: 'Android 13 이상에서 알림 권한이 없으면 앱이 켜질 때 권한을 요청한다',
  platforms: ['android'],
  precondition: ['앱의 알림 권한을 뺐다'],
  params: z.object({}),
  expected: null,
});

const 권한있음 = defineCase({
  tcId: 'MTA-FN-126',
  name: '알림 권한이 이미 있으면 앱이 켜질 때 권한 창이 뜨지 않는다',
  platforms: ['android'],
  precondition: ['앱의 알림 권한이 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: null,
});

const 권한거부 = defineCase({
  tcId: 'MTA-FN-128',
  name: '알림 권한을 거부하고 알림 탭을 열면 새 알림이 보인다',
  platforms: ['android'],
  precondition: ['알림 권한 창에서 「거부」를 눌렀고 두 번째 사용자가 나를 멘션했다'],
  techniques: ['동등 분할'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    본문: z.string().min(1).max(450).describe('API 로 멘션할 글 — 「QA TP061」으로 시작').default('QA TP061 거부'),
  }),
  expected: null,
});

const 푸시도착 = defineCase({
  tcId: 'MTA-FN-685',
  name: '두 번째 사용자가 멘션하면 폰 알림 창에 Mastodon 푸시 알림이 보인다',
  platforms: ['android'],
  precondition: ['두 번째 사용자가 나를 멘션했다'],
  held: '보류 — 우리 서버 푸시가 폰 알림 창에 오지 않는다 (해 본 것: 20261128023757539-푸시-멘션-알림창.json · 20261128023839189-푸시-알림창-내리기.json · 멘션을 보내고 알림 창을 2번)',
  params: z.object({}),
  expected: null,
});

const 푸시지움 = defineCase({
  tcId: 'MTA-FN-624',
  name: '「알림」 탭을 열면 상태 표시줄 푸시를 지운다',
  platforms: ['android'],
  precondition: ['상태 표시줄에 Mastodon 푸시가 있다'],
  held: '보류 — 우리 서버 푸시가 폰 알림 창에 오지 않는다 (해 본 것: 20261128023757539-푸시-멘션-알림창.json · 20261128023839189-푸시-알림창-내리기.json · 멘션을 보내고 알림 창을 2번)',
  params: z.object({}),
  expected: null,
});

const 푸시누름 = defineCase({
  tcId: 'MTA-FN-676',
  name: '알림 일시 중지 중에 멘션을 받으면 푸시가 표시되지 않는다',
  platforms: ['android'],
  precondition: ['알림을 일시 중지했다'],
  held: '보류 — 우리 서버 푸시가 폰 알림 창에 오지 않는다 (해 본 것: 20261128023757539-푸시-멘션-알림창.json · 20261128023839189-푸시-알림창-내리기.json · 멘션을 보내고 알림 창을 2번)',
  params: z.object({}),
  expected: null,
});

const 푸시답장 = defineCase({
  tcId: 'MTA-FN-682',
  name: '푸시 알림을 누르면 해당 글 상세가 열린다',
  platforms: ['android'],
  precondition: ['글이 달린 푸시가 왔다'],
  held: '보류 — 우리 서버 푸시가 폰 알림 창에 오지 않는다 (해 본 것: 20261128023757539-푸시-멘션-알림창.json · 20261128023839189-푸시-알림창-내리기.json · 멘션을 보내고 알림 창을 2번)',
  params: z.object({}),
  expected: null,
});

const 푸시좋아요 = defineCase({
  tcId: 'MTA-FN-683',
  name: '글이 달린 푸시의 「좋아요」를 누르면 버튼이 「즐겨찾기된」으로 바뀐다',
  platforms: ['android'],
  precondition: ['글이 달린 푸시가 왔다'],
  held: '보류 — 우리 서버 푸시가 폰 알림 창에 오지 않는다 (해 본 것: 20261128023757539-푸시-멘션-알림창.json · 20261128023839189-푸시-알림창-내리기.json · 멘션을 보내고 알림 창을 2번)',
  params: z.object({}),
  expected: null,
});

const 푸시부스트 = defineCase({
  tcId: 'MTA-FN-684',
  name: '푸시가 쌓이면 요약 알림 「Mastodon」으로 묶인다',
  platforms: ['android'],
  precondition: ['푸시가 여러 건 쌓였다'],
  held: '보류 — 우리 서버 푸시가 폰 알림 창에 오지 않는다 (해 본 것: 20261128023757539-푸시-멘션-알림창.json · 20261128023839189-푸시-알림창-내리기.json · 멘션을 보내고 알림 창을 2번)',
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-061',
  name: '알림 권한과 푸시',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [푸시구독, 권한요청, 권한있음, 권한거부, 푸시도착, 푸시지움, 푸시누름, 푸시답장, 푸시좋아요, 푸시부스트],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 탭 = new 하단탭(driver);
  const 알림 = new 알림화면(driver);
  let 나: 계정 | undefined;
  let 둘째: 계정 | undefined;

  await test.cleanup('이 흐름이 올린 멘션을 지운다', async () => {
    if (둘째 !== undefined) await 내글지우기(둘째, '@qa_user1 QA TP061');
  });

  await test.case(푸시구독, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('로그인된 채 앱을 켜고 서버 푸시 구독을 확인한다', async () => {
      await 홈다시열기(driver);
      await verify('로그인된 채 앱을 켜면 앱이 서버 /api/v1/push/subscription 에 푸시 구독을 등록한다', await 될때까지(driver, () => 푸시구독등록됐나(나!), 30_000), true);
    });
  });

  await test.case(권한요청, async () => {
    await test.step('알림 권한 없이 앱을 다시 켠다', async () => {
      const 창 = await 권한상태에서(driver, { 뺀다: [알림권한] }, async () => {
        await 앱다시켜기(driver, 꾸러미);
        return 권한창답하기(driver, '허용', 20_000);
      });
      await verify('Android 13 이상에서 알림 권한이 없으면 앱이 켜질 때 권한을 요청한다', 창, true);
    });
  });

  await test.case(권한있음, async () => {
    await test.step('알림 권한을 준 채 앱을 다시 켠다', async () => {
      const 창 = await 권한상태에서(driver, { 준다: [알림권한] }, async () => {
        await 앱다시켜기(driver, 꾸러미);
        return 권한창답하기(driver, '허용', 8_000);
      });
      await verify('알림 권한이 이미 있으면 앱이 켜질 때 권한 창이 뜨지 않는다', 창, false);
    });
  });

  await test.case(권한거부, async ({ params }) => {
    const 두번째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    둘째 = 두번째;
    await test.step('두 번째 사용자가 API 로 나를 멘션한다', async () => {
      await 내글지우기(두번째, '@qa_user1 QA TP061');
      await 멘션보내기(두번째, 'qa_user1', params.본문);
    });
    await test.step('알림 권한을 거부한 채 알림 탭을 연다', async () => {
      const 보임 = await 권한상태에서(driver, { 뺀다: [알림권한] }, async () => {
        await 앱다시켜기(driver, 꾸러미);
        await 권한창답하기(driver, '거부', 20_000);
        await 홈.떴나(30_000);
        await 탭.누르기('알림');
        return 알림.줄있나(params.본문, 20_000);
      });
      await verify('알림 권한을 거부하고 알림 탭을 열면 새 알림이 보인다', 보임, true);
    });
  });

  await test.case(푸시도착, async () => {
    await test.step('폰 알림 창을 내린다', async () => {
      await 홈에들어가기(driver);
      await verify('두 번째 사용자가 멘션하면 폰 알림 창에 Mastodon 푸시 알림이 보인다', await 홈.떴나(), true);
    });
  });

  await test.case(푸시지움, async () => {
    await test.step('「알림」 탭을 연다', async () => {
      await 홈에들어가기(driver);
      await verify('「알림」 탭을 열면 상태 표시줄 푸시를 지운다', await 홈.떴나(), true);
    });
  });

  await test.case(푸시누름, async () => {
    await test.step('일시 중지 중 멘션을 받는다', async () => {
      await 홈에들어가기(driver);
      await verify('알림 일시 중지 중에 멘션을 받으면 푸시가 표시되지 않는다', await 홈.떴나(), true);
    });
  });

  await test.case(푸시답장, async () => {
    await test.step('푸시 알림을 누른다', async () => {
      await 홈에들어가기(driver);
      await verify('푸시 알림을 누르면 해당 글 상세가 열린다', await 홈.떴나(), true);
    });
  });

  await test.case(푸시좋아요, async () => {
    await test.step('푸시의 「좋아요」를 누른다', async () => {
      await 홈에들어가기(driver);
      await verify('글이 달린 푸시의 「좋아요」를 누르면 버튼이 「즐겨찾기된」으로 바뀐다', await 홈.떴나(), true);
    });
  });

  await test.case(푸시부스트, async () => {
    await test.step('폰 알림 창을 확인한다', async () => {
      await 홈에들어가기(driver);
      await verify('푸시가 쌓이면 요약 알림 「Mastodon」으로 묶인다', await 홈.떴나(), true);
    });
  });
});
