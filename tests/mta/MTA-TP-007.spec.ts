import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 가입사용자명, 가입양식열기, 가입양식채우기, 오류문구가뜰때까지 } from './helpers/flow-start.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 길이글, 길이이메일 } from './helpers/test-data.helper.js';
import { 가입양식 } from './pages/signup.page.js';
import { 시작화면 } from './pages/start.page.js';

const 암호짧음 = defineCase({
  tcId: 'MTA-FN-068',
  name: '두 암호 칸에 같은 7자를 적고 포커스가 나가면 「비밀번호는 최소 8자 이상이어야 합니다」가 보인다',
  platforms: ['android'],
  precondition: ['가입 양식이 열려 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    짧은길이: z.number().int().min(1).describe('암호 글자 수 — 8자 미만').default(7),
    맞는길이: z.number().int().min(1).describe('암호 글자 수 — 8자 이상').default(8),
  }),
  expected: z.object({ 문구: z.string().describe('암호 칸 오류 문구').default('비밀번호는 최소 8자 이상이어야 합니다') }),
});

const 사용자명중복 = defineCase({
  tcId: 'MTA-FN-080',
  name: '이미 있는 사용자명으로 「다음」을 누르면 「이 사용자 이미 사용 중입니다. 다른 것을 시도하거나 다른 서버를 선택하세요.」가 보인다',
  platforms: ['android'],
  precondition: ['가입 양식 나머지 칸이 맞게 채워져 있다'],
  techniques: ['동등 분할'],
  params: z.object({ 사용자명: z.string().min(1).describe('사용자명 칸에 적을 글 — 이미 있는 사용자명').default('qa_user1') }),
  expected: z.object({ 문구: z.string().describe('사용자명 오류 문구').default('이 사용자 이미 사용 중입니다. 다른 것을 시도하거나 다른 서버를 선택하세요.') }),
});

const 사용자명칸오류 = defineCase({
  tcId: 'MTA-FN-072',
  name: '서버가 사용자명 칸 오류를 돌려주면 그 오류가 「사용자명」 칸에 붙고 그 칸에 포커스가 간다',
  platforms: ['android'],
  precondition: ['가입 양식 나머지 칸이 맞게 채워져 있다'],
  techniques: ['동등 분할'],
  params: z.object({ 사용자명: z.string().min(1).describe('사용자명 칸에 적을 글 — 이미 있는 사용자명').default('qa_user2') }),
  expected: null,
});

const 이메일중복 = defineCase({
  tcId: 'MTA-FN-078',
  name: '이미 쓰는 이메일로 「다음」을 누르면 「이미 사용 중인 이메일 주소입니다. 혹시 비밀번호를 잊으셨나요?」가 보인다',
  platforms: ['android'],
  precondition: ['가입 양식 나머지 칸이 맞게 채워져 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디 — 이미 쓰는 이메일').optional().meta({ secret: true }),
  }),
  expected: z.object({ 문구: z.string().describe('이메일 오류 문구').default('이미 사용 중인 이메일 주소입니다. 혹시 비밀번호를 잊으셨나요?') }),
});

const 사용자명기타오류 = defineCase({
  tcId: 'MTA-FN-082',
  name: '서버가 그 밖의 사용자명 오류를 돌려주면 「사용자명」 칸에 서버가 보낸 오류 문구가 붙는다',
  platforms: ['android'],
  precondition: ['가입 양식 나머지 칸이 맞게 채워져 있다'],
  techniques: ['동등 분할'],
  params: z.object({ 사용자명: z.string().min(1).describe('사용자명 칸에 적을 글 — 점이 든 사용자명').default('qa.user') }),
  expected: null,
});

const 사용자명길이 = defineCase({
  tcId: 'MTA-FN-084',
  name: '사용자명에 30자를 적으면 「다음」이 켜진다',
  platforms: ['android'],
  precondition: ['가입 양식 나머지 칸이 맞게 채워져 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    안쪽길이: z.number().int().min(10).describe('사용자명 글자 수 — 30자 이하').default(30),
    바깥길이: z.number().int().min(10).describe('사용자명 글자 수 — 30자 초과').default(31),
  }),
  expected: null,
});

const 이메일길이 = defineCase({
  tcId: 'MTA-FN-087',
  name: '이메일에 320자를 적으면 「다음」이 켜진다',
  platforms: ['android'],
  held: '보류 — 서버 오류(429): 가입 요청 횟수 제한에 걸린다(「요청 횟수 제한에 도달했습니다」)',
  precondition: ['가입 양식 나머지 칸이 맞게 채워져 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    안쪽길이: z.number().int().min(80).describe('이메일 글자 수 — 320자 이하').default(320),
    바깥길이: z.number().int().min(80).describe('이메일 글자 수 — 320자 초과').default(321),
  }),
  expected: null,
});

