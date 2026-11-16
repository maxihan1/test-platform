import type { AppDriver } from '@platform/kit/app';
import { 될때까지, 뜰때까지, 먼저뜨는것, 보이나, 사라질때까지, 칸에적기 } from '@platform/kit/parts';

import { 확인창 } from '../components/dialog.component.js';
import { 프로필편집화면 } from '../pages/profile-edit.page.js';

export const 항목라벨머리 = 'tc항목';
export const 해시태그머리 = 'tcfeat';
export const 항목화면제목 = 'Custom fields';
export const 해시태그화면제목 = 'Featured hashtags';

async function 하위화면열기(driver: AppDriver, 줄글: string, 제목: string, 불러온표지: Record<string, string>): Promise<boolean> {
  const 편집 = new 프로필편집화면(driver);
  await 편집.포함줄누르기(줄글);
  if (!(await 될때까지(driver, async () => (await 편집.화면제목()) === 제목, 10_000))) return false;
  return (await 먼저뜨는것(driver, 불러온표지, 15_000)) !== undefined;
}

export async function 항목화면열기(driver: AppDriver): Promise<boolean> {
  const 편집 = new 프로필편집화면(driver);
  return 하위화면열기(driver, 항목화면제목, 항목화면제목, { 추가: 편집.항목추가, 도움말: 편집.항목도움말, 제목: 편집.목록제목들 });
}

export async function 소개해시태그화면열기(driver: AppDriver): Promise<boolean> {
  const 편집 = new 프로필편집화면(driver);
  return 하위화면열기(driver, 해시태그화면제목, 해시태그화면제목, { 추가: 편집.줄('Add hashtag'), 제목: 편집.목록제목들 });
}

export async function 하위화면으로돌아오기(driver: AppDriver, 제목: string): Promise<boolean> {
  const 편집 = new 프로필편집화면(driver);
  if (await 보이나(driver, new 확인창(driver).확인버튼)) await driver.back();
  for (let 번 = 0; 번 < 4; 번 += 1) {
    if ((await 편집.화면제목()) === 제목) return true;
    await driver.back();
    await 될때까지(driver, async () => (await 편집.화면제목()) === 제목, 3_000);
  }
  return (await 편집.화면제목()) === 제목;
}

export async function 항목수(driver: AppDriver): Promise<number> {
  return (await new 프로필편집화면(driver).목록제목글들()).length;
}

export async function 항목더하기(driver: AppDriver, 라벨: string, 값 = '값'): Promise<boolean> {
  const 편집 = new 프로필편집화면(driver);
  await driver.$(편집.항목추가).click();
  if (!(await 뜰때까지(driver, 편집.항목라벨칸, 10_000))) throw new Error('「Add field」 화면이 안 열렸다');
  await 칸에적기(await driver.$(편집.항목라벨칸).getElement(), 라벨);
  await 칸에적기(await driver.$(편집.항목내용칸).getElement(), 값);
  await 될때까지(driver, () => 편집.저장켜졌나(), 5_000);
  await driver.$(편집.저장).click();
  if (!(await 사라질때까지(driver, 편집.항목라벨칸, 10_000))) return false;
  return 뜰때까지(driver, 편집.줄(라벨), 10_000);
}

export async function 항목수맞추기(driver: AppDriver, 목표: number, 더한라벨들: string[]): Promise<boolean> {
  let 수 = await 항목수(driver);
  while (수 < 목표) {
    const 라벨 = `${항목라벨머리} ${String(더한라벨들.length + 1)}`;
    더한라벨들.push(라벨);
    if (!(await 항목더하기(driver, 라벨))) throw new Error(`항목 「${라벨}」을 더하지 못했다`);
    수 = await 항목수(driver);
  }
  return 수 === 목표;
}

export async function 항목삭제창열기(driver: AppDriver, 라벨: string): Promise<void> {
  const 편집 = new 프로필편집화면(driver);
  const 순서 = (await 편집.목록제목글들()).indexOf(라벨);
  if (순서 < 0) throw new Error(`프로필 항목 「${라벨}」 줄이 없다`);
  await driver.$(편집.항목수정버튼(순서)).click();
  if (!(await 뜰때까지(driver, 편집.항목삭제버튼, 10_000))) throw new Error('「Edit field」 화면이 안 열렸다');
  await driver.$(편집.항목삭제버튼).click();
}

