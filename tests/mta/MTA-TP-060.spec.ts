import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 딥링크열기 } from '@platform/kit/parts';
import { z } from 'zod';

import { type 글, type 계정, 계정꺼내기, 글쓰기, 내글지우기, 사람글찾기 } from './helpers/api.helper.js';
import { 앱이닫힐때까지, 글공유시트열기 } from './helpers/flow-share.helper.js';
import { 꾸러미 } from './helpers/app.helper.js';
import { 글쓰기닫고홈으로, 글에서버튼누르기, 글열기 } from './helpers/flow-compose.helper.js';
import { 카드글자, 프로필열고글찾기 } from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 공유시트닫기, 공유시트떴나, 공유시트에서앱누르기, 공유시트에앱있나 } from './helpers/system-ui.helper.js';
import { 글카드 } from './components/status-card.component.js';
import { 글쓰기첨부 } from './pages/compose-media.page.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 미디어뷰어화면 } from './pages/media-viewer.page.js';

const 공유받기열림 = defineCase({
  tcId: 'MTA-FN-522',
  name: '계정이 하나일 때 공유받기로 들어오면 곧바로 글쓰기 화면이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있고 계정이 하나다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    공유글: z.string().min(1).max(500).describe('API 로 올릴 공유할 글 — 「QA TP060」으로 시작하는 500자까지').default('QA TP060 공유받을 글'),
  }),
  expected: null,
});

const 공유시트앱이름 = defineCase({
  tcId: 'MTA-UI-495',
  name: '공유 시트에 앱 이름이 「Mastodon」으로 보인다',
  platforms: ['android'],
  precondition: ['글 「공유」 시트가 떠 있다'],
  params: z.object({
    본문: z.string().min(1).max(500).describe('API 로 올릴 글 — 「QA TP060」으로 시작하는 500자까지').default('QA TP060 공유할 글'),
  }),
  expected: z.object({ 앱: z.string().describe('공유 시트의 앱 이름').default('Mastodon') }),
});

const 공유받은본문 = defineCase({
  tcId: 'MTA-FN-524',
  name: '텍스트 공유로 글쓰기가 열리면 본문에 공유한 글 주소가 채워져 있다',
  platforms: ['android'],
  precondition: ['공유받기로 글쓰기가 열렸다'],
  params: z.object({}),
  expected: null,
});

