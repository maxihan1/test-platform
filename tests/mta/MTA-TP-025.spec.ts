import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 글, type 계정, 계정꺼내기, 글쓰기, 내글지우기 } from './helpers/api.helper.js';
import { 글열기, 글조각, 내글수정화면열기, 새글쓰기열기 } from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 펼친메뉴 } from './components/popup-menu.component.js';
import { 글카드 } from './components/status-card.component.js';
import { 글쓰기투표 } from './pages/compose-poll.page.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 언어창 } from './pages/language-sheet.page.js';
import { 공개범위시트 } from './pages/visibility-sheet.page.js';

const 수정화면머리 = defineCase({
  tcId: 'MTA-UI-169',
  name: '글 수정 화면 상단에 제목 「게시물 편집」과 「저장」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있고 내가 쓴 글이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    본문: z.string().min(1).max(500).describe('API 로 올릴 글 — 「QA TP025」로 시작하는 500자까지').default('QA TP025 수정할 글'),
  }),
  expected: z.object({
    제목: z.string().describe('글 수정 화면 상단 제목').default('게시물 편집'),
    저장: z.string().describe('수정 화면 저장 버튼 글').default('저장'),
  }),
});

const 수정중공개범위 = defineCase({
  tcId: 'MTA-FN-258',
  name: '수정 중에 공개 범위 버튼을 누르면 「게시된 게시물은 공개 범위를 변경할 수 없습니다.」가 보이고 바꿀 수 없다',
  platforms: ['android'],
  precondition: ['글 수정 화면이 열려 있다'],
  params: z.object({}),
  expected: z.object({ 안내: z.string().describe('공개 범위를 못 바꾼다는 토스트 글').default('게시된 게시물은 공개 범위를 변경할 수 없습니다.') }),
});

const 수정중뒤로 = defineCase({
  tcId: 'MTA-FN-268',
  name: '글 수정 중 뒤로 가면 「변경 사항을 지우시겠습니까?」 창이 뜬다',
  platforms: ['android'],
  precondition: ['글 수정 화면에서 본문을 고쳤다'],
  params: z.object({ 고친글: z.string().min(1).max(500).describe('수정 화면 본문에 적을 글 — 비어 있지 않은 글').default('QA TP025 고친 본문') }),
  expected: z.object({ 안내: z.string().describe('뒤로 갈 때 뜨는 창 글').default('변경 사항을 지우시겠습니까?') }),
});

const 지우고다시열기 = defineCase({
  tcId: 'MTA-FN-271',
  name: '글쓰기를 지우고 다시 열면 앞 내용 「QA 임시」가 남아 있지 않다',
  platforms: ['android'],
  precondition: ['새 글쓰기에 「QA 임시」를 적었다'],
  params: z.object({ 본문: z.string().min(1).max(500).describe('본문에 적을 글 — 비어 있지 않은 글').default('QA 임시') }),
  expected: null,
});

const 투표게시실패 = defineCase({
  tcId: 'MTA-FN-273',
  name: '게시에 실패하면 「게시물 작성 실패」 창에 서버 메시지와 「재시도」 · 「취소」가 보인다',
  platforms: ['android'],
  precondition: ['새 글쓰기에 같은 항목 「가」 · 「가」 투표가 붙어 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    본문: z.string().min(1).max(500).describe('올릴 글 — 「QA TP025」로 시작하는 500자까지').default('QA TP025 같은 항목 투표'),
    항목: z.string().min(1).describe('투표 두 항목에 똑같이 적을 글').default('가'),
  }),
  expected: z.object({
    재시도: z.string().describe('실패 창의 확인 버튼 글').default('재시도'),
    취소: z.string().describe('실패 창의 취소 버튼 글').default('취소'),
  }),
});

