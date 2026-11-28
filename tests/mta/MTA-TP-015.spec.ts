import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글카드 } from './components/status-card.component.js';
import { type 계정, 계정꺼내기, 글쓰기, 내글지우기, 사람글찾기, 투표하기 } from './helpers/api.helper.js';
import { 결과버튼글이될때까지, 카드글자, 투표버튼켜질때까지, 프로필열고글찾기, 화면글자포함있나, 친구목록에서글찾기 } from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

const 투표카드모양 = defineCase({
  tcId: 'MTA-UI-134',
  name: '투표 카드에 항목 · 「투표」 · 「결과 보기」 · 「n 투표」 · 「n시간 남았습니다」가 보인다',
  platforms: ['android'],
  precondition: [
    '두 번째 사용자가 단일 · 다중 선택 투표 글과 마감된 투표 글을 올렸다',
    '두 번째 사용자의 다중 선택 투표 글이 있다',
    'minjun_dev 의 마감된 투표 글이 있다',
  ],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    단일본문: z.string().min(1).max(400).describe('단일 선택 투표 글 — 「QA TP015」로 시작하는 400자까지').default('QA TP015 단일 투표'),
    다중본문: z.string().min(1).max(400).describe('다중 선택 투표 글 — 「QA TP015」로 시작하는 400자까지').default('QA TP015 다중 투표'),
  }),
  expected: z.object({
    투표글: z.string().describe('투표 버튼 글자').default('투표'),
    결과글: z.string().describe('결과 보기 버튼 글자').default('결과 보기'),
  }),
});

const 투표켜짐 = defineCase({
  tcId: 'MTA-FN-161',
  name: '투표 카드에서 항목을 고르기 전이면 「투표」가 꺼져 있다',
  platforms: ['android'],
  precondition: ['두 번째 사용자의 단일 투표 글이 있다', '내가 이미 투표한 두 번째 사용자의 투표 글이 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    투표전본문: z.string().min(1).max(400).describe('투표하지 않은 투표 글 — 「QA TP015」로 시작하는 400자까지').default('QA TP015 투표 글 가'),
    투표후본문: z.string().min(1).max(400).describe('내가 투표할 투표 글 — 「QA TP015」로 시작하는 400자까지').default('QA TP015 투표 글 나'),
  }),
  expected: z.object({ 고를항목: z.string().describe('고를 투표 항목').default('사과') }),
});

const 결과보기 = defineCase({
  tcId: 'MTA-FN-162',
  name: '투표 전 「결과 보기」를 누르면 「결과 숨기기」로 바뀐다',
  platforms: ['android'],
  precondition: ['두 번째 사용자의 단일 투표 글이 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    본문: z.string().min(1).max(400).describe('투표 글 — 「QA TP015」로 시작하는 400자까지').default('QA TP015 결과 보기 투표'),
  }),
  expected: z.object({ 바뀐글: z.string().describe('결과 보기를 누른 뒤 버튼 글자').default('결과 숨기기') }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-015',
  name: '글 카드 — 투표',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [투표카드모양, 투표켜짐, 결과보기],
});

