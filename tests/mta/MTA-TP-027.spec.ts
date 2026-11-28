import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 글, type 계정, 계정꺼내기, 글쓰기, 내글지우기, 사람글찾기 } from './helpers/api.helper.js';
import { 글열기, 인용글쓰기가열릴때까지, 인용글쓰기열기, 인용하기누르기, 조용한공개인용창넘기기 } from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

const 인용카드붙이기 = defineCase({
  tcId: 'MTA-FN-293',
  name: '부스트 시트 「인용하기」를 누르면 글쓰기에 인용 카드가 붙는다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있고 cafe_moon 의 공개 글이 있다', '내가 쓴 공개 글이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    내글: z.string().min(1).max(500).describe('API 로 올릴 내 공개 글 — 「QA TP027」로 시작하는 500자까지').default('QA TP027 인용할 내 글'),
  }),
  expected: null,
});

const 인용취소 = defineCase({
  tcId: 'MTA-FN-294',
  name: '인용 카드의 「인용 취소」를 누르면 인용 카드가 떨어진다',
  platforms: ['android'],
  precondition: ['글쓰기에 인용 카드가 붙어 있다'],
  params: z.object({}),
  expected: null,
});

const 조용한공개인용안내 = defineCase({
  tcId: 'MTA-FN-276',
  name: '제한적 공개 글을 인용하러 들어오면 「조용한 공개 게시물 인용하기」 창과 「무시」 · 「다시 알리지 않습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['seoyeon_books 의 조용한 공개 글이 있다'],
  params: z.object({}),
  expected: z.object({
    제목: z.string().describe('창 글').default('조용한 공개 게시물 인용하기'),
    무시: z.string().describe('창의 한 버튼 글').default('무시'),
    다시안함: z.string().describe('창의 다른 버튼 글').default('다시 알리지 않습니다'),
  }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-027',
  name: '인용 글쓰기',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [인용카드붙이기, 인용취소, 조용한공개인용안내],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 작성 = new 글쓰기화면(driver);
  let 나: 계정 | undefined;
  let 내공개글: 글 | undefined;

  const 남의공개글 = (): Promise<글> => 사람글찾기(나!, 'cafe_moon', (x) => x.visibility === 'public' && x.reblog === null, '공개 글');
  const 조용한공개글 = (): Promise<글> => 사람글찾기(나!, 'seoyeon_books', (x) => x.visibility === 'unlisted' && x.reblog === null, '조용한 공개');

  await test.cleanup('이 흐름이 올린 글을 지운다', async () => {
    if (나 !== undefined) await 내글지우기(나, 'QA TP027');
  });

  await test.case(인용카드붙이기, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어가 cafe_moon 의 공개 글을 연다', async () => {
      await 내글지우기(나!, 'QA TP027');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      await 글열기(driver, await 남의공개글());
    });
    await test.step('부스트 시트에서 「인용하기」를 누른다', async () => {
      await 인용하기누르기(driver, await 남의공개글());
      await verify('부스트 시트 「인용하기」를 누르면 글쓰기에 인용 카드가 붙는다', await 작성.인용카드있나(), true);
    });
    await test.step('내가 쓴 공개 글을 올리고 연다', async () => {
      내공개글 = await 글쓰기(나!, params.내글);
      await 글열기(driver, 내공개글);
    });
    await test.step('내 글의 부스트 시트에서 「인용하기」를 누른다', async () => {
      await 인용하기누르기(driver, 내공개글!);
      await verify('내 글도 「인용하기」로 글쓰기에 인용 카드를 붙일 수 있다', await 작성.인용카드있나(), true);
    });
  });

  await test.case(인용취소, async () => {
    await test.step('인용 카드를 붙인 글쓰기를 연다', async () => {
      await 인용글쓰기열기(driver, await 남의공개글());
      await 인용글쓰기가열릴때까지(driver);
    });
    await test.step('인용 카드의 「인용 취소」 버튼을 누른다', async () => {
      await 작성.인용취소누르기();
      await verify('인용 카드의 「인용 취소」를 누르면 인용 카드가 떨어진다', await 작성.인용카드사라질때까지(), true);
    });
  });

  await test.case(조용한공개인용안내, async ({ expected }) => {
    await test.step('조용한 공개 글을 연다', async () => {
      await 글열기(driver, await 조용한공개글());
    });
    await test.step('조용한 공개 글의 부스트 시트에서 「인용하기」를 누른다', async () => {
      await 인용하기누르기(driver, await 조용한공개글());
      const 창 = 작성.조용한공개인용창();
      const 제목 = await verify('「조용한 공개 게시물 인용하기」 창이 보인다', await 작성.창에글자있나(expected.제목, 10_000), true);
      const 버튼들 = [await 창.확인버튼글(), await 창.취소버튼글()];
      if (await 창.세번째버튼있나(1_000)) 버튼들.push(await 창.세번째버튼글());
      const 무시 = await verify('창에 「무시」 버튼이 보인다', 버튼들.includes(expected.무시), true);
      const 다시안함 = await verify('창에 「다시 알리지 않습니다」 버튼이 보인다', 버튼들.includes(expected.다시안함), true);
      await verify('제한적 공개 글을 인용하러 들어오면 「조용한 공개 게시물 인용하기」 창과 「무시」 · 「다시 알리지 않습니다」가 뜬다', 제목 && 무시 && 다시안함, true);
      await 조용한공개인용창넘기기(driver);
    });
  });
});
