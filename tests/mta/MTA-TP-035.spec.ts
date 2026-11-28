import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지, 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 둘러보기화면 } from './pages/explore.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

const 검색창열기 = defineCase({
  tcId: 'MTA-FN-331',
  name: '둘러보기 검색창에 「Mastodon에서 찾아보기」가 보이고 누르면 검색 입력 화면이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 둘러보기 탭을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({ 검색창글: z.string().describe('둘러보기 검색창 글').default('Mastodon에서 찾아보기') }),
});

const QR아이콘 = defineCase({
  tcId: 'MTA-UI-274',
  name: 'Google Play 서비스가 있는 폰의 둘러보기에 「QR 코드 스캔」 아이콘이 보인다',
  platforms: ['android'],
  precondition: ['둘러보기 탭이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 탭네개 = defineCase({
  tcId: 'MTA-UI-276',
  name: '둘러보기에 탭 「게시물」 · 「해시태그」 · 「소식」 · 「추천」이 보인다',
  platforms: ['android'],
  precondition: ['둘러보기 탭이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 게시물탭안내 = defineCase({
  tcId: 'MTA-UI-277',
  name: '둘러보기 「게시물」 탭에 안내 「당신이 속한 마스토돈 서버에서 관심을 끌고 있는 게시물들입니다.」와 유행 글이 보인다',
  platforms: ['android'],
  precondition: ['둘러보기 「게시물」 탭이 열려 있다'],
  params: z.object({}),
  expected: z.object({ 안내: z.string().describe('「게시물」 탭 안내').default('당신이 속한 마스토돈 서버에서 관심을 끌고 있는 게시물들입니다.') }),
});

const 해시태그탭 = defineCase({
  tcId: 'MTA-UI-278',
  name: '둘러보기 「해시태그」 탭에 유행 해시태그와 「n명이 말하고 있음」이 보인다',
  platforms: ['android'],
  precondition: ['둘러보기 탭이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const QR권한창 = defineCase({
  tcId: 'MTA-FN-562',
  name: '「QR 코드 스캔」을 누르면 이 앱의 카메라 권한 창이 뜨지 않는다',
  platforms: ['android'],
  precondition: ['둘러보기 탭이 열려 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: null,
});

const 소식빈화면 = defineCase({
  tcId: 'MTA-UI-522',
  name: '둘러보기 「소식」 탭에 자료가 없다는 안내 문구가 보인다',
  platforms: ['android'],
  precondition: ['둘러보기 탭이 열려 있다'],
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-035',
  name: '둘러보기',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [검색창열기, QR아이콘, 탭네개, 게시물탭안내, 해시태그탭, QR권한창, 소식빈화면],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 둘러보기 = new 둘러보기화면(driver);
  const 검색 = new 검색화면(driver);

  await test.case(검색창열기, async ({ expected }) => {
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('둘러보기 검색창을 누른다', async () => {
      await 둘러보기.열기();
      const 글같음 = await verify('둘러보기 검색창에 「Mastodon에서 찾아보기」가 보인다', await 둘러보기.검색창글(), expected.검색창글);
      await 둘러보기.검색창누르기();
      const 열림 = await verify('검색 입력 칸이 보인다', await 검색.입력칸있나(), true);
      await verify('둘러보기 검색창에 「Mastodon에서 찾아보기」가 보이고 누르면 검색 입력 화면이 열린다', 글같음 && 열림, true);
    });
  });

  await test.case(QR아이콘, async () => {
    await test.step('「QR 코드 스캔」 아이콘을 확인한다', async () => {
      await 홈에들어가기(driver);
      await 둘러보기.열기();
      await verify('Google Play 서비스가 있는 폰의 둘러보기에 「QR 코드 스캔」 아이콘이 보인다', await 둘러보기.QR스캔있나(10_000), true);
    });
  });

  await test.case(탭네개, async () => {
    await test.step('둘러보기 탭 줄을 확인한다', async () => {
      await 홈에들어가기(driver);
      await 둘러보기.열기();
      const 게시물 = await verify('「게시물」 탭이 보인다', await 둘러보기.탭있나('게시물', 10_000), true);
      const 해시태그 = await verify('「해시태그」 탭이 보인다', await 둘러보기.탭있나('해시태그', 10_000), true);
      const 소식 = await verify('「소식」 탭이 보인다', await 둘러보기.탭있나('소식', 10_000), true);
      const 추천 = await verify('「추천」 탭이 보인다', await 둘러보기.탭있나('추천', 10_000), true);
      await verify('둘러보기에 탭 「게시물」 · 「해시태그」 · 「소식」 · 「추천」이 보인다', 게시물 && 해시태그 && 소식 && 추천, true);
    });
  });

  await test.case(게시물탭안내, async ({ expected }) => {
    await test.step('「게시물」 탭 안내를 확인한다', async () => {
      await 홈에들어가기(driver);
      await 둘러보기.열기();
      await 둘러보기.탭누르기('게시물');
      const 안내같음 = await verify('「게시물」 탭 안내가 기대값과 같다', await 둘러보기.안내글(), expected.안내);
      const 유행글 = await verify('유행 글이 보인다', await 둘러보기.유행글있나(15_000), true);
      await verify('둘러보기 「게시물」 탭에 안내 「당신이 속한 마스토돈 서버에서 관심을 끌고 있는 게시물들입니다.」와 유행 글이 보인다', 안내같음 && 유행글, true);
    });
  });

  await test.case(해시태그탭, async () => {
    await test.step('「해시태그」 탭을 누른다', async () => {
      await 홈에들어가기(driver);
      await 둘러보기.열기();
      await 둘러보기.탭누르기('해시태그');
      const 유행태그 = await verify('유행 해시태그가 보인다', await 될때까지(driver, async () => (await 둘러보기.해시태그제목글들()).length > 0, 15_000), true);
      const 말하는수 = await verify('「n명이 말하고 있음」이 보인다', (await 둘러보기.해시태그설명글들()).some((글) => /\d+명이 말하고 있음/.test(글)), true);
      await verify('둘러보기 「해시태그」 탭에 유행 해시태그와 「n명이 말하고 있음」이 보인다', 유행태그 && 말하는수, true);
    });
  });

  await test.case(QR권한창, async () => {
    await test.step('「QR 코드 스캔」을 누른다', async () => {
      await 홈에들어가기(driver);
      await 둘러보기.열기();
      await 둘러보기.QR스캔누르기();
      await verify('「QR 코드 스캔」을 누른 뒤 둘러보기 화면이 바뀐다', await 사라질때까지(driver, 둘러보기화면.QR스캔, 15_000), true);
      await verify('「QR 코드 스캔」을 누르면 이 앱의 카메라 권한 창이 뜨지 않는다', await 둘러보기.카메라권한창뜨나(), false);
    });
  });

  await test.case(소식빈화면, async () => {
    await test.step('「소식」 탭을 눌러 빈 화면 문구를 확인한다', async () => {
      await 홈에들어가기(driver);
      await 둘러보기.열기();
      await 둘러보기.탭누르기('소식');
      await verify('둘러보기 「소식」 탭에 자료가 없다는 안내 문구가 보인다', (await 둘러보기.빈글읽기(15_000)).length > 0, true);
    });
  });
});
