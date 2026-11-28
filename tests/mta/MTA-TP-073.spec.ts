import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { type 글, type 계정, 계정꺼내기, 글쓰기, 글읽기, 내글지우기, 사람글찾기 } from './helpers/api.helper.js';
import { 글열기, 글조각, 올라온글기다리기, 인용글쓰기가열릴때까지, 인용글쓰기열기 } from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 화면글자포함있나 } from './helpers/flow-status.helper.js';
import { 펼친메뉴 } from './components/popup-menu.component.js';
import { 글카드 } from './components/status-card.component.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 공개범위시트 } from './pages/visibility-sheet.page.js';

const 남의글팔로워인용 = defineCase({
  tcId: 'MTA-FN-274',
  name: '남의 글을 인용하며 팔로워 공개로 게시하면 영어 확인 창 「Share with followers and mentioned users?」 · 「Publish post」 · 「Back to editing」이 뜬다',
  platforms: ['android'],
  precondition: ['cafe_moon 의 공개 글을 인용하는 글쓰기다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    본문: z.string().min(1).max(500).describe('올릴 글 — 「QA TP073」로 시작하는 500자까지').default('QA TP073 남의 글 팔로워 인용'),
  }),
  expected: z.object({
    제목: z.string().describe('영어 확인 창 글').default('Share with followers and mentioned users?'),
    게시: z.string().describe('창의 확인 버튼 글').default('Publish post'),
    돌아감: z.string().describe('창의 취소 버튼 글').default('Back to editing'),
  }),
});

const 인용정책바꾸기 = defineCase({
  tcId: 'MTA-FN-296',
  name: '더보기 「인용 가능한 사용자 변경」으로 바꾸면 서버의 그 글 인용 정책이 팔로워만으로 바뀐다',
  platforms: ['android'],
  precondition: ['내가 쓴 공개 글이 있다'],
  params: z.object({ 내글: z.string().min(1).max(500).describe('API 로 올릴 내 공개 글 — 「QA TP073」로 시작하는 500자까지').default('QA TP073 인용 정책 바꿀 글') }),
  expected: z.object({ 자동허용: z.string().describe('팔로워만 인용할 수 있을 때 서버의 자동 허용 대상').default('followers') }),
});

const 중첩인용 = defineCase({
  tcId: 'MTA-UI-241',
  name: '중첩 인용은 「<이름> 님에 의해 인용된 게시물」로 한 단계만 보인다',
  platforms: ['android'],
  precondition: ['내가 jiho_cafe 의 인용 글을 다시 인용해 올렸다'],
  params: z.object({ 본문: z.string().min(1).max(500).describe('올릴 글 — 「QA TP073」로 시작하는 500자까지').default('QA TP073 중첩 인용 글') }),
  expected: z.object({ 안내: z.string().describe('중첩 인용 안내 글 — 앞의 이름을 뺀 부분').default('님에 의해 인용된 게시물') }),
});

