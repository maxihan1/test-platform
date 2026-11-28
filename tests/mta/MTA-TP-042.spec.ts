import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 하단탭 } from './components/tabbar.component.js';
import { type 계정, 계정꺼내기, 관계보기 } from './helpers/api.helper.js';
import { 나를차단했나, 관계맞추기, 프로필열어보기 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

const 관계없음 = defineCase({
  tcId: 'MTA-UI-321',
  name: '관계 없는 사람 프로필의 동작 버튼이 「팔로우」로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있고 관계 없는 cafe_moon 프로필을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사용자명: z.string().min(1).describe('열어 볼 계정 — 일반 회원과 관계가 없는 계정의 사용자명').default('cafe_moon'),
  }),
  expected: z.object({ 버튼: z.string().describe('관계 없는 사람 프로필의 동작 버튼').default('팔로우') }),
});

const 상대만팔로우 = defineCase({
  tcId: 'MTA-UI-323',
  name: '상대만 나를 팔로우하면 동작 버튼이 「맞팔로우」로 보인다',
  platforms: ['android'],
  precondition: ['fan_ryu 만 나를 팔로우한다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 일반 회원을 팔로우하지만 일반 회원은 팔로우하지 않는 계정의 사용자명').default('fan_ryu') }),
  expected: z.object({ 버튼: z.string().describe('상대만 팔로우할 때의 동작 버튼').default('맞팔로우') }),
});

const 내가팔로우 = defineCase({
  tcId: 'MTA-UI-324',
  name: '내가 팔로우 중이면 동작 버튼이 「팔로우 해제」로 보인다',
  platforms: ['android'],
  precondition: ['내가 news_bot 을 팔로우 중이다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 일반 회원이 팔로우하는 계정의 사용자명').default('news_bot') }),
  expected: z.object({ 버튼: z.string().describe('팔로우 중일 때의 동작 버튼').default('팔로우 해제') }),
});

const 내가차단 = defineCase({
  tcId: 'MTA-UI-325',
  name: '내가 차단 중이면 동작 버튼이 「Unblock」으로 보인다',
  platforms: ['android'],
  precondition: ['내가 troll_kim 을 차단 중이다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 일반 회원이 차단한 계정의 사용자명').default('troll_kim') }),
  expected: z.object({ 버튼: z.string().describe('차단 중일 때의 동작 버튼').default('Unblock') }),
});

const 상대가차단 = defineCase({
  tcId: 'MTA-FN-389',
  name: '상대가 나를 차단했으면 동작 버튼이 꺼져 있다',
  platforms: ['android'],
  precondition: ['blocker_baek 이 나를 차단했다'],
  techniques: ['결정 테이블'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 일반 회원을 차단한 계정의 사용자명').default('blocker_baek') }),
  expected: null,
});

const 내프로필버튼 = defineCase({
  tcId: 'MTA-UI-327',
  name: '내 프로필 동작 버튼이 「프로필 편집」으로 보인다',
  platforms: ['android'],
  precondition: ['내 프로필을 열었다'],
  params: z.object({}),
  expected: z.object({ 버튼: z.string().describe('내 프로필의 동작 버튼').default('프로필 편집') }),
});

const 뮤트해제먼저 = defineCase({
  tcId: 'MTA-FN-391',
  name: '뮤트한 상태에서 동작 버튼을 누르면 뮤트 해제가 먼저 진행된다',
  platforms: ['android'],
  precondition: ['mute_jang 을 뮤트했다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 일반 회원이 팔로우하는 계정의 사용자명(뮤트 · 해제가 허용된 계정)').default('mute_jang') }),
  expected: null,
});

const 잠긴계정요청 = defineCase({
  tcId: 'MTA-FN-652',
  name: '잠긴 계정 프로필의 「팔로우」를 눌러 요청을 보내면 버튼이 「Cancel request」로 바뀐다',
  platforms: ['android'],
  precondition: ['yuna_locked 에 보낸 팔로우 요청을 취소했다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 팔로우 요청을 받는 잠긴 계정의 사용자명').default('yuna_locked') }),
  expected: z.object({ 처음버튼: z.string().describe('요청 전 동작 버튼').default('팔로우') }),
});

const 팔로워수새로고침 = defineCase({
  tcId: 'MTA-FN-695',
  name: '남의 프로필에서 팔로우하면 「Followers」 숫자는 바로 안 바뀌고 당겨서 새로고침해야 바뀐다',
  platforms: ['android'],
  precondition: ['cafe_moon 프로필이 열려 있다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 일반 회원과 관계가 없고 팔로워가 0~8명인 계정의 사용자명').default('cafe_moon') }),
  expected: null,
});

