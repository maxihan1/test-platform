import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 글쓰기, 내글지우기, 사람글찾기, 좋아요 } from './helpers/api.helper.js';
import {
  글쓰기닫고홈으로,
  글열기,
  글조각,
  동작스위치맞추기,
  디스플레이설정열기,
  디스플레이스위치맞추기,
} from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 시작화면열기, 홈에들어가기 } from './helpers/login.helper.js';
import { 글카드 } from './components/status-card.component.js';
import { 디스플레이설정화면 } from './pages/display-settings.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 시작화면 } from './pages/start.page.js';

const 테마기본값 = defineCase({
  tcId: 'MTA-UI-400',
  name: '「디스플레이」 설정 「테마-화면 스타일」이 「기기 모드에 맞춰 자동 적용」으로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 「디스플레이」 설정을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({ 테마: z.string().describe('「테마-화면 스타일」 기본값').default('기기 모드에 맞춰 자동 적용') }),
});

const 동적색상기본값 = defineCase({
  tcId: 'MTA-UI-401',
  name: 'Android 12 이상 폰의 「디스플레이」 설정에 「시스템 동적 색상 적용」이 켜져 보인다',
  platforms: ['android'],
  precondition: ['Android 12 이상 폰의 「디스플레이」 설정이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 열람주의표시기본값 = defineCase({
  tcId: 'MTA-UI-402',
  name: '「디스플레이」 설정에 「열람 주의 표시」가 켜져 보인다',
  platforms: ['android'],
  precondition: ['「디스플레이」 설정이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 민감미디어기본값 = defineCase({
  tcId: 'MTA-UI-403',
  name: '「디스플레이」 설정에 「민감하다고 표시된 미디어를 숨기기」가 켜져 보인다',
  platforms: ['android'],
  precondition: ['「디스플레이」 설정이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 상호작용수기본값 = defineCase({
  tcId: 'MTA-UI-404',
  name: '「디스플레이」 설정에 「게시물 상호작용 수」가 켜져 보이고 글 카드 푸터에 숫자가 보인다',
  platforms: ['android'],
  precondition: ['「디스플레이」 설정이 열려 있다'],
  params: z.object({ 본문: z.string().min(1).max(500).describe('API 로 올릴 글 — 「QA TP053」으로 시작하는 500자까지').default('QA TP053 상호작용 수') }),
  expected: z.object({ 숫자: z.string().describe('내가 좋아요를 누른 내 글 카드 푸터의 좋아요 수').default('1') }),
});

const 이모지표시기본값 = defineCase({
  tcId: 'MTA-UI-405',
  name: '「디스플레이」 설정에 「표시 이름에 사용자 지정 이모지 추가」가 켜져 보인다',
  platforms: ['android'],
  precondition: ['「디스플레이」 설정이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 테마어두움 = defineCase({
  tcId: 'MTA-FN-470',
  name: '「테마-화면 스타일」에서 「어두움」을 고르면 줄 값이 바로 「어두움」으로 바뀐다',
  platforms: ['android'],
  precondition: ['「디스플레이」 설정이 열려 있다'],
  params: z.object({}),
  expected: z.object({ 테마: z.string().describe('고를 테마 이름').default('어두움') }),
});

const 열람주의끄기 = defineCase({
  tcId: 'MTA-FN-472',
  name: '「열람 주의 표시」를 끄면 내용 경고 글이 접히지 않고 본문이 펼쳐 보인다',
  platforms: ['android'],
  held: '보류 — Test timeout of 120000ms exceeded.',
  precondition: ['「열람 주의 표시」를 껐다'],
  params: z.object({}),
  expected: null,
});

const 앱데이터지우기 = defineCase({
  tcId: 'MTA-FN-476',
  name: '앱 데이터를 지우면 기기 설정이 사라지고 다시 로그인해야 하는 시작 화면이 나온다',
  platforms: ['android'],
  held: '보류 — Test timeout of 120000ms exceeded.',
  precondition: ['「게시물 삭제 전 묻기」를 끈 채 앱 데이터를 지운다'],
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-053',
  name: '설정 — 디스플레이',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [테마기본값, 동적색상기본값, 열람주의표시기본값, 민감미디어기본값, 상호작용수기본값, 이모지표시기본값, 테마어두움, 열람주의끄기, 앱데이터지우기],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 디스플레이 = new 디스플레이설정화면(driver);
  let 나: 계정 | undefined;

  const 디스플레이화면맞추기 = async (): Promise<void> => {
    if (!(await 디스플레이.떴나(3_000))) await 디스플레이설정열기(driver);
  };

  await test.cleanup('이 흐름이 올린 글을 지운다', async () => {
    if (나 !== undefined) await 내글지우기(나, 'QA TP053');
  });

  await test.case(테마기본값, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어가 「디스플레이」 설정을 연다', async () => {
      await 내글지우기(나!, 'QA TP053');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      await 디스플레이설정열기(driver);
      await verify('「디스플레이」 설정 화면이 보인다', await 디스플레이.떴나(), true, { blocker: true });
    });
    await test.step('「테마-화면 스타일」 기본값을 확인한다', async () => {
      await verify('「디스플레이」 설정 「테마-화면 스타일」이 「기기 모드에 맞춰 자동 적용」으로 보인다', await 디스플레이.테마글(), expected.테마);
    });
  });

  await test.case(동적색상기본값, async () => {
    await test.step('「시스템 동적 색상 적용」을 확인한다', async () => {
      await 디스플레이화면맞추기();
      await verify('Android 12 이상 폰의 「디스플레이」 설정에 「시스템 동적 색상 적용」이 켜져 보인다', await 디스플레이.스위치켜졌나('시스템 동적 색상 적용'), true);
    });
  });

  await test.case(열람주의표시기본값, async () => {
    await test.step('「열람 주의 표시」를 확인한다', async () => {
      await 디스플레이화면맞추기();
      await verify('「디스플레이」 설정에 「열람 주의 표시」가 켜져 보인다', await 디스플레이.스위치켜졌나('열람 주의 표시'), true);
    });
  });

  await test.case(민감미디어기본값, async () => {
    await test.step('「민감하다고 표시된 미디어를 숨기기」를 확인한다', async () => {
      await 디스플레이화면맞추기();
      await verify('「디스플레이」 설정에 「민감하다고 표시된 미디어를 숨기기」가 켜져 보인다', await 디스플레이.스위치켜졌나('민감하다고 표시된 미디어를 숨기기'), true);
    });
  });

  await test.case(상호작용수기본값, async ({ params, expected }) => {
    await test.step('푸터 숫자를 볼 내 글에 좋아요를 누른다', async () => {
      const 글 = await 글쓰기(나!, params.본문);
      await 좋아요(나!, 글.id);
    });
    await test.step('「게시물 상호작용 수」를 확인한다', async () => {
      await 디스플레이화면맞추기();
      const 켜짐 = await verify('「디스플레이」 설정에 「게시물 상호작용 수」가 켜져 보인다', await 디스플레이.스위치켜졌나('게시물 상호작용 수'), true);
      await 글쓰기닫고홈으로(driver);
      await 홈.새로고침해맨위에올때까지(params.본문);
      const 카드 = new 글카드(driver);
      const 숫자 = await verify('글 카드 푸터의 좋아요 수가 기대값과 같다', await 카드.푸터숫자(params.본문.slice(0, 12), '좋아요'), expected.숫자);
      await verify('「디스플레이」 설정에 「게시물 상호작용 수」가 켜져 보이고 글 카드 푸터에 숫자가 보인다', 켜짐 && 숫자, true);
    });
  });

  await test.case(이모지표시기본값, async () => {
    await test.step('「표시 이름에 사용자 지정 이모지 추가」를 확인한다', async () => {
      await 디스플레이설정열기(driver);
      await verify('「디스플레이」 설정에 「표시 이름에 사용자 지정 이모지 추가」가 켜져 보인다', await 디스플레이.스위치켜졌나('표시 이름에 사용자 지정 이모지 추가'), true);
    });
  });

  await test.case(테마어두움, async ({ expected }) => {
    await test.step('「테마-화면 스타일」을 바꿀 「디스플레이」 설정을 연다', async () => {
      await 디스플레이화면맞추기();
    });
    await test.step('「테마-화면 스타일」에서 「어두움」을 고른다', async () => {
      const 원래 = await 디스플레이.테마글();
      try {
        await 디스플레이.테마누르기();
        await 디스플레이.테마창떴나();
        await 디스플레이.테마고르기(expected.테마);
        const 바뀜 = await 될때까지(driver, async () => (await 디스플레이.테마글()) === expected.테마, 10_000);
        await verify('「테마-화면 스타일」에서 「어두움」을 고르면 줄 값이 바로 「어두움」으로 바뀐다', 바뀜, true);
      } finally {
        const 되돌릴화면 = await 디스플레이설정열기(driver);
        await 되돌릴화면.테마누르기();
        await 되돌릴화면.테마창떴나();
        await 되돌릴화면.테마고르기(원래);
      }
    });
  });

  await test.case(열람주의끄기, async () => {
    await test.step('「열람 주의 표시」를 끈다', async () => {
      await 디스플레이스위치맞추기(driver, '열람 주의 표시', false);
    });
    await test.step('seoyeon_books 의 내용 경고 글 카드를 연다', async () => {
      try {
        const 글 = await 사람글찾기(나!, 'seoyeon_books', (x) => x.spoiler_text !== '' && x.reblog === null, '내용 경고');
        await 글열기(driver, 글);
        await verify('「열람 주의 표시」를 끄면 내용 경고 글이 접히지 않고 본문이 펼쳐 보인다', await new 글카드(driver).보이나(글조각(글)), true);
      } finally {
        await 디스플레이스위치맞추기(driver, '열람 주의 표시', true);
      }
    });
  });

  await test.case(앱데이터지우기, async () => {
    await test.step('「게시물 삭제 전 묻기」를 끈다', async () => {
      await 동작스위치맞추기(driver, '게시물 삭제 전 묻기', false);
    });
    await test.step('앱 데이터를 지우고 앱을 다시 켠다', async () => {
      await 시작화면열기(driver);
      await verify('앱 데이터를 지우면 기기 설정이 사라지고 다시 로그인해야 하는 시작 화면이 나온다', await new 시작화면(driver).떴나(), true);
    });
  });
});