const 공유받은글쓰기닫기 = defineCase({
  tcId: 'MTA-FN-528',
  name: '공유받기로 연 글쓰기를 닫으면 앱도 닫힌다',
  platforms: ['android'],
  precondition: ['공유받기로 연 글쓰기가 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 공유주소글쓰기 = defineCase({
  tcId: 'MTA-FN-526',
  name: 'mastodon://share?text=<글>을 열면 글쓰기 본문에 그 글만 채워진다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({ 본문: z.string().min(1).max(500).describe('공유 주소의 text 값 — 공유할 글').default('QA공유') }),
  expected: null,
});

const 알수없는공유주소 = defineCase({
  tcId: 'MTA-FN-527',
  name: '그 밖의 공유 주소를 열면 영어 토스트 「Unexpected intent URI」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({}),
  expected: z.object({ 안내: z.string().describe('알 수 없는 주소를 열 때 뜨는 토스트 글').default('Unexpected intent URI') }),
});

const 이미지공유 = defineCase({
  tcId: 'MTA-FN-525',
  name: '이미지 공유로 들어오면 그 이미지가 글쓰기 첨부로 붙는다',
  platforms: ['android'],
  precondition: ['hana_photo 사진 글의 미디어 뷰어가 열려 있다'],
  params: z.object({}),
  expected: z.object({ 첨부수: z.number().int().describe('글쓰기에 붙는 첨부 수').default(1) }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-060',
  name: '공유받기',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [공유받기열림, 공유시트앱이름, 공유받은본문, 공유받은글쓰기닫기, 공유주소글쓰기, 알수없는공유주소, 이미지공유],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 작성 = new 글쓰기화면(driver);
  const 뷰어 = new 미디어뷰어화면(driver);
  const 첨부 = new 글쓰기첨부(driver);
  let 나: 계정 | undefined;
  let 공유글: 글 | undefined;

  await test.cleanup('이 흐름이 올린 글을 지운다', async () => {
    if (나 !== undefined) await 내글지우기(나, 'QA TP060');
  });

  await test.case(공유받기열림, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어가 공유받을 내 글의 「공유」 시트를 연다', async () => {
      await 내글지우기(나!, 'QA TP060');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      공유글 = await 글쓰기(나!, params.공유글);
      await 글공유시트열기(driver, 공유글);
    });
    await test.step('글 「공유」 시트에서 「Mastodon」을 고른다', async () => {
      await 공유시트에서앱누르기(driver, 'Mastodon');
      await verify('계정이 하나일 때 공유받기로 들어오면 곧바로 글쓰기 화면이 열린다', await 작성.새게시물떴나(20_000), true);
    });
  });

  await test.case(공유시트앱이름, async ({ params, expected }) => {
    await test.step('공유받은 글쓰기를 닫고 내 글의 「공유」 시트를 연다', async () => {
      const 올린글 = await 글쓰기(나!, params.본문);
      await 글열기(driver, 올린글);
      await 글에서버튼누르기(driver, 올린글, '공유');
      if (!(await 공유시트떴나(driver))) throw new Error('글 「공유」 시트가 안 떴다');
    });
    await test.step('공유 시트의 앱 이름을 확인한다', async () => {
      await verify('공유 시트에 앱 이름이 「Mastodon」으로 보인다', await 공유시트에앱있나(driver, expected.앱), true);
      await 공유시트닫기(driver);
    });
  });

  await test.case(공유받은본문, async () => {
    await test.step('공유 시트에서 「Mastodon」을 골라 공유받기 글쓰기를 연다', async () => {
      if (공유글 === undefined) throw new Error('앞 케이스가 공유할 글을 올리지 못했다');
      await 글공유시트열기(driver, 공유글);
      await 공유시트에서앱누르기(driver, 'Mastodon');
      if (!(await 작성.새게시물떴나(20_000))) throw new Error('공유받기 글쓰기가 안 열렸다');
    });
    await test.step('공유받은 글쓰기 본문을 확인한다', async () => {
      const 본문 = await 작성.본문칸글();
      await verify('텍스트 공유로 글쓰기가 열리면 본문에 공유한 글 주소가 채워져 있다', 본문.includes(공유글!.url ?? 공유글!.uri), true);
    });
  });

  await test.case(공유받은글쓰기닫기, async () => {
    await test.step('공유받기 글쓰기를 「지우기」로 닫는다', async () => {
      await 작성.닫기누르기();
      const 창 = 작성.닫기확인창();
      if (!(await 창.떴나(5_000))) throw new Error('글쓰기 닫기 확인 창이 안 떴다');
      await 창.확인누르기();
      await verify('공유받기로 연 글쓰기를 닫으면 앱도 닫힌다', await 앱이닫힐때까지(driver), true);
    });
    await test.step('앱을 다시 켜 홈 화면으로 돌아온다', async () => {
      await driver.activateApp(꾸러미);
      await 홈에들어가기(driver);
    });
  });

  await test.case(공유주소글쓰기, async ({ params }) => {
    await test.step('공유 주소를 열 홈 화면으로 돌아온다', async () => {
      await 글쓰기닫고홈으로(driver);
    });
    await test.step('mastodon://share?text=QA공유 를 연다', async () => {
      await 딥링크열기(driver, `mastodon://share?text=${encodeURIComponent(params.본문)}`);
      await verify('mastodon://share?text=<글>을 열면 글쓰기 본문에 그 글만 채워진다', await 작성.본문칸글(), params.본문);
    });
  });

  await test.case(알수없는공유주소, async ({ expected }) => {
    await test.step('다른 공유 주소를 열 홈 화면으로 돌아온다', async () => {
      await 글쓰기닫고홈으로(driver);
    });
    await test.step('mastodon://qa-unknown 을 연다', async () => {
      await 딥링크열기(driver, 'mastodon://qa-unknown');
      await verify('그 밖의 공유 주소를 열면 영어 토스트 「Unexpected intent URI」가 보인다', await 작성.토스트에글자있나(expected.안내, 8_000), true);
    });
  });

  await test.case(이미지공유, async ({ expected }) => {
    await test.step('hana_photo 사진 글을 미디어 뷰어로 연다', async () => {
      const 사진글 = await 사람글찾기(
        나!,
        'hana_photo',
        (x) => x.reblog === null && !x.sensitive && x.spoiler_text === '' && x.media_attachments.length > 0 && x.media_attachments.every((m) => m.type === 'image'),
        '사진',
      );
      const 사진글자 = 카드글자(사진글);
      await 글쓰기닫고홈으로(driver);
      await 프로필열고글찾기(driver, 'hana_photo', 사진글자);
      await new 글카드(driver).사진누르기(사진글자, 0);
      if (!(await 뷰어.떴나(15_000))) throw new Error('사진 미디어 뷰어가 안 열렸다');
    });
    await test.step('미디어 뷰어 「공유」에서 「Mastodon」을 고른다', async () => {
      await 뷰어.누르기('공유');
      if (!(await 공유시트떴나(driver))) throw new Error('미디어 뷰어 「공유」 시트가 안 떴다');
      await 공유시트에서앱누르기(driver, 'Mastodon');
      await verify('이미지 공유로 들어오면 그 이미지가 글쓰기 첨부로 붙는다', await 첨부.첨부가될때까지(expected.첨부수, 30_000), true);
    });
  });
});
