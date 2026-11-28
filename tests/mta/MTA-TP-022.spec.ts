import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지, 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 사람글찾기 } from './helpers/api.helper.js';
import {
  고르기창닫기,
  사진붙이기,
  새글쓰기열기,
  인용글쓰기열기,
  인용글쓰기가열릴때까지,
} from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 길이글 } from './helpers/test-data.helper.js';
import { 글쓰기첨부 } from './pages/compose-media.page.js';
import { 글쓰기투표 } from './pages/compose-poll.page.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

const 본문힌트 = defineCase({
  tcId: 'MTA-UI-172',
  name: '글쓰기 본문 칸에 힌트 「당신의 생각을 입력하거나 붙여넣으세요」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 새 글쓰기 화면을 열었다', '남의 공개 글을 「인용하기」로 연 글쓰기다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    새글힌트: z.string().describe('새 글쓰기 본문 칸 힌트').default('당신의 생각을 입력하거나 붙여넣으세요'),
    인용힌트: z.string().describe('인용 글쓰기 본문 칸 힌트').default('대화에 무언가를 추가하세요'),
  }),
});

const 투표항목두개 = defineCase({
  tcId: 'MTA-FN-225',
  name: '투표 항목 값이 1개면 「게시」가 꺼져 있다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 글쓰기에 투표를 붙였다', '글쓰기에 투표가 붙어 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    본문: z.string().min(1).max(500).describe('글쓰기 본문 — 「QA TP022」로 시작하는 500자까지').default('QA TP022 투표 항목 수'),
    첫항목: z.string().min(1).describe('투표 첫째 항목').default('가'),
    둘째항목: z.string().min(1).describe('투표 둘째 항목').default('나'),
  }),
  expected: null,
});

const 투표항목최대 = defineCase({
  tcId: 'MTA-FN-233',
  name: '투표 항목이 4개가 되면 「투표 옵션 추가」가 더 보이지 않는다',
  platforms: ['android'],
  precondition: ['글쓰기에 투표가 붙어 있다', '투표 항목이 4개다'],
  techniques: ['경계값 분석'],
  params: z.object({
    첫항목: z.string().min(1).describe('투표 첫째 항목').default('가'),
    둘째항목: z.string().min(1).describe('투표 둘째 항목').default('나'),
  }),
  expected: z.object({ 최대: z.number().describe('투표 항목 최대 개수').default(4) }),
});

const 투표항목글자수 = defineCase({
  tcId: 'MTA-FN-634',
  name: '투표 항목에 50자를 적으면 50자가 다 들어간다',
  platforms: ['android'],
  precondition: ['글쓰기에 투표가 붙어 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    안쪽: z.number().int().min(1).describe('투표 항목에 적을 글자 수 — 50').default(50),
    바깥쪽: z.number().int().min(1).describe('투표 항목에 적을 글자 수 — 51').default(51),
  }),
  expected: z.object({ 들어가는글자: z.number().describe('투표 항목에 들어가는 최대 글자 수').default(50) }),
});

const 설문길이창 = defineCase({
  tcId: 'MTA-UI-192',
  name: '설문 길이 창에 5분 · 30분 · 1시간 · 6시간 · 12시간 · 1일 · 3일 · 1 주가 보이고 1일이 기본으로 골라져 있다',
  platforms: ['android'],
  precondition: ['글쓰기에 투표가 붙어 있다'],
  params: z.object({}),
  expected: null,
});

const 스타일창 = defineCase({
  tcId: 'MTA-UI-193',
  name: '투표 스타일 창에 「선택해 주세요」 · 「다중 선택」이 보인다',
  platforms: ['android'],
  precondition: ['글쓰기에 투표가 붙어 있다'],
  params: z.object({}),
  expected: null,
});

const 미디어투표잠김 = defineCase({
  tcId: 'MTA-FN-238',
  name: '투표가 있으면 「미디어 추가」 버튼이 꺼진다',
  platforms: ['android'],
  precondition: ['글쓰기에 투표가 붙어 있다', '글쓰기에 사진 하나를 붙였다'],
  techniques: ['결정 테이블'],
  params: z.object({}),
  expected: null,
});

