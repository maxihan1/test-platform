import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 뒤로보냈다오기, 뜰때까지, 사라질때까지, 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 하단탭 } from './components/tabbar.component.js';
import { type 계정, 계정꺼내기, 글쓰기, 내글지우기, 멘션보내기 } from './helpers/api.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 계정전환시트 } from './pages/account-switcher.page.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

const 하단탭네개 = defineCase({
  tcId: 'MTA-UI-001',
  name: '하단 탭에 「홈」 · 「둘러보기」 · 「알림」 · 「프로필」 네 개가 보이고 「홈」이 선택돼 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 홈에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

const 둘러보기설명 = defineCase({
  tcId: 'MTA-UI-002',
  name: '하단 「둘러보기」 탭의 접근성 설명이 「검색」으로 보인다',
  platforms: ['android'],
  precondition: ['홈에 있다'],
  params: z.object({}),
  expected: z.object({ 설명: z.string().describe('둘러보기 탭 접근성 설명').default('검색') }),
});

const 프로필아바타 = defineCase({
  tcId: 'MTA-UI-004',
  name: '하단 「프로필」 탭 아이콘에 내 아바타가 보인다',
  platforms: ['android'],
  precondition: ['홈에 있다'],
  params: z.object({}),
  expected: null,
});

const 홈제목 = defineCase({
  tcId: 'MTA-UI-106',
  name: '홈 상단 제목에 「홈」과 드롭다운 화살표가 보인다',
  platforms: ['android'],
  precondition: ['홈에 있다'],
  params: z.object({}),
  expected: z.object({ 제목: z.string().describe('홈 상단 제목').default('홈') }),
});

const 계정전환 = defineCase({
  tcId: 'MTA-FN-005',
  name: '「프로필」 탭을 길게 누르면 계정 전환 시트가 뜬다',
  platforms: ['android'],
  precondition: ['홈에 있다'],
  params: z.object({}),
  expected: null,
});

const 설정열기 = defineCase({
  tcId: 'MTA-FN-137',
  name: '홈 상단 설정 아이콘을 누르면 설정 화면이 열린다',
  platforms: ['android'],
  precondition: ['홈에 있다'],
  params: z.object({}),
  expected: null,
});

const 글쓰기열기 = defineCase({
  tcId: 'MTA-FN-139',
  name: '홈 오른쪽 아래 글쓰기 버튼을 누르면 글쓰기 화면이 열린다',
  platforms: ['android'],
  precondition: ['홈에 있다'],
  params: z.object({}),
  expected: null,
});

const 탭다시누르기 = defineCase({
  tcId: 'MTA-FN-129',
  name: '선택된 하단 탭을 다시 누르면 목록 맨 위로 이동한다',
  platforms: ['android'],
  precondition: ['홈 목록을 아래로 내려 두었다'],
  params: z.object({}),
  expected: null,
});

const 당겨새로고침 = defineCase({
  tcId: 'MTA-FN-142',
  name: '홈을 당겨서 새로고침하면 방금 쓴 글을 불러와 맨 위에 보인다',
  platforms: ['android'],
  precondition: ['내가 방금 쓴 글이 서버에 있다'],
  params: z.object({ 본문: z.string().min(1).max(500).describe('API 로 올릴 글 — 「QA TP009 새로고침」으로 시작').default('QA TP009 새로고침') }),
  expected: null,
});

const 알림배지 = defineCase({
  tcId: 'MTA-FN-003',
  name: '안 읽은 알림이 있으면 「알림」 탭 배지에 안 읽은 알림 수가 보인다',
  platforms: ['android'],
  precondition: ['두 번째 사용자가 나를 멘션해 안 읽은 알림이 있다', '안 읽은 알림이 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-009',
  name: '하단 탭과 홈 머리',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [하단탭네개, 둘러보기설명, 프로필아바타, 홈제목, 계정전환, 설정열기, 글쓰기열기, 탭다시누르기, 당겨새로고침, 알림배지],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 탭 = new 하단탭(driver);
  let 나: 계정 | undefined;
  let 둘째: 계정 | undefined;

  await test.cleanup('이 흐름이 올린 글을 지운다', async () => {
    if (나 !== undefined) await 내글지우기(나, 'QA TP009');
    if (둘째 !== undefined) await 내글지우기(둘째, '@qa_user1 QA TP009');
  });

  await test.case(하단탭네개, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 내글지우기(나!, 'QA TP009');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('하단 탭을 확인한다', async () => {
      const 홈있음 = await verify('하단 「홈」 탭이 보인다', await 뜰때까지(driver, 하단탭.홈, 5_000), true);
      const 둘러보기있음 = await verify('하단 「둘러보기」 탭이 보인다', await 뜰때까지(driver, 하단탭.둘러보기, 5_000), true);
      const 알림있음 = await verify('하단 「알림」 탭이 보인다', await 뜰때까지(driver, 하단탭.알림, 5_000), true);
      const 프로필있음 = await verify('하단 「프로필」 탭이 보인다', await 뜰때까지(driver, 하단탭.프로필, 5_000), true);
      const 홈선택 = await verify('하단 「홈」 탭이 선택돼 있다', await 탭.선택됐나('홈'), true);
      await verify(
        '하단 탭에 「홈」 · 「둘러보기」 · 「알림」 · 「프로필」 네 개가 보이고 「홈」이 선택돼 보인다',
        홈있음 && 둘러보기있음 && 알림있음 && 프로필있음 && 홈선택,
        true,
      );
    });
  });

  await test.case(둘러보기설명, async ({ expected }) => {
    await test.step('「둘러보기」 탭 접근성 설명을 확인한다', async () => {
      await verify('하단 「둘러보기」 탭의 접근성 설명이 「검색」으로 보인다', await 탭.탭설명('둘러보기'), expected.설명);
    });
  });

  await test.case(프로필아바타, async () => {
    await test.step('「프로필」 탭 아이콘을 확인한다', async () => {
      await verify('하단 「프로필」 탭 아이콘에 내 아바타가 보인다', await 뜰때까지(driver, 하단탭.프로필아바타, 5_000), true);
    });
  });

  await test.case(홈제목, async ({ expected }) => {
    await test.step('홈 상단 제목을 확인한다', async () => {
      const 제목같음 = await verify('홈 상단 제목이 기대값과 같다', await 홈.제목(), expected.제목);
      const 고르개 = await verify('홈 상단 제목이 드롭다운 고르개다', await 홈.제목고르개있나(), true);
      await verify('홈 상단 제목에 「홈」과 드롭다운 화살표가 보인다', 제목같음 && 고르개, true);
    });
  });

  await test.case(계정전환, async () => {
    await test.step('「프로필」 탭을 길게 누른다', async () => {
      await 홈에들어가기(driver);
      await 탭.프로필길게누르기();
      await verify('「프로필」 탭을 길게 누르면 계정 전환 시트가 뜬다', await new 계정전환시트(driver).떴나(), true);
    });
  });

  await test.case(설정열기, async () => {
    await test.step('홈 상단 설정 아이콘을 누른다', async () => {
      await 홈에들어가기(driver);
      await 홈.설정누르기();
      await verify('홈 상단 설정 아이콘을 누르면 설정 화면이 열린다', await new 설정화면(driver).떴나(), true);
    });
  });

  await test.case(글쓰기열기, async () => {
    await test.step('홈 오른쪽 아래 글쓰기 버튼을 누른다', async () => {
      await 홈에들어가기(driver);
      await 홈.글쓰기누르기();
      await verify('홈 오른쪽 아래 글쓰기 버튼을 누르면 글쓰기 화면이 열린다', await new 글쓰기화면(driver).새게시물떴나(), true);
    });
  });

  await test.case(탭다시누르기, async () => {
    let 처음글 = '';
    await test.step('홈 목록을 아래로 내린다', async () => {
      await 홈에들어가기(driver);
      처음글 = await 홈.맨위글본문();
      await 홈.아래로내리기(3);
      await verify('홈 목록이 내려가 맨 위 글이 바뀌었다', await 될때까지(driver, async () => (await 홈.맨위글본문()) !== 처음글, 10_000), true, { blocker: true });
    });
    await test.step('선택된 「홈」 탭을 다시 누른다', async () => {
      await 탭.누르기('홈');
      await verify('선택된 하단 탭을 다시 누르면 목록 맨 위로 이동한다', await 홈.맨위에올때까지(처음글.slice(0, 20), 15_000), true);
    });
  });

  await test.case(당겨새로고침, async ({ params }) => {
    await test.step('API 로 새 글을 올린다', async () => {
      await 글쓰기(나!, params.본문);
      await 홈에들어가기(driver);
    });
    await test.step('홈을 당겨서 새로고침한다', async () => {
      await verify('홈을 당겨서 새로고침하면 방금 쓴 글을 불러와 맨 위에 보인다', await 홈.새로고침해맨위에올때까지(params.본문), true);
    });
  });

  await test.case(알림배지, async ({ params }) => {
    둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    await test.step('두 번째 사용자가 API 로 나를 멘션한다', async () => {
      await 멘션보내기(둘째!, 'qa_user1', 'QA TP009 배지');
      await 홈에들어가기(driver);
    });
    await test.step('안 읽은 알림이 있을 때 「알림」 탭 배지를 확인한다', async () => {
      const 떴다 = await 될때까지(
        driver,
        async () => {
          await 뒤로보냈다오기(driver, 3);
          return 뜰때까지(driver, 하단탭.알림배지, 8_000);
        },
        60_000,
      );
      await verify('안 읽은 알림이 있으면 「알림」 탭 배지에 안 읽은 알림 수가 보인다', 떴다, true);
    });
    await test.step('「알림」 탭을 열어 알림을 읽는다', async () => {
      await 탭.누르기('알림');
      await 탭.누르기('홈');
      await verify('알림을 다 읽은 뒤 「알림」 탭 배지가 숨겨진다', await 사라질때까지(driver, 하단탭.알림배지, 15_000), true);
    });
  });
});