export async function 항목지우기(driver: AppDriver, 라벨: string): Promise<boolean> {
  const 편집 = new 프로필편집화면(driver);
  if (!(await 편집.목록제목글들()).includes(라벨)) return false;
  await 항목삭제창열기(driver, 라벨);
  const 창 = new 확인창(driver);
  if (!(await 창.뜰때까지())) throw new Error('「Delete field?」 확인 창이 안 떴다');
  await 창.확인();
  return 사라질때까지(driver, 편집.줄(라벨), 10_000);
}

export async function 머리항목지우기(driver: AppDriver): Promise<void> {
  const 편집 = new 프로필편집화면(driver);
  for (let 번 = 0; 번 < 4; 번 += 1) {
    const 남은 = (await 편집.목록제목글들()).find((글) => 글.startsWith(항목라벨머리));
    if (남은 === undefined) return;
    if (!(await 항목지우기(driver, 남은))) throw new Error(`앞 실행이 남긴 항목 「${남은}」을 지우지 못했다`);
  }
}

export async function 항목정리(driver: AppDriver, 라벨들: string[]): Promise<void> {
  if (라벨들.length === 0) return;
  if (!(await 하위화면으로돌아오기(driver, 항목화면제목))) throw new Error('「Custom fields」 화면으로 돌아오지 못해 더한 항목을 못 지웠다');
  for (const 라벨 of 라벨들) await 항목지우기(driver, 라벨);
}

export async function 해시태그더하기(driver: AppDriver, 태그: string): Promise<boolean> {
  const 편집 = new 프로필편집화면(driver);
  if (!(await 뜰때까지(driver, 편집.줄('Add hashtag'), 5_000))) return false;
  await driver.$(편집.줄('Add hashtag')).click();
  if (!(await 뜰때까지(driver, 편집.해시태그칸, 10_000))) throw new Error('「Add hashtag」 화면이 안 열렸다');
  await 칸에적기(await driver.$(편집.해시태그칸).getElement(), 태그);
  await 될때까지(driver, () => 편집.툴바추가켜졌나(), 5_000);
  await driver.$(편집.툴바추가).click();
  return 뜰때까지(driver, 편집.줄(`#${태그}`), 10_000);
}

export async function 해시태그수맞추기(driver: AppDriver, 목표: number, 더한태그들: string[]): Promise<boolean> {
  const 편집 = new 프로필편집화면(driver);
  let 수 = (await 편집.목록제목글들()).length;
  while (수 < 목표) {
    const 태그 = `${해시태그머리}${String(더한태그들.length + 1).padStart(2, '0')}`;
    더한태그들.push(태그);
    if (!(await 해시태그더하기(driver, 태그))) throw new Error(`해시태그 「#${태그}」를 더하지 못했다`);
    수 = (await 편집.목록제목글들()).length;
  }
  return 수 === 목표;
}

export async function 해시태그지우기창열기(driver: AppDriver, 태그: string): Promise<void> {
  const 편집 = new 프로필편집화면(driver);
  const 순서 = (await 편집.목록제목글들()).indexOf(`#${태그}`);
  if (순서 < 0) throw new Error(`소개 해시태그 「#${태그}」 줄이 없다`);
  await driver.$(편집.해시태그지우기버튼(순서)).click();
}

export async function 해시태그지우기(driver: AppDriver, 태그: string): Promise<boolean> {
  const 편집 = new 프로필편집화면(driver);
  if (!(await 편집.목록제목글들()).includes(`#${태그}`)) return false;
  await 해시태그지우기창열기(driver, 태그);
  const 창 = new 확인창(driver);
  if (!(await 창.뜰때까지())) throw new Error('「Remove hashtag?」 확인 창이 안 떴다');
  await 창.확인();
  return 사라질때까지(driver, 편집.줄(`#${태그}`), 10_000);
}

export async function 머리해시태그지우기(driver: AppDriver): Promise<void> {
  const 편집 = new 프로필편집화면(driver);
  for (let 번 = 0; 번 < 10; 번 += 1) {
    const 남은 = (await 편집.목록제목글들()).find((글) => 글.startsWith(`#${해시태그머리}`));
    if (남은 === undefined) return;
    if (!(await 해시태그지우기(driver, 남은.slice(1)))) throw new Error(`앞 실행이 남긴 해시태그 「${남은}」를 지우지 못했다`);
  }
}

export async function 해시태그정리(driver: AppDriver, 태그들: string[]): Promise<void> {
  if (태그들.length === 0) return;
  if (!(await 하위화면으로돌아오기(driver, 해시태그화면제목))) throw new Error('「Featured hashtags」 화면으로 돌아오지 못해 더한 해시태그를 못 지웠다');
  for (const 태그 of 태그들) await 해시태그지우기(driver, 태그);
}
