import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 펼친메뉴 } from './components/popup-menu.component.js';
import { 글카드 } from './components/status-card.component.js';
import { type 계정, 계정꺼내기, 계정찾기, 사람글찾기 } from './helpers/api.helper.js';
import { 이름 } from './helpers/flow-status.helper.js';
import { 본문조각, 신고이유설명글들, 프로필열어보기 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필글목록 } from './pages/profile-feed.page.js';
import { 신고화면 } from './pages/report.page.js';

const 글신고첫화면 = defineCase({
  tcId: 'MTA-UI-372',
  name: '글 신고 첫 화면에 제목 「게시물 신고」 · 질문 「이 게시물에 어떤 문제가 있나요?」 · 「가장 알맞은 것을 선택하세요」 · 「다음」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있고 spam_shop 의 글이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사용자명: z.string().min(1).describe('신고해 볼 계정 — 글이 있는 신고용 시드 계정의 사용자명').default('spam_shop'),
  }),
  expected: z.object({
    제목: z.string().describe('글 신고 제목').default('게시물 신고'),
    질문: z.string().describe('글 신고 질문').default('이 게시물에 어떤 문제가 있나요?'),
    안내: z.string().describe('글 신고 안내').default('가장 알맞은 것을 선택하세요'),
    다음: z.string().describe('글 신고 버튼 글').default('다음'),
  }),
});

const 신고이유목록 = defineCase({
  tcId: 'MTA-UI-374',
  name: '신고 이유 목록에 「마음에 안 듭니다」 · 「스팸입니다」 · 「불법입니다」 · 「다른 문제가 있습니다」와 각 설명이 보인다',
  platforms: ['android'],
  precondition: ['글 신고 첫 화면이 열려 있다'],
  params: z.object({ 사용자명: z.string().min(1).describe('신고해 볼 계정 — 글이 있는 신고용 시드 계정의 사용자명').default('spam_shop') }),
  expected: null,
});

const 규칙이유없음 = defineCase({
  tcId: 'MTA-UI-375',
  name: '규칙이 없는 우리 서버의 신고 이유에 「서버 규칙을 위반합니다」가 보이지 않는다',
  platforms: ['android'],
  precondition: ['글 신고 첫 화면이 열려 있다'],
  params: z.object({ 사용자명: z.string().min(1).describe('신고해 볼 계정 — 글이 있는 신고용 시드 계정의 사용자명').default('spam_shop') }),
  expected: null,
});

const 마음에안듦 = defineCase({
  tcId: 'MTA-FN-445',
  name: '「마음에 안 듭니다」를 고르고 「다음」을 누르면 신고를 보내지 않고 완료 화면 「이런 것을 보지 않길 원하나요?」로 간다',
  platforms: ['android'],
  precondition: ['글 신고 첫 화면이 열려 있다'],
  params: z.object({ 사용자명: z.string().min(1).describe('신고해 볼 계정 — 글이 있는 신고용 시드 계정의 사용자명').default('spam_shop') }),
  expected: null,
});