const 암호길이 = defineCase({
  tcId: 'MTA-FN-089',
  name: '두 암호 칸에 72자를 적으면 「다음」이 켜진다',
  platforms: ['android'],
  held: '보류 — 서버 오류(429): 가입 요청 횟수 제한에 걸린다(「요청 횟수 제한에 도달했습니다」)',
  precondition: ['가입 양식 나머지 칸이 맞게 채워져 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    안쪽길이: z.number().int().min(8).describe('암호 글자 수 — 72자 이하').default(72),
    바깥길이: z.number().int().min(8).describe('암호 글자 수 — 72자 초과').default(73),
  }),
  expected: null,
});

const 사용자명오류문구 = defineCase({
  tcId: 'MTA-FN-611',
  name: '사용자명 31자로 「다음」을 누르면 「사용자명」 칸에 오류 문구가 보인다',
  platforms: ['android'],
  held: '보류 — 서버 오류(429): 가입 요청 횟수 제한에 걸린다(「요청 횟수 제한에 도달했습니다」)',
  precondition: ['가입 양식 나머지 칸이 맞게 채워져 있다'],
  params: z.object({ 글자수: z.number().int().min(10).describe('사용자명 글자 수 — 30자 초과').default(31) }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-007',
  name: '가입 양식 — 서버 오류와 길이 한도',
  platforms: ['android'],
  precondition: ['로그인한 계정이 없다'],
  cases: [암호짧음, 사용자명중복, 사용자명칸오류, 이메일중복, 사용자명기타오류, 사용자명길이, 이메일길이, 암호길이, 사용자명오류문구],
});

test(procedure, async ({ driver }) => {
  const 양식 = new 가입양식(driver);

  await test.case(암호짧음, async ({ params, expected }) => {
    await test.step('두 암호 칸에 같은 7자를 적고 다른 칸으로 옮긴다', async () => {
      await 시작화면열기(driver);
      await verify('시작 화면이 열려 있다', await new 시작화면(driver).떴나(), true, { blocker: true });
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver);
      await 양식.적기('암호', 길이글(params.짧은길이));
      await 양식.포커스주기('암호 확인');
      await 양식.적기('암호 확인', 길이글(params.짧은길이));
      await 양식.포커스주기('이메일');
      await verify('두 암호 칸에 같은 7자를 적고 포커스가 나가면 「비밀번호는 최소 8자 이상이어야 합니다」가 보인다', await 오류문구가뜰때까지(driver, 양식, expected.문구), true);
    });
    await test.step('두 암호 칸에 같은 8자를 적고 다른 칸으로 옮긴다', async () => {
      await 양식.포커스주기('암호');
      await 양식.적기('암호', 길이글(params.맞는길이));
      await 양식.포커스주기('암호 확인');
      await 양식.적기('암호 확인', 길이글(params.맞는길이));
      await 양식.포커스주기('이름');
      await verify(
        '같은 8자 암호로 포커스가 나간 뒤에는 「비밀번호는 최소 8자 이상이어야 합니다」가 보이지 않는다',
        await 될때까지(driver, async () => !(await 양식.모든오류글()).some((글) => 글.includes(expected.문구)), 10_000),
        true,
      );
    });
  });

  await test.case(사용자명중복, async ({ params, expected }) => {
    await test.step('사용자명에 이미 있는 「qa_user1」을 적고 「다음」을 누른다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver, { 사용자명: params.사용자명 });
      await verify('가입 양식 나머지 칸이 맞게 채워져 「다음」이 켜져 있다', await 양식.다음켜질때까지(), true, { blocker: true });
      await 양식.다음누르기();
      await verify('이미 있는 사용자명으로 「다음」을 누르면 「이 사용자 이미 사용 중입니다. 다른 것을 시도하거나 다른 서버를 선택하세요.」가 보인다', await 오류문구가뜰때까지(driver, 양식, expected.문구, 20_000), true);
    });
  });

  await test.case(사용자명칸오류, async ({ params }) => {
    await test.step('사용자명에 이미 있는 「qa_user2」를 적고 「다음」을 누른다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver, { 사용자명: params.사용자명 });
      await verify('가입 양식 나머지 칸이 맞게 채워져 「다음」이 켜져 있다', await 양식.다음켜질때까지(), true, { blocker: true });
      await 양식.다음누르기();
      const 오류 = await verify('서버가 돌려준 오류가 「사용자명」 칸에 붙는다', (await 양식.칸오류글('사용자명')) !== '', true);
      const 포커스 = await verify('「사용자명」 칸에 포커스가 간다', await 양식.포커스칸인가('사용자명'), true);
      await verify('서버가 사용자명 칸 오류를 돌려주면 그 오류가 「사용자명」 칸에 붙고 그 칸에 포커스가 간다', 오류 && 포커스, true);
    });
  });

  await test.case(이메일중복, async ({ params, expected }) => {
    await test.step('이메일에 일반 회원 이메일을 적고 「다음」을 누른다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver, { 이메일: params.loginId ?? '' });
      await verify('가입 양식 나머지 칸이 맞게 채워져 「다음」이 켜져 있다', await 양식.다음켜질때까지(), true, { blocker: true });
      await 양식.다음누르기();
      await verify('이미 쓰는 이메일로 「다음」을 누르면 「이미 사용 중인 이메일 주소입니다. 혹시 비밀번호를 잊으셨나요?」가 보인다', await 오류문구가뜰때까지(driver, 양식, expected.문구, 20_000), true);
    });
  });

  await test.case(사용자명기타오류, async ({ params }) => {
    await test.step('사용자명에 점이 든 「qa.user」를 적고 「다음」을 누른다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver, { 사용자명: params.사용자명 });
      await verify('가입 양식 나머지 칸이 맞게 채워져 「다음」이 켜져 있다', await 양식.다음켜질때까지(), true, { blocker: true });
      await 양식.다음누르기();
      await verify('서버가 그 밖의 사용자명 오류를 돌려주면 「사용자명」 칸에 서버가 보낸 오류 문구가 붙는다', (await 양식.칸오류글('사용자명', 20_000)) !== '', true);
    });
  });

  await test.case(사용자명길이, async ({ params }) => {
    await test.step('사용자명에 30자를 적는다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver, { 사용자명: 가입사용자명(params.안쪽길이) });
      await verify('사용자명에 30자를 적으면 「다음」이 켜진다', await 양식.다음켜질때까지(), true);
    });
    await test.step('사용자명 31자로 「다음」을 누른다', async () => {
      await 양식.적기('사용자명', 가입사용자명(params.바깥길이));
      await 양식.다음누르기();
      await 양식.칸오류글('사용자명', 20_000);
      await verify('사용자명 31자로는 이메일 확인 화면으로 가지 않는다', await 양식.떴나(5_000), true);
    });
  });

  await test.case(이메일길이, async ({ params }) => {
    await test.step('이메일에 320자를 적는다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver, { 이메일: 길이이메일(params.안쪽길이) });
      await verify('이메일에 320자를 적으면 「다음」이 켜진다', await 양식.다음켜질때까지(), true);
    });
    await test.step('이메일 321자로 「다음」을 누른다', async () => {
      await 양식.적기('이메일', 길이이메일(params.바깥길이));
      await 양식.다음누르기();
      await verify('이메일 321자로는 「이메일」 칸에 오류가 붙는다', (await 양식.칸오류글('이메일', 20_000)) !== '', true);
    });
  });

  await test.case(암호길이, async ({ params }) => {
    await test.step('두 암호 칸에 72자를 적는다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver, { 암호: 길이글(params.안쪽길이), '암호 확인': 길이글(params.안쪽길이) });
      await verify('두 암호 칸에 72자를 적으면 「다음」이 켜진다', await 양식.다음켜질때까지(), true);
    });
    await test.step('두 암호 칸 73자로 「다음」을 누른다', async () => {
      await 양식.적기('암호', 길이글(params.바깥길이));
      await 양식.적기('암호 확인', 길이글(params.바깥길이));
      await 양식.다음누르기();
      await verify('두 암호 칸 73자로는 「암호」 칸에 오류가 붙는다', (await 양식.칸오류글('암호', 20_000)) !== '', true);
    });
  });

  await test.case(사용자명오류문구, async ({ params }) => {
    await test.step('사용자명 31자로 「다음」을 누르고 칸 오류를 확인한다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver, { 사용자명: 가입사용자명(params.글자수) });
      await verify('가입 양식 나머지 칸이 맞게 채워져 「다음」이 켜져 있다', await 양식.다음켜질때까지(), true, { blocker: true });
      await 양식.다음누르기();
      await verify('사용자명 31자로 「다음」을 누르면 「사용자명」 칸에 오류 문구가 보인다', (await 양식.칸오류글('사용자명', 20_000)) !== '', true);
    });
  });
});
