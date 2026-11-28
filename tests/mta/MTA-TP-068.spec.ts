import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 하단탭 } from './components/tabbar.component.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 컬렉션화면 } from './pages/collection.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필글목록 } from './pages/profile-feed.page.js';

const 컬렉션이름 = '좋아하는 사진가';

const 컬렉션화면모양 = defineCase({
  tcId: 'MTA-UI-480',
  name: '컬렉션 화면에 제목 · 「by @qa_user1」 · 계정 목록이 보인다',
  platforms: ['android'],
  precondition: ['컬렉션 「좋아하는 사진가」를 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목: z.string().describe('컬렉션 제목').default(컬렉션이름),
    작성자: z.string().describe('컬렉션 작성자 줄').default('by @qa_user1'),
  }),
});

const 컬렉션메뉴 = defineCase({
  tcId: 'MTA-UI-481',
  name: '컬렉션 메뉴에 「공유」 · 「브라우저에서 열기」 · 「Report collection」 · 「Block account」가 있다',
  platforms: ['android'],
  precondition: ['컬렉션 화면이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 추천탭컬렉션 = defineCase({
  tcId: 'MTA-UI-529',
  name: '프로필 「추천」 탭에 영어 「Collections」 구간과 컬렉션 「좋아하는 사진가」 · 「by @qa_user1」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 내 프로필 「추천」 탭을 열었다'],
  params: z.object({}),
  expected: z.object({ 작성자: z.string().describe('컬렉션 작성자 줄').default('by @qa_user1') }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-068',
  name: '컬렉션',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [컬렉션화면모양, 컬렉션메뉴, 추천탭컬렉션],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 컬렉션 = new 컬렉션화면(driver);
  const 목록 = new 프로필글목록(driver);

  const 내추천탭열기 = async (): Promise<void> => {
    await 홈에들어가기(driver);
    await new 하단탭(driver).누르기('프로필');
    await 목록.탭누르기('추천');
  };

  await test.case(컬렉션화면모양, async ({ expected }) => {
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('내 프로필 「추천」 탭에서 컬렉션 「좋아하는 사진가」를 연다', async () => {
      await 내추천탭열기();
      await 컬렉션.컬렉션열기(컬렉션이름);
      if (!(await 컬렉션.떴나(15_000))) throw new Error('컬렉션 화면이 안 열렸다');
    });
    await test.step('컬렉션 화면을 확인한다', async () => {
      const 제목 = await verify('컬렉션 화면에 제목이 보인다', await 컬렉션.제목글(), expected.제목);
      const 작성자 = await verify('컬렉션 화면에 「by @qa_user1」이 보인다', await 컬렉션.작성자줄글(), expected.작성자);
      const 계정들 = await verify('컬렉션 화면에 계정 목록이 보인다', (await 컬렉션.계정글들()).length > 0, true);
      await verify('컬렉션 화면에 제목 · 「by @qa_user1」 · 계정 목록이 보인다', 제목 && 작성자 && 계정들, true);
    });
  });

  await test.case(컬렉션메뉴, async () => {
    await test.step('컬렉션 화면이 열려 있는지 보고 닫혀 있으면 다시 연다', async () => {
      if (!(await 컬렉션.떴나(2_000))) {
        await 내추천탭열기();
        await 컬렉션.컬렉션열기(컬렉션이름);
        if (!(await 컬렉션.떴나(15_000))) throw new Error('컬렉션 화면이 안 열렸다');
      }
    });
    await test.step('컬렉션 메뉴를 연다', async () => {
      await 컬렉션.메뉴열기();
      const 공유 = await verify('컬렉션 메뉴에 「공유」가 있다', await 컬렉션.메뉴.항목있나('공유', 10_000), true);
      const 브라우저 = await verify('컬렉션 메뉴에 「브라우저에서 열기」가 있다', await 컬렉션.메뉴.항목있나('브라우저에서 열기'), true);
      const 신고 = await verify('컬렉션 메뉴에 「Report collection」이 있다', await 컬렉션.메뉴.항목있나('Report collection'), true);
      const 차단 = await verify('컬렉션 메뉴에 「Block account」가 있다', await 컬렉션.메뉴.항목있나('Block account'), true);
      await verify('컬렉션 메뉴에 「공유」 · 「브라우저에서 열기」 · 「Report collection」 · 「Block account」가 있다', 공유 && 브라우저 && 신고 && 차단, true);
      await 컬렉션.메뉴.닫기();
    });
  });

  await test.case(추천탭컬렉션, async ({ expected }) => {
    await test.step('내 프로필 「추천」 탭을 연다', async () => {
      await 내추천탭열기();
    });
    await test.step('「추천」 탭의 컬렉션 구간을 확인한다', async () => {
      const 구간 = await verify('「추천」 탭에 영어 「Collections」 구간이 보인다', await 컬렉션.구간있나(), true);
      const 이름 = await verify('컬렉션 「좋아하는 사진가」가 보인다', await 컬렉션.컬렉션찾기(컬렉션이름), true);
      const 작성자 = await verify('컬렉션 아래에 「by @qa_user1」이 보인다', await 컬렉션.작성자글(컬렉션이름), expected.작성자);
      await verify('프로필 「추천」 탭에 영어 「Collections」 구간과 컬렉션 「좋아하는 사진가」 · 「by @qa_user1」이 보인다', 구간 && 이름 && 작성자, true);
    });
  });
});
