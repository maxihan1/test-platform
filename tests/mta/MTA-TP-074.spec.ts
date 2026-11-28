import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 펼친메뉴 } from './components/popup-menu.component.js';
import { type 계정, 계정꺼내기, 사람글찾기 } from './helpers/api.helper.js';
import { 더보기열기, 안내글보이나, 카드글자, 프로필열고글찾기 } from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

const 번역실패 = defineCase({
  tcId: 'MTA-FN-628',
  name: '번역 항목을 누르면 「번역에 실패했습니다. 관리자가 이 서버에 번역 기능을 활성화시키지 않았거나 이 서버가 번역 기능을 지원하지 않는 Mastodon의 오래된 버전을 사용하는 것일 수 있습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['minjun_dev 의 영어 공개 글이 있다'],
  techniques: ['결정 테이블'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    안내: z
      .string()
      .describe('번역 실패 안내')
      .default('번역에 실패했습니다. 관리자가 이 서버에 번역 기능을 활성화시키지 않았거나 이 서버가 번역 기능을 지원하지 않는 Mastodon의 오래된 버전을 사용하는 것일 수 있습니다.'),
  }),
});

const 링크복사항목 = defineCase({
  tcId: 'MTA-UI-530',
  name: '글 더보기에 링크 복사 항목이 보인다',
  platforms: ['android'],
  precondition: ['남의 글 더보기가 열려 있다'],
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-074',
  name: '글 더보기 — 번역과 링크 복사',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [번역실패, 링크복사항목],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 메뉴 = new 펼친메뉴(driver);
  const 창 = new 확인창(driver);
  let 나: 계정 | undefined;

  await test.case(번역실패, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    const 영어글 = await 사람글찾기(나, 'minjun_dev', (x) => x.reblog === null && x.language === 'en' && x.visibility === 'public', '영어 공개');
    await test.step('minjun_dev 프로필에서 영어 글 카드를 다시 연다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      await 프로필열고글찾기(driver, 'minjun_dev', 카드글자(영어글));
    });
    await test.step('영어 글 더보기에서 번역 항목을 누른다', async () => {
      const 메뉴열림 = await 더보기열기(driver, 카드글자(영어글));
      await 메뉴열림.항목누르기('영어에서 번역됨');
      const 화면안내 = await 안내글보이나(driver, expected.안내);
      const 창안내 = !화면안내 && (await 창.떴나(2_000)) && (await 창.글읽기()).includes(expected.안내);
      await verify(
        '번역 항목을 누르면 「번역에 실패했습니다. 관리자가 이 서버에 번역 기능을 활성화시키지 않았거나 이 서버가 번역 기능을 지원하지 않는 Mastodon의 오래된 버전을 사용하는 것일 수 있습니다.」가 보인다',
        화면안내 || 창안내,
        true,
      );
    });
  });

  await test.case(링크복사항목, async () => {
    const 카페글 = await 사람글찾기(나!, 'cafe_moon', (x) => x.reblog === null, 'cafe_moon 글');
    await test.step('cafe_moon 프로필에서 남의 글 더보기를 다시 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'cafe_moon', 카드글자(카페글));
      await 더보기열기(driver, 카드글자(카페글));
    });
    await test.step('더보기의 링크 복사 항목 문구를 확인한다', async () => {
      await verify('글 더보기에 링크 복사 항목이 보인다', await 메뉴.항목있나('링크 복사'), true);
      await 메뉴.닫기();
    });
  });
});