const 투표항목 = ['사과', '배'];
const 하루초 = 86_400;

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  let 나: 계정 | undefined;
  let 둘째: 계정 | undefined;

  await test.cleanup('두 번째 사용자가 올린 투표 글을 지운다', async () => {
    if (둘째 !== undefined) await 내글지우기(둘째, 'QA TP015');
  });

  await test.case(투표카드모양, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    const 마감글 = await 사람글찾기(나, 'minjun_dev', (x) => x.reblog === null && x.poll !== null && x.poll.expired, '마감된 투표');
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 내글지우기(둘째!, 'QA TP015');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('두 번째 사용자가 API 로 단일 · 다중 선택 투표 글을 올린다', async () => {
      await 글쓰기(둘째!, params.단일본문, { poll: { options: 투표항목, expires_in: 하루초 } });
      await 글쓰기(둘째!, params.다중본문, { poll: { options: 투표항목, expires_in: 하루초, multiple: true } });
      await 홈에들어가기(driver);
      await 친구목록에서글찾기(driver, params.다중본문);
    });
    await test.step('진행 중 단일 투표 카드를 확인한다', async () => {
      await 카드.찾을때까지내리기(params.단일본문);
      const 줄들 = await 카드.투표줄글들(params.단일본문);
      const 버튼들 = await 카드.카드안글들(params.단일본문, 'vote_btn');
      const 첫항목 = await verify('투표 카드에 항목 「사과」가 보인다', 줄들.includes(투표항목[0]!), true);
      const 둘째항목 = await verify('투표 카드에 항목 「배」가 보인다', 줄들.includes(투표항목[1]!), true);
      const 투표버튼 = await verify('투표 카드에 「투표」가 보인다', 버튼들.includes(expected.투표글), true);
      const 결과버튼 = await verify('투표 카드에 「결과 보기」가 보인다', await 카드.결과버튼글(params.단일본문), expected.결과글);
      const 투표수 = await verify('투표 카드에 「n 투표」가 보인다', 줄들.some((글) => /\d+ 투표/.test(글)), true);
      const 남은시간 = await verify('투표 카드에 「n시간 남았습니다」가 보인다', 줄들.some((글) => /\d+시간 남았습니다/.test(글)), true);
      await verify(
        '투표 카드에 항목 · 「투표」 · 「결과 보기」 · 「n 투표」 · 「n시간 남았습니다」가 보인다',
        첫항목 && 둘째항목 && 투표버튼 && 결과버튼 && 투표수 && 남은시간,
        true,
      );
    });
    await test.step('다중 선택 투표 카드를 확인한다', async () => {
      await verify('다중 선택 투표 카드에 「한 개 혹은 여러 개를 선택하세요」가 보인다', await 화면글자포함있나(driver, '한 개 혹은 여러 개를 선택하세요'), true);
    });
    await test.step('minjun_dev 프로필에서 마감된 투표 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'minjun_dev', 카드글자(마감글));
    });
    await test.step('마감된 투표 카드를 확인한다', async () => {
      const 줄들 = await 카드.투표줄글들(카드글자(마감글));
      await verify('마감된 투표 카드에 「마감됨」이 보인다', 줄들.some((글) => 글.includes('마감됨')), true);
    });
  });

  await test.case(투표켜짐, async ({ params, expected }) => {
    둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    await test.step('두 번째 사용자가 API 로 투표 글 둘을 올리고 하나에 투표한다', async () => {
      await 글쓰기(둘째!, params.투표전본문, { poll: { options: 투표항목, expires_in: 하루초 } });
      const 투표후 = await 글쓰기(둘째!, params.투표후본문, { poll: { options: 투표항목, expires_in: 하루초 } });
      await 투표하기(나!, 투표후.poll!.id, [0]);
      await 홈에들어가기(driver);
      await 친구목록에서글찾기(driver, params.투표후본문);
    });
    await test.step('항목을 고르기 전 「투표」를 확인한다', async () => {
      await 카드.찾을때까지내리기(params.투표전본문);
      await verify('투표 카드에서 항목을 고르기 전이면 「투표」가 꺼져 있다', await 카드.투표버튼켜졌나(params.투표전본문), false);
    });
    await test.step('투표 항목 하나를 고른다', async () => {
      await 카드.투표항목누르기(params.투표전본문, expected.고를항목);
      await verify('투표 항목을 고른 뒤 「투표」가 켜진다', await 투표버튼켜질때까지(driver, params.투표전본문), true);
    });
    await test.step('이미 투표한 투표 카드를 확인한다', async () => {
      await 카드.찾을때까지내리기(params.투표후본문);
      await verify('이미 투표한 투표 카드의 「투표」는 꺼져 있다', await 카드.투표버튼켜졌나(params.투표후본문), false);
    });
  });

  await test.case(결과보기, async ({ params, expected }) => {
    둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    await test.step('두 번째 사용자가 API 로 새 단일 투표 글을 올린다', async () => {
      await 글쓰기(둘째!, params.본문, { poll: { options: 투표항목, expires_in: 하루초 } });
      await 홈에들어가기(driver);
      await 친구목록에서글찾기(driver, params.본문);
    });
    await test.step('투표 카드에서 「결과 보기」를 누른다', async () => {
      await 카드.결과버튼누르기(params.본문);
      await verify('투표 전 「결과 보기」를 누르면 「결과 숨기기」로 바뀐다', await 결과버튼글이될때까지(driver, params.본문, expected.바뀐글), true);
    });
  });
});
