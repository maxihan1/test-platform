import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 유행중화면 } from './pages/explore.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-319',
  name: '유행 중 버튼 반응',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 유행중화면(page);
  const 프로필 = new 프로필화면(page);
  const 상세 = new 글상세화면(page);
  const 글경로식 = /^\/@[^/]+\/\d+$/;

  await test.step('유행 중에서 「해시태그」 탭을 누른다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await 화면.해시태그탭.click();
    await verify('유행 중에서 「해시태그」 탭을 누르면 /explore/tags 로 간다', new URL(page.url()).pathname, '/explore/tags');
  });

  await test.step('유행 중에서 「소식」 탭을 누른다', async () => {
    await 화면.열기();
    await 화면.소식탭.click();
    await verify('유행 중에서 「소식」 탭을 누르면 /explore/links 로 간다', new URL(page.url()).pathname, '/explore/links');
  });

  await test.step('유행 중에서 글 작성자 링크를 누른다', async () => {
    await 화면.열기();
    const 눌렀다 = await 화면.작성자링크.click({ timeout: 3_000 }).then(() => true, () => false);
    const 도착 = 눌렀다 && (await 프로필.표시이름.waitFor({ timeout: 10_000 }).then(() => true, () => false));
    await verify('유행 중에서 글 작성자 링크를 누르면 작성자 프로필로 간다', 도착 && /^\/@[^/]+$/.test(new URL(page.url()).pathname), true);
  });

  await test.step('유행 중에서 글 시각 링크를 누른다', async () => {
    await 화면.열기();
    const 눌렀다 = await 화면.시각링크.click({ timeout: 3_000 }).then(() => true, () => false);
    const 도착 = 눌렀다 && (await 상세.돌아가기.waitFor({ timeout: 10_000 }).then(() => true, () => false));
    await verify('유행 중에서 글 시각 링크를 누르면 그 글 상세로 간다', 도착 && 글경로식.test(new URL(page.url()).pathname), true);
  });

  await test.step('유행 중에서 글 「자세히」의 「상세 정보 표시」를 누른다', async () => {
    await 화면.열기();
    const 열렸다 = await 화면.자세히.click({ timeout: 3_000 }).then(() => true, () => false);
    const 눌렀다 = 열렸다 && (await 화면.펼침.항목('상세 정보 표시').click({ timeout: 5_000 }).then(() => true, () => false));
    const 도착 = 눌렀다 && (await 상세.돌아가기.waitFor({ timeout: 10_000 }).then(() => true, () => false));
    await verify('유행 중에서 「자세히」의 「상세 정보 표시」를 누르면 그 글 상세로 간다', 도착 && 글경로식.test(new URL(page.url()).pathname), true);
  });

  await test.step('유행 중에서 글 「자세히」의 「임베드 코드 받기」를 누른다', async () => {
    await 화면.열기();
    const 열렸다 = await 화면.자세히.click({ timeout: 3_000 }).then(() => true, () => false);
    const 눌렀다 = 열렸다 && (await 화면.펼침.항목('임베드 코드 받기').click({ timeout: 5_000 }).then(() => true, () => false));
    const 떴다 = 눌렀다 && (await 화면.창.창.first().waitFor({ timeout: 10_000 }).then(() => true, () => false));
    await verify('유행 중에서 「자세히」의 「임베드 코드 받기」를 누르면 임베드 코드 창이 뜬다', 떴다, true);
  });
});
