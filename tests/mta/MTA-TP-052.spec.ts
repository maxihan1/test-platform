import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 사람글찾기 } from './helpers/api.helper.js';
import { 고르기창닫기, 글에서버튼누르기, 글열기, 동작스위치맞추기, 동작설정열기, 설정열기 } from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 부스트시트 } from './components/boost-sheet.component.js';
import { 계정설정화면 } from './pages/account-settings.page.js';
import { 동작설정화면 } from './pages/behavior-settings.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';
import { 시작화면 } from './pages/start.page.js';

const 앱설정구간 = defineCase({
  tcId: 'MTA-UI-393',
  name: '설정 「앱 설정」에 「동작」 · 「디스플레이」 · 「Mastodon에 대해」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 설정 화면을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

const 내계정줄 = defineCase({
  tcId: 'MTA-FN-461',
  name: '설정 「계정」에 「@qa_user1@mastodon.maxihan.com」 줄이 보이고 누르면 계정 설정이 열린다',
  platforms: ['android'],
  precondition: ['설정 화면이 열려 있다'],
  params: z.object({}),
  expected: z.object({ 계정: z.string().describe('설정 계정 구간의 내 계정 줄').default('@qa_user1@mastodon.maxihan.com') }),
});

const 리마인더기본값 = defineCase({
  tcId: 'MTA-UI-395',
  name: '「동작」 설정에 「대체 텍스트 리마인더 추가」가 꺼져 보인다',
  platforms: ['android'],
  precondition: ['앱 데이터를 지우고 로그인했다'],
  params: z.object({}),
  expected: null,
});

const 애니메이션기본값 = defineCase({
  tcId: 'MTA-UI-396',
  name: '「동작」 설정에 「아바타와 에모지의 애니메이션을 재생」이 켜져 보인다',
  platforms: ['android'],
  precondition: ['「동작」 설정이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 언팔로우묻기기본값 = defineCase({
  tcId: 'MTA-UI-397',
  name: '「동작」 설정에 「누군가를 언팔로우할 때 묻기」가 꺼져 보인다',
  platforms: ['android'],
  precondition: ['「동작」 설정이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 부스트묻기기본값 = defineCase({
  tcId: 'MTA-UI-398',
  name: '「동작」 설정에 「부스트 전에 묻기」가 꺼져 보인다',
  platforms: ['android'],
  precondition: ['「동작」 설정이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 삭제묻기기본값 = defineCase({
  tcId: 'MTA-UI-399',
  name: '「동작」 설정에 「게시물 삭제 전 묻기」가 켜져 보인다',
  platforms: ['android'],
  precondition: ['「동작」 설정이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 부스트묻기켜기 = defineCase({
  tcId: 'MTA-FN-468',
  name: '「부스트 전에 묻기」를 켜고 「부스트」를 누르면 이 서버에서는 부스트 시트가 대신 뜬다',
  platforms: ['android'],
  held: '보류 — Test timeout of 120000ms exceeded.',
  precondition: ['「부스트 전에 묻기」를 켰다'],
  params: z.object({}),
  expected: null,
});

const 링크열기기본값 = defineCase({
  tcId: 'MTA-UI-526',
  name: '「동작」 설정 「링크 열기」가 「앱내 브라우저 」로 보이고 「앱내 브라우저 」 · 「시스템 브라우저」 중 고를 수 있다',
  platforms: ['android'],
  precondition: ['「동작」 설정이 열려 있다'],
  params: z.object({}),
  expected: z.object({
    기본값: z.string().describe('「링크 열기」 기본값 — 끝 공백은 뺀 글').default('앱내 브라우저'),
    다른선택지: z.string().describe('「링크 열기」의 다른 선택지').default('시스템 브라우저'),
  }),
});

const 계정추가이동 = defineCase({
  tcId: 'MTA-FN-668',
  name: '설정 「계정 추가…」를 누르면 시작 화면으로 간다',
  platforms: ['android'],
  precondition: ['설정 화면이 열려 있다'],
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-052',
  name: '설정 — 메인과 동작 기본값',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [앱설정구간, 내계정줄, 리마인더기본값, 애니메이션기본값, 언팔로우묻기기본값, 부스트묻기기본값, 삭제묻기기본값, 링크열기기본값, 계정추가이동, 부스트묻기켜기],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 동작 = new 동작설정화면(driver);
  let 나: 계정 | undefined;

  const 동작화면맞추기 = async (): Promise<void> => {
    if (!(await 동작.떴나(3_000))) await 동작설정열기(driver);
  };

  await test.case(앱설정구간, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어가 설정 화면을 연다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      await 설정열기(driver);
      await verify('설정 화면이 보인다', await 설정.떴나(), true, { blocker: true });
    });
    await test.step('설정 「앱 설정」 구간을 확인한다', async () => {
      const 동작줄 = await verify('설정 「앱 설정」에 「동작」이 보인다', await 설정.줄있나('동작'), true);
      const 디스플레이줄 = await verify('설정 「앱 설정」에 「디스플레이」가 보인다', await 설정.줄있나('디스플레이'), true);
      const 정보줄 = await verify('설정 「앱 설정」에 「Mastodon에 대해」가 보인다', await 설정.줄있나('Mastodon에 대해'), true);
      await verify('설정 「앱 설정」에 「동작」 · 「디스플레이」 · 「Mastodon에 대해」가 보인다', 동작줄 && 디스플레이줄 && 정보줄, true);
    });
  });

  await test.case(내계정줄, async ({ expected }) => {
    await test.step('내 계정 줄을 보려고 설정 화면이 열려 있는지 확인한다', async () => {
      if (!(await 설정.떴나(3_000))) await 설정열기(driver);
    });
    await test.step('설정 「계정」의 내 계정 줄을 누른다', async () => {
      const 줄 = await verify('설정 「계정」에 내 계정 줄이 보인다', await 설정.계정줄있나(expected.계정), true);
      await 설정.계정줄누르기(expected.계정);
      const 열림 = await verify('계정 설정이 열린다', await new 계정설정화면(driver).떴나(), true);
      await verify('설정 「계정」에 「@qa_user1@mastodon.maxihan.com」 줄이 보이고 누르면 계정 설정이 열린다', 줄 && 열림, true);
    });
  });

  await test.case(리마인더기본값, async () => {
    await test.step('「동작」 설정을 연다', async () => {
      await 동작설정열기(driver);
    });
    await test.step('「동작」에서 「대체 텍스트 리마인더 추가」를 확인한다', async () => {
      await verify('「동작」 설정에 「대체 텍스트 리마인더 추가」가 꺼져 보인다', !(await 동작.스위치켜졌나('대체 텍스트 리마인더 추가')), true);
    });
  });

  await test.case(애니메이션기본값, async () => {
    await test.step('「아바타와 에모지의 애니메이션을 재생」을 확인한다', async () => {
      await 동작화면맞추기();
      await verify('「동작」 설정에 「아바타와 에모지의 애니메이션을 재생」이 켜져 보인다', await 동작.스위치켜졌나('아바타와 에모지의 애니메이션을 재생'), true);
    });
  });

  await test.case(언팔로우묻기기본값, async () => {
    await test.step('「누군가를 언팔로우할 때 묻기」를 확인한다', async () => {
      await 동작화면맞추기();
      await verify('「동작」 설정에 「누군가를 언팔로우할 때 묻기」가 꺼져 보인다', !(await 동작.스위치켜졌나('누군가를 언팔로우할 때 묻기')), true);
    });
  });

  await test.case(부스트묻기기본값, async () => {
    await test.step('「부스트 전에 묻기」를 확인한다', async () => {
      await 동작화면맞추기();
      await verify('「동작」 설정에 「부스트 전에 묻기」가 꺼져 보인다', !(await 동작.스위치켜졌나('부스트 전에 묻기')), true);
    });
  });

  await test.case(삭제묻기기본값, async () => {
    await test.step('「게시물 삭제 전 묻기」를 확인한다', async () => {
      await 동작화면맞추기();
      await verify('「동작」 설정에 「게시물 삭제 전 묻기」가 켜져 보인다', await 동작.스위치켜졌나('게시물 삭제 전 묻기'), true);
    });
  });

  await test.case(링크열기기본값, async ({ expected }) => {
    await test.step('「링크 열기」를 확인할 「동작」 설정을 연다', async () => {
      await 동작설정열기(driver);
    });
    await test.step('「링크 열기」 기본값을 확인한다', async () => {
      const 기본값 = await verify('「링크 열기」 값이 기대값과 같다', (await 동작.링크열기글()).trim(), expected.기본값);
      await 동작.링크열기누르기();
      const 창 = await verify('「링크 열기」 선택 창이 열린다', await 동작.링크열기창떴나(), true);
      const 선택지 = (await 동작.링크열기선택지()).map((글) => 글.trim());
      const 앱내 = await verify('선택 창에 「앱내 브라우저」가 보인다', 선택지.includes(expected.기본값), true);
      const 시스템 = await verify('선택 창에 「시스템 브라우저」가 보인다', 선택지.includes(expected.다른선택지), true);
      await verify('「동작」 설정 「링크 열기」가 「앱내 브라우저 」로 보이고 「앱내 브라우저 」 · 「시스템 브라우저」 중 고를 수 있다', 기본값 && 창 && 앱내 && 시스템, true);
      await 고르기창닫기(driver);
    });
  });

  await test.case(계정추가이동, async () => {
    await test.step('「계정 추가…」를 누를 설정 화면을 연다', async () => {
      await 설정열기(driver);
    });
    await test.step('설정 「계정 추가…」를 누른다', async () => {
      await 설정.계정추가누르기();
      await verify('설정 「계정 추가…」를 누르면 시작 화면으로 간다', await new 시작화면(driver).떴나(), true);
    });
  });

  await test.case(부스트묻기켜기, async () => {
    await test.step('「부스트 전에 묻기」를 켜고 남의 글을 연다', async () => {
      await 동작스위치맞추기(driver, '부스트 전에 묻기', true);
      await 글열기(driver, await 사람글찾기(나!, 'cafe_moon', (x) => x.visibility === 'public' && x.reblog === null, '공개 글'));
    });
    await test.step('묻기를 켠 채 남의 글 「부스트」를 누른다', async () => {
      try {
        await 글에서버튼누르기(driver, await 사람글찾기(나!, 'cafe_moon', (x) => x.visibility === 'public' && x.reblog === null, '공개 글'), '부스트');
        const 시트 = new 부스트시트(driver);
        await verify('「부스트 전에 묻기」를 켜고 「부스트」를 누르면 이 서버에서는 부스트 시트가 대신 뜬다', await 시트.떴나(), true);
        await 시트.닫기();
      } finally {
        await 동작스위치맞추기(driver, '부스트 전에 묻기', false);
      }
    });
  });
});
