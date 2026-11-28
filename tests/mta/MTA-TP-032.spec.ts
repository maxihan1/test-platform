import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정꺼내기, 알림요청들 } from './helpers/api.helper.js';
import { 알림탭열기 } from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 컬렉션화면 } from './pages/collection.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림요청화면 } from './pages/notification-requests.page.js';

const 요청줄 = defineCase({
  tcId: 'MTA-UI-249',
  name: '알림 요청이 있으면 맨 위에 「필터링된 알림」 줄과 부제 「n 명의 알 수도 있는 사람」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있고 걸러진 알림 요청이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({ 제목: z.string().describe('알림 요청 줄 제목').default('필터링된 알림') }),
});

const 요청화면줄 = defineCase({
  tcId: 'MTA-UI-267',
  name: '알림 요청 줄마다 아바타 · 이름 · @계정 · 개수 배지와 허용 · 해제 버튼이 보인다',
  platforms: ['android'],
  held: '보류 — 알림 요청 줄 「filt_hong」이 안 보인다',
  precondition: ['알림 요청 화면 「필터링된 알림」이 열려 있다'],
  params: z.object({
    사용자명: z.string().min(1).describe('줄을 확인할 걸러진 알림 요청 계정의 사용자명').default('filt_hong'),
  }),
  expected: null,
});

