import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 딥링크열기, 앱다시켜기, 움직이는화면에서, 클립보드쓰기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 꾸러미, 서버 } from './helpers/app.helper.js';
import { 시작화면으로 } from './helpers/flow-start.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 규칙화면 } from './pages/rules.page.js';
import { 가입서버고르기, 로그인서버고르기 } from './pages/server-pick.page.js';
import { 더알아보기시트, 시작화면 } from './pages/start.page.js';

const 시작버튼 = defineCase({
  tcId: 'MTA-UI-010',
  name: '시작 화면에 「<서버>에 가입하기」 · 「다른 서버 선택하기」 · 「로그인」 · 「더 알아보기」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 없다'],
  params: z.object({}),
  expected: null,
});

const 더알아보기 = defineCase({
  tcId: 'MTA-FN-016',
  name: '시작 화면에서 「더 알아보기」를 누르면 「Mastodon에 오신 것을 환영합니다」 · 「서버란 무엇인가요?」 설명 하단 시트가 뜬다',
  platforms: ['android'],
  precondition: ['시작 화면이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 다른서버 = defineCase({
  tcId: 'MTA-FN-014',
  name: '시작 화면에서 「다른 서버 선택하기」를 누르면 가입용 서버 고르기 화면이 열린다',
  platforms: ['android'],
  precondition: ['시작 화면이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 로그인 = defineCase({
  tcId: 'MTA-FN-015',
  name: '시작 화면에서 「로그인」을 누르면 로그인용 서버 고르기 화면이 열린다',
  platforms: ['android'],
  precondition: ['시작 화면이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 프로필링크 = defineCase({
  tcId: 'MTA-FN-545',
  name: '로그인된 계정이 없을 때 링크를 열면 시작 화면에서 아무 화면도 열리지 않는다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 없다'],
  params: z.object({ 프로필주소: z.string().min(1).describe('열 프로필 주소 — 앱이 자동으로 여는 mastodon.social 프로필 주소').default('https://mastodon.social/@Mastodon') }),
  expected: null,
});

const 공유받기 = defineCase({
  tcId: 'MTA-FN-521',
  name: '로그인 계정이 없을 때 공유받기로 들어오면 토스트 「먼저 마스토돈에 로그인해야 합니다」가 보인다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 없다'],
  params: z.object({ 공유주소: z.string().min(1).describe('공유 주소 — mastodon://share?text= 로 시작').default('mastodon://share?text=QA-TP001') }),
  expected: z.object({ 토스트: z.string().describe('공유받기 토스트 글').default('먼저 마스토돈에 로그인해야 합니다') }),
});

const 기본서버 = defineCase({
  tcId: 'MTA-FN-600',
  name: '시작 화면에서 기본 서버 버튼을 누르면 서버 규칙 화면으로 간다',
  platforms: ['android'],
  precondition: ['시작 화면이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 초대버튼 = defineCase({
  tcId: 'MTA-FN-599',
  name: '클립보드에 초대 링크가 있으면 기본 서버 버튼이 「<서버> 참여를 위해 초대하기」로 보인다',
  platforms: ['android'],
  precondition: ['클립보드에 우리 서버 초대 링크가 있다'],
  held: '보류 — 테스트 계정 없음 — 관리자 계정 값으로 웹 로그인하면 「올바르지 않은 이메일 주소 혹은 암호입니다.」로 거절돼 초대 링크를 만들 수 없다',
  params: z.object({ 초대링크: z.string().min(1).describe('클립보드에 넣을 우리 서버 초대 링크') }),
  expected: z.object({ 버튼글: z.string().describe('기본 서버 버튼 글').default(`${서버} 참여를 위해 초대하기`) }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-001',
  name: '시작 화면 — 버튼과 첫 안내',
  platforms: ['android'],
  precondition: ['로그인한 계정이 없다'],
  cases: [시작버튼, 더알아보기, 다른서버, 로그인, 프로필링크, 공유받기, 기본서버, 초대버튼],
});

test(procedure, async ({ driver }) => {
  const 시작 = new 시작화면(driver);

  await test.case(시작버튼, async () => {
    await test.step('앱을 켜 시작 화면을 연다', async () => {
      await 시작화면열기(driver);
      await verify('시작 화면이 열려 있다', await 시작.떴나(), true, { blocker: true });
      const 기본 = await verify('시작 화면에 「<서버>에 가입하기」 버튼이 보인다', (await 시작.기본서버버튼보이나()) && (await 시작.기본서버버튼글()).endsWith('에 가입하기'), true);
      const 다른 = await verify('시작 화면에 「다른 서버 선택하기」 버튼이 보인다', (await 시작.다른서버버튼보이나()) && (await 시작.다른서버버튼글()) === '다른 서버 선택하기', true);
      const 로그인버튼 = await verify('시작 화면에 「로그인」 버튼이 보인다', (await 시작.로그인버튼보이나()) && (await 시작.로그인버튼글()) === '로그인', true);
      const 더 = await verify('시작 화면에 「더 알아보기」 버튼이 보인다', (await 시작.더알아보기버튼보이나()) && (await 시작.더알아보기버튼글()) === '더 알아보기', true);
      await verify('시작 화면에 「<서버>에 가입하기」 · 「다른 서버 선택하기」 · 「로그인」 · 「더 알아보기」 버튼이 보인다', 기본 && 다른 && 로그인버튼 && 더, true);
    });
  });

  await test.case(더알아보기, async () => {
    await test.step('시작 화면에서 「더 알아보기」를 누른다', async () => {
      await 시작화면으로(driver);
      await verify('시작 화면이 열려 있다', await 시작.떴나(), true, { blocker: true });
      await 시작.더알아보기누르기();
      const 시트 = new 더알아보기시트(driver);
      const 떴다 = await verify('「더 알아보기」 하단 시트가 뜬다', await 시트.떴나(), true);
      const 글 = (await 시트.글읽기()).join('\n');
      const 환영 = await verify('하단 시트에 「Mastodon에 오신 것을 환영합니다」가 보인다', 글.includes('Mastodon에 오신 것을 환영합니다'), true);
      const 서버란 = await verify('하단 시트에 「서버란 무엇인가요?」가 보인다', 글.includes('서버란 무엇인가요?'), true);
      await verify('시작 화면에서 「더 알아보기」를 누르면 「Mastodon에 오신 것을 환영합니다」 · 「서버란 무엇인가요?」 설명 하단 시트가 뜬다', 떴다 && 환영 && 서버란, true);
    });
  });

  await test.case(다른서버, async () => {
    await test.step('시작 화면에서 「다른 서버 선택하기」를 누른다', async () => {
      await 시작화면으로(driver);
      await verify('시작 화면이 열려 있다', await 시작.떴나(), true, { blocker: true });
      await 시작.다른서버선택누르기();
      await verify('시작 화면에서 「다른 서버 선택하기」를 누르면 가입용 서버 고르기 화면이 열린다', await new 가입서버고르기(driver).떴나(), true);
    });
  });

  await test.case(로그인, async () => {
    await test.step('시작 화면에서 「로그인」을 누른다', async () => {
      await 시작화면으로(driver);
      await verify('시작 화면이 열려 있다', await 시작.떴나(), true, { blocker: true });
      await 시작.로그인누르기();
      await verify('시작 화면에서 「로그인」을 누르면 로그인용 서버 고르기 화면이 열린다', await new 로그인서버고르기(driver).떴나(), true);
    });
  });

  await test.case(프로필링크, async ({ params }) => {
    await test.step('계정 없이 mastodon.social 프로필 주소를 연다', async () => {
      await 시작화면으로(driver);
      await verify('시작 화면이 열려 있다', await 시작.떴나(), true, { blocker: true });
      await 딥링크열기(driver, params.프로필주소);
      const 남음 = await verify('시작 화면이 그대로 보인다', await 시작.떴나(10_000), true);
      const 프로필없음 = await verify('프로필 화면이 열리지 않는다', await new 프로필화면(driver).떴나(3_000), false);
      await verify('로그인된 계정이 없을 때 링크를 열면 시작 화면에서 아무 화면도 열리지 않는다', 남음 && 프로필없음, true);
    });
  });

  await test.case(공유받기, async ({ params, expected }) => {
    await test.step('계정 없이 공유 주소 mastodon://share?text=를 연다', async () => {
      await 시작화면으로(driver);
      await verify('시작 화면이 열려 있다', await 시작.떴나(), true, { blocker: true });
      const [, 토스트] = await 움직이는화면에서(driver, () => Promise.all([딥링크열기(driver, params.공유주소), 시작.토스트()]), 0);
      await verify('로그인 계정이 없을 때 공유받기로 들어오면 토스트 「먼저 마스토돈에 로그인해야 합니다」가 보인다', 토스트, expected.토스트);
    });
  });

  await test.case(기본서버, async () => {
    await test.step('시작 화면에서 기본 서버 버튼을 누른다', async () => {
      await 시작화면으로(driver);
      await verify('시작 화면이 열려 있다', await 시작.떴나(), true, { blocker: true });
      await 시작.기본서버누르기();
      await verify('시작 화면에서 기본 서버 버튼을 누르면 서버 규칙 화면으로 간다', await new 규칙화면(driver).떴나(60_000), true);
    });
  });

  await test.case(초대버튼, async ({ params, expected }) => {
    await test.step('클립보드에 초대 링크를 넣고 시작 화면을 다시 연다', async () => {
      await 시작화면으로(driver);
      await verify('시작 화면이 열려 있다', await 시작.떴나(), true, { blocker: true });
      await 클립보드쓰기(driver, params.초대링크);
      await 앱다시켜기(driver, 꾸러미);
      await verify('시작 화면이 다시 열려 있다', await 시작.떴나(), true, { blocker: true });
      await verify('클립보드에 초대 링크가 있으면 기본 서버 버튼이 「<서버> 참여를 위해 초대하기」로 보인다', await 시작.기본서버버튼글(), expected.버튼글);
    });
  });
});
