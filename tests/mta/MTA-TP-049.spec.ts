import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 펼친메뉴 } from './components/popup-menu.component.js';
import { 스낵바 } from './components/snackbar.component.js';
import { 글카드 } from './components/status-card.component.js';
import { type 계정, 계정꺼내기, 관계보기, 사람글찾기 } from './helpers/api.helper.js';
import { 관계맞추기, 본문조각, 창에글있나, 프로필열어보기 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 보관함화면 } from './pages/bookmarks.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 뮤트차단시트 } from './pages/mute-block.page.js';
import { 프로필글목록 } from './pages/profile-feed.page.js';
import { 프로필화면 } from './pages/profile.page.js';

const 보관함안내 = defineCase({
  tcId: 'MTA-FN-431',
  name: '「보관함」을 열면 위에 「당신이 저장한 게시물은 오직 당신에게만 보입니다.」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 내 프로필 메뉴를 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({ 안내: z.string().describe('보관함 안내 글').default('당신이 저장한 게시물은 오직 당신에게만 보입니다.') }),
});

const 뮤트시트 = defineCase({
  tcId: 'MTA-FN-432',
  name: '뮤트를 누르면 「사용자를 뮤트할까요?」 시트에 「해당 사용자는 뮤트되었다는 사실을 모를 것입니다.」와 「뮤트」 · 「취소」가 보인다',
  platforms: ['android'],
  precondition: ['mute_jang 의 글이 있다'],
  params: z.object({ 사용자명: z.string().min(1).describe('뮤트해 볼 계정 — 일반 회원이 팔로우하는 계정(뮤트가 허용된 계정)의 사용자명').default('mute_jang') }),
  expected: z.object({
    제목: z.string().describe('뮤트 시트 제목').default('사용자를 뮤트할까요?'),
    설명: z.string().describe('뮤트 시트 설명').default('해당 사용자는 뮤트되었다는 사실을 모를 것입니다.'),
    확인: z.string().describe('뮤트 시트 확인 버튼 글').default('뮤트'),
    취소: z.string().describe('뮤트 시트 취소 버튼 글').default('취소'),
  }),
});

const 뮤트하면사라짐 = defineCase({
  tcId: 'MTA-FN-439',
  name: '뮤트에 성공하면 mute_jang 의 글이 홈 목록에서 바로 빠진다',
  platforms: ['android'],
  precondition: ['홈에 mute_jang 글이 보인다'],
  params: z.object({ 사용자명: z.string().min(1).describe('뮤트해 볼 계정 — 일반 회원이 팔로우하는 계정(뮤트가 허용된 계정)의 사용자명').default('mute_jang') }),
  expected: null,
});

const 뮤트해제 = defineCase({
  tcId: 'MTA-FN-433',
  name: '뮤트 해제를 누르면 확인 없이 스낵바 「mute_jang 뮤트 해제」가 보인다',
  platforms: ['android'],
  precondition: ['mute_jang 을 뮤트했다'],
  params: z.object({ 사용자명: z.string().min(1).describe('뮤트를 풀 계정 — 뮤트가 허용된 계정의 사용자명').default('mute_jang') }),
  expected: null,
});

const 차단시트 = defineCase({
  tcId: 'MTA-FN-434',
  name: '차단을 누르면 「사용자를 차단할까요?」 시트에 「해당 사용자는 자신이 차단 당했다는 사실을 확인할 수 있습니다.」와 「차단」 · 「취소」가 보인다',
  platforms: ['android'],
  precondition: ['cafe_moon 의 글이 있다'],
  params: z.object({ 사용자명: z.string().min(1).describe('차단해 볼 계정 — 일반 회원과 관계가 없고 글이 있는 계정의 사용자명').default('cafe_moon') }),
  expected: z.object({
    제목: z.string().describe('차단 시트 제목').default('사용자를 차단할까요?'),
    설명: z.string().describe('차단 시트 설명').default('해당 사용자는 자신이 차단 당했다는 사실을 확인할 수 있습니다.'),
    확인: z.string().describe('차단 시트 확인 버튼 글').default('차단'),
    취소: z.string().describe('차단 시트 취소 버튼 글').default('취소'),
  }),
});

const 차단해제 = defineCase({
  tcId: 'MTA-FN-435',
  name: '차단 해제를 누르면 확인 없이 스낵바 「troll_kim 차단 해제」가 보인다',
  platforms: ['android'],
  precondition: ['troll_kim 을 차단했다'],
  params: z.object({ 사용자명: z.string().min(1).describe('차단을 풀 계정 — 일반 회원이 차단한 계정의 사용자명').default('troll_kim') }),
  expected: null,
});