const 내글팔로워인용 = defineCase({
  tcId: 'MTA-FN-275',
  name: '내 글을 인용하며 팔로워 공개로 게시하면 영어 확인 창 없이 올라간다',
  platforms: ['android'],
  precondition: ['내 공개 글을 인용하는 글쓰기다'],
  techniques: ['동등 분할'],
  params: z.object({ 본문: z.string().min(1).max(500).describe('올릴 글 — 「QA TP073」로 시작하는 500자까지').default('QA TP073 내 글 팔로워 인용') }),
  expected: z.object({
    제목: z.string().describe('뜨면 안 되는 영어 확인 창 글').default('Share with followers and mentioned users?'),
    공개범위: z.string().describe('올라간 글의 공개 범위').default('private'),
  }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-073',
  name: '인용 글쓰기 — 팔로워 공개와 인용 정책',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [남의글팔로워인용, 인용정책바꾸기, 중첩인용, 내글팔로워인용],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 작성 = new 글쓰기화면(driver);
  const 시트 = new 공개범위시트(driver);
  let 나: 계정 | undefined;
  let 내공개글: 글 | undefined;

  const 남의공개글 = (): Promise<글> => 사람글찾기(나!, 'cafe_moon', (x) => x.visibility === 'public' && x.reblog === null, '공개 글');
  const 팔로워로바꿔게시 = async (본문: string): Promise<void> => {
    await 작성.공개범위누르기();
    await 시트.범위열기();
    await 시트.줄고르기('팔로워');
    await 시트.저장누르기();
    await 시트.닫혔나();
    await 작성.본문적기(본문);
    await 작성.게시누르기();
  };

  await test.cleanup('이 흐름이 올린 글을 지운다', async () => {
    if (나 !== undefined) await 내글지우기(나, 'QA TP073');
  });

  await test.case(남의글팔로워인용, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('cafe_moon 의 공개 글을 인용하는 글쓰기를 연다', async () => {
      await 내글지우기(나!, 'QA TP073');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      await 인용글쓰기열기(driver, await 남의공개글());
      await 인용글쓰기가열릴때까지(driver);
    });
    await test.step('남의 글 인용 글쓰기에서 「팔로워」로 바꾸고 「게시」를 누른다', async () => {
      await 팔로워로바꿔게시(params.본문);
      const 창 = 작성.영어확인창();
      const 제목 = await verify('영어 확인 창 「Share with followers and mentioned users?」가 보인다', await 작성.창에글자있나(expected.제목, 10_000), true);
      const 게시 = await verify('창의 확인 버튼 글이 기대값과 같다', await 창.확인버튼글(), expected.게시);
      const 돌아감 = await verify('창의 취소 버튼 글이 기대값과 같다', await 창.취소버튼글(), expected.돌아감);
      await verify(
        '남의 글을 인용하며 팔로워 공개로 게시하면 영어 확인 창 「Share with followers and mentioned users?」 · 「Publish post」 · 「Back to editing」이 뜬다',
        제목 && 게시 && 돌아감,
        true,
      );
      await 창.취소누르기();
    });
  });

  await test.case(인용정책바꾸기, async ({ params, expected }) => {
    await test.step('내 공개 글을 올리고 연다', async () => {
      const 올린글 = await 글쓰기(나!, params.내글);
      내공개글 = 올린글;
      await 글열기(driver, 올린글);
    });
    await test.step('내 글 더보기 「인용 가능한 사용자 변경」에서 「팔로워만」으로 저장한다', async () => {
      await new 글카드(driver).더보기누르기(글조각(내공개글!));
      await new 펼친메뉴(driver).항목누르기('인용 가능한 사용자 변경');
      await 시트.인용정책열기();
      await 시트.줄고르기('팔로워만');
      await 시트.저장누르기();
      const 바뀜 = await 될때까지(driver, async () => ((await 글읽기(나!, 내공개글!.id)).quote_approval?.automatic ?? []).join(',') === expected.자동허용, 20_000);
      await verify('더보기 「인용 가능한 사용자 변경」으로 바꾸면 서버의 그 글 인용 정책이 팔로워만으로 바뀐다', 바뀜, true);
    });
  });

  await test.case(중첩인용, async ({ params, expected }) => {
    await test.step('내가 jiho_cafe 의 인용 글을 다시 인용해 올리고 그 글을 연다', async () => {
      const 인용글 = await 사람글찾기(나!, 'jiho_cafe', (x) => x.reblog === null && x.quote?.quoted_status !== undefined && x.quote.quoted_status !== null, '인용 글');
      const 올린글 = await 글쓰기(나!, params.본문, { quoted_status_id: 인용글.id });
      await 글열기(driver, 올린글);
    });
    await test.step('중첩 인용 글 카드를 확인한다', async () => {
      await verify('중첩 인용은 「<이름> 님에 의해 인용된 게시물」로 한 단계만 보인다', await 화면글자포함있나(driver, expected.안내, 10_000), true);
    });
  });

  await test.case(내글팔로워인용, async ({ params, expected }) => {
    await test.step('내 공개 글을 인용하는 글쓰기를 연다', async () => {
      내공개글 = await 글쓰기(나!, 'QA TP073 인용할 내 글');
      await 인용글쓰기열기(driver, 내공개글);
      await 인용글쓰기가열릴때까지(driver);
    });
    await test.step('내 글 인용 글쓰기에서 「팔로워」로 바꾸고 「게시」를 누른다', async () => {
      await 팔로워로바꿔게시(params.본문);
      const 창없음 = !(await 작성.창에글자있나(expected.제목, 2_000));
      const 올림 = await 올라온글기다리기(driver, 나!, params.본문);
      await verify('내 글을 인용하며 팔로워 공개로 게시하면 영어 확인 창 없이 올라간다', 창없음 && 올림?.visibility === expected.공개범위, true);
    });
  });
});
