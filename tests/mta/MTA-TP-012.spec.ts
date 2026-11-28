import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 홈에서드롭다운열기 } from './helpers/flow-start.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 하단탭 } from './components/tabbar.component.js';
import { 컬렉션화면 } from './pages/collection.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필글목록 } from './pages/profile-feed.page.js';

const 빈홈 = defineCase({
  tcId: 'MTA-FN-625',
  name: '팔로우한 사람이 없으면 홈에 글이 하나도 보이지 않는다',
  platforms: ['android'],
  precondition: ['빈 계정으로 로그인해 홈에 있고 팔로우한 사람이 없다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('빈 계정 아이디').optional().meta({ secret: true, account: '빈 계정' }),
    loginPassword: z.string().describe('빈 계정 비밀번호').optional().meta({ secret: true, account: '빈 계정' }),
  }),
  expected: null,
});

const 목록없음 = defineCase({
  tcId: 'MTA-UI-109',
  name: '내 목록이 없으면 홈 드롭다운 「목록」 하위에 「목록으로 홈 피드를 관리하세요」 / 「여기에 당신의 제목이 나타납니다」가 보인다',
  platforms: ['android'],
  precondition: ['빈 계정에 목록이 없다'],
  params: z.object({}),
  expected: z.object({
    제목: z.string().describe('목록 하위 안내 제목').default('목록으로 홈 피드를 관리하세요'),
    설명: z.string().describe('목록 하위 안내 설명').default('여기에 당신의 제목이 나타납니다'),
  }),
});

const 해시태그없음 = defineCase({
  tcId: 'MTA-UI-111',
  name: '팔로우한 해시태그가 없으면 「팔로우 중인 해시태그」 하위에 「해시태그를 팔로우해서 관심사 따라잡기」 / 「팔로우중인 사람들이 여기 나타날 것입니다」가 보인다',
  platforms: ['android'],
  precondition: ['빈 계정이 팔로우한 해시태그가 없다'],
  params: z.object({}),
  expected: z.object({
    제목: z.string().describe('해시태그 하위 안내 제목').default('해시태그를 팔로우해서 관심사 따라잡기'),
    설명: z.string().describe('해시태그 하위 안내 설명').default('팔로우중인 사람들이 여기 나타날 것입니다'),
  }),
});

const 빈추천탭 = defineCase({
  tcId: 'MTA-UI-483',
  name: '내 프로필 「추천」 탭이 비어 있으면 「Showcase your favorite accounts」가 보인다',
  platforms: ['android'],
  precondition: ['빈 계정의 「추천」 탭이 비어 있다'],
  params: z.object({}),
  expected: z.object({ 안내: z.string().describe('빈 추천 탭 안내 글').default('Showcase your favorite accounts') }),
});

const 컬렉션만들기없음 = defineCase({
  tcId: 'MTA-UI-482',
  name: '내 프로필 「추천」 탭에 컬렉션 만들기 버튼이 보이지 않는다',
  platforms: ['android'],
  precondition: ['빈 계정으로 로그인해 있다'],
  params: z.object({ 버튼: z.string().min(1).describe('없어야 할 버튼 글').default('컬렉션 만들기') }),
  expected: null,
});

const 빈홈문구 = defineCase({
  tcId: 'MTA-UI-515',
  name: '빈 홈 화면에 비어 있다는 안내 문구가 보인다',
  platforms: ['android'],
  precondition: ['빈 계정의 홈이 비어 있다'],
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-012',
  name: '빈 계정 — 비어 있는 화면',
  platforms: ['android'],
  precondition: ['빈 계정으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [빈홈, 목록없음, 해시태그없음, 빈추천탭, 컬렉션만들기없음, 빈홈문구],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);

  await test.case(빈홈, async () => {
    await test.step('빈 계정으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('팔로우한 사람이 없는 홈을 확인한다', async () => {
      await verify('팔로우한 사람이 없으면 홈에 글이 하나도 보이지 않는다', await 홈.보이는카드수(), 0);
    });
  });

  await test.case(목록없음, async ({ expected }) => {
    await test.step('드롭다운에서 「목록」 하위를 열어 안내를 확인한다', async () => {
      await 홈에서드롭다운열기(driver);
      await 홈.드롭다운하위열기('목록');
      const 제목 = await verify('「목록」 하위에 「목록으로 홈 피드를 관리하세요」가 보인다', await 홈.드롭다운항목있나(expected.제목), true);
      const 설명 = await verify('「목록」 하위에 「여기에 당신의 제목이 나타납니다」가 보인다', await 홈.드롭다운항목있나(expected.설명), true);
      await verify('내 목록이 없으면 홈 드롭다운 「목록」 하위에 「목록으로 홈 피드를 관리하세요」 / 「여기에 당신의 제목이 나타납니다」가 보인다', 제목 && 설명, true);
    });
  });

  await test.case(해시태그없음, async ({ expected }) => {
    await test.step('드롭다운에서 「팔로우 중인 해시태그」 하위를 열어 안내를 확인한다', async () => {
      await 홈에서드롭다운열기(driver);
      await 홈.드롭다운하위열기('팔로우 중인 해시태그');
      const 제목 = await verify('「팔로우 중인 해시태그」 하위에 「해시태그를 팔로우해서 관심사 따라잡기」가 보인다', await 홈.드롭다운항목있나(expected.제목), true);
      const 설명 = await verify('「팔로우 중인 해시태그」 하위에 「팔로우중인 사람들이 여기 나타날 것입니다」가 보인다', await 홈.드롭다운항목있나(expected.설명), true);
      await verify('팔로우한 해시태그가 없으면 「팔로우 중인 해시태그」 하위에 「해시태그를 팔로우해서 관심사 따라잡기」 / 「팔로우중인 사람들이 여기 나타날 것입니다」가 보인다', 제목 && 설명, true);
    });
  });

  await test.case(빈추천탭, async ({ expected }) => {
    await test.step('내 프로필 「추천」 탭을 연다', async () => {
      await 홈에들어가기(driver);
      await new 하단탭(driver).누르기('프로필');
      await new 프로필글목록(driver).탭누르기('추천');
    });
    await test.step('「추천」 탭의 안내 글을 확인한다', async () => {
      await verify('내 프로필 「추천」 탭이 비어 있으면 「Showcase your favorite accounts」가 보인다', await new 컬렉션화면(driver).빈안내있나(expected.안내), true);
    });
  });

  await test.case(컬렉션만들기없음, async ({ params }) => {
    await test.step('내 프로필 「추천」 탭에서 컬렉션 만들기 버튼 자리를 확인한다', async () => {
      if (!(await new 컬렉션화면(driver).빈안내있나('Showcase your favorite accounts'))) throw new Error('내 프로필 「추천」 탭이 안 열려 있다');
      const 글로 = await 보이나(driver, `android=new UiSelector().textContains(${JSON.stringify(params.버튼)})`);
      const 이름으로 = await 보이나(driver, `android=new UiSelector().descriptionContains(${JSON.stringify(params.버튼)})`);
      await verify('내 프로필 「추천」 탭에 컬렉션 만들기 버튼이 보이지 않는다', 글로 || 이름으로, false);
    });
  });

  await test.case(빈홈문구, async () => {
    await test.step('빈 홈 화면 문구를 확인한다', async () => {
      await 홈에들어가기(driver);
      await verify('빈 홈 화면에 비어 있다는 안내 문구가 보인다', (await 홈.빈안내글()) !== '', true);
    });
  });
});
