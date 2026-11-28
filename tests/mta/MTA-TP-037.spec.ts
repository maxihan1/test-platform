import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 검색입력화면으로, 검색제출하기 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 서버 } from './helpers/app.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

const 검색힌트 = defineCase({
  tcId: 'MTA-UI-283',
  name: '검색 입력 화면 칸에 힌트 「Mastodon에서 찾아보기」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 검색 입력 화면을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({ 힌트: z.string().describe('검색 입력 칸 힌트').default('Mastodon에서 찾아보기') }),
});

const URL열기줄 = defineCase({
  tcId: 'MTA-FN-345',
  name: '검색에 https:// 로 시작하고 공백 없는 글을 넣으면 「마스토돈에서 URL 열기」 줄이 위에 붙는다',
  platforms: ['android'],
  precondition: ['검색 입력 화면이 열려 있다'],
  params: z.object({ 주소: z.string().min(1).describe('검색 칸에 적을 글 — https:// 로 시작하고 공백이 없는 글').default('https://mastodon.maxihan.com/@cafe_moon') }),
  expected: null,
});

const 공백주소 = defineCase({
  tcId: 'MTA-FN-346',
  name: '공백이 든 https 글을 넣으면 「마스토돈에서 URL 열기」 줄이 붙지 않는다',
  platforms: ['android'],
  precondition: ['검색 입력 화면이 열려 있다'],
  techniques: ['동등 분할'],
  params: z.object({ 주소: z.string().min(1).describe('검색 칸에 적을 글 — https:// 로 시작하고 공백이 든 글').default('https://mastodon.maxihan.com/@cafe moon') }),
  expected: null,
});

const 해시태그줄 = defineCase({
  tcId: 'MTA-FN-347',
  name: '검색에 「#카페」를 넣으면 「“#카페가 포함된 게시물들」 줄이 위에 붙는다',
  platforms: ['android'],
  precondition: ['검색 입력 화면이 열려 있다'],
  params: z.object({ 검색어: z.string().min(2).describe('검색 칸에 적을 글 — # 로 시작하는 해시태그').default('#카페') }),
  expected: null,
});

const 계정이동줄 = defineCase({
  tcId: 'MTA-FN-348',
  name: '검색에 「@cafe_moon」을 넣으면 「@cafe_moon@mastodon.maxihan.com로 이동」 줄이 위에 붙는다',
  platforms: ['android'],
  precondition: ['검색 입력 화면이 열려 있다'],
  params: z.object({ 검색어: z.string().min(2).describe('검색 칸에 적을 글 — 도메인 없는 @사용자명, 서버에 있는 계정').default('@cafe_moon') }),
  expected: null,
});

const 글자줄 = defineCase({
  tcId: 'MTA-FN-349',
  name: '검색에 「라테」를 넣으면 「“라테”가 포함된 게시물들」 · 「“라테”가 포함된 사람들」 줄이 보인다',
  platforms: ['android'],
  precondition: ['검색 입력 화면이 열려 있다'],
  params: z.object({ 검색어: z.string().min(1).describe('검색 칸에 적을 글 — 기호 없는 낱말').default('라테') }),
  expected: null,
});

const 결과탭 = defineCase({
  tcId: 'MTA-FN-350',
  name: '검색어를 넣고 잠시 있으면 결과가 「게시물」 · 「해시태그」 · 「사람」 탭으로 나뉘어 보인다',
  platforms: ['android'],
  precondition: ['검색 입력 화면이 열려 있다'],
  params: z.object({ 검색어: z.string().min(1).describe('검색 칸에 적을 글 — 기호 없는 낱말').default('카페') }),
  expected: null,
});

const 결과없음 = defineCase({
  tcId: 'MTA-FN-647',
  name: '검색 결과가 없으면 「검색어에 대한 결과를 찾을 수 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['검색 입력 화면이 열려 있다'],
  params: z.object({ 검색어: z.string().min(1).describe('검색 칸에 적을 글 — 결과가 없는 낱말').default('qa없는검색어zz') }),
  expected: z.object({ 안내: z.string().describe('결과 없음 안내').default('검색어에 대한 결과를 찾을 수 없습니다') }),
});