const 요청줄누르기 = defineCase({
  tcId: 'MTA-FN-328',
  name: '알림 요청 줄을 누르면 그 사람의 알림 목록이 열리고 메뉴에 「알림 허용」 · 「알림 요청 해제」가 있다',
  platforms: ['android'],
  precondition: ['알림 요청 화면이 열려 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

const 요청허용과해제 = defineCase({
  tcId: 'MTA-FN-327',
  name: '알림 요청을 허용하면 스낵바 「filt_hong 가 이제 알림 목록에 나타날 것입니다.」가 보인다',
  platforms: ['android'],
  precondition: ['filt_hong 의 알림 요청이 있다', 'promo_lee 의 알림 요청이 있다'],
  params: z.object({}),
  expected: z.object({
    허용안내: z.string().describe('허용 뒤 안내').default('filt_hong 가 이제 알림 목록에 나타날 것입니다.'),
    해제안내: z.string().describe('해제 뒤 안내').default('promo_lee 로부터의 알림이 해제되었습니다.'),
  }),
});

const 중재경고 = defineCase({
  tcId: 'MTA-FN-640',
  name: '중재 경고 알림에 설명과 「더 학습하기」가 보이고 누르면 웹 브라우저로 간다',
  platforms: ['android'],
  precondition: ['나에게 온 중재 경고 알림이 있다'],
  held: '보류 — 테스트 계정 없음 — 관리자 계정 값으로 웹 로그인하면 「올바르지 않은 이메일 주소 혹은 암호입니다.」로 거절돼 중재 경고를 보낼 수 없다',
  params: z.object({
    경고알림글: z.string().describe('중재 경고 알림 줄에서 찾을 글자'),
  }),
  expected: null,
});

const 컬렉션알림 = defineCase({
  tcId: 'MTA-FN-641',
  name: '컬렉션 알림 「<이름> added you to a collection」을 누르면 컬렉션이 열린다',
  platforms: ['android'],
  precondition: ['누군가 나를 컬렉션에 넣었다'],
  held: '보류 — 컬렉션은 웹에서만 만들고 나를 넣은 컬렉션 알림이 없다',
  params: z.object({}),
  expected: null,
});

const 요청배지 = defineCase({
  tcId: 'MTA-FN-642',
  name: '알림 요청 개수가 99 를 넘으면 배지가 「99+」로 보인다',
  platforms: ['android'],
  precondition: ['한 사람이 보낸 걸러진 알림이 100건 있다'],
  held: '보류 — 한 사람이 보낸 걸러진 알림 100건이 없다',
  params: z.object({
    사용자명: z.string().min(1).describe('걸러진 알림이 100건인 계정의 사용자명'),
  }),
  expected: z.object({ 배지: z.string().describe('개수 배지 글자').default('99+') }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-032',
  name: '알림 요청',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [요청줄, 요청줄누르기, 요청허용과해제, 중재경고, 컬렉션알림, 요청배지, 요청화면줄],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 요청 = new 알림요청화면(driver);

  const 요청화면열기 = async (): Promise<void> => {
    const 알림 = await 알림탭열기(driver);
    await 알림.요청줄누르기();
    if (!(await 요청.떴나(15_000))) throw new Error('알림 요청 화면이 안 열렸다');
  };

  await test.case(요청줄, async ({ expected }) => {
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('일반 회원으로 알림 탭을 연다', async () => {
      await 알림탭열기(driver);
    });
    await test.step('알림 맨 위 줄을 확인한다', async () => {
      const 알림 = await 알림탭열기(driver);
      const 제목 = await verify('알림 맨 위에 「필터링된 알림」 줄이 보인다', await 알림.요청줄제목글(), expected.제목);
      const 부제 = await verify('부제 「n 명의 알 수도 있는 사람」이 보인다', /^\d+ 명의 알 수도 있는 사람$/.test(await 알림.요청줄부제글()), true);
      await verify('알림 요청이 있으면 맨 위에 「필터링된 알림」 줄과 부제 「n 명의 알 수도 있는 사람」이 보인다', 제목 && 부제, true);
    });
  });

  await test.case(요청줄누르기, async ({ params }) => {
    let 사용자명 = '';
    await test.step('지금 알림 요청이 있는 계정을 API 로 찾고 알림 요청 화면을 연다', async () => {
      const 요청들 = await 알림요청들(계정꺼내기(params.loginId, params.loginPassword));
      if (요청들.length === 0) throw new Error('알림 요청이 하나도 없다');
      사용자명 = 요청들[0]!.account.username;
      if (!(await 요청.떴나(2_000))) await 요청화면열기();
    });
    await test.step('알림 요청 줄을 누른다', async () => {
      await 요청.줄누르기(사용자명);
      const 목록 = await verify('그 사람의 알림 목록이 열린다', (await 요청.사람알림제목글()).endsWith('로부터의 알림'), true);
      const 허용 = await verify('메뉴에 「알림 허용」이 있다', await 요청.막대허용있나(), true);
      const 해제 = await verify('메뉴에 「알림 요청 해제」가 있다', await 요청.막대해제있나(), true);
      await verify('알림 요청 줄을 누르면 그 사람의 알림 목록이 열리고 메뉴에 「알림 허용」 · 「알림 요청 해제」가 있다', 목록 && 허용 && 해제, true);
      await driver.back();
    });
  });

  await test.case(요청허용과해제, async ({ expected }) => {
    await test.step('알림 요청 화면이 열려 있는지 보고 닫혀 있으면 다시 연다', async () => {
      if (!(await 요청.떴나(2_000))) await 요청화면열기();
    });
    await test.step('filt_hong 줄의 허용 버튼을 누른다', async () => {
      await 요청.허용누르기('filt_hong');
      await verify('알림 요청을 허용하면 스낵바 「filt_hong 가 이제 알림 목록에 나타날 것입니다.」가 보인다', await 요청.토스트(), expected.허용안내);
    });
    await test.step('promo_lee 줄의 해제 버튼을 누른다', async () => {
      await 요청.해제누르기('promo_lee');
      await verify('알림 요청 해제 뒤 스낵바 「promo_lee 로부터의 알림이 해제되었습니다.」가 보인다', await 요청.토스트(), expected.해제안내);
    });
  });

  await test.case(중재경고, async ({ params }) => {
    await test.step('중재 경고 알림을 누른다', async () => {
      const 알림 = await 알림탭열기(driver);
      await 알림.줄누르기(params.경고알림글);
      await verify('중재 경고 알림에 설명과 「더 학습하기」가 보이고 누르면 웹 브라우저로 간다', await 알림.줄있나('더 학습하기', 10_000), true);
    });
  });

  await test.case(컬렉션알림, async () => {
    await test.step('컬렉션 알림을 누른다', async () => {
      const 알림 = await 알림탭열기(driver);
      await 알림.줄누르기('added you to a collection');
      await verify('컬렉션 알림 「<이름> added you to a collection」을 누르면 컬렉션이 열린다', await new 컬렉션화면(driver).떴나(), true);
    });
  });

  await test.case(요청배지, async ({ params, expected }) => {
    await test.step('그 알림 요청 개수 배지를 확인한다', async () => {
      await 요청화면열기();
      await verify('알림 요청 개수가 99 를 넘으면 배지가 「99+」로 보인다', await 요청.배지글(params.사용자명), expected.배지);
    });
  });

  await test.case(요청화면줄, async ({ params }) => {
    await test.step('알림 요청 화면 「필터링된 알림」을 연다', async () => {
      await 요청화면열기();
    });
    await test.step('알림 요청 줄을 확인한다', async () => {
      const 줄 = await verify('알림 요청 줄이 보인다', await 요청.줄있나(params.사용자명), true);
      const 아바타 = await verify('아바타가 보인다', await 요청.아바타있나(params.사용자명), true);
      const 이름 = await verify('이름이 보인다', (await 요청.줄이름글(params.사용자명)) !== '', true);
      const 계정 = await verify('@계정이 보인다', (await 요청.사용자글들()).includes(`@${params.사용자명}`), true);
      const 배지 = await verify('개수 배지가 보인다', (await 요청.배지글(params.사용자명)) !== '', true);
      const 허용 = await verify('허용 버튼이 보인다', await 요청.허용버튼보이나(params.사용자명), true);
      const 해제 = await verify('해제 버튼이 보인다', await 요청.해제버튼보이나(params.사용자명), true);
      await verify('알림 요청 줄마다 아바타 · 이름 · @계정 · 개수 배지와 허용 · 해제 버튼이 보인다', 줄 && 아바타 && 이름 && 계정 && 배지 && 허용 && 해제, true);
    });
  });
});
