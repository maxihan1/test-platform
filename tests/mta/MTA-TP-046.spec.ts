import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지, 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { 스낵바 } from './components/snackbar.component.js';
import { type 계정, 계정꺼내기 } from './helpers/api.helper.js';
import { type 프로필원본, 프로필되돌리기, 프로필원본읽기, 프로필편집으로 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 이름편집화면 } from './pages/name-edit.page.js';

const 공백만 = defineCase({
  tcId: 'MTA-FN-653',
  name: '「Display name」에 공백만 적으면 빈 값처럼 「저장」이 꺼진다',
  platforms: ['android'],
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 「Display name」 편집 화면을 열었다'],
  techniques: ['오류 추정'],
  params: z.object({
    loginId: z.string().describe('프로필 고쳐도 되는 계정 아이디').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    loginPassword: z.string().describe('프로필 고쳐도 되는 계정 비밀번호').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    공백: z.string().min(1).describe('이름 칸에 적을 글 — 공백 문자만').default('   '),
  }),
  expected: null,
});

const 저장실패 = defineCase({
  tcId: 'MTA-FN-657',
  name: '이름 저장에 실패하면 오류 토스트가 보인다',
  platforms: ['android'],
  precondition: ['「Display name」 편집 화면에서 이름을 바꿨다'],
  techniques: ['동등 분할'],
  params: z.object({ 이름: z.string().min(1).max(30).describe('바꿔 적을 표시 이름 — 30자 이하').default('QA 이름 실패') }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-046',
  name: '프로필 편집 — 이름 칸 오류 추정',
  platforms: ['android'],
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [공백만, 저장실패],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 이름 = new 이름편집화면(driver);
  let 나: 계정 | undefined;
  let 원본: 프로필원본 | undefined;

  await test.cleanup('이름을 처음 상태로 되돌린다', async () => {
    if (나 !== undefined && 원본 !== undefined) await 프로필되돌리기(나, 원본);
  });

  await test.case(공백만, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword, '프로필 고쳐도 되는 계정');
    await test.step('프로필 고쳐도 되는 계정으로 홈에 들어간다', async () => {
      원본 = await 프로필원본읽기(나!);
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('이름 칸에 공백만 적는다', async () => {
      const 편집 = await 프로필편집으로(driver);
      await 편집.이름줄누르기();
      await verify('「Display name」 편집 화면이 보인다', await 이름.떴나(), true, { blocker: true });
      await 이름.적기(params.공백);
      await verify('「Display name」에 공백만 적으면 빈 값처럼 「저장」이 꺼진다', await 될때까지(driver, async () => !(await 이름.저장켜져있나()), 10_000), true);
    });
  });

  await test.case(저장실패, async ({ params }) => {
    await test.step('「Display name」 편집 화면에서 이름을 바꾼다', async () => {
      const 편집 = await 프로필편집으로(driver);
      await 편집.이름줄누르기();
      await verify('「Display name」 편집 화면이 보인다', await 이름.떴나(), true, { blocker: true });
      await 이름.적기(params.이름);
      await verify('바꾼 이름을 저장할 수 있다', await 될때까지(driver, () => 이름.저장켜져있나(), 10_000), true, { blocker: true });
    });
    await test.step('통신을 끊은 채 이름 「저장」을 누른다', async () => {
      const 토스트 = await 폰상태에서(driver, { 네트워크: '끊김' }, async () => {
        await 이름.저장누르기();
        return new 스낵바(driver).글읽기(15_000);
      });
      await verify('이름 저장에 실패하면 오류 토스트가 보인다', 토스트 !== '', true);
    });
  });
});
