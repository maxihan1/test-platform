import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-496',
  name: '이름을 1자로 적으면 「이름은 2~10자입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    nameShort: z.string().describe('가입할 이름 — 1자').default('가'),
    nameMin: z.string().describe('가입할 이름 — 2자').default('가나'),
    nameMax: z.string().describe('가입할 이름 — 10자').default('가나다라마바사아자차'),
    nameFit: z.string().describe('이름 칸에 적을 값 — 10자').default('가나다라마바사아자차'),
    nameOver: z.string().describe('이름 칸에 적을 값 — 11자').default('가나다라마바사아자차카'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 가입 = new 회원가입화면(page);
  await 안내창막기(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 가입.열기();
    await verify('비회원이다', await 가입.머리.로그인.isVisible(), true, { blocker: true });
    await verify('회원가입 화면이 보인다', await 가입.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('회원가입 이름에 1자를 적는다', async () => {
    await 가입.이름.fill(params.nameShort);
    await verify('이름을 1자로 적으면 「이름은 2~10자입니다」가 보인다', await 가입.이름오류.isVisible(), true);
  });

  await test.step('회원가입 이름에 2자를 적는다', async () => {
    await 가입.이름.fill(params.nameMin);
    await verify('이름을 2자로 적으면 이름 오류 문구가 보이지 않는다', await 가입.이름오류.isVisible(), false);
  });

  await test.step('회원가입 이름에 10자를 적는다', async () => {
    await 가입.이름.fill(params.nameMax);
    await verify('이름을 10자로 적으면 이름 오류 문구가 보이지 않는다', await 가입.이름오류.isVisible(), false);
  });

  await test.step('회원가입 이름 칸에 10자를 적는다', async () => {
    await 가입.이름.fill(params.nameFit);
    await verify('이름 칸에 10자를 적으면 10자가 다 들어간다', await 가입.값길이(가입.이름), 10);
  });

  await test.step('회원가입 이름 칸에 11자를 적는다', async () => {
    await 가입.이름.fill(params.nameOver);
    await verify('이름 칸에 11자를 적으면 10자까지만 들어간다', await 가입.값길이(가입.이름), 10);
  });
});
