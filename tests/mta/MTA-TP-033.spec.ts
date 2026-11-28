import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 하단탭 } from './components/tabbar.component.js';
import { type 계정, 계정꺼내기, 계정찾기, 내정보 } from './helpers/api.helper.js';
import {
  신고알림들,
  신고하기,
  알림에서줄찾을때까지,
  알림탭열기,
  역할이름,
  이름,
  계정설정열기,
  화면에서굴려글자찾기,
} from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 알림제외조건창 } from './pages/notification-policy.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 서버소개화면 } from './pages/server-about.page.js';

const 신고알림 = defineCase({
  tcId: 'MTA-FN-318',
  name: '운영 권한 계정의 알림에 「<이름> reported <대상>」이 보이고 누르면 프로필이 열린다',
  platforms: ['android'],
  precondition: ['관리자로 로그인해 있고 두 번째 사용자가 신고를 보냈다'],
  held: '보류 — 테스트 계정 없음 — 관리자 계정 값으로 웹 로그인하면 「올바르지 않은 이메일 주소 혹은 암호입니다.」로 거절된다',
  params: z.object({
    loginId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    loginPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    신고대상: z.string().min(1).describe('두 번째 사용자가 신고할 계정의 사용자명 — 관리자 알림에 신고가 없을 때만 쓴다').default('spam_shop'),
  }),
  expected: null,
});

const 운영제외조건 = defineCase({
  tcId: 'MTA-UI-266',
  name: '운영 권한 계정의 알림 제외 조건 창에 「Admin notifications」 · 「Admin reports」 · 「Account signups」가 보인다',
  platforms: ['android'],
  precondition: ['관리자로 로그인해 알림 제외 조건 창을 열었다'],
  held: '보류 — 테스트 계정 없음 — 관리자 계정 값으로 웹 로그인하면 「올바르지 않은 이메일 주소 혹은 암호입니다.」로 거절된다',
  params: z.object({}),
  expected: null,
});

const 운영메뉴없음 = defineCase({
  tcId: 'MTA-UI-488',
  name: '관리자 계정 설정에도 신고 처리 · 계정 관리 메뉴가 보이지 않는다',
  platforms: ['android'],
  precondition: ['관리자로 로그인해 계정 설정을 열었다'],
  held: '보류 — 테스트 계정 없음 — 관리자 계정 값으로 웹 로그인하면 「올바르지 않은 이메일 주소 혹은 암호입니다.」로 거절된다',
  params: z.object({}),
  expected: null,
});

const 역할배지 = defineCase({
  tcId: 'MTA-UI-308',
  name: '역할이 있는 계정 프로필에 역할 이름 배지가 보인다',
  platforms: ['android'],
  precondition: ['관리자 계정에 역할이 있다'],
  held: '보류 — 테스트 계정 없음 — 관리자 계정 값으로 웹 로그인하면 「올바르지 않은 이메일 주소 혹은 암호입니다.」로 거절된다',
  params: z.object({}),
  expected: null,
});

