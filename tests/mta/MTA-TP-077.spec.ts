import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 펼친메뉴 } from './components/popup-menu.component.js';
import { 글카드 } from './components/status-card.component.js';
import { type 계정, 계정꺼내기, 계정찾기, 사람글찾기 } from './helpers/api.helper.js';
import { 이름 } from './helpers/flow-status.helper.js';
import { 본문조각, 프로필열어보기 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필글목록 } from './pages/profile-feed.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 신고화면 } from './pages/report.page.js';

const 미리선택 = defineCase({
  tcId: 'MTA-FN-447',
  name: '글에서 신고를 시작하면 글 고르기에서 그 글이 미리 선택돼 있다',
  platforms: ['android'],
  precondition: ['글에서 신고를 시작해 글 고르기 화면에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사용자명: z.string().min(1).describe('신고해 볼 계정 — 글이 있는 신고용 시드 계정의 사용자명').default('spam_shop'),
  }),
  expected: null,
});

const 의견쓰기 = defineCase({
  tcId: 'MTA-UI-380',
  name: '신고 의견 쓰기에 「우리가 더 알아야 할 내용이 있나요?」와 힌트 「추가 의견」이 보인다',
  platforms: ['android'],
  precondition: ['글 고르기에서 「다음」을 눌렀다'],
  params: z.object({ 사용자명: z.string().min(1).describe('신고해 볼 계정 — 글이 있는 신고용 시드 계정의 사용자명').default('spam_shop') }),
  expected: z.object({
    질문: z.string().describe('의견 쓰기 질문').default('우리가 더 알아야 할 내용이 있나요?'),
    힌트: z.string().describe('의견 칸 힌트').default('추가 의견'),
  }),
});

const 프로필신고 = defineCase({
  tcId: 'MTA-UI-373',
  name: '프로필 메뉴로 신고하면 제목 「spam_shop 신고」 · 질문 「spam_shop에 어떠한 문제라도 있나요?」가 보인다',
  platforms: ['android'],
  precondition: ['spam_shop 프로필이 열려 있다'],
  params: z.object({ 사용자명: z.string().min(1).describe('신고해 볼 계정 — 신고용 시드 계정의 사용자명').default('spam_shop') }),
  expected: null,
});

const 신고보내기 = defineCase({
  tcId: 'MTA-FN-664',
  name: '의견 쓰기에서 「다음」을 누르면 전송 뒤 완료 화면에 「신고됨」 · 「신고해주셔서 감사합니다. 저희 중재팀이 확인할 예정입니다.」가 보인다',
  platforms: ['android'],
  precondition: ['spam_shop 신고 의견 쓰기 화면에 있다'],
  params: z.object({ 사용자명: z.string().min(1).describe('신고할 계정 — 신고를 보내도 되는 신고용 시드 계정의 사용자명').default('spam_shop') }),
  expected: z.object({
    도장: z.string().describe('완료 화면 도장 글').default('신고됨'),
    감사: z.string().describe('완료 화면 안내 글').default('신고해주셔서 감사합니다. 저희 중재팀이 확인할 예정입니다.'),
  }),
});

