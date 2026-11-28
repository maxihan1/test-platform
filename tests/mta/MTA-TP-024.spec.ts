import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 내글지우기 } from './helpers/api.helper.js';
import { 내글들, 새글쓰기열기, 올라온글기다리기 } from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 공개범위시트 } from './pages/visibility-sheet.page.js';

const 시트구성 = defineCase({
  tcId: 'MTA-UI-204',
  name: '공개 범위 시트 「공개 범위 및 상호작용」에 「공개」 · 「제한적 공개」 · 「팔로워」 · 「개인 멘션」, 「모든 사용자」 · 「팔로워만」 · 「본인만」, 「취소」 · 「저장」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 새 글쓰기 화면을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

const 줄설명 = defineCase({
  tcId: 'MTA-UI-205',
  name: '공개 범위 시트에 「마스토돈 검색 결과, 트렌딩, 공개 타임라인에서 숨김」 · 「오직 팔로우 중인 사람들에게만」 · 「게시물에 반응한 사람들에게만」 설명이 보인다',
  platforms: ['android'],
  precondition: ['공개 범위 시트가 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 시트위설명 = defineCase({
  tcId: 'MTA-UI-206',
  name: '공개 범위 시트 위에 영어 설명 「Control who can interact with this post.」가 보인다',
  platforms: ['android'],
  precondition: ['공개 범위 시트가 열려 있다'],
  params: z.object({}),
  expected: z.object({ 설명: z.string().describe('시트 위 영어 설명').default('Control who can interact with this post.') }),
});

const 제한적공개고르기 = defineCase({
  tcId: 'MTA-FN-257',
  name: '공개 범위 시트에서 「제한적 공개」를 고르면 「다른 사용자가 회원님을 인용할 때, 해당 게시물은 트렌딩 타임라인에서 숨겨집니다.」 설명이 붙는다',
  platforms: ['android'],
  precondition: ['공개 범위 시트가 열려 있다'],
  params: z.object({}),
  expected: z.object({ 설명: z.string().describe('제한적 공개를 골랐을 때 붙는 설명').default('다른 사용자가 회원님을 인용할 때, 해당 게시물은 트렌딩 타임라인에서 숨겨집니다.') }),
});

const 팔로워고르기 = defineCase({
  tcId: 'MTA-FN-255',
  name: '공개 범위 시트에서 「팔로워」를 고르면 인용 정책이 「본인만」으로 잠기고 「마스토돈에서 작성된 팔로워 전용 게시물은 다른 사용자가 인용할 수 없습니다.」 설명이 붙는다',
  platforms: ['android'],
  precondition: ['공개 범위 시트가 열려 있다'],
  params: z.object({}),
  expected: z.object({
    정책: z.string().describe('팔로워를 골랐을 때 잠기는 인용 정책').default('본인만'),
    설명: z.string().describe('팔로워를 골랐을 때 붙는 설명').default('마스토돈에서 작성된 팔로워 전용 게시물은 다른 사용자가 인용할 수 없습니다.'),
  }),
});

const 잠긴정책 = defineCase({
  tcId: 'MTA-FN-256',
  name: '팔로워 공개에서 「모든 사용자」를 누르면 인용 정책이 「본인만」에서 바뀌지 않는다',
  platforms: ['android'],
  precondition: ['공개 범위 시트에서 「팔로워」를 골랐다'],
  techniques: ['동등 분할', '상태 전이'],
  params: z.object({}),
  expected: z.object({ 정책: z.string().describe('잠긴 인용 정책').default('본인만') }),
});

const 공개저장 = defineCase({
  tcId: 'MTA-FN-254',
  name: '「공개」 · 「모든 사용자」로 저장하면 도구 줄 공개 범위 버튼이 「공개, 누구나 인용 가능」으로 보인다',
  platforms: ['android'],
  precondition: ['공개 범위 시트가 열려 있다'],
  params: z.object({}),
  expected: z.object({ 버튼글: z.string().describe('저장한 뒤 공개 범위 버튼 글').default('공개, 누구나 인용 가능') }),
});

const 닫기확인 = defineCase({
  tcId: 'MTA-FN-267',
  name: '내용이 있는 글쓰기를 닫으면 「작성 중인 글을 지우시겠습니까?」 창과 「지우기」 · 「취소」가 뜬다',
  platforms: ['android'],
  precondition: ['새 글쓰기 본문에 글이 적혀 있다'],
  params: z.object({ 본문: z.string().min(1).max(500).describe('본문에 적을 글 — 비어 있지 않은 글').default('QA TP024 닫기 확인') }),
  expected: z.object({
    지우기: z.string().describe('창의 확인 버튼 글').default('지우기'),
    취소: z.string().describe('창의 취소 버튼 글').default('취소'),
  }),
});

const 빈글뒤로 = defineCase({
  tcId: 'MTA-FN-270',
  name: '내용이 없는 글쓰기에서 뒤로 가기를 누르면 확인 창 없이 바로 닫힌다',
  platforms: ['android'],
  precondition: ['새 글쓰기 본문이 비어 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: null,
});

const 두번게시 = defineCase({
  tcId: 'MTA-FN-265',
  name: '「게시」를 빠르게 두 번 누르면 같은 글은 한 번만 올라간다',
  platforms: ['android'],
  precondition: ['새 글쓰기 본문에 「QA 중복 방지」로 시작하는 글이 적혀 있다'],
  techniques: ['동등 분할'],
  params: z.object({ 본문: z.string().min(1).max(500).describe('올릴 글 — 「QA 중복 방지」로 시작하는 500자까지').default('QA 중복 방지 빠르게 두 번 누르기') }),
  expected: z.object({ 올라간수: z.number().describe('같은 글이 올라간 수').default(1) }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-024',
  name: '글쓰기 — 공개 범위와 게시',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [시트구성, 줄설명, 시트위설명, 제한적공개고르기, 팔로워고르기, 잠긴정책, 공개저장, 닫기확인, 빈글뒤로, 두번게시],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 시트 = new 공개범위시트(driver);
  let 나: 계정 | undefined;

  const 시트열기 = async (): Promise<void> => {
    if (await 시트.떴나(3_000)) return;
    if (!(await 글쓰기.새게시물떴나(2_000))) await 새글쓰기열기(driver);
    await 글쓰기.공개범위누르기();
    if (!(await 시트.떴나(10_000))) throw new Error('공개 범위 시트가 안 열렸다');
  };

  await test.cleanup('이 흐름이 올린 글을 지운다', async () => {
    if (나 === undefined) return;
    await 내글지우기(나, 'QA TP024');
    await 내글지우기(나, 'QA 중복 방지');
  });

  await test.case(시트구성, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어가 새 글쓰기 화면을 연다', async () => {
      await 내글지우기(나!, 'QA TP024');
      await 내글지우기(나!, 'QA 중복 방지');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      await 새글쓰기열기(driver);
      await verify('새 글쓰기 화면이 보인다', await 글쓰기.새게시물떴나(), true, { blocker: true });
    });
    await test.step('공개 범위 버튼을 누른다', async () => {
      await 글쓰기.공개범위누르기();
      const 떴다 = await verify('공개 범위 시트 「공개 범위 및 상호작용」이 보인다', await 시트.떴나(), true);
      await 시트.범위열기();
      const 범위들 = await 시트.줄글들();
      const 공개 = await verify('공개 범위 시트에 「공개」가 보인다', 범위들.includes('공개'), true);
      const 제한적 = await verify('공개 범위 시트에 「제한적 공개」가 보인다', 범위들.includes('제한적 공개'), true);
      const 팔로워 = await verify('공개 범위 시트에 「팔로워」가 보인다', 범위들.includes('팔로워'), true);
      const 멘션 = await verify('공개 범위 시트에 「개인 멘션」이 보인다', 범위들.includes('개인 멘션'), true);
      await 시트.줄창닫기();
      await 시트.인용정책열기();
      const 정책들 = await 시트.줄글들();
      const 모든 = await verify('공개 범위 시트에 「모든 사용자」가 보인다', 정책들.includes('모든 사용자'), true);
      const 팔로워만 = await verify('공개 범위 시트에 「팔로워만」이 보인다', 정책들.includes('팔로워만'), true);
      const 본인만 = await verify('공개 범위 시트에 「본인만」이 보인다', 정책들.includes('본인만'), true);
      await 시트.줄창닫기();
      const 버튼 = await verify('공개 범위 시트에 「취소」 · 「저장」이 보인다', await 시트.취소저장있나(), true);
      await verify(
        '공개 범위 시트 「공개 범위 및 상호작용」에 「공개」 · 「제한적 공개」 · 「팔로워」 · 「개인 멘션」, 「모든 사용자」 · 「팔로워만」 · 「본인만」, 「취소」 · 「저장」이 보인다',
        떴다 && 공개 && 제한적 && 팔로워 && 멘션 && 모든 && 팔로워만 && 본인만 && 버튼,
        true,
      );
    });
  });

  await test.case(줄설명, async () => {
    await test.step('공개 범위 줄 설명을 확인한다', async () => {
      await 시트열기();
      await 시트.범위열기();
      const 설명들 = await 시트.줄설명들();
      const 제한적 = await verify('공개 범위 시트에 「마스토돈 검색 결과, 트렌딩, 공개 타임라인에서 숨김」 설명이 보인다', 설명들.includes('마스토돈 검색 결과, 트렌딩, 공개 타임라인에서 숨김'), true);
      const 팔로워 = await verify('공개 범위 시트에 「오직 팔로우 중인 사람들에게만」 설명이 보인다', 설명들.includes('오직 팔로우 중인 사람들에게만'), true);
      const 멘션 = await verify('공개 범위 시트에 「게시물에 반응한 사람들에게만」 설명이 보인다', 설명들.includes('게시물에 반응한 사람들에게만'), true);
      await verify(
        '공개 범위 시트에 「마스토돈 검색 결과, 트렌딩, 공개 타임라인에서 숨김」 · 「오직 팔로우 중인 사람들에게만」 · 「게시물에 반응한 사람들에게만」 설명이 보인다',
        제한적 && 팔로워 && 멘션,
        true,
      );
      await 시트.줄창닫기();
    });
  });

  await test.case(시트위설명, async ({ expected }) => {
    await test.step('시트 위 설명을 확인한다', async () => {
      await 시트열기();
      await verify('공개 범위 시트 위에 영어 설명 「Control who can interact with this post.」가 보인다', await 시트.부제글(), expected.설명);
    });
  });

  await test.case(제한적공개고르기, async ({ expected }) => {
    await test.step('시트에서 「제한적 공개」를 고른다', async () => {
      await 시트열기();
      await 시트.범위열기();
      await 시트.줄고르기('제한적 공개');
      const 글들 = await 시트.시트글들();
      await verify(
        '공개 범위 시트에서 「제한적 공개」를 고르면 「다른 사용자가 회원님을 인용할 때, 해당 게시물은 트렌딩 타임라인에서 숨겨집니다.」 설명이 붙는다',
        글들.includes(expected.설명),
        true,
      );
    });
  });

  await test.case(팔로워고르기, async ({ expected }) => {
    await test.step('시트에서 「팔로워」를 고른다', async () => {
      await 시트열기();
      await 시트.범위열기();
      await 시트.줄고르기('팔로워');
      const 정책 = await verify('인용 정책이 기대값과 같다', await 시트.인용정책글(), expected.정책);
      const 글들 = await 시트.시트글들();
      const 설명 = await verify('팔로워 전용 게시물 설명이 보인다', 글들.includes(expected.설명), true);
      await verify(
        '공개 범위 시트에서 「팔로워」를 고르면 인용 정책이 「본인만」으로 잠기고 「마스토돈에서 작성된 팔로워 전용 게시물은 다른 사용자가 인용할 수 없습니다.」 설명이 붙는다',
        정책 && 설명,
        true,
      );
    });
  });

  await test.case(잠긴정책, async ({ expected }) => {
    await test.step('「팔로워」를 골라 인용 정책을 잠근다', async () => {
      await 시트열기();
      if ((await 시트.인용정책글()) !== expected.정책) {
        await 시트.범위열기();
        await 시트.줄고르기('팔로워');
      }
    });
    await test.step('잠긴 인용 정책에서 「모든 사용자」를 누른다', async () => {
      await 시트.인용정책열기();
      if (await 시트.줄있나('모든 사용자', 3_000)) await 시트.줄고르기('모든 사용자');
      await verify('팔로워 공개에서 「모든 사용자」를 누르면 인용 정책이 「본인만」에서 바뀌지 않는다', await 시트.인용정책글(), expected.정책);
    });
  });

  await test.case(공개저장, async ({ expected }) => {
    await test.step('「공개」 · 「모든 사용자」를 고르고 「저장」을 누른다', async () => {
      await 시트열기();
      await 시트.범위열기();
      await 시트.줄고르기('공개');
      await 시트.인용정책열기();
      await 시트.줄고르기('모든 사용자');
      await 시트.저장누르기();
      await 시트.닫혔나();
      await verify('「공개」 · 「모든 사용자」로 저장하면 도구 줄 공개 범위 버튼이 「공개, 누구나 인용 가능」으로 보인다', await 글쓰기.공개범위글(), expected.버튼글);
    });
  });

  await test.case(닫기확인, async ({ params, expected }) => {
    await test.step('본문에 글이 적힌 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
      await 글쓰기.본문적기(params.본문);
    });
    await test.step('내용이 있는 글쓰기에서 닫기를 누른다', async () => {
      await 글쓰기.닫기누르기();
      const 창 = 글쓰기.닫기확인창();
      const 문구 = await verify('「작성 중인 글을 지우시겠습니까?」 창이 보인다', await 글쓰기.창에글자있나('작성 중인 글을 지우시겠습니까?', 10_000), true);
      const 지우기 = await verify('창의 확인 버튼 글이 기대값과 같다', await 창.확인버튼글(), expected.지우기);
      const 취소 = await verify('창의 취소 버튼 글이 기대값과 같다', await 창.취소버튼글(), expected.취소);
      await verify('내용이 있는 글쓰기를 닫으면 「작성 중인 글을 지우시겠습니까?」 창과 「지우기」 · 「취소」가 뜬다', 문구 && 지우기 && 취소, true);
      await 창.취소누르기();
    });
  });

  await test.case(빈글뒤로, async () => {
    await test.step('본문이 비어 있는 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
    });
    await test.step('내용이 없는 글쓰기에서 뒤로 가기를 누른다', async () => {
      await 글쓰기.뒤로가기누르기();
      if (!(await 글쓰기.닫혔나(3_000))) await 글쓰기.뒤로가기누르기();
      const 닫힘 = await 글쓰기.닫혔나(10_000);
      const 창없음 = !(await 글쓰기.닫기확인창().떴나(1_500));
      await verify('내용이 없는 글쓰기에서 뒤로 가기를 누르면 확인 창 없이 바로 닫힌다', 닫힘 && 창없음, true);
    });
  });

  await test.case(두번게시, async ({ params, expected }) => {
    await test.step('「QA 중복 방지」로 시작하는 글을 적은 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
      await 글쓰기.본문적기(params.본문);
    });
    await test.step('「게시」를 빠르게 두 번 누른다', async () => {
      await 글쓰기.게시두번누르기();
      const 올림 = await 올라온글기다리기(driver, 나!, params.본문);
      const 겹침 = await 될때까지(driver, async () => (await 내글들(나!, params.본문)).length > expected.올라간수, 6_000);
      await verify('「게시」를 빠르게 두 번 누르면 같은 글은 한 번만 올라간다', 올림 !== undefined && !겹침, true);
    });
  });
});