const 스팸고르기 = defineCase({
  tcId: 'MTA-FN-446',
  name: '「스팸입니다」를 고르고 「다음」을 누르면 글 고르기 「이 신고에 대해서 더 참고해야 할 게시물이 있나요?」로 간다',
  platforms: ['android'],
  precondition: ['글 신고 첫 화면이 열려 있다'],
  params: z.object({ 사용자명: z.string().min(1).describe('신고해 볼 계정 — 글이 있는 신고용 시드 계정의 사용자명').default('spam_shop') }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-050',
  name: '신고 — 첫 화면과 이유',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [글신고첫화면, 신고이유목록, 규칙이유없음, 마음에안듦, 스팸고르기],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 글목록 = new 프로필글목록(driver);
  const 카드 = new 글카드(driver);
  const 메뉴 = new 펼친메뉴(driver);
  const 신고 = new 신고화면(driver);
  let 나: 계정 | undefined;

  const 글조각 = async (사용자명: string): Promise<string> =>
    본문조각(await 사람글찾기(나!, 사용자명, (x) => x.reblog === null && x.in_reply_to_id === null && 본문조각(x) !== '', '본문이 있는 원글'));

  const 글신고열기 = async (사용자명: string, 조각: string): Promise<void> => {
    await 프로필열어보기(driver, 사용자명);
    if (!(await 글목록.글찾을때까지내리기(조각))) throw new Error(`${사용자명} 프로필에서 신고할 글이 안 보인다`);
    await 카드.더보기누르기(조각);
    await 메뉴.항목누르기(`${이름(await 계정찾기(나!, 사용자명))} 신고`);
    if (!(await 신고.떴나())) throw new Error('글 신고 첫 화면이 안 열렸다');
  };

  await test.case(글신고첫화면, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    let 조각 = '';
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      조각 = await 글조각(params.사용자명);
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('spam_shop 글 더보기에서 「spam_shop 신고」를 누른다', async () => {
      await 글신고열기(params.사용자명, 조각);
      const 제목 = await verify('글 신고 제목이 기대값과 같다', await 신고.위막대제목글(), expected.제목);
      const 질문 = await verify('글 신고 질문이 기대값과 같다', await 신고.질문글(), expected.질문);
      const 안내 = await verify('글 신고 안내가 기대값과 같다', await 신고.안내글(), expected.안내);
      const 다음 = await verify('글 신고 버튼이 「다음」이다', await 신고.다음글(), expected.다음);
      await verify(
        '글 신고 첫 화면에 제목 「게시물 신고」 · 질문 「이 게시물에 어떤 문제가 있나요?」 · 「가장 알맞은 것을 선택하세요」 · 「다음」이 보인다',
        제목 && 질문 && 안내 && 다음,
        true,
      );
    });
  });

  await test.case(신고이유목록, async ({ params }) => {
    await test.step('신고 이유 목록을 확인한다', async () => {
      await 글신고열기(params.사용자명, await 글조각(params.사용자명));
      const 마음 = await verify('「마음에 안 듭니다」가 보인다', await 신고.이유있나('마음에 안 듭니다', 5_000), true);
      const 스팸 = await verify('「스팸입니다」가 보인다', await 신고.이유있나('스팸입니다', 5_000), true);
      const 불법 = await verify('「불법입니다」가 보인다', await 신고.이유있나('불법입니다', 5_000), true);
      const 다른 = await verify('「다른 문제가 있습니다」가 보인다', await 신고.이유있나('다른 문제가 있습니다', 5_000), true);
      const 설명 = await verify('이유마다 설명이 보인다', (await 신고이유설명글들(driver)).filter((글) => 글 !== '').length >= 5, true);
      await verify('신고 이유 목록에 「마음에 안 듭니다」 · 「스팸입니다」 · 「불법입니다」 · 「다른 문제가 있습니다」와 각 설명이 보인다', 마음 && 스팸 && 불법 && 다른 && 설명, true);
    });
  });

  await test.case(규칙이유없음, async ({ params }) => {
    await test.step('「서버 규칙을 위반합니다」 자리를 확인한다', async () => {
      await 글신고열기(params.사용자명, await 글조각(params.사용자명));
      const 목록 = await verify('「불법입니다」 이유가 보인다', await 신고.이유있나('불법입니다', 5_000), true);
      const 없음 = await verify('「서버 규칙을 위반합니다」가 보이지 않는다', !(await 신고.이유있나('서버 규칙을 위반합니다', 2_000)), true);
      await verify('규칙이 없는 우리 서버의 신고 이유에 「서버 규칙을 위반합니다」가 보이지 않는다', 목록 && 없음, true);
    });
  });

  await test.case(마음에안듦, async ({ params }) => {
    await test.step('「마음에 안 듭니다」를 고르고 「다음」을 누른다', async () => {
      await 글신고열기(params.사용자명, await 글조각(params.사용자명));
      await 신고.이유누르기('마음에 안 듭니다');
      await 신고.다음누르기();
      const 완료화면 = await verify('완료 화면 「이런 것을 보지 않길 원하나요?」가 보인다', await 신고.질문될때까지('이런 것을 보지 않길 원하나요?'), true);
      const 안보냄 = await verify('「신고됨」 도장이 보이지 않는다', !(await 신고.완료떴나(2_000)), true);
      await verify('「마음에 안 듭니다」를 고르고 「다음」을 누르면 신고를 보내지 않고 완료 화면 「이런 것을 보지 않길 원하나요?」로 간다', 완료화면 && 안보냄, true);
    });
  });

  await test.case(스팸고르기, async ({ params }) => {
    await test.step('「스팸입니다」를 고르고 「다음」을 누른다', async () => {
      await 글신고열기(params.사용자명, await 글조각(params.사용자명));
      await 신고.이유누르기('스팸입니다');
      await 신고.다음누르기();
      await verify('「스팸입니다」를 고르고 「다음」을 누르면 글 고르기 「이 신고에 대해서 더 참고해야 할 게시물이 있나요?」로 간다', await 신고.질문될때까지('이 신고에 대해서 더 참고해야 할 게시물이 있나요?'), true);
    });
  });
});