const 규칙고르기 = defineCase({
  tcId: 'MTA-FN-663',
  name: '「서버 규칙을 위반합니다」를 고르면 규칙 고르기 「어떤 규칙을 위반했나요?」로 간다',
  platforms: ['android'],
  precondition: ['규칙이 있는 서버다'],
  held: '보류 — 테스트 계정 없음 — 관리자 계정 값으로 웹 로그인하면 「올바르지 않은 이메일 주소 혹은 암호입니다.」로 거절돼 서버 규칙을 더할 수 없다',
  params: z.object({ 사용자명: z.string().min(1).describe('신고해 볼 계정 — 글이 있는 신고용 시드 계정의 사용자명').default('spam_shop') }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-077',
  name: '신고 — 글 고르기부터 보내기까지',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [미리선택, 의견쓰기, 프로필신고, 신고보내기, 규칙고르기],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
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

  const 프로필신고열기 = async (사용자명: string): Promise<void> => {
    await 프로필열어보기(driver, 사용자명);
    await 프로필.메뉴열기('Report account');
    await 메뉴.항목누르기('Report account');
    if (!(await 신고.떴나())) throw new Error('프로필 신고 첫 화면이 안 열렸다');
  };

  await test.case(미리선택, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    let 조각 = '';
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      조각 = await 글조각(params.사용자명);
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('글에서 신고를 시작해 글 고르기 화면으로 간다', async () => {
      await 글신고열기(params.사용자명, 조각);
      await 신고.이유누르기('스팸입니다');
      await 신고.다음누르기();
      await verify('글 고르기 화면이 보인다', await 신고.질문될때까지('이 신고에 대해서 더 참고해야 할 게시물이 있나요?'), true, { blocker: true });
    });
    await test.step('글 고르기에서 신고한 글을 확인한다', async () => {
      const 보임 = await verify('신고를 시작한 글이 글 고르기에 보인다', (await 신고.글본문글들()).some((글) => 글.includes(조각)), true);
      const 선택 = await verify('글 하나가 선택돼 있다', await 신고.체크된글수(), 1);
      await verify('글에서 신고를 시작하면 글 고르기에서 그 글이 미리 선택돼 있다', 보임 && 선택, true);
    });
  });

  await test.case(의견쓰기, async ({ params, expected }) => {
    await test.step('글 고르기에서 「다음」을 누른다', async () => {
      await 글신고열기(params.사용자명, await 글조각(params.사용자명));
      await 신고.이유누르기('스팸입니다');
      await 신고.다음누르기();
      await 신고.질문될때까지('이 신고에 대해서 더 참고해야 할 게시물이 있나요?');
      await 신고.다음누르기();
      await verify('의견 쓰기 화면이 보인다', await 신고.의견칸있나(), true, { blocker: true });
    });
    await test.step('의견 쓰기 화면을 확인한다', async () => {
      const 질문 = await verify('의견 쓰기 질문이 기대값과 같다', await 신고.질문글(), expected.질문);
      const 힌트 = await verify('의견 칸 힌트가 기대값과 같다', await 신고.의견힌트글(), expected.힌트);
      await verify('신고 의견 쓰기에 「우리가 더 알아야 할 내용이 있나요?」와 힌트 「추가 의견」이 보인다', 질문 && 힌트, true);
    });
  });

  await test.case(프로필신고, async ({ params }) => {
    await test.step('프로필 메뉴 「Report account」를 누른다', async () => {
      await 프로필신고열기(params.사용자명);
      const 제목 = await verify('프로필 신고 제목이 「spam_shop 신고」다', await 신고.위막대제목글(), `${params.사용자명} 신고`);
      const 질문 = await verify('프로필 신고 질문이 「spam_shop에 어떠한 문제라도 있나요?」다', await 신고.질문글(), `${params.사용자명}에 어떠한 문제라도 있나요?`);
      await verify('프로필 메뉴로 신고하면 제목 「spam_shop 신고」 · 질문 「spam_shop에 어떠한 문제라도 있나요?」가 보인다', 제목 && 질문, true);
    });
  });

  await test.case(신고보내기, async ({ params, expected }) => {
    await test.step('spam_shop 신고 의견 쓰기 화면으로 간다', async () => {
      await 프로필신고열기(params.사용자명);
      await 신고.이유누르기('스팸입니다');
      await 신고.다음누르기();
      await 신고.질문될때까지('이 신고에 대해서 더 참고해야 할 게시물이 있나요?');
      await 신고.다음누르기();
      await verify('의견 쓰기 화면이 보인다', await 신고.의견칸있나(), true, { blocker: true });
    });
    await test.step('의견 쓰기에서 「다음」을 누른다', async () => {
      await 신고.다음누르기();
      const 도장 = await verify('완료 화면 도장이 기대값과 같다', await 신고.완료도장글(), expected.도장);
      const 감사 = await verify('완료 화면 안내가 기대값과 같다', await 신고.완료제목글(), expected.감사);
      await verify('의견 쓰기에서 「다음」을 누르면 전송 뒤 완료 화면에 「신고됨」 · 「신고해주셔서 감사합니다. 저희 중재팀이 확인할 예정입니다.」가 보인다', 도장 && 감사, true);
      await 신고.완료누르기();
    });
  });

  await test.case(규칙고르기, async ({ params }) => {
    await test.step('「서버 규칙을 위반합니다」를 고른다', async () => {
      await 글신고열기(params.사용자명, await 글조각(params.사용자명));
      await 신고.이유누르기('서버 규칙을 위반합니다');
      await 신고.다음누르기();
      await verify('「서버 규칙을 위반합니다」를 고르면 규칙 고르기 「어떤 규칙을 위반했나요?」로 간다', await 신고.질문될때까지('어떤 규칙을 위반했나요?'), true);
    });
  });
});
