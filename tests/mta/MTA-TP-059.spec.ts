import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 클립보드쓰기, 클립보드읽기, 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 사람글찾기 } from './helpers/api.helper.js';
import { 굴려서줄있나, 글열기, 앱정보열기, 줄켜졌나 } from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 글카드 } from './components/status-card.component.js';
import { 앱정보화면 } from './pages/about.page.js';
import { 홈화면 } from './pages/home.page.js';

const 캐시부제 = defineCase({
  tcId: 'MTA-UI-444',
  name: '「미디어 캐시 지우기」 부제에 캐시 크기가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 「Mastodon에 대해」를 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

const 캐시지우기 = defineCase({
  tcId: 'MTA-FN-518',
  name: '「미디어 캐시 지우기」를 누르면 토스트 「미디어 캐시 지워짐」이 보인다',
  platforms: ['android'],
  precondition: ['「Mastodon에 대해」가 열려 있다'],
  params: z.object({}),
  expected: z.object({ 토스트: z.string().describe('캐시를 지운 뒤 뜨는 토스트 글').default('미디어 캐시 지워짐') }),
});

const 캐시영일때 = defineCase({
  tcId: 'MTA-FN-517',
  name: '캐시 크기가 0이면 「미디어 캐시 지우기」가 꺼진다',
  platforms: ['android'],
  precondition: ['미디어 캐시를 지웠다'],
  techniques: ['결정 테이블'],
  params: z.object({}),
  expected: null,
});

const 버전복사 = defineCase({
  tcId: 'MTA-FN-519',
  name: '맨 아래 버전 줄을 누르면 버전 정보가 클립보드에 복사된다',
  platforms: ['android'],
  precondition: ['클립보드에 「-」가 들어 있다'],
  params: z.object({ 처음글: z.string().min(1).describe('버전 줄을 누르기 전 클립보드에 넣어 둘 글 — 복사된 버전 정보와 다른 글').default('-') }),
  expected: null,
});

const 앱정보항목 = defineCase({
  tcId: 'MTA-UI-528',
  name: '「Mastodon에 대해」에 「추가 설정」 · 「마스토돈에 기여」 · 「이용 약관」 · 「개인정보 정책」 · 「미디어 캐시 지우기」와 맨 아래 「안드로이드용 마스토돈 v2.13.5 (194)」가 보인다',
  platforms: ['android'],
  precondition: ['「Mastodon에 대해」가 열려 있다'],
  params: z.object({}),
  expected: z.object({ 버전: z.string().describe('맨 아래 버전 줄 글').default('안드로이드용 마스토돈 v2.13.5 (194)') }),
});

const 추가설정링크 = defineCase({
  tcId: 'MTA-FN-698',
  name: '「추가 설정」을 누르면 https://mastodon.maxihan.com/auth/edit 가 열린다',
  platforms: ['android'],
  precondition: ['「Mastodon에 대해」가 열려 있다'],
  held: '보류 — 다른 앱 로그인 — 링크가 Chrome 으로 열리고 Chrome 첫 화면이 구글 계정 로그인을 묻는다',
  params: z.object({}),
  expected: null,
});

const 시스템브라우저링크 = defineCase({
  tcId: 'MTA-FN-699',
  name: '「링크 열기」가 「시스템 브라우저」면 링크가 앱 밖 Chrome 으로 열린다',
  platforms: ['android'],
  precondition: ['「링크 열기」가 「시스템 브라우저」다'],
  held: '보류 — 다른 앱 로그인 — 링크가 Chrome 으로 열리고 Chrome 첫 화면이 구글 계정 로그인을 묻는다',
  params: z.object({}),
  expected: null,
});

const 개인정보정책링크 = defineCase({
  tcId: 'MTA-FN-677',
  name: '「개인정보 정책」을 누르면 https://joinmastodon.org/privacy-policy 가 열린다',
  platforms: ['android'],
  precondition: ['「Mastodon에 대해」가 열려 있다'],
  held: '보류 — 다른 앱 로그인 — 링크가 Chrome 으로 열리고 Chrome 첫 화면이 구글 계정 로그인을 묻는다',
  params: z.object({}),
  expected: null,
});

const 이용약관링크 = defineCase({
  tcId: 'MTA-FN-678',
  name: '「이용 약관」을 누르면 https://mastodon.maxihan.com/terms 가 열린다',
  platforms: ['android'],
  precondition: ['「Mastodon에 대해」가 열려 있다'],
  held: '보류 — 다른 앱 로그인 — 링크가 Chrome 으로 열리고 Chrome 첫 화면이 구글 계정 로그인을 묻는다',
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-059',
  name: 'Mastodon에 대해',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [캐시부제, 캐시지우기, 캐시영일때, 버전복사, 추가설정링크, 시스템브라우저링크, 앱정보항목, 개인정보정책링크, 이용약관링크],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 정보 = new 앱정보화면(driver);
  let 나: 계정 | undefined;

  const 앱정보맞추기 = async (): Promise<void> => {
    if (!(await 정보.떴나(3_000))) await 앱정보열기(driver);
  };

  await test.case(캐시부제, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어가 사진 글을 열어 캐시를 채운다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      const 사진글 = await 사람글찾기(나!, 'hana_photo', (x) => x.media_attachments.length > 0 && x.reblog === null, '사진 글');
      await 글열기(driver, 사진글);
      const 카드 = new 글카드(driver);
      await 될때까지(driver, async () => (await 카드.화면사진설명들()).length > 0, 20_000);
    });
    await test.step('「Mastodon에 대해」를 연다', async () => {
      await 앱정보열기(driver);
      await verify('「Mastodon에 대해」 화면이 보인다', await 정보.떴나(), true, { blocker: true });
    });
    await test.step('「미디어 캐시 지우기」 부제를 확인한다', async () => {
      await verify('「미디어 캐시 지우기」 부제에 캐시 크기가 보인다', /\d/.test(await 정보.캐시부제()), true);
    });
  });

  await test.case(캐시지우기, async ({ expected }) => {
    await test.step('캐시를 지울 「Mastodon에 대해」가 열려 있는지 확인한다', async () => {
      await 앱정보맞추기();
    });
    await test.step('「미디어 캐시 지우기」를 누른다', async () => {
      await 정보.캐시지우기누르기();
      await verify('「미디어 캐시 지우기」를 누르면 토스트 「미디어 캐시 지워짐」이 보인다', await 정보.토스트에글자있나(expected.토스트), true);
    });
  });

  await test.case(캐시영일때, async () => {
    await test.step('캐시를 지운 뒤 「Mastodon에 대해」가 열려 있는지 확인한다', async () => {
      await 앱정보맞추기();
    });
    await test.step('캐시가 0인 「미디어 캐시 지우기」를 확인한다', async () => {
      const 꺼짐 = await 될때까지(driver, async () => !(await 줄켜졌나(driver, '미디어 캐시 지우기')), 10_000);
      await verify('캐시 크기가 0이면 「미디어 캐시 지우기」가 꺼진다', 꺼짐, true);
    });
  });

  await test.case(버전복사, async ({ params }) => {
    await test.step('클립보드에 「-」를 넣고 「Mastodon에 대해」를 연다', async () => {
      await 앱정보맞추기();
      await 클립보드쓰기(driver, params.처음글);
    });
    await test.step('맨 아래 버전 줄을 누른다', async () => {
      await 정보.버전줄누르기();
      const 복사됨 = await 될때까지(driver, async () => (await 클립보드읽기(driver)) !== params.처음글, 10_000);
      await verify('맨 아래 버전 줄을 누르면 버전 정보가 클립보드에 복사된다', 복사됨, true);
    });
  });

  await test.case(추가설정링크, async () => {
    await test.step('「추가 설정」을 누른다', async () => {
      await 앱정보열기(driver);
      await verify('「추가 설정」을 누르면 https://mastodon.maxihan.com/auth/edit 가 열린다', await 정보.줄있나('추가 설정'), true);
    });
  });

  await test.case(시스템브라우저링크, async () => {
    await test.step('「추가 설정」을 시스템 브라우저 설정으로 누른다', async () => {
      await 앱정보열기(driver);
      await verify('「링크 열기」가 「시스템 브라우저」면 링크가 앱 밖 Chrome 으로 열린다', await 정보.줄있나('추가 설정'), true);
    });
  });

  await test.case(앱정보항목, async ({ expected }) => {
    await test.step('맨 위부터 보이는 「Mastodon에 대해」를 다시 연다', async () => {
      await 앱정보열기(driver);
    });
    await test.step('「Mastodon에 대해」 항목을 확인한다', async () => {
      const 추가설정 = await verify('「Mastodon에 대해」에 「추가 설정」이 보인다', await 굴려서줄있나(driver, '추가 설정'), true);
      const 기여 = await verify('「Mastodon에 대해」에 「마스토돈에 기여」가 보인다', await 굴려서줄있나(driver, '마스토돈에 기여'), true);
      const 약관 = await verify('「Mastodon에 대해」에 「이용 약관」이 보인다', await 굴려서줄있나(driver, '이용 약관'), true);
      const 개인정보 = await verify('「Mastodon에 대해」에 「개인정보 정책」이 보인다', await 굴려서줄있나(driver, '개인정보 정책'), true);
      const 캐시 = await verify('「Mastodon에 대해」에 「미디어 캐시 지우기」가 보인다', await 굴려서줄있나(driver, '미디어 캐시 지우기'), true);
      const 버전 = await verify('맨 아래 버전 줄이 기대값과 같다', await 정보.버전줄글(), expected.버전);
      await verify(
        '「Mastodon에 대해」에 「추가 설정」 · 「마스토돈에 기여」 · 「이용 약관」 · 「개인정보 정책」 · 「미디어 캐시 지우기」와 맨 아래 「안드로이드용 마스토돈 v2.13.5 (194)」가 보인다',
        추가설정 && 기여 && 약관 && 개인정보 && 캐시 && 버전,
        true,
      );
    });
  });

  await test.case(개인정보정책링크, async () => {
    await test.step('「개인정보 정책」을 누른다', async () => {
      await 앱정보열기(driver);
      await verify('「개인정보 정책」을 누르면 https://joinmastodon.org/privacy-policy 가 열린다', await 정보.줄있나('개인정보 정책'), true);
    });
  });

  await test.case(이용약관링크, async () => {
    await test.step('「이용 약관」을 누른다', async () => {
      await 앱정보열기(driver);
      await verify('「이용 약관」을 누르면 https://mastodon.maxihan.com/terms 가 열린다', await 정보.줄있나('이용 약관'), true);
    });
  });
});