const 언어창열기 = defineCase({
  tcId: 'MTA-FN-635',
  name: '언어 버튼을 누르면 「기본값」과 전체 언어 목록이 있는 「언어」 창이 열린다',
  platforms: ['android'],
  precondition: ['새 글쓰기 화면이 열려 있다'],
  params: z.object({}),
  expected: z.object({ 제목: z.string().describe('언어 창 제목').default('언어') }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-025',
  name: '글쓰기 — 수정 · 다시 열기 · 실패',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [수정화면머리, 수정중공개범위, 수정중뒤로, 지우고다시열기, 투표게시실패, 언어창열기],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 작성 = new 글쓰기화면(driver);
  const 투표 = new 글쓰기투표(driver);
  const 시트 = new 공개범위시트(driver);
  const 언어 = new 언어창(driver);
  let 나: 계정 | undefined;
  let 수정글: 글 | undefined;

  const 수정화면맞추기 = async (): Promise<void> => {
    if (await 작성.수정화면떴나(3_000)) return;
    await 내글수정화면열기(driver, 수정글!);
  };

  await test.cleanup('이 흐름이 올린 글을 지운다', async () => {
    if (나 !== undefined) await 내글지우기(나, 'QA TP025');
  });

  await test.case(수정화면머리, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어가 내 글을 올리고 그 글을 연다', async () => {
      await 내글지우기(나!, 'QA TP025');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      수정글 = await 글쓰기(나!, params.본문);
      await 글열기(driver, 수정글);
    });
    await test.step('내 글 더보기에서 「수정」을 누른다', async () => {
      await new 글카드(driver).더보기누르기(글조각(수정글!));
      await new 펼친메뉴(driver).항목누르기('수정');
      const 제목 = await verify('글 수정 화면 상단 제목이 기대값과 같다', await 작성.제목글(), expected.제목);
      const 저장 = await verify('글 수정 화면 상단 저장 버튼 글이 기대값과 같다', await 작성.게시버튼글(), expected.저장);
      await verify('글 수정 화면 상단에 제목 「게시물 편집」과 「저장」 버튼이 보인다', 제목 && 저장, true);
    });
  });

  await test.case(수정중공개범위, async ({ expected }) => {
    await test.step('수정 화면에서 공개 범위 버튼을 누른다', async () => {
      await 수정화면맞추기();
      await 작성.공개범위누르기();
      const 안내 = await verify('공개 범위를 못 바꾼다는 안내가 보인다', await 작성.토스트에글자있나(expected.안내), true);
      const 시트안뜸 = await verify('공개 범위 시트가 열리지 않는다', !(await 시트.떴나(2_000)), true);
      await verify('수정 중에 공개 범위 버튼을 누르면 「게시된 게시물은 공개 범위를 변경할 수 없습니다.」가 보이고 바꿀 수 없다', 안내 && 시트안뜸, true);
    });
  });

  await test.case(수정중뒤로, async ({ params, expected }) => {
    await test.step('수정 화면에서 본문을 고친다', async () => {
      await 수정화면맞추기();
      await 작성.본문적기(params.고친글);
    });
    await test.step('본문을 고친 수정 화면에서 뒤로 가기를 누른다', async () => {
      await 작성.뒤로가기누르기();
      if (!(await 작성.창에글자있나(expected.안내, 3_000))) await 작성.뒤로가기누르기();
      await verify('글 수정 중 뒤로 가면 「변경 사항을 지우시겠습니까?」 창이 뜬다', await 작성.창에글자있나(expected.안내, 10_000), true);
      await 작성.닫기확인창().취소누르기();
    });
  });

  await test.case(지우고다시열기, async ({ params }) => {
    await test.step('「QA 임시」를 적은 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
      await 작성.본문적기(params.본문);
    });
    await test.step('「지우기」로 닫고 글쓰기를 다시 연다', async () => {
      await 작성.닫기누르기();
      await 작성.닫기확인창().확인누르기();
      await 작성.닫혔나(10_000);
      await 새글쓰기열기(driver);
      await verify('글쓰기를 지우고 다시 열면 앞 내용 「QA 임시」가 남아 있지 않다', !(await 작성.본문칸글()).includes(params.본문), true);
    });
  });

  await test.case(투표게시실패, async ({ params, expected }) => {
    await test.step('같은 항목 「가」 · 「가」 투표를 붙인 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
      await 작성.본문적기(params.본문);
      await 작성.도구누르기('투표');
      if (!(await 투표.떴나(10_000))) throw new Error('글쓰기에 투표 칸이 안 붙었다');
      await 투표.항목적기(0, params.항목);
      await 투표.항목적기(1, params.항목);
    });
    await test.step('같은 항목 투표로 「게시」를 누른다', async () => {
      await 작성.게시누르기();
      const 창 = 작성.작성실패창();
      const 제목 = await verify('「게시물 작성 실패」 창이 보인다', await 작성.창에글자있나('게시물 작성 실패', 15_000), true);
      const 서버메시지 = await verify('창에 서버 메시지가 보인다', (await 창.글읽기()).length > 0, true);
      const 재시도 = await verify('창의 확인 버튼 글이 기대값과 같다', await 창.확인버튼글(), expected.재시도);
      const 취소 = await verify('창의 취소 버튼 글이 기대값과 같다', await 창.취소버튼글(), expected.취소);
      await verify('게시에 실패하면 「게시물 작성 실패」 창에 서버 메시지와 「재시도」 · 「취소」가 보인다', 제목 && 서버메시지 && 재시도 && 취소, true);
      await 창.취소누르기();
    });
  });

  await test.case(언어창열기, async ({ expected }) => {
    await test.step('언어 버튼을 누를 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
    });
    await test.step('도구 줄 언어 버튼을 누른다', async () => {
      await 작성.도구누르기('언어');
      const 창 = await verify('「기본값」 줄이 있는 언어 창이 열린다', await 언어.떴나(), true);
      const 제목 = await verify('언어 창 제목이 기대값과 같다', await 언어.제목글(), expected.제목);
      const 목록 = await verify('언어 목록이 보인다', await 언어.언어줄이있나(), true);
      await verify('언어 버튼을 누르면 「기본값」과 전체 언어 목록이 있는 「언어」 창이 열린다', 창 && 제목 && 목록, true);
      await 언어.취소누르기();
    });
  });
});
