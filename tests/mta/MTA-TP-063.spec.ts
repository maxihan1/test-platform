import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 앱다시켜기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 하단탭 } from './components/tabbar.component.js';
import { 확인창 } from './components/dialog.component.js';
import { 꾸러미 } from './helpers/app.helper.js';
import { 홈에들어가기안전 } from './helpers/flow-start.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 계정전환시트 } from './pages/account-switcher.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 시작화면 } from './pages/start.page.js';

const 홈보임 = defineCase({
  tcId: 'MTA-FN-560',
  name: 'Android 6.0 이상 폰에서 앱을 켜면 홈이 보인다',
  platforms: ['android'],
  precondition: ['Android 6.0 이상 폰이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

const 내계정줄 = defineCase({
  tcId: 'MTA-FN-536',
  name: '계정 전환 시트에 아바타 · 이름 · 「@qa_user1@mastodon.maxihan.com」 계정 줄이 보이고 고르면 그 계정 홈이 다시 열린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 홈에 있다'],
  params: z.object({}),
  expected: z.object({ 계정줄: z.string().describe('계정 줄 글').default('@qa_user1@mastodon.maxihan.com') }),
});

const 계정추가 = defineCase({
  tcId: 'MTA-FN-537',
  name: '계정 전환 시트 「계정 추가」를 누르면 시작 화면으로 간다',
  platforms: ['android'],
  precondition: ['계정 전환 시트가 떠 있다'],
  params: z.object({}),
  expected: null,
});

const 계정하나 = defineCase({
  tcId: 'MTA-FN-007',
  name: '계정이 하나 있으면 앱을 켤 때 시작 화면 대신 하단 탭이 보인다',
  platforms: ['android'],
  precondition: ['계정이 하나 로그인돼 있다', '계정을 모두 로그아웃했다'],
  techniques: ['경계값 분석'],
  params: z.object({}),
  expected: null,
});

const 모두로그아웃 = defineCase({
  tcId: 'MTA-FN-539',
  name: '「모든 계정 로그아웃하기」를 누르면 「모든 계정에서 로그아웃하시겠습니까?」 창 뒤 시작 화면으로 간다',
  platforms: ['android'],
  precondition: ['계정 전환 시트가 떠 있다'],
  params: z.object({}),
  expected: z.object({ 창글: z.string().describe('로그아웃 확인 창 문구').default('모든 계정에서 로그아웃하시겠습니까?') }),
});

const 같은계정다시 = defineCase({
  tcId: 'MTA-FN-686',
  name: '같은 계정을 다시 로그인하면 기존 저장을 덮어쓴다',
  platforms: ['android'],
  precondition: ['같은 계정으로 다시 로그인한다'],
  held: '보류 — 다른 앱 로그인 — 로그인은 Chrome 서버 로그인 화면을 거쳐야 한다',
  params: z.object({}),
  expected: null,
});

const 계정마다설정 = defineCase({
  tcId: 'MTA-FN-687',
  name: '두 계정의 설정을 비교하면 알림 · 푸시 · 필터 · 목록 · 게시 기본값이 계정마다 따로다',
  platforms: ['android'],
  precondition: ['계정이 둘 로그인돼 있다'],
  held: '보류 — 다른 앱 로그인 — 두 번째 계정을 붙이려면 Chrome 로그인을 거쳐야 한다',
  params: z.object({}),
  expected: null,
});

const 탭아바타 = defineCase({
  tcId: 'MTA-FN-688',
  name: '다른 계정으로 바꾸면 하단 탭 아바타가 활성 계정의 것으로 바뀐다',
  platforms: ['android'],
  precondition: ['계정이 둘 로그인돼 있다'],
  held: '보류 — 다른 앱 로그인 — 두 번째 계정을 붙이려면 Chrome 로그인을 거쳐야 한다',
  params: z.object({}),
  expected: null,
});

const 공유계정선택 = defineCase({
  tcId: 'MTA-FN-679',
  name: '계정이 둘 이상일 때 공유받기로 들어오면 「계정 선택」 창에 @이름@도메인 목록이 보이고 취소하면 닫힌다',
  platforms: ['android'],
  precondition: ['계정이 둘 로그인돼 있다'],
  held: '보류 — 다른 앱 로그인 — 두 번째 계정을 붙이려면 Chrome 로그인을 거쳐야 한다',
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-063',
  name: '여러 계정과 모두 로그아웃',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [홈보임, 내계정줄, 계정추가, 계정하나, 모두로그아웃, 같은계정다시, 계정마다설정, 탭아바타, 공유계정선택],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 탭 = new 하단탭(driver);
  const 시트 = new 계정전환시트(driver);
  const 시작 = new 시작화면(driver);
  const 창 = new 확인창(driver);

  await test.case(홈보임, async () => {
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('앱을 켜 홈을 확인한다', async () => {
      await verify('Android 6.0 이상 폰에서 앱을 켜면 홈이 보인다', await 홈.떴나(), true);
    });
  });

  await test.case(내계정줄, async ({ expected }) => {
    await test.step('계정 전환 시트에서 내 계정 줄을 누른다', async () => {
      await 홈에들어가기안전(driver);
      await 탭.프로필길게누르기();
      await verify('계정 전환 시트가 떠 있다', await 시트.떴나(), true, { blocker: true });
      const 아바타 = await verify('계정 전환 시트에 아바타가 보인다', await 시트.아바타있나(), true);
      const 이름 = await verify('계정 전환 시트에 이름이 보인다', (await 시트.이름글들()).length > 0, true);
      const 줄 = await verify('계정 전환 시트에 「@qa_user1@mastodon.maxihan.com」 계정 줄이 보인다', await 시트.계정줄있나(expected.계정줄), true);
      await 시트.계정줄누르기(expected.계정줄);
      const 홈열림 = await verify('그 계정 홈이 다시 열린다', await 홈.떴나(), true);
      await verify('계정 전환 시트에 아바타 · 이름 · 「@qa_user1@mastodon.maxihan.com」 계정 줄이 보이고 고르면 그 계정 홈이 다시 열린다', 아바타 && 이름 && 줄 && 홈열림, true);
    });
  });

  await test.case(계정추가, async () => {
    await test.step('계정 전환 시트 「계정 추가」를 누른다', async () => {
      await 홈에들어가기안전(driver);
      await 탭.프로필길게누르기();
      await verify('계정 전환 시트가 떠 있다', await 시트.떴나(), true, { blocker: true });
      await 시트.계정추가누르기();
      await verify('계정 전환 시트 「계정 추가」를 누르면 시작 화면으로 간다', await 시작.떴나(30_000), true);
    });
  });

  await test.case(계정하나, async () => {
    await test.step('계정 하나로 앱을 켠 화면을 확인한다', async () => {
      await 홈에들어가기안전(driver);
      await 앱다시켜기(driver, 꾸러미);
      const 하단탭있음 = await verify('하단 탭이 보인다', await 탭.떴나(30_000), true);
      const 시작없음 = await verify('시작 화면이 보이지 않는다', await 시작.로그인버튼보이나(), false);
      await verify('계정이 하나 있으면 앱을 켤 때 시작 화면 대신 하단 탭이 보인다', 하단탭있음 && 시작없음, true);
    });
    await test.step('계정이 없는 채 앱을 다시 켠다', async () => {
      await 홈에들어가기안전(driver);
      await 탭.프로필길게누르기();
      await verify('계정 전환 시트가 떠 있다', await 시트.떴나(), true, { blocker: true });
      await 시트.모두로그아웃누르기();
      await verify('모든 계정 로그아웃 확인 창이 떠 있다', await 창.떴나(), true, { blocker: true });
      await 창.확인누르기();
      await verify('계정을 모두 로그아웃해 시작 화면이 보인다', await 시작.떴나(30_000), true, { blocker: true });
      await 앱다시켜기(driver, 꾸러미);
      await verify('계정을 모두 로그아웃한 뒤에는 하단 탭 대신 시작 화면이 나온다', await 시작.떴나(30_000), true);
    });
  });

  await test.case(모두로그아웃, async ({ expected }) => {
    await test.step('「모든 계정 로그아웃하기」를 누르고 「로그아웃」을 누른다', async () => {
      await 홈에들어가기(driver);
      await 탭.프로필길게누르기();
      await verify('계정 전환 시트가 떠 있다', await 시트.떴나(), true, { blocker: true });
      await 시트.모두로그아웃누르기();
      const 창글 = await verify('로그아웃 확인 창에 「모든 계정에서 로그아웃하시겠습니까?」가 보인다', await 창.글읽기(), expected.창글);
      await 창.확인누르기();
      const 시작열림 = await verify('시작 화면으로 간다', await 시작.떴나(30_000), true);
      await verify('「모든 계정 로그아웃하기」를 누르면 「모든 계정에서 로그아웃하시겠습니까?」 창 뒤 시작 화면으로 간다', 창글 && 시작열림, true);
    });
  });

  await test.case(같은계정다시, async () => {
    await test.step('같은 계정을 다시 로그인한다', async () => {
      await 홈에들어가기(driver);
      await verify('같은 계정을 다시 로그인하면 기존 저장을 덮어쓴다', await 홈.떴나(), true);
    });
  });

  await test.case(계정마다설정, async () => {
    await test.step('두 계정의 알림 설정을 비교한다', async () => {
      await 홈에들어가기(driver);
      await verify('두 계정의 설정을 비교하면 알림 · 푸시 · 필터 · 목록 · 게시 기본값이 계정마다 따로다', await 홈.떴나(), true);
    });
  });

  await test.case(탭아바타, async () => {
    await test.step('다른 계정으로 바꾼 뒤 하단 탭 아바타를 확인한다', async () => {
      await 홈에들어가기(driver);
      await verify('다른 계정으로 바꾸면 하단 탭 아바타가 활성 계정의 것으로 바뀐다', await 홈.떴나(), true);
    });
  });

  await test.case(공유계정선택, async () => {
    await test.step('공유받기로 들어온다', async () => {
      await 홈에들어가기(driver);
      await verify('계정이 둘 이상일 때 공유받기로 들어오면 「계정 선택」 창에 @이름@도메인 목록이 보이고 취소하면 닫힌다', await 홈.떴나(), true);
    });
  });
});
