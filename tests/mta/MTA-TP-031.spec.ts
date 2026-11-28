import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 앱다시켜기, 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 알림제외조건창 } from './pages/notification-policy.page.js';
import { 하단탭 } from './components/tabbar.component.js';
import {
  type 계정,
  type 계정정보,
  api,
  계정꺼내기,
  관계보기,
  글쓰기,
  내글지우기,
  내정보,
  마커읽기,
  멘션보내기,
  알림들,
  좋아요,
  팔로우,
} from './helpers/api.helper.js';
import { 꾸러미 } from './helpers/app.helper.js';
import { 알림에서줄찾을때까지, 알림탭열기, 이름 } from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

const 묶음알림 = defineCase({
  tcId: 'MTA-FN-311',
  name: '여러 명이 좋아요하면 「<이름> 및 1 개 다른 즐겨찾기」로 묶여 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있고 두 번째 사용자와 가입 직후 계정이 같은 내 글을 좋아요했다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    freshId: z.string().describe('가입 직후 계정 아이디').optional().meta({ secret: true, account: '가입 직후 계정' }),
    freshPassword: z.string().describe('가입 직후 계정 비밀번호').optional().meta({ secret: true, account: '가입 직후 계정' }),
    본문: z.string().min(1).max(500).describe('API 로 올릴 내 글 — 「QA TP031」로 시작하는 500자까지').default('QA TP031 묶음 알림 글'),
  }),
  expected: null,
});

const 새글구독알림 = defineCase({
  tcId: 'MTA-FN-314',
  name: '새 글 구독 알림 「<이름> 가 방금 게시함」을 누르면 글 상세가 열린다',
  platforms: ['android'],
  precondition: ['두 번째 사용자 새 글 알림을 켜 두었고 그 사람이 글을 올렸다'],
  params: z.object({
    본문: z.string().min(1).max(500).describe('두 번째 사용자가 API 로 올릴 글 — 「QA TP031」로 시작하는 500자까지').default('QA TP031 새 글 구독 알림 글'),
  }),
  expected: null,
});

const 멘션탭유지 = defineCase({
  tcId: 'MTA-FN-303',
  name: '알림 「멘션」 탭을 골라 두고 앱을 다시 켜면 「멘션」 탭이 그대로 골라져 있다',
  platforms: ['android'],
  precondition: ['알림 「멘션」 탭을 골라 두었다'],
  params: z.object({}),
  expected: null,
});

const 이어불러오기 = defineCase({
  tcId: 'MTA-FN-329',
  name: '알림 목록 끝까지 내리면 이전 알림을 이어 불러온다',
  platforms: ['android'],
  precondition: ['알림이 한 쪽 넘게 있다'],
  params: z.object({}),
  expected: null,
});

const 읽은위치 = defineCase({
  tcId: 'MTA-FN-330',
  name: '알림 탭을 열었다가 홈으로 옮기면 서버 알림 마커에 읽은 위치가 저장된다',
  platforms: ['android'],
  held: '보류 — 알림 화면이 안 열렸다',
  precondition: ['알림 탭을 열었다'],
  params: z.object({
    본문: z.string().min(1).max(450).describe('두 번째 사용자가 API 로 멘션할 글 — 「QA TP031」로 시작하는 450자까지').default('QA TP031 읽은 위치 글'),
  }),
  expected: null,
});

const 팔로우요청알림 = defineCase({
  tcId: 'MTA-FN-308',
  name: '팔로우 요청 알림을 보면 「<이름> 님이 나에게 팔로우 요청을 보냄」과 「확정」 · 「삭제」가 보인다',
  platforms: ['android'],
  precondition: ['req_yoon 이 나에게 팔로우 요청을 보냈다'],
  params: z.object({}),
  expected: null,
});

