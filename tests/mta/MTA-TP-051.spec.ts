import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { 펼친메뉴 } from './components/popup-menu.component.js';
import { type 계정, 계정꺼내기 } from './helpers/api.helper.js';
import { 관계맞추기, 신고끝까지보내기, 프로필열어보기 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 신고화면 } from './pages/report.page.js';

const 이미차단 = defineCase({
  tcId: 'MTA-FN-451',
  name: '이미 차단한 계정을 신고하면 완료 화면에 「이미 이 사용자를 차단했으므로, 신고를 검토하는 동안 더 이상 무언가를 하지 않으셔도 됩니다.」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있고 troll_kim 을 차단했다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사용자명: z.string().min(1).describe('신고할 계정 — 일반 회원이 차단한 신고용 시드 계정의 사용자명').default('troll_kim'),
  }),
  expected: z.object({ 안내: z.string().describe('이미 차단한 계정 신고 완료 안내').default('이미 이 사용자를 차단했으므로, 신고를 검토하는 동안 더 이상 무언가를 하지 않으셔도 됩니다.') }),
});

const 이미뮤트 = defineCase({
  tcId: 'MTA-FN-452',
  name: '이미 뮤트했고 팔로우하지 않는 계정이면 신고 완료 화면에 「뮤트」 · 「팔로우 해제」 줄이 보이지 않는다',
  platforms: ['android'],
  held: '보류 — 프로필 메뉴에 「Report account」이 안 보인다',
  precondition: ['noisy_cho 를 뮤트했고 팔로우하지 않는다'],
  params: z.object({ 사용자명: z.string().min(1).describe('신고할 계정 — 일반 회원이 뮤트한 신고용 시드 계정의 사용자명').default('noisy_cho') }),
  expected: null,
});

const 완료뮤트 = defineCase({
  tcId: 'MTA-FN-453',
  name: '신고 완료 화면에서 뮤트를 마치면 줄이 「뮤트한-음소거한 @spam_shop」으로 바뀐다',
  platforms: ['android'],
  precondition: ['spam_shop 신고 완료 화면에 있다'],
  params: z.object({ 사용자명: z.string().min(1).describe('신고할 계정 — 신고를 보내도 되는 신고용 시드 계정의 사용자명').default('spam_shop') }),
  expected: null,
});

const 전송실패 = defineCase({
  tcId: 'MTA-FN-455',
  name: '신고 전송에 실패하면 오류 토스트가 보인다',
  platforms: ['android'],
  precondition: ['spam_shop 신고 의견 쓰기 화면에 있다'],
  techniques: ['동등 분할'],
  params: z.object({ 사용자명: z.string().min(1).describe('신고할 계정 — 신고용 시드 계정의 사용자명').default('spam_shop') }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-051',
  name: '신고 — 완료 화면 동작',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [이미차단, 완료뮤트, 전송실패, 이미뮤트],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 메뉴 = new 펼친메뉴(driver);
  const 신고 = new 신고화면(driver);
  let 나: 계정 | undefined;

  const 스팸신고시작 = async (사용자명: string): Promise<void> => {
    await 프로필열어보기(driver, 사용자명);
    await 프로필.메뉴열기('Report account');
    await 메뉴.항목누르기('Report account');
    if (!(await 신고.떴나())) throw new Error('프로필 신고 첫 화면이 안 열렸다');
    await 신고.이유누르기('스팸입니다');
    await 신고.다음누르기();
  };

  await test.cleanup('바꾼 뮤트 · 차단 · 팔로우를 시드 상태로 되돌린다', async () => {
    if (나 === undefined) return;
    await 관계맞추기(나, 'spam_shop', { 뮤트: false });
    await 관계맞추기(나, 'noisy_cho', { 팔로우: true, 뮤트: true });
    await 관계맞추기(나, 'troll_kim', { 차단: true });
  });

  await test.case(이미차단, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 관계맞추기(나!, params.사용자명, { 차단: true });
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('차단한 troll_kim 을 스팸으로 신고해 보낸다', async () => {
      await 스팸신고시작(params.사용자명);
      await 신고끝까지보내기(신고);
      await verify('이미 차단한 계정을 신고하면 완료 화면에 「이미 이 사용자를 차단했으므로, 신고를 검토하는 동안 더 이상 무언가를 하지 않으셔도 됩니다.」가 보인다', await 신고.완료안내글(), expected.안내);
      await 신고.완료누르기();
    });
  });

  await test.case(완료뮤트, async ({ params }) => {
    await test.step('spam_shop 신고 완료 화면으로 간다', async () => {
      await 관계맞추기(나!, params.사용자명, { 팔로우: false, 뮤트: false, 차단: false });
      await 스팸신고시작(params.사용자명);
      await 신고끝까지보내기(신고);
      await verify('신고 완료 화면이 보인다', await 신고.완료떴나(), true, { blocker: true });
    });
    await test.step('완료 화면에서 「뮤트」 줄을 누른다', async () => {
      await 신고.뮤트줄누르기();
      await verify('신고 완료 화면에서 뮤트를 마치면 줄이 「뮤트한-음소거한 @spam_shop」으로 바뀐다', await 신고.뮤트줄글될때까지(`뮤트한-음소거한 @${params.사용자명}`, 20_000), true);
      await 신고.완료누르기();
    });
  });

  await test.case(전송실패, async ({ params }) => {
    await test.step('spam_shop 신고 의견 쓰기 화면으로 간다', async () => {
      await 스팸신고시작(params.사용자명);
      await 신고.질문될때까지('이 신고에 대해서 더 참고해야 할 게시물이 있나요?');
      await 신고.다음누르기();
      await verify('의견 쓰기 화면이 보인다', await 신고.의견칸있나(), true, { blocker: true });
    });
    await test.step('통신을 끊은 채 「다음」을 누른다', async () => {
      const 토스트 = await 폰상태에서(driver, { 네트워크: '끊김' }, async () => {
        await 신고.다음누르기();
        return 신고.토스트글읽기(15_000);
      });
      await verify('신고 전송에 실패하면 오류 토스트가 보인다', 토스트 !== '', true);
    });
  });

  await test.case(이미뮤트, async ({ params }) => {
    await test.step('noisy_cho 를 뮤트했고 팔로우하지 않는 상태로 맞춘다', async () => {
      await 관계맞추기(나!, params.사용자명, { 팔로우: false, 뮤트: true });
    });
    await test.step('뮤트한 noisy_cho 를 스팸으로 신고해 보낸다', async () => {
      await 스팸신고시작(params.사용자명);
      await 신고끝까지보내기(신고);
      const 차단줄 = await verify('완료 화면에 「차단」 줄이 보인다', await 신고.차단줄있나(5_000), true);
      const 뮤트줄없음 = await verify('완료 화면에 「뮤트」 줄이 보이지 않는다', !(await 신고.뮤트줄있나(2_000)), true);
      const 해제줄없음 = await verify('완료 화면에 「팔로우 해제」 줄이 보이지 않는다', !(await 신고.팔로우해제줄있나(2_000)), true);
      await verify('이미 뮤트했고 팔로우하지 않는 계정이면 신고 완료 화면에 「뮤트」 · 「팔로우 해제」 줄이 보이지 않는다', 차단줄 && 뮤트줄없음 && 해제줄없음, true);
      await 신고.완료누르기();
    });
  });
});