const 서버소개관리자 = defineCase({
  tcId: 'MTA-UI-527',
  name: '「이 서버에 대해서」에 「관리자」 · 「관리자에게 메세지 보내기」가 보인다',
  platforms: ['android'],
  precondition: ['관리자 계정과 문의 이메일이 있는 우리 서버다'],
  held: '보류 — 테스트 계정 없음 — 관리자 계정 값으로 웹 로그인하면 「올바르지 않은 이메일 주소 혹은 암호입니다.」로 거절된다',
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-033',
  name: '운영 권한 계정 알림',
  platforms: ['android'],
  precondition: ['관리자로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [신고알림, 운영제외조건, 운영메뉴없음, 역할배지, 서버소개관리자],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  let 관리자: 계정 | undefined;
  let 관리자사용자명 = '';

  await test.case(신고알림, async ({ params }) => {
    관리자 = 계정꺼내기(params.loginId, params.loginPassword, '관리자');
    const 둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    await test.step('관리자로 홈에 들어간다', async () => {
      관리자사용자명 = (await 내정보(관리자!)).username;
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    let 줄글자 = '';
    await test.step('두 번째 사용자가 보낸 신고가 관리자 알림에 있게 한다', async () => {
      if ((await 신고알림들(관리자!)).length === 0) {
        const 대상 = await 계정찾기(둘째, params.신고대상);
        await 신고하기(둘째, 대상.id, 'QA TP033 신고');
      }
      const 신고 = (await 신고알림들(관리자!)).find((x) => x.report !== undefined);
      if (신고?.report === undefined) throw new Error('관리자 알림에 신고 알림이 없다');
      줄글자 = `${이름(신고.account)} reported ${이름(신고.report.target_account)}`;
      const 알림 = await 알림탭열기(driver);
      await verify('알림에 신고 알림이 보인다', await 알림에서줄찾을때까지(driver, 줄글자), true, { blocker: true });
      await verify('알림 화면이 열려 있다', await 알림.떴나(), true, { blocker: true });
    });
    await test.step('관리자 알림에서 신고 알림을 누른다', async () => {
      const 알림 = await 알림탭열기(driver);
      const 줄보임 = await verify('알림에 「<이름> reported <대상>」이 보인다', await 알림.줄있나(줄글자, 10_000), true);
      await 알림.줄누르기(줄글자);
      const 열림 = await verify('프로필이 열린다', await 프로필.떴나(), true);
      await verify('운영 권한 계정의 알림에 「<이름> reported <대상>」이 보이고 누르면 프로필이 열린다', 줄보임 && 열림, true);
    });
  });

  await test.case(운영제외조건, async () => {
    const 창 = new 알림제외조건창(driver);
    await test.step('관리자로 알림 제외 조건 창을 연다', async () => {
      const 알림 = await 알림탭열기(driver);
      await 알림.제외조건누르기();
      if (!(await 창.떴나(10_000))) throw new Error('알림 제외 조건 창이 안 열렸다');
    });
    await test.step('관리자 알림 제외 조건 창을 확인한다', async () => {
      const 알림 = await verify('「Admin notifications」가 보인다', await 창.항목있나('Admin notifications'), true);
      const 신고 = await verify('「Admin reports」가 보인다', await 창.항목있나('Admin reports'), true);
      const 가입 = await verify('「Account signups」가 보인다', await 창.항목있나('Account signups'), true);
      await verify('운영 권한 계정의 알림 제외 조건 창에 「Admin notifications」 · 「Admin reports」 · 「Account signups」가 보인다', 알림 && 신고 && 가입, true);
      await 창.닫기();
    });
  });

  await test.case(운영메뉴없음, async () => {
    await test.step('관리자로 계정 설정을 연다', async () => {
      await 계정설정열기(driver, 관리자사용자명);
    });
    await test.step('관리자 계정 설정에서 운영 메뉴 자리를 확인한다', async () => {
      const 설정 = await 계정설정열기(driver, 관리자사용자명);
      const 신고처리 = await verify('신고 처리 메뉴가 보이지 않는다', await 설정.줄있나('신고 처리', 1_500), false);
      const 계정관리 = await verify('계정 관리 메뉴가 보이지 않는다', await 설정.줄있나('계정 관리', 1_500), false);
      await verify('관리자 계정 설정에도 신고 처리 · 계정 관리 메뉴가 보이지 않는다', 신고처리 && 계정관리, true);
    });
  });

  await test.case(역할배지, async () => {
    const 역할 = await 역할이름(관리자!);
    await test.step('관리자 프로필을 연다', async () => {
      await 홈에들어가기(driver);
      await new 하단탭(driver).누르기('프로필');
      if (!(await 프로필.떴나())) throw new Error('내 프로필이 안 열렸다');
    });
    await test.step('관리자 계정 프로필 머리를 확인한다', async () => {
      await verify('역할이 있는 계정 프로필에 역할 이름 배지가 보인다', await 프로필.배지있나(역할), true);
    });
  });

  await test.case(서버소개관리자, async () => {
    const 소개 = new 서버소개화면(driver);
    await test.step('관리자 계정 설정에서 「이 서버에 대해서」 화면을 연다', async () => {
      const 설정 = await 계정설정열기(driver, 관리자사용자명);
      await 설정.줄누르기('이 서버에 대해서');
      if (!(await 소개.떴나(15_000))) throw new Error('이 서버에 대해서 화면이 안 열렸다');
    });
    await test.step('「이 서버에 대해서」 화면을 연다', async () => {
      const 관리자있음 = await verify('「관리자」가 보인다', await 소개.관리자있나(), true);
      const 메시지 = await verify('「관리자에게 메세지 보내기」가 보인다', await 화면에서굴려글자찾기(driver, '관리자에게 메세지 보내기'), true);
      await verify('「이 서버에 대해서」에 「관리자」 · 「관리자에게 메세지 보내기」가 보인다', 관리자있음 && 메시지, true);
    });
  });
});
