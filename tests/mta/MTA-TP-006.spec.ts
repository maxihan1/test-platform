import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 가입양식열기, 가입양식채우기, 오류문구가뜰때까지 } from './helpers/flow-start.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 길이글 } from './helpers/test-data.helper.js';
import { 가입양식 } from './pages/signup.page.js';
import { 시작화면 } from './pages/start.page.js';

const 양식칸 = defineCase({
  tcId: 'MTA-UI-050',
  name: '가입 양식에 제목 「계정 만들기」와 「이름」 · 「사용자명」 · 「이메일」 · 「암호」 · 「암호 확인」 칸, 「다음」이 보인다',
  platforms: ['android'],
  precondition: ['우리 서버 가입 양식 「계정 만들기」가 열려 있다'],
  params: z.object({}),
  expected: z.object({ 제목: z.string().describe('양식 제목').default('계정 만들기') }),
});

const 서버뒤글 = defineCase({
  tcId: 'MTA-UI-051',
  name: '가입 양식 「사용자명」 칸 오른쪽에 「@mastodon.maxihan.com」이 붙어 보인다',
  platforms: ['android'],
  precondition: ['가입 양식이 열려 있다'],
  params: z.object({}),
  expected: z.object({ 뒤글: z.string().describe('사용자명 칸 오른쪽 글').default('@mastodon.maxihan.com') }),
});

const 사유칸없음 = defineCase({
  tcId: 'MTA-UI-052',
  name: '우리 서버 가입 양식에 가입 사유 · 「생년월일」 칸이 보이지 않는다',
  platforms: ['android'],
  precondition: ['가입 양식이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 이름비움 = defineCase({
  tcId: 'MTA-FN-056',
  name: '가입 양식에서 「이름」을 비우고 나머지 칸을 맞게 채우면 「다음」이 켜진다',
  platforms: ['android'],
  precondition: ['가입 양식이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 사용자명비움 = defineCase({
  tcId: 'MTA-FN-607',
  name: '가입 양식에서 「사용자명」을 비우면 「다음」이 꺼진다',
  platforms: ['android'],
  precondition: ['가입 양식 나머지 칸이 맞게 채워져 있다'],
  params: z.object({}),
  expected: null,
});

const 이메일끝 = defineCase({
  tcId: 'MTA-FN-059',
  name: '이메일 끝 부분이 1자인 「qa@maxihan.c」를 적으면 「다음」이 꺼져 있다',
  platforms: ['android'],
  precondition: ['가입 양식 나머지 칸이 맞게 채워져 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    한자끝이메일: z.string().min(1).describe('이메일 칸에 적을 글 — 끝 부분이 1자').default('qa@maxihan.c'),
    두자끝이메일: z.string().min(1).describe('이메일 칸에 적을 글 — 끝 부분이 2자').default('qa@maxihan.co'),
  }),
  expected: null,
});

const 암호길이 = defineCase({
  tcId: 'MTA-FN-061',
  name: '암호와 암호 확인에 같은 7자를 적으면 「다음」이 꺼져 있다',
  platforms: ['android'],
  precondition: ['가입 양식 나머지 칸이 맞게 채워져 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    짧은길이: z.number().int().min(1).describe('암호 글자 수 — 8자 미만').default(7),
    맞는길이: z.number().int().min(1).describe('암호 글자 수 — 8자 이상').default(8),
  }),
  expected: null,
});

const 암호다름 = defineCase({
  tcId: 'MTA-FN-608',
  name: '가입 양식 암호와 암호 확인이 서로 다르면 「다음」이 꺼진다',
  platforms: ['android'],
  precondition: ['가입 양식 나머지 칸이 맞게 채워져 있다'],
  params: z.object({ 글자수: z.number().int().min(8).describe('두 암호 칸 글자 수 — 8자 이상').default(8) }),
  expected: null,
});

const 이메일꼴오류 = defineCase({
  tcId: 'MTA-FN-064',
  name: '이메일 꼴이 틀린 채 포커스가 나가면 「유효한 이메일 주소처럼 보이지 않습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['가입 양식이 열려 있다'],
  techniques: ['동등 분할'],
  params: z.object({ 틀린이메일: z.string().min(1).describe('이메일 칸에 적을 글 — 골뱅이가 없는 글').default('qa-at-maxihan') }),
  expected: z.object({ 오류: z.string().describe('이메일 칸 오류 문구').default('유효한 이메일 주소처럼 보이지 않습니다.') }),
});