const 최근검색 = defineCase({
  tcId: 'MTA-FN-343',
  name: '검색 입력이 비어 있으면 최근 검색 제목 「최근앱」 · 「모두 지우기」와 「카페」가 보인다',
  platforms: ['android'],
  precondition: ['「카페」를 검색한 적이 있다'],
  params: z.object({ 검색어: z.string().min(1).describe('먼저 검색해 둘 낱말 — 기호 없는 낱말').default('카페') }),
  expected: z.object({
    제목: z.string().describe('최근 검색 제목').default('최근앱'),
    지우기: z.string().describe('최근 검색 지우기 버튼').default('모두 지우기'),
  }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-037',
  name: '검색 — 입력과 바로가기 줄',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [검색힌트, URL열기줄, 공백주소, 해시태그줄, 계정이동줄, 글자줄, 결과탭, 결과없음, 최근검색],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 검색 = new 검색화면(driver);

  await test.case(검색힌트, async ({ expected }) => {
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('검색 입력 칸 힌트를 확인한다', async () => {
      await 검색.열기();
      await verify('검색 입력 화면 칸에 힌트 「Mastodon에서 찾아보기」가 보인다', await 검색.입력값(), expected.힌트);
    });
  });

  await test.case(URL열기줄, async ({ params }) => {
    await test.step('검색 칸에 「https://mastodon.maxihan.com/@cafe_moon」을 적는다', async () => {
      await 검색입력화면으로(driver);
      await 검색.적기(params.주소);
      await verify('검색에 https:// 로 시작하고 공백 없는 글을 넣으면 「마스토돈에서 URL 열기」 줄이 위에 붙는다', await 검색.줄보일때까지('마스토돈에서 URL 열기'), true);
    });
  });

  await test.case(공백주소, async ({ params }) => {
    await test.step('검색 칸에 공백이 든 「https://mastodon.maxihan.com/@cafe moon」을 적는다', async () => {
      await 검색입력화면으로(driver);
      await 검색.적기(params.주소);
      await verify('검색 줄이 그려진다', await 될때까지(driver, async () => (await 검색.결과줄글들()).some((글) => 글.endsWith('포함된 게시물들')), 10_000), true);
      await verify('공백이 든 https 글을 넣으면 「마스토돈에서 URL 열기」 줄이 붙지 않는다', !(await 검색.결과줄글들()).includes('마스토돈에서 URL 열기'), true);
    });
  });

  await test.case(해시태그줄, async ({ params }) => {
    await test.step('검색 칸에 「#카페」를 적는다', async () => {
      await 검색입력화면으로(driver);
      await 검색.적기(params.검색어);
      await verify('검색에 「#카페」를 넣으면 「“#카페가 포함된 게시물들」 줄이 위에 붙는다', await 검색.줄보일때까지(`“${params.검색어}가 포함된 게시물들`), true);
    });
  });

  await test.case(계정이동줄, async ({ params }) => {
    await test.step('검색 칸에 도메인 없이 「@cafe_moon」을 적는다', async () => {
      await 검색입력화면으로(driver);
      await 검색.적기(params.검색어);
      await verify('검색에 「@cafe_moon」을 넣으면 「@cafe_moon@mastodon.maxihan.com로 이동」 줄이 위에 붙는다', await 검색.줄보일때까지(`${params.검색어}@${서버}로 이동`), true);
    });
  });

  await test.case(글자줄, async ({ params }) => {
    await test.step('검색 칸에 「라테」를 적는다', async () => {
      await 검색입력화면으로(driver);
      await 검색.적기(params.검색어);
      const 게시물줄 = await verify('「“라테”가 포함된 게시물들」 줄이 보인다', await 검색.줄보일때까지(`“${params.검색어}”가 포함된 게시물들`), true);
      const 사람줄 = await verify('「“라테”가 포함된 사람들」 줄이 보인다', await 검색.줄보일때까지(`“${params.검색어}”가 포함된 사람들`), true);
      await verify('검색에 「라테」를 넣으면 「“라테”가 포함된 게시물들」 · 「“라테”가 포함된 사람들」 줄이 보인다', 게시물줄 && 사람줄, true);
    });
  });

  await test.case(결과탭, async ({ params }) => {
    await test.step('검색 칸에 「카페」를 적고 기다린다', async () => {
      await 검색입력화면으로(driver);
      await 검색.적기(params.검색어);
      const 게시물탭 = await verify('「게시물」 탭이 보인다', await 검색.결과탭있나('게시물', 20_000), true);
      const 해시태그탭 = await verify('「해시태그」 탭이 보인다', await 검색.결과탭있나('해시태그', 5_000), true);
      const 사람탭 = await verify('「사람」 탭이 보인다', await 검색.결과탭있나('사람', 5_000), true);
      await verify('검색어를 넣고 잠시 있으면 결과가 「게시물」 · 「해시태그」 · 「사람」 탭으로 나뉘어 보인다', 게시물탭 && 해시태그탭 && 사람탭, true);
    });
  });

  await test.case(결과없음, async ({ params, expected }) => {
    await test.step('검색 칸에 결과가 없는 「qa없는검색어zz」를 적고 기다린다', async () => {
      await 검색입력화면으로(driver);
      await 검색.적기(params.검색어);
      await verify('검색 결과가 없으면 「검색어에 대한 결과를 찾을 수 없습니다」가 보인다', await 검색.결과없음글(20_000), expected.안내);
    });
  });

  await test.case(최근검색, async ({ params, expected }) => {
    await test.step('검색어를 검색해 최근 검색에 남긴다', async () => {
      await 검색입력화면으로(driver);
      await 검색.적기(params.검색어);
      await 검색제출하기(driver);
    });
    await test.step('검색 칸을 비운다', async () => {
      await 홈에들어가기(driver);
      await 검색.열기();
      await 검색.적기(params.검색어);
      await 검색.입력비우기();
      await 될때까지(driver, async () => (await 검색.최근제목글(1_000)) !== '', 10_000);
      const 제목 = await verify('최근 검색 제목이 「최근앱」이다', await 검색.최근제목글(), expected.제목);
      const 지우기 = await verify('최근 검색 「모두 지우기」가 보인다', await 검색.모두지우기글(), expected.지우기);
      const 남은검색어 = await verify('최근 검색에 방금 검색한 낱말이 보인다', (await 검색.결과줄글들()).includes(params.검색어), true);
      await verify('검색 입력이 비어 있으면 최근 검색 제목 「최근앱」 · 「모두 지우기」와 「카페」가 보인다', 제목 && 지우기 && 남은검색어, true);
    });
  });
});
