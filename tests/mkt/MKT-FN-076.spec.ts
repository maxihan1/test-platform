import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 토스트 } from './components/toast.component.js';
import { 글쓰기 } from './pages/board-write.page.js';

const 작은png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC', 'base64');
const 작은gif = Buffer.from('R0lGODlhAQABAAAAADs=', 'base64');

export const spec = defineCase({
  tcId: 'MKT-FN-076',
  name: '글쓰기에서 이미지를 올리면 미리보기가 보이고 규칙에 어긋나면 토스트가 보인다',
  platforms: ['desktop'],
  precondition: ['일반 회원이 로그인해 있다', '글쓰기 화면이다', '글쓰기 화면에 이미지가 세 장 올라가 있다', '이미지 미리보기가 한 장 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
    limitBytes: z.number().describe('올릴 수 있는 파일 크기 한도(바이트)').default(5 * 1024 * 1024),
  }),
  expected: z.object({
    gifToast: z.string().describe('gif 를 올렸을 때 안내').default('jpg, png 파일만 올릴 수 있습니다'),
    bigToast: z.string().describe('한도를 넘는 파일을 올렸을 때 안내').default('5MB 이하 파일만 올릴 수 있습니다'),
    fourthToast: z.string().describe('네 번째 이미지를 올렸을 때 안내').default('이미지는 최대 3장까지 첨부할 수 있습니다'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 쓰기 = new 글쓰기(page);
  const 알림 = new 토스트(page);
  const 파일 = (이름: string) => ({ name: 이름, mimeType: 'image/png', buffer: 작은png });

  await test.step('일반 회원 계정으로 로그인해 글쓰기 화면을 연다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 로그인.로그인한다(params.loginId, params.password ?? '');
    await 쓰기.열기();
  });

  await test.step('글쓰기 화면을 확인한다', async () => {
    await verify('일반 회원이 로그인해 있다', [await 머리.로그아웃.isVisible(), await 쓰기.제목칸.isVisible()].join(', '), 'true, true', { blocker: true });
  });

  await test.step('png 이미지를 한 장 올린다', async () => {
    await 쓰기.이미지입력.setInputFiles(파일('a.png'));
    await 쓰기.미리보기.first().waitFor();
    await verify('첨부한 이미지는 입력칸 아래에 미리보기로 보인다', await 쓰기.미리보기.count(), 1);
  });

  await test.step('미리보기의 X 버튼을 누른다', async () => {
    await 쓰기.이미지빼기.click();
    await 쓰기.미리보기.first().waitFor({ state: 'detached' });
    await verify('미리보기의 X 버튼을 누르면 그 이미지가 빠진다', await 쓰기.미리보기.count(), 0);
  });

  await test.step('png 가 아닌 gif 파일을 올린다', async () => {
    await 쓰기.이미지입력.setInputFiles({ name: 'b.gif', mimeType: 'image/gif', buffer: 작은gif });
    await verify('jpg · png 가 아닌 파일을 올리면 토스트 「jpg, png 파일만 올릴 수 있습니다」가 보인다', await 알림.문구(expected.gifToast).innerText(), expected.gifToast);
  });

  await test.step('5MB 를 1바이트 넘는 png 파일을 올린다', async () => {
    await 쓰기.이미지입력.setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(params.limitBytes + 1) });
    await verify('5MB 를 넘는 파일을 올리면 토스트 「5MB 이하 파일만 올릴 수 있습니다」가 보인다', await 알림.문구(expected.bigToast).innerText(), expected.bigToast);
  });

  await test.step('네 번째 이미지를 올린다', async () => {
    await 쓰기.이미지입력.setInputFiles([파일('c.png'), 파일('d.png'), 파일('e.png')]);
    await 쓰기.미리보기.nth(2).waitFor();
    await 쓰기.이미지입력.setInputFiles(파일('f.png'));
    await verify('네 번째 이미지를 올리면 토스트 「이미지는 최대 3장까지 첨부할 수 있습니다」가 보인다', await 알림.문구(expected.fourthToast).innerText(), expected.fourthToast);
  });
});
