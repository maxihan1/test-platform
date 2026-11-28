import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지, 뒤로보냈다오기 } from '@platform/kit/parts';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 사람글찾기 } from './helpers/api.helper.js';
import { 서버 } from './helpers/app.helper.js';
import { 검색입력화면으로, 본문조각 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';
import { 글상세화면 } from './pages/thread.page.js';

const 지원안하는주소 = defineCase({
  tcId: 'MTA-FN-649',
  name: '해석할 수 없는 주소를 「URL 열기」로 열면 토스트 「이 링크는 앱에서 지원하지 않습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 검색 입력 화면을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    주소: z.string().min(1).describe('검색 칸에 적을 주소 — 마스토돈 서버 주소가 아닌 https 주소').default('https://example.com/qa'),
  }),
  expected: z.object({ 토스트: z.string().describe('지원하지 않는 링크 토스트').default('이 링크는 앱에서 지원하지 않습니다.') }),
});

const 없는계정이동 = defineCase({
  tcId: 'MTA-FN-650',
  name: '없는 계정의 「<@이름>로 이동」을 누르면 토스트 「검색어에 대한 결과를 찾을 수 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['검색 입력 화면이 열려 있다'],
  params: z.object({ 검색어: z.string().min(2).describe('검색 칸에 적을 글 — 서버에 없는 @사용자명').default('@qa_no_such_user') }),
  expected: z.object({ 토스트: z.string().describe('없는 계정 토스트').default('검색어에 대한 결과를 찾을 수 없습니다') }),
});

const 내렸다올리기 = defineCase({
  tcId: 'MTA-FN-645',
  name: '검색어를 적다가 앱을 내렸다 올리면 적던 검색어가 남아 있다',
  platforms: ['android'],
  precondition: ['검색 입력 화면에 「카페」를 적고 있다'],
  techniques: ['오류 추정'],
  params: z.object({ 검색어: z.string().min(1).describe('적어 둘 검색어 — 기호 없는 낱말').default('카페') }),
  expected: null,
});

const 글주소열기 = defineCase({
  tcId: 'MTA-FN-648',
  name: '글 주소를 「URL 열기」로 열면 진행 창 「링크 열기…」 뒤 그 글 스레드로 간다',
  platforms: ['android'],
  precondition: ['cafe_moon 의 공개 글 주소가 있다'],
  params: z.object({ 사용자명: z.string().min(1).describe('글 주소를 가져올 계정 — 공개 글이 있는 계정의 사용자명').default('cafe_moon') }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-038',
  name: '검색 — URL 열기와 이동',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [지원안하는주소, 없는계정이동, 내렸다올리기, 글주소열기],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 검색 = new 검색화면(driver);
  let 나: 계정 | undefined;

  await test.case(지원안하는주소, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('「https://example.com/qa」를 「마스토돈에서 URL 열기」로 연다', async () => {
      await 검색입력화면으로(driver);
      await 검색.적기(params.주소);
      await 검색.줄누르기('마스토돈에서 URL 열기');
      await verify('해석할 수 없는 주소를 「URL 열기」로 열면 토스트 「이 링크는 앱에서 지원하지 않습니다.」가 보인다', await 검색.토스트글읽기(15_000), expected.토스트);
    });
  });

  await test.case(없는계정이동, async ({ params, expected }) => {
    await test.step('「@qa_no_such_user」 이동 줄을 누른다', async () => {
      await 검색입력화면으로(driver);
      await 검색.적기(params.검색어);
      await 검색.줄누르기(`${params.검색어}@${서버}로 이동`);
      await verify('없는 계정의 「<@이름>로 이동」을 누르면 토스트 「검색어에 대한 결과를 찾을 수 없습니다」가 보인다', await 검색.토스트글읽기(15_000), expected.토스트);
    });
  });

  await test.case(내렸다올리기, async ({ params }) => {
    await test.step('검색 입력 화면에 검색어를 적어 둔다', async () => {
      await 검색입력화면으로(driver);
      await 검색.적기(params.검색어);
      await verify('검색 입력 칸에 적은 검색어가 보인다', await 검색.입력값(), params.검색어);
    });
    await test.step('검색어를 적다가 앱을 5초 내렸다 올린다', async () => {
      await 뒤로보냈다오기(driver, 5);
      const 남은글 = (await 될때까지(driver, () => 검색.입력칸있나(1_000), 15_000)) ? await 검색.입력값() : '';
      await verify('검색어를 적다가 앱을 내렸다 올리면 적던 검색어가 남아 있다', 남은글, params.검색어);
    });
  });

  await test.case(글주소열기, async ({ params }) => {
    let 주소 = '';
    let 조각 = '';
    await test.step('공개 글 주소를 API 로 찾는다', async () => {
      const 글 = await 사람글찾기(나!, params.사용자명, (x) => x.visibility === 'public' && x.reblog === null && x.url !== null && 본문조각(x) !== '', '본문이 있는 공개');
      주소 = 글.url ?? '';
      조각 = 본문조각(글);
    });
    await test.step('글 주소를 「마스토돈에서 URL 열기」로 연다', async () => {
      await 홈에들어가기(driver);
      await 검색.주소열기(주소);
      const 스레드 = new 글상세화면(driver);
      const 떴다 = await verify('글 스레드 화면이 보인다', await 스레드.떴나(30_000), true);
      const 그글 = await verify('그 글 본문이 보인다', await 스레드.카드.보이나(조각), true);
      await verify('글 주소를 「URL 열기」로 열면 진행 창 「링크 열기…」 뒤 그 글 스레드로 간다', 떴다 && 그글, true);
    });
  });
});