const 항목순서 = defineCase({
  tcId: 'MTA-FN-244',
  name: '투표 항목을 끌면 항목 순서가 「나」 · 「가」로 바뀐다',
  platforms: ['android'],
  precondition: ['투표 항목 「가」 · 「나」가 있다'],
  params: z.object({
    첫항목: z.string().min(1).describe('투표 첫째 항목').default('가'),
    둘째항목: z.string().min(1).describe('투표 둘째 항목').default('나'),
  }),
  expected: z.object({ 순서: z.string().describe('끈 뒤 항목 순서 — 쉼표로 이은 글').default('나,가') }),
});

const 인용중도구잠김 = defineCase({
  tcId: 'MTA-FN-239',
  name: '인용 중인 글쓰기를 열면 「미디어 추가」 · 「투표 추가」 버튼이 둘 다 꺼져 있다',
  platforms: ['android'],
  precondition: ['남의 공개 글을 「인용하기」로 연 글쓰기다'],
  params: z.object({}),
  expected: null,
});

const 손잡이끌어지우기 = defineCase({
  tcId: 'MTA-FN-243',
  name: '투표 항목이 2개면 손잡이를 끌어도 항목이 지워지지 않는다',
  platforms: ['android'],
  precondition: ['투표 항목이 2개다', '투표 항목이 3개다'],
  techniques: ['경계값 분석'],
  held: '보류 — 손잡이를 끄는 동안에만 뜨는 삭제 영역을 kit 끌어놓기로 짚을 수 없다 (해 본 것: 20261128031714567-투표-손잡이-끌기.json · 항목 둘에서 손잡이를 위 막대로 1번)',
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-022',
  name: '글쓰기 — 투표와 버튼 잠김',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [본문힌트, 투표항목두개, 투표항목최대, 투표항목글자수, 설문길이창, 스타일창, 미디어투표잠김, 항목순서, 인용중도구잠김, 손잡이끌어지우기],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 투표 = new 글쓰기투표(driver);
  const 첨부 = new 글쓰기첨부(driver);
  let 나: 계정 | undefined;

  const 투표붙인글쓰기열기 = async (): Promise<글쓰기화면> => {
    const 글쓰기 = await 새글쓰기열기(driver);
    await 글쓰기.도구누르기('투표');
    if (!(await 투표.떴나(10_000))) throw new Error('글쓰기에 투표 칸이 안 붙었다');
    return 글쓰기;
  };

  await test.case(본문힌트, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어가 새 글쓰기 화면을 연다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      const 글쓰기 = await 새글쓰기열기(driver);
      await verify('새 글쓰기 화면이 보인다', await 글쓰기.새게시물떴나(), true, { blocker: true });
    });
    await test.step('새 글쓰기 본문 칸 힌트를 확인한다', async () => {
      const 글쓰기 = new 글쓰기화면(driver);
      await verify('글쓰기 본문 칸에 힌트 「당신의 생각을 입력하거나 붙여넣으세요」가 보인다', await 글쓰기.본문칸글(), expected.새글힌트);
    });
    await test.step('남의 공개 글을 인용하는 글쓰기를 연다', async () => {
      const 남의글 = await 사람글찾기(나!, 'cafe_moon', (x) => x.visibility === 'public' && x.reblog === null, '공개 글');
      await 인용글쓰기열기(driver, 남의글);
      await 인용글쓰기가열릴때까지(driver);
    });
    await test.step('인용 중인 본문 칸 힌트를 확인한다', async () => {
      const 글쓰기 = new 글쓰기화면(driver);
      await verify('인용 중인 글쓰기 본문 칸에 힌트 「대화에 무언가를 추가하세요」가 보인다', await 글쓰기.본문칸글(), expected.인용힌트);
    });
  });

  await test.case(투표항목두개, async ({ params }) => {
    await test.step('투표를 붙인 새 글쓰기 화면을 연다', async () => {
      const 글쓰기 = await 투표붙인글쓰기열기();
      await 글쓰기.본문적기(params.본문);
    });
    await test.step('투표 항목 하나만 채운다', async () => {
      await 투표.항목적기(0, params.첫항목);
      const 글쓰기 = new 글쓰기화면(driver);
      await verify('투표 항목 값이 1개면 「게시」가 꺼져 있다', await 글쓰기.게시꺼질때까지(), true);
    });
    await test.step('투표 항목 둘을 채운다', async () => {
      await 투표.항목적기(1, params.둘째항목);
      const 글쓰기 = new 글쓰기화면(driver);
      await verify('투표 항목 값이 2개일 때는 「게시」가 켜진다', await 글쓰기.게시켜질때까지(), true);
    });
  });

  await test.case(투표항목최대, async ({ params, expected }) => {
    await test.step('항목 둘을 채운 투표를 붙인 새 글쓰기 화면을 연다', async () => {
      await 투표붙인글쓰기열기();
      await 투표.항목적기(0, params.첫항목);
      await 투표.항목적기(1, params.둘째항목);
    });
    await test.step('투표 항목을 4개까지 늘린다', async () => {
      await 투표.항목추가누르기();
      await 투표.항목추가누르기();
      const 넷 = await verify('투표 항목이 4개가 된다', await 투표.항목이될때까지(expected.최대), true);
      const 사라짐 = await 사라질때까지(driver, 글쓰기투표.항목추가, 5_000);
      await verify('투표 항목이 4개가 되면 「투표 옵션 추가」가 더 보이지 않는다', 넷 && 사라짐, true);
    });
    await test.step('5번째 항목을 더할 수 있는지 확인한다', async () => {
      const 개수 = await 투표.항목수();
      const 추가없음 = !(await 투표.항목추가있나());
      await verify('투표 항목은 5개가 되지 않는다', 개수 === expected.최대 && 추가없음, true);
    });
  });

  await test.case(투표항목글자수, async ({ params, expected }) => {
    await test.step('투표를 붙인 글자 수 확인용 새 글쓰기 화면을 연다', async () => {
      await 투표붙인글쓰기열기();
    });
    await test.step('투표 항목에 50자를 적는다', async () => {
      await 투표.항목적기(0, 길이글(params.안쪽, '가'));
      await verify('투표 항목에 50자를 적으면 50자가 다 들어간다', (await 투표.항목글(0)).length, expected.들어가는글자);
    });
    await test.step('투표 항목에 51자를 적는다', async () => {
      await 투표.항목적기(0, 길이글(params.바깥쪽, '가'));
      await verify('투표 항목에 51자를 적어도 50자까지만 들어간다', (await 투표.항목글(0)).length, expected.들어가는글자);
    });
  });

  await test.case(설문길이창, async () => {
    await test.step('설문 길이를 보려고 투표를 붙인 새 글쓰기 화면을 연다', async () => {
      await 투표붙인글쓰기열기();
    });
    await test.step('「설문 길이」를 누른다', async () => {
      await 투표.설문길이누르기();
      await 투표.선택창떴나();
      const 글들 = await 투표.선택창글들();
      const 오분 = await verify('설문 길이 창에 「5분」이 보인다', 글들.includes('5분'), true);
      const 삼십분 = await verify('설문 길이 창에 「30분」이 보인다', 글들.includes('30분'), true);
      const 한시간 = await verify('설문 길이 창에 「1시간」이 보인다', 글들.includes('1시간'), true);
      const 여섯시간 = await verify('설문 길이 창에 「6시간」이 보인다', 글들.includes('6시간'), true);
      const 열두시간 = await verify('설문 길이 창에 「12시간」이 보인다', 글들.includes('12시간'), true);
      const 하루 = await verify('설문 길이 창에 「1일」이 보인다', 글들.includes('1일'), true);
      const 사흘 = await verify('설문 길이 창에 「3일」이 보인다', 글들.includes('3일'), true);
      const 한주 = await verify('설문 길이 창에 「1 주」가 보인다', 글들.includes('1 주'), true);
      const 기본 = await verify('설문 길이 창에서 「1일」이 골라져 있다', await 투표.선택창골라졌나('1일'), true);
      await verify(
        '설문 길이 창에 5분 · 30분 · 1시간 · 6시간 · 12시간 · 1일 · 3일 · 1 주가 보이고 1일이 기본으로 골라져 있다',
        오분 && 삼십분 && 한시간 && 여섯시간 && 열두시간 && 하루 && 사흘 && 한주 && 기본,
        true,
      );
      await 고르기창닫기(driver);
    });
  });

  await test.case(스타일창, async () => {
    await test.step('투표 스타일을 보려고 투표를 붙인 새 글쓰기 화면을 연다', async () => {
      await 투표붙인글쓰기열기();
    });
    await test.step('「스타일」을 누른다', async () => {
      await 투표.스타일누르기();
      await 투표.스타일창떴나();
      const 글들 = await 투표.스타일창글읽기();
      const 단일 = await verify('투표 스타일 창에 「선택해 주세요」가 보인다', 글들.includes('선택해 주세요'), true);
      const 다중 = await verify('투표 스타일 창에 「다중 선택」이 보인다', 글들.includes('다중 선택'), true);
      await verify('투표 스타일 창에 「선택해 주세요」 · 「다중 선택」이 보인다', 단일 && 다중, true);
      await 고르기창닫기(driver);
    });
  });

  await test.case(미디어투표잠김, async () => {
    await test.step('미디어 버튼을 보려고 투표를 붙인 새 글쓰기 화면을 연다', async () => {
      await 투표붙인글쓰기열기();
    });
    await test.step('투표가 있는 채 「미디어 추가」 버튼을 확인한다', async () => {
      const 글쓰기 = new 글쓰기화면(driver);
      await verify('투표가 있으면 「미디어 추가」 버튼이 꺼진다', !(await 글쓰기.도구켜졌나('미디어')), true);
    });
    await test.step('사진 하나를 붙인 새 글쓰기 화면을 연다', async () => {
      const 글쓰기 = await 새글쓰기열기(driver);
      await 사진붙이기(driver, 글쓰기);
      await verify('글쓰기에 사진 하나가 붙는다', await 첨부.첨부가될때까지(1), true, { blocker: true });
    });
    await test.step('미디어가 있는 채 「투표 추가」 버튼을 확인한다', async () => {
      const 글쓰기 = new 글쓰기화면(driver);
      await verify('미디어가 있을 때는 「투표 추가」 버튼이 꺼진다', !(await 글쓰기.도구켜졌나('투표')), true);
    });
  });

  await test.case(항목순서, async ({ params, expected }) => {
    await test.step('항목 「가」 · 「나」를 채운 투표를 붙인 새 글쓰기 화면을 연다', async () => {
      await 투표붙인글쓰기열기();
      await 투표.항목적기(0, params.첫항목);
      await 투표.항목적기(1, params.둘째항목);
    });
    await test.step('「나」 항목 손잡이를 「가」 위로 끈다', async () => {
      await 투표.손잡이끌기(1, 0);
      const 바뀜 = await 될때까지(driver, async () => (await 투표.항목글들()).join(',') === expected.순서, 10_000);
      await verify('투표 항목을 끌면 항목 순서가 「나」 · 「가」로 바뀐다', 바뀜, true);
    });
  });

  await test.case(인용중도구잠김, async () => {
    await test.step('버튼이 꺼지는지 보려고 남의 공개 글을 인용하는 글쓰기를 연다', async () => {
      const 남의글 = await 사람글찾기(나!, 'cafe_moon', (x) => x.visibility === 'public' && x.reblog === null, '공개 글');
      await 인용글쓰기열기(driver, 남의글);
      await 인용글쓰기가열릴때까지(driver);
    });
    await test.step('인용 중인 글쓰기 도구 줄을 확인한다', async () => {
      const 글쓰기 = new 글쓰기화면(driver);
      const 미디어꺼짐 = await verify('인용 중인 글쓰기의 「미디어 추가」 버튼이 꺼져 있다', !(await 글쓰기.도구켜졌나('미디어')), true);
      const 투표꺼짐 = await verify('인용 중인 글쓰기의 「투표 추가」 버튼이 꺼져 있다', !(await 글쓰기.도구켜졌나('투표')), true);
      await verify('인용 중인 글쓰기를 열면 「미디어 추가」 · 「투표 추가」 버튼이 둘 다 꺼져 있다', 미디어꺼짐 && 투표꺼짐, true);
    });
  });

  await test.case(손잡이끌어지우기, async () => {
    await test.step('항목이 2개일 때 손잡이를 길게 눌러 끈다', async () => {
      await 투표.손잡이끌기(1, 0);
      await verify('투표 항목이 2개면 손잡이를 끌어도 항목이 지워지지 않는다', await 투표.항목수(), 2);
    });
    await test.step('항목이 3개일 때 손잡이를 길게 눌러 삭제 영역으로 끈다', async () => {
      await 투표.손잡이끌기(2, 0);
      await verify('투표 항목이 3개일 때는 손잡이를 삭제 영역으로 끌어 지울 수 있다', await 투표.항목수(), 2);
    });
  });
});