const 팔로우요청확정 = defineCase({
  tcId: 'MTA-FN-309',
  name: '팔로우 요청 알림에서 「확정」을 누르면 요청이 수락돼 req_yoon 이 내 팔로워가 된다',
  platforms: ['android'],
  precondition: ['req_yoon 팔로우 요청 알림이 있다'],
  params: z.object({}),
  expected: null,
});

const 제외조건창 = defineCase({
  tcId: 'MTA-UI-519',
  name: '알림 제외 조건 창에 「내가 팔로우하지 않는 사람들」 · 「나를 팔로우하지 않는 사람들」 · 「새로운 계정」 · 「요청하지 않은 개인 멘션」 체크와 「저장」이 보인다',
  platforms: ['android'],
  precondition: ['알림 화면 메뉴가 열려 있다'],
  params: z.object({}),
  expected: z.object({ 저장: z.string().describe('저장 버튼 글자').default('저장') }),
});

const 운영구간없음 = defineCase({
  tcId: 'MTA-FN-324',
  name: '일반 회원이 알림 제외 조건 창을 열면 「Admin notifications」가 보이지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원의 알림 제외 조건 창이 열려 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-031',
  name: '알림 — 묶음 · 구독 · 위치',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [묶음알림, 새글구독알림, 멘션탭유지, 이어불러오기, 팔로우요청알림, 팔로우요청확정, 운영구간없음, 제외조건창, 읽은위치],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 상세 = new 글상세화면(driver);
  const 창 = new 알림제외조건창(driver);
  let 나: 계정 | undefined;
  let 둘째: 계정 | undefined;
  let 새글알림켰음 = false;
  let 요청줄글자 = '';

  const 제외조건창열기 = async (): Promise<void> => {
    const 알림 = await 알림탭열기(driver);
    await 알림.제외조건누르기();
    if (!(await 창.떴나(10_000))) throw new Error('알림 제외 조건 창이 안 열렸다');
  };

  await test.cleanup('이 흐름이 올린 글과 바꾼 알림 설정을 되돌린다', async () => {
    if (나 !== undefined) {
      await 내글지우기(나, 'QA TP031');
      if (새글알림켰음) await 팔로우(나, 'qa_user2', false);
    }
    if (둘째 !== undefined) {
      await 내글지우기(둘째, 'QA TP031');
      await 내글지우기(둘째, '@qa_user1 QA TP031');
    }
  });

  await test.case(묶음알림, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    const 신규 = 계정꺼내기(params.freshId, params.freshPassword, '가입 직후 계정');
    const 둘째정보 = await 내정보(둘째);
    const 신규정보 = await 내정보(신규);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 내글지우기(나!, 'QA TP031');
      await 내글지우기(둘째!, 'QA TP031');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('두 번째 사용자와 가입 직후 계정이 API 로 내 글을 좋아요한다', async () => {
      const 올린글 = await 글쓰기(나!, params.본문);
      await 좋아요(둘째!, 올린글.id);
      await 좋아요(신규, 올린글.id);
      const 알림 = await 알림탭열기(driver);
      await verify('알림에 묶인 좋아요 알림이 보인다', await 알림에서줄찾을때까지(driver, ' 및 1 개 다른 즐겨찾기'), true, { blocker: true });
      await verify('알림 화면이 열려 있다', await 알림.떴나(), true, { blocker: true });
    });
    await test.step('여러 명이 좋아요한 알림을 확인한다', async () => {
      const 알림 = await 알림탭열기(driver);
      const 줄 = await 알림.줄글(' 및 1 개 다른 즐겨찾기');
      await verify(
        '여러 명이 좋아요하면 「<이름> 및 1 개 다른 즐겨찾기」로 묶여 보인다',
        줄 === `${이름(둘째정보)} 및 1 개 다른 즐겨찾기` || 줄 === `${이름(신규정보)} 및 1 개 다른 즐겨찾기`,
        true,
      );
    });
  });

  await test.case(새글구독알림, async ({ params }) => {
    const 둘째정보 = await 내정보(둘째!);
    const 줄글자 = `${이름(둘째정보)} 가 방금 게시함`;
    await test.step('두 번째 사용자 새 글 알림을 켜고 그 사람이 API 로 글을 올린다', async () => {
      await 팔로우(나!, 'qa_user2', true);
      새글알림켰음 = true;
      await 글쓰기(둘째!, params.본문);
      const 알림 = await 알림탭열기(driver);
      await verify('알림에 새 글 구독 알림이 보인다', await 알림에서줄찾을때까지(driver, 줄글자), true, { blocker: true });
      await verify('알림 화면이 열려 있다', await 알림.떴나(), true, { blocker: true });
    });
    await test.step('새 글 구독 알림을 누른다', async () => {
      const 알림 = await 알림탭열기(driver);
      await 알림.줄누르기(줄글자);
      await verify('새 글 구독 알림 「<이름> 가 방금 게시함」을 누르면 글 상세가 열린다', await 상세.떴나(), true);
      await 상세.뒤로();
    });
  });

  await test.case(멘션탭유지, async () => {
    await test.step('알림 「멘션」 탭을 골라 둔다', async () => {
      const 알림 = await 알림탭열기(driver);
      await 알림.탭누르기('멘션');
      await verify('「멘션」 탭이 골라져 있다', await 알림.탭골라질때까지('멘션'), true, { blocker: true });
    });
    await test.step('앱을 껐다가 다시 켜 알림 탭을 연다', async () => {
      await 앱다시켜기(driver, 꾸러미);
      const 알림 = await 알림탭열기(driver);
      await verify('알림 「멘션」 탭을 골라 두고 앱을 다시 켜면 「멘션」 탭이 그대로 골라져 있다', await 알림.탭골라졌나('멘션'), true);
      await 알림.탭누르기('모든 것');
    });
  });

  await test.case(이어불러오기, async () => {
    await test.step('알림이 한 쪽 넘게 있는지 본다', async () => {
      if ((await 알림들(나!)).length <= 20) throw new Error('알림이 한 쪽(20건)을 넘지 않는다');
    });
    await test.step('알림 목록을 끝까지 내린다', async () => {
      const 알림 = await 알림탭열기(driver);
      await verify('알림 목록 끝까지 내리면 이전 알림을 이어 불러온다', await 알림.끝까지내리기(25), true);
    });
  });

  await test.case(팔로우요청알림, async () => {
    await test.step('req_yoon 의 팔로우 요청을 API 로 확인하고 알림을 연다', async () => {
      const 요청들 = await api<계정정보[]>(나!, 'GET', '/api/v1/follow_requests');
      const 요청 = 요청들.find((x) => x.username === 'req_yoon');
      if (요청 === undefined) throw new Error('req_yoon 의 팔로우 요청이 없다');
      요청줄글자 = `${이름(요청)} 님이 나에게 팔로우 요청을 보냄`;
      const 알림 = await 알림탭열기(driver);
      await verify('알림에 팔로우 요청 알림이 보인다', await 알림에서줄찾을때까지(driver, 요청줄글자), true, { blocker: true });
      await verify('알림 화면이 열려 있다', await 알림.떴나(), true, { blocker: true });
    });
    await test.step('팔로우 요청 알림을 확인한다', async () => {
      const 알림 = await 알림탭열기(driver);
      const 줄 = await verify('「<이름> 님이 나에게 팔로우 요청을 보냄」이 보인다', await 알림.줄있나(요청줄글자, 10_000), true);
      const 확정 = await verify('「확정」이 보인다', await 알림.줄버튼있나(요청줄글자, '확정'), true);
      const 삭제 = await verify('「삭제」가 보인다', await 알림.줄버튼있나(요청줄글자, '삭제'), true);
      await verify('팔로우 요청 알림을 보면 「<이름> 님이 나에게 팔로우 요청을 보냄」과 「확정」 · 「삭제」가 보인다', 줄 && 확정 && 삭제, true);
    });
  });

  await test.case(팔로우요청확정, async () => {
    await test.step('팔로우 요청 알림이 있는지 보고 없으면 알림을 다시 연다', async () => {
      const 알림 = await 알림탭열기(driver);
      if (!(await 알림.줄있나(요청줄글자, 10_000))) throw new Error('팔로우 요청 알림이 안 보인다');
    });
    await test.step('팔로우 요청 알림에서 「확정」을 누른다', async () => {
      const 알림 = await 알림탭열기(driver);
      await 알림.줄버튼누르기(요청줄글자, '확정');
      await verify(
        '팔로우 요청 알림에서 「확정」을 누르면 요청이 수락돼 req_yoon 이 내 팔로워가 된다',
        await 될때까지(driver, async () => (await 관계보기(나!, 'req_yoon')).followed_by, 30_000),
        true,
      );
    });
  });

  await test.case(운영구간없음, async () => {
    await test.step('일반 회원의 알림 제외 조건 창이 열려 있는지 보고 닫혀 있으면 연다', async () => {
      if (!(await 창.떴나(2_000))) await 제외조건창열기();
    });
    await test.step('일반 회원 창에서 운영 구간 자리를 확인한다', async () => {
      await verify('일반 회원이 알림 제외 조건 창을 열면 「Admin notifications」가 보이지 않는다', await 창.항목있나('Admin notifications', 2_000), false);
      await 창.닫기();
    });
  });

  await test.case(제외조건창, async ({ expected }) => {
    await test.step('알림 화면 메뉴를 열어 둔다', async () => {
      await 알림탭열기(driver);
    });
    await test.step('「알림 제외 조건…」을 누른다', async () => {
      const 알림 = await 알림탭열기(driver);
      await 알림.제외조건누르기();
      const 열림 = await verify('알림 제외 조건 창이 뜬다', await 창.떴나(), true);
      const 팔로우안함 = await verify('「내가 팔로우하지 않는 사람들」이 보인다', await 창.항목있나('내가 팔로우하지 않는 사람들'), true);
      const 나를안함 = await verify('「나를 팔로우하지 않는 사람들」이 보인다', await 창.항목있나('나를 팔로우하지 않는 사람들'), true);
      const 새계정 = await verify('「새로운 계정」이 보인다', await 창.항목있나('새로운 계정'), true);
      const 개인멘션 = await verify('「요청하지 않은 개인 멘션」이 보인다', await 창.항목있나('요청하지 않은 개인 멘션'), true);
      const 저장 = await verify('「저장」이 보인다', await 창.저장글(), expected.저장);
      await verify(
        '알림 제외 조건 창에 「내가 팔로우하지 않는 사람들」 · 「나를 팔로우하지 않는 사람들」 · 「새로운 계정」 · 「요청하지 않은 개인 멘션」 체크와 「저장」이 보인다',
        열림 && 팔로우안함 && 나를안함 && 새계정 && 개인멘션 && 저장,
        true,
      );
    });
  });

  await test.case(읽은위치, async ({ params }) => {
    let 최신id = '';
    await test.step('두 번째 사용자가 API 로 나를 멘션해 새 알림을 만든다', async () => {
      await 멘션보내기(둘째!, 'qa_user1', params.본문);
      최신id = (await 알림들(나!))[0]?.id ?? '';
      const 알림 = await 알림탭열기(driver);
      await verify('알림에 새 멘션 알림이 보인다', await 알림에서줄찾을때까지(driver, params.본문), true, { blocker: true });
      await verify('알림 화면이 열려 있다', await 알림.떴나(), true, { blocker: true });
    });
    await test.step('알림 탭을 연 뒤 홈으로 옮긴다', async () => {
      await new 하단탭(driver).누르기('홈');
      await verify(
        '알림 탭을 열었다가 홈으로 옮기면 서버 알림 마커에 읽은 위치가 저장된다',
        await 될때까지(driver, async () => (await 마커읽기(나!, 'notifications'))?.last_read_id === 최신id, 30_000),
        true,
      );
    });
  });
});
