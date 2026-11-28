import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 내정보, 필터들, 필터지우기 } from './helpers/api.helper.js';
import { 안내글보이나, 필터목록열기 } from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 필터편집화면 } from './pages/filter-edit.page.js';
import { 뮤트단어화면 } from './pages/filter-words.page.js';
import { 필터목록화면 } from './pages/filters.page.js';
import { 홈화면 } from './pages/home.page.js';

const 공백제목 = defineCase({
  tcId: 'MTA-FN-669',
  name: '필터 제목에 공백만 넣고 「저장」을 누르면 빈 제목처럼 「비워둘 수 없습니다」로 막힌다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 필터 추가 화면을 열었다'],
  techniques: ['오류 추정'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    제목: z.string().min(1).describe('필터 제목에 넣을 공백 — 공백 글자만').default('   '),
  }),
  expected: null,
});

const 저장두번 = defineCase({
  tcId: 'MTA-FN-670',
  name: '필터 「저장」을 빠르게 두 번 누르면 「QA 두번 필터」는 하나만 생긴다',
  platforms: ['android'],
  precondition: ['필터 추가 화면에 제목 「QA 두번 필터」와 단어를 적었다'],
  techniques: ['오류 추정'],
  params: z.object({
    제목: z.string().min(1).describe('필터 제목 — 「QA」로 시작').default('QA 두번 필터'),
    단어: z.string().min(1).describe('뮤트할 단어').default('qa두번단어'),
  }),
  expected: z.object({ 개수: z.number().describe('생긴 같은 제목 필터 수').default(1) }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-072',
  name: '필터 편집 — 오류 추정',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [공백제목, 저장두번],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 목록 = new 필터목록화면(driver);
  const 편집 = new 필터편집화면(driver);
  const 단어 = new 뮤트단어화면(driver);
  let 나: 계정 | undefined;

  await test.cleanup('이 흐름이 만든 필터를 지운다', async () => {
    if (나 !== undefined) await 필터지우기(나, 'QA 두번 필터');
  });

  await test.case(공백제목, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('필터 추가 화면을 연다', async () => {
      await 필터목록열기(driver, (await 내정보(나!)).username);
      await 목록.추가누르기();
      await verify('필터 추가 화면이 보인다', await 편집.추가화면떴나(), true, { blocker: true });
    });
    await test.step('필터 제목에 공백만 적고 「저장」을 누른다', async () => {
      await 편집.제목적기(params.제목);
      await 편집.저장누르기();
      await verify('필터 제목에 공백만 넣고 「저장」을 누르면 빈 제목처럼 「비워둘 수 없습니다」로 막힌다', await 안내글보이나(driver, '비워둘 수 없습니다'), true);
    });
  });

  await test.case(저장두번, async ({ params, expected }) => {
    await test.step('필터 추가 화면에 제목과 단어를 적는다', async () => {
      await 필터지우기(나!, params.제목);
      await 편집.뒤로가기누르기();
      const 나가기 = 편집.나가기확인창();
      if (await 나가기.떴나(3_000)) await 나가기.확인누르기();
      await 필터목록열기(driver, (await 내정보(나!)).username);
      await 목록.추가누르기();
      if (!(await 편집.추가화면떴나())) throw new Error('필터 추가 화면이 안 열렸다');
      await 편집.제목적기(params.제목);
      await 편집.뮤트단어누르기();
      if (!(await 단어.떴나())) throw new Error('뮤트된 단어 화면이 안 열렸다');
      await 단어.단어더하기(params.단어);
      await 단어.닫기();
    });
    await test.step('필터 「저장」을 빠르게 두 번 누른다', async () => {
      await 편집.저장빠르게두번누르기();
      await 목록.떴나(15_000);
      const 같은제목 = await 될때까지(driver, async () => (await 필터들(나!)).some((x) => x.title === params.제목), 15_000);
      await verify('필터 「저장」을 빠르게 두 번 누르면 「QA 두번 필터」는 하나만 생긴다', 같은제목 ? (await 필터들(나!)).filter((x) => x.title === params.제목).length : 0, expected.개수);
    });
  });
});