const 정지된계정 = defineCase({
  tcId: 'MTA-FN-692',
  name: '정지된 계정 프로필을 열면 동작 버튼이 꺼져 있다',
  platforms: ['android'],
  precondition: ['정지된 계정이 있다'],
  held: '보류 — 테스트 계정 없음 — 관리자 계정 값으로 웹 로그인하면 「올바르지 않은 이메일 주소 혹은 암호입니다.」로 거절돼 계정을 정지할 수 없다',
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 정지된 계정의 사용자명') }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-042',
  name: '남의 프로필 — 동작 버튼',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [관계없음, 상대만팔로우, 내가팔로우, 내가차단, 상대가차단, 내프로필버튼, 뮤트해제먼저, 잠긴계정요청, 팔로워수새로고침, 정지된계정],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  let 나: 계정 | undefined;

  await test.cleanup('바꾼 관계를 시드 상태로 되돌린다', async () => {
    if (나 === undefined) return;
    await 관계맞추기(나, 'cafe_moon', { 팔로우: false });
    await 관계맞추기(나, 'mute_jang', { 뮤트: false });
    await 관계맞추기(나, 'yuna_locked', { 팔로우: true });
  });

  await test.case(관계없음, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 관계맞추기(나!, params.사용자명, { 팔로우: false, 뮤트: false, 차단: false });
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('cafe_moon 동작 버튼을 확인한다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await verify('관계 없는 사람 프로필의 동작 버튼이 「팔로우」로 보인다', await 프로필.동작버튼글(), expected.버튼);
    });
  });

  await test.case(상대만팔로우, async ({ params, expected }) => {
    await test.step('fan_ryu 만 나를 팔로우하는 상태로 맞춘다', async () => {
      await 관계맞추기(나!, params.사용자명, { 팔로우: false });
      await verify('상대가 나를 팔로우한다', (await 관계보기(나!, params.사용자명)).followed_by, true, { blocker: true });
    });
    await test.step('fan_ryu 동작 버튼을 확인한다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await verify('상대만 나를 팔로우하면 동작 버튼이 「맞팔로우」로 보인다', await 프로필.동작버튼글(), expected.버튼);
    });
  });

  await test.case(내가팔로우, async ({ params, expected }) => {
    await test.step('news_bot 을 팔로우 중인 상태로 맞춘다', async () => {
      await 관계맞추기(나!, params.사용자명, { 팔로우: true });
    });
    await test.step('news_bot 동작 버튼을 확인한다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await verify('내가 팔로우 중이면 동작 버튼이 「팔로우 해제」로 보인다', await 프로필.동작버튼글(), expected.버튼);
    });
  });

  await test.case(내가차단, async ({ params, expected }) => {
    await test.step('troll_kim 을 차단 중인 상태로 맞춘다', async () => {
      await 관계맞추기(나!, params.사용자명, { 차단: true });
    });
    await test.step('troll_kim 동작 버튼을 확인한다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await verify('내가 차단 중이면 동작 버튼이 「Unblock」으로 보인다', await 프로필.동작버튼글(), expected.버튼);
    });
  });

  await test.case(상대가차단, async ({ params }) => {
    await test.step('blocker_baek 이 나를 차단했는지 API 로 확인한다', async () => {
      await verify('상대가 나를 차단했다', await 나를차단했나(나!, params.사용자명), true, { blocker: true });
    });
    await test.step('blocker_baek 동작 버튼을 확인한다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await verify('상대가 나를 차단했으면 동작 버튼이 꺼져 있다', await 프로필.동작버튼켜져있나(), false);
    });
  });

  await test.case(내프로필버튼, async ({ expected }) => {
    await test.step('내 프로필 동작 버튼을 확인한다', async () => {
      await 홈에들어가기(driver);
      await new 하단탭(driver).누르기('프로필');
      await verify('내 프로필 동작 버튼이 「프로필 편집」으로 보인다', await 프로필.동작버튼글(), expected.버튼);
    });
  });

  await test.case(뮤트해제먼저, async ({ params }) => {
    await test.step('mute_jang 을 뮤트한 상태로 맞춘다', async () => {
      await 관계맞추기(나!, params.사용자명, { 뮤트: true });
    });
    await test.step('뮤트한 mute_jang 의 동작 버튼을 누른다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await 프로필.동작버튼누르기();
      await verify('뮤트한 상태에서 동작 버튼을 누르면 뮤트 해제가 먼저 진행된다', await 될때까지(driver, async () => !(await 관계보기(나!, params.사용자명)).muting, 20_000), true);
    });
  });

  await test.case(잠긴계정요청, async ({ params, expected }) => {
    await test.step('yuna_locked 에 보낸 팔로우 요청을 취소한 상태로 맞춘다', async () => {
      await 관계맞추기(나!, params.사용자명, { 팔로우: false });
    });
    await test.step('잠긴 계정 yuna_locked 의 「팔로우」를 누른다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await verify('요청을 보내기 전 동작 버튼이 「팔로우」다', await 프로필.동작버튼글(), expected.처음버튼, { blocker: true });
      await 프로필.동작버튼누르기();
      await verify('잠긴 계정 프로필의 「팔로우」를 눌러 요청을 보내면 버튼이 「Cancel request」로 바뀐다', await 프로필.동작버튼글될때까지('Cancel request', 20_000), true);
    });
  });

  await test.case(팔로워수새로고침, async ({ params }) => {
    await test.step('cafe_moon 을 팔로우하지 않는 상태로 맞춘다', async () => {
      await 관계맞추기(나!, params.사용자명, { 팔로우: false });
    });
    await test.step('cafe_moon 을 팔로우한 뒤 「Followers」 숫자를 확인한다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      const 처음 = await 프로필.수글('팔로워');
      await 프로필.동작버튼누르기();
      await verify('팔로우한 뒤 동작 버튼이 「팔로우 해제」로 바뀐다', await 프로필.동작버튼글될때까지('팔로우 해제', 20_000), true, { blocker: true });
      const 안바뀜 = await verify('팔로우한 직후 「Followers」 숫자가 그대로다', await 프로필.수글('팔로워'), 처음);
      await 프로필.당겨서새로고침();
      const 바뀜 = await verify('당겨서 새로고침한 뒤 「Followers」 숫자가 바뀐다', await 프로필.수글될때까지('팔로워', String(Number(처음) + 1), 20_000), true);
      await verify('남의 프로필에서 팔로우하면 「Followers」 숫자는 바로 안 바뀌고 당겨서 새로고침해야 바뀐다', 안바뀜 && 바뀜, true);
    });
  });

  await test.case(정지된계정, async ({ params }) => {
    await test.step('정지된 계정 프로필을 연다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await verify('정지된 계정 프로필을 열면 동작 버튼이 꺼져 있다', await 프로필.동작버튼켜져있나(), false);
    });
  });
});