const 팔로워제거묻기 = defineCase({
  tcId: 'MTA-FN-438',
  name: '팔로워 제거를 누르면 영어 확인 창 「Remove follower?」가 뜬다',
  platforms: ['android'],
  precondition: ['fan_ryu 가 나를 팔로우한다'],
  params: z.object({ 사용자명: z.string().min(1).describe('제거해 볼 팔로워 — 일반 회원을 팔로우하는 계정의 사용자명').default('fan_ryu') }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-049',
  name: '보관함 · 뮤트 · 차단',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [보관함안내, 뮤트시트, 뮤트하면사라짐, 뮤트해제, 차단시트, 차단해제, 팔로워제거묻기],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 글목록 = new 프로필글목록(driver);
  const 카드 = new 글카드(driver);
  const 메뉴 = new 펼친메뉴(driver);
  const 시트 = new 뮤트차단시트(driver);
  const 창 = new 확인창(driver);
  let 나: 계정 | undefined;

  await test.cleanup('바꾼 뮤트 · 차단을 시드 상태로 되돌린다', async () => {
    if (나 === undefined) return;
    await 관계맞추기(나, 'mute_jang', { 뮤트: false });
    await 관계맞추기(나, 'cafe_moon', { 차단: false });
    await 관계맞추기(나, 'troll_kim', { 차단: true });
  });

  await test.case(보관함안내, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('내 프로필 메뉴에서 「보관함」을 연다', async () => {
      await new 보관함화면(driver).열기('보관함');
      await verify('「보관함」을 열면 위에 「당신이 저장한 게시물은 오직 당신에게만 보입니다.」가 보인다', await new 보관함화면(driver).안내글(), expected.안내);
    });
  });

  await test.case(뮤트시트, async ({ params, expected }) => {
    let 조각 = '';
    await test.step('mute_jang 의 글을 API 로 찾는다', async () => {
      await 관계맞추기(나!, params.사용자명, { 뮤트: false });
      조각 = 본문조각(await 사람글찾기(나!, params.사용자명, (x) => x.reblog === null && 본문조각(x) !== '', '본문이 있는'));
    });
    await test.step('mute_jang 글 더보기에서 「mute_jang 뮤트」를 누른다', async () => {
      await 홈에들어가기(driver);
      await verify('홈에 그 글이 보인다', await 카드.찾을때까지내리기(조각), true, { blocker: true });
      await 카드.더보기누르기(조각);
      await 메뉴.항목누르기(`${params.사용자명} 뮤트`);
      const 제목 = await verify('뮤트 시트 제목이 기대값과 같다', await 시트.제목글(), expected.제목);
      const 설명 = await verify('뮤트 시트에 「해당 사용자는 뮤트되었다는 사실을 모를 것입니다.」가 보인다', await 시트.설명있나(expected.설명), true);
      const 확인 = await verify('뮤트 시트 확인 버튼이 「뮤트」다', await 시트.확인버튼글(), expected.확인);
      const 취소 = await verify('뮤트 시트 취소 버튼이 「취소」다', await 시트.취소버튼글(), expected.취소);
      await verify(
        '뮤트를 누르면 「사용자를 뮤트할까요?」 시트에 「해당 사용자는 뮤트되었다는 사실을 모를 것입니다.」와 「뮤트」 · 「취소」가 보인다',
        제목 && 설명 && 확인 && 취소,
        true,
      );
      await 시트.취소누르기();
    });
  });

  await test.case(뮤트하면사라짐, async ({ params }) => {
    let 조각 = '';
    await test.step('홈에 mute_jang 글이 보이게 맞춘다', async () => {
      await 관계맞추기(나!, params.사용자명, { 뮤트: false });
      조각 = 본문조각(await 사람글찾기(나!, params.사용자명, (x) => x.reblog === null && 본문조각(x) !== '', '본문이 있는'));
      await 홈에들어가기(driver);
      await verify('홈에 그 글이 보인다', await 카드.찾을때까지내리기(조각), true, { blocker: true });
    });
    await test.step('뮤트 시트에서 「뮤트」를 누른다', async () => {
      await 카드.더보기누르기(조각);
      await 메뉴.항목누르기(`${params.사용자명} 뮤트`);
      await 시트.확인누르기();
      await verify('뮤트 시트가 닫힌다', await 시트.닫혔나(), true);
      await verify('뮤트에 성공하면 mute_jang 의 글이 홈 목록에서 바로 빠진다', await 될때까지(driver, async () => !(await 카드.보이나(조각)), 20_000), true);
    });
  });

  await test.case(뮤트해제, async ({ params }) => {
    await test.step('mute_jang 을 뮤트한 상태로 맞춘다', async () => {
      await 관계맞추기(나!, params.사용자명, { 뮤트: true });
    });
    await test.step('mute_jang 프로필 메뉴에서 뮤트 해제를 누른다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await 프로필.메뉴열기('Unmute account');
      await 메뉴.항목누르기('Unmute account');
      const 글 = await verify('스낵바에 「mute_jang 뮤트 해제」가 보인다', await new 스낵바(driver).글읽기(10_000), `${params.사용자명} 뮤트 해제`);
      const 확인없음 = await verify('확인 창이 뜨지 않는다', await 창.떴나(2_000), false);
      await verify('뮤트 해제를 누르면 확인 없이 스낵바 「mute_jang 뮤트 해제」가 보인다', 글 && 확인없음, true);
    });
  });

  await test.case(차단시트, async ({ params, expected }) => {
    let 조각 = '';
    await test.step('cafe_moon 의 글을 API 로 찾는다', async () => {
      await 관계맞추기(나!, params.사용자명, { 팔로우: false, 뮤트: false, 차단: false });
      조각 = 본문조각(await 사람글찾기(나!, params.사용자명, (x) => x.reblog === null && x.visibility === 'public' && 본문조각(x) !== '', '본문이 있는 공개'));
    });
    await test.step('cafe_moon 글 더보기에서 「cafe_moon 차단」을 누른다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await verify('프로필에 그 글이 보인다', await 글목록.글찾을때까지내리기(조각), true, { blocker: true });
      await 카드.더보기누르기(조각);
      await 메뉴.항목누르기(`${params.사용자명} 차단`);
      const 제목 = await verify('차단 시트 제목이 기대값과 같다', await 시트.제목글(), expected.제목);
      const 설명 = await verify('차단 시트에 「해당 사용자는 자신이 차단 당했다는 사실을 확인할 수 있습니다.」가 보인다', await 시트.설명있나(expected.설명), true);
      const 확인 = await verify('차단 시트 확인 버튼이 「차단」이다', await 시트.확인버튼글(), expected.확인);
      const 취소 = await verify('차단 시트 취소 버튼이 「취소」다', await 시트.취소버튼글(), expected.취소);
      await verify(
        '차단을 누르면 「사용자를 차단할까요?」 시트에 「해당 사용자는 자신이 차단 당했다는 사실을 확인할 수 있습니다.」와 「차단」 · 「취소」가 보인다',
        제목 && 설명 && 확인 && 취소,
        true,
      );
      await 시트.취소누르기();
    });
  });

  await test.case(차단해제, async ({ params }) => {
    await test.step('troll_kim 을 차단한 상태로 맞춘다', async () => {
      await 관계맞추기(나!, params.사용자명, { 차단: true });
    });
    await test.step('troll_kim 프로필에서 「Unblock」을 누른다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await 프로필.동작버튼누르기();
      const 글 = await verify('스낵바에 「troll_kim 차단 해제」가 보인다', await new 스낵바(driver).글읽기(10_000), `${params.사용자명} 차단 해제`);
      const 확인없음 = await verify('확인 창이 뜨지 않는다', await 창.떴나(2_000), false);
      await verify('차단 해제를 누르면 확인 없이 스낵바 「troll_kim 차단 해제」가 보인다', 글 && 확인없음, true);
    });
  });

  await test.case(팔로워제거묻기, async ({ params }) => {
    await test.step('fan_ryu 가 나를 팔로우하는지 API 로 확인한다', async () => {
      await verify('상대가 나를 팔로우한다', (await 관계보기(나!, params.사용자명)).followed_by, true, { blocker: true });
    });
    await test.step('fan_ryu 프로필 메뉴에서 「Remove follower」를 누른다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await 프로필.메뉴열기('Remove follower');
      await 메뉴.항목누르기('Remove follower');
      await verify('팔로워 제거를 누르면 영어 확인 창 「Remove follower?」가 뜬다', await 창에글있나(창, 'Remove follower?'), true);
      await 창.취소누르기();
    });
  });
});