const 암호불일치오류 = defineCase({
  tcId: 'MTA-FN-066',
  name: '두 암호 칸 값이 다른 채 포커스가 나가면 「비밀번호가 일치하지 않습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['가입 양식이 열려 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    암호값: z.string().min(8).describe('암호 칸에 적을 글 — 8자 이상').default('qa-pass-aaaa'),
    확인값: z.string().min(8).describe('암호 확인 칸에 적을 글 — 암호와 다른 8자 이상').default('qa-pass-bbbb'),
  }),
  expected: z.object({ 오류: z.string().describe('암호 칸 오류 문구').default('비밀번호가 일치하지 않습니다.') }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-006',
  name: '가입 양식 — 칸과 「다음」 켜짐',
  platforms: ['android'],
  precondition: ['로그인한 계정이 없다'],
  cases: [양식칸, 서버뒤글, 사유칸없음, 이름비움, 사용자명비움, 이메일끝, 암호길이, 암호다름, 이메일꼴오류, 암호불일치오류],
});

test(procedure, async ({ driver }) => {
  const 양식 = new 가입양식(driver);
  const 다음꺼질때까지 = (): Promise<boolean> => 될때까지(driver, async () => !(await 양식.다음켜졌나()), 10_000);

  await test.case(양식칸, async ({ expected }) => {
    await test.step('가입 양식 칸을 확인한다', async () => {
      await 시작화면열기(driver);
      await verify('시작 화면이 열려 있다', await new 시작화면(driver).떴나(), true, { blocker: true });
      await verify('우리 서버 가입 양식 「계정 만들기」가 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      const 제목 = await verify('가입 양식에 제목 「계정 만들기」가 보인다', await 양식.제목글(), expected.제목);
      const 이름 = await verify('가입 양식에 「이름」 칸이 보인다', await 양식.칸있나('이름'), true);
      const 사용자명 = await verify('가입 양식에 「사용자명」 칸이 보인다', await 양식.칸있나('사용자명'), true);
      const 이메일 = await verify('가입 양식에 「이메일」 칸이 보인다', await 양식.칸있나('이메일'), true);
      const 암호 = await verify('가입 양식에 「암호」 칸이 보인다', await 양식.칸있나('암호'), true);
      const 암호확인 = await verify('가입 양식에 「암호 확인」 칸이 보인다', await 양식.칸있나('암호 확인'), true);
      const 다음 = await verify('가입 양식에 「다음」이 보인다', await 양식.다음보이나(), true);
      await verify(
        '가입 양식에 제목 「계정 만들기」와 「이름」 · 「사용자명」 · 「이메일」 · 「암호」 · 「암호 확인」 칸, 「다음」이 보인다',
        제목 && 이름 && 사용자명 && 이메일 && 암호 && 암호확인 && 다음,
        true,
      );
    });
  });

  await test.case(서버뒤글, async ({ expected }) => {
    await test.step('사용자명 칸 오른쪽 글을 확인한다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await verify('가입 양식 「사용자명」 칸 오른쪽에 「@mastodon.maxihan.com」이 붙어 보인다', await 양식.사용자명뒤글(), expected.뒤글);
    });
  });

  await test.case(사유칸없음, async () => {
    await test.step('가입 사유 · 생년월일 칸 자리를 확인한다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      const 사유 = await verify('가입 양식에 가입 사유 칸이 보이지 않는다', await 양식.사유칸있나(), false);
      const 생년월일 = await verify('가입 양식에 「생년월일」 칸이 보이지 않는다', (await 양식.칸글들()).some((글) => 글.includes('생년월일')), false);
      await verify('우리 서버 가입 양식에 가입 사유 · 「생년월일」 칸이 보이지 않는다', 사유 && 생년월일, true);
    });
  });

  await test.case(이름비움, async () => {
    await test.step('「이름」만 비우고 나머지 칸을 맞게 채운다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver, { 이름: '' });
      await verify('가입 양식에서 「이름」을 비우고 나머지 칸을 맞게 채우면 「다음」이 켜진다', await 양식.다음켜질때까지(), true);
    });
  });

  await test.case(사용자명비움, async () => {
    await test.step('「사용자명」 칸을 비운다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver);
      await verify('가입 양식 나머지 칸이 맞게 채워져 「다음」이 켜져 있다', await 양식.다음켜질때까지(), true, { blocker: true });
      await 양식.적기('사용자명', '');
      await verify('가입 양식에서 「사용자명」을 비우면 「다음」이 꺼진다', await 다음꺼질때까지(), true);
    });
  });

  await test.case(이메일끝, async ({ params }) => {
    await test.step('이메일 칸에 끝 부분이 1자인 「qa@maxihan.c」를 적는다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver);
      await verify('가입 양식 나머지 칸이 맞게 채워져 「다음」이 켜져 있다', await 양식.다음켜질때까지(), true, { blocker: true });
      await 양식.적기('이메일', params.한자끝이메일);
      await verify('이메일 끝 부분이 1자인 「qa@maxihan.c」를 적으면 「다음」이 꺼져 있다', await 다음꺼질때까지(), true);
    });
    await test.step('이메일 칸에 끝 부분이 2자인 「qa@maxihan.co」를 적는다', async () => {
      await 양식.적기('이메일', params.두자끝이메일);
      await verify('「qa@maxihan.co」처럼 끝 부분이 2자인 이메일에는 「다음」이 켜진다', await 양식.다음켜질때까지(), true);
    });
  });

  await test.case(암호길이, async ({ params }) => {
    await test.step('암호와 암호 확인에 같은 7자를 적는다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver);
      await verify('가입 양식 나머지 칸이 맞게 채워져 「다음」이 켜져 있다', await 양식.다음켜질때까지(), true, { blocker: true });
      await 양식.적기('암호', 길이글(params.짧은길이));
      await 양식.적기('암호 확인', 길이글(params.짧은길이));
      await verify('암호와 암호 확인에 같은 7자를 적으면 「다음」이 꺼져 있다', await 다음꺼질때까지(), true);
    });
    await test.step('암호와 암호 확인에 같은 8자를 적는다', async () => {
      await 양식.적기('암호', 길이글(params.맞는길이));
      await 양식.적기('암호 확인', 길이글(params.맞는길이));
      await verify('같은 8자 암호에는 「다음」이 켜진다', await 양식.다음켜질때까지(), true);
    });
  });

  await test.case(암호다름, async ({ params }) => {
    await test.step('암호와 암호 확인에 서로 다른 8자를 적는다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver);
      await verify('가입 양식 나머지 칸이 맞게 채워져 「다음」이 켜져 있다', await 양식.다음켜질때까지(), true, { blocker: true });
      await 양식.적기('암호', 길이글(params.글자수, 'a'));
      await 양식.적기('암호 확인', 길이글(params.글자수, 'b'));
      await verify('가입 양식 암호와 암호 확인이 서로 다르면 「다음」이 꺼진다', await 다음꺼질때까지(), true);
    });
  });

  await test.case(이메일꼴오류, async ({ params, expected }) => {
    await test.step('이메일 칸에 「qa-at-maxihan」을 적고 다른 칸으로 옮긴다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver);
      await 양식.포커스주기('이메일');
      await 양식.적기('이메일', params.틀린이메일);
      await 양식.포커스주기('사용자명');
      await verify('이메일 꼴이 틀린 채 포커스가 나가면 「유효한 이메일 주소처럼 보이지 않습니다.」가 보인다', await 양식.칸오류글('이메일'), expected.오류);
    });
  });

  await test.case(암호불일치오류, async ({ params, expected }) => {
    await test.step('두 암호 칸에 서로 다른 값을 적고 다른 칸으로 옮긴다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver);
      await 양식.적기('암호', params.암호값);
      await 양식.포커스주기('암호 확인');
      await 양식.적기('암호 확인', params.확인값);
      await 양식.포커스주기('이메일');
      await verify('두 암호 칸 값이 다른 채 포커스가 나가면 「비밀번호가 일치하지 않습니다.」가 보인다', await 오류문구가뜰때까지(driver, 양식, expected.오류), true);
    });
  });
});
