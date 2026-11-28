import type { AppDriver } from '@platform/kit/app';
import type { 앱요소 } from '@platform/kit/parts';
import { 글자들, 될때까지, 뜰때까지, 보이나 } from '@platform/kit/parts';

export const 꾸러미 = 'org.joinmastodon.android';
export const 서버 = 'mastodon.maxihan.com';

export function 앱id(이름: string): string {
  return `id=${꾸러미}:id/${이름}`;
}

export function 목록안글자(글자: string, 목록 = 'list'): string {
  return `android=new UiSelector().resourceId("${꾸러미}:id/${목록}").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
}

export function 목록안글자포함(글자: string, 목록 = 'list'): string {
  return `android=new UiSelector().resourceId("${꾸러미}:id/${목록}").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
}

export function 굴려서글자포함(글자: string, 목록 = 'list'): string {
  return `android=new UiScrollable(new UiSelector().resourceId("${꾸러미}:id/${목록}")).scrollIntoView(new UiSelector().textContains(${JSON.stringify(글자)}))`;
}

export function 사용자명(아이디: string): string {
  return 아이디.split('@')[0] ?? 아이디;
}

export function 계정줄(아이디: string): string {
  return `@${사용자명(아이디)}@${서버}`;
}

export async function 누르기(driver: AppDriver, 선택자: string, 시간 = 15_000): Promise<void> {
  if (!(await 뜰때까지(driver, 선택자, 시간))) throw new Error(`「${선택자}」가 ${String(시간)}ms 안에 안 보인다`);
  await driver.$(선택자).click();
}

export async function 글읽기(driver: AppDriver, 선택자: string, 시간 = 10_000): Promise<string> {
  if (!(await 뜰때까지(driver, 선택자, 시간))) return '';
  return driver.$(선택자).getText();
}

export async function 있나(driver: AppDriver, 선택자: string): Promise<boolean> {
  return 보이나(driver, 선택자);
}

function 자식꼴인가(선택자: string): boolean {
  return 선택자.includes('.childSelector(') && 선택자.endsWith('))');
}

export async function 모든요소(driver: AppDriver, 선택자: string, 상한 = 30): Promise<앱요소[]> {
  if (!자식꼴인가(선택자)) return [...(await driver.$$(선택자).getElements())];
  const 요소들: 앱요소[] = [];
  for (let 순서 = 0; 순서 < 상한; 순서++) {
    const 요소 = driver.$(`${선택자.slice(0, -1)}.instance(${String(순서)}))`);
    if (!(await 요소.isExisting())) break;
    요소들.push(await 요소.getElement());
  }
  return 요소들;
}

export async function 모든글자(driver: AppDriver, 선택자: string, 상한 = 30): Promise<string[]> {
  if (!자식꼴인가(선택자)) return 글자들(driver, 선택자);
  const 글들: string[] = [];
  for (const 요소 of await 모든요소(driver, 선택자, 상한)) 글들.push(await 요소.getText());
  return 글들;
}

const 앱이름토스트 = 'Mastodon';

function 원문글풀기(글: string): string {
  return 글
    .replace(/&#10;/g, '\n')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export async function 지금토스트글들(driver: AppDriver): Promise<string[]> {
  const 원문 = await driver.getPageSource();
  return [...원문.matchAll(/<android\.widget\.Toast\b[^>]*\btext="([^"]*)"/g)]
    .map((맞음) => 원문글풀기(맞음[1] ?? ''))
    .filter((글) => 글 !== '' && 글 !== 앱이름토스트);
}

export async function 토스트글읽기(driver: AppDriver, 시간 = 8_000): Promise<string> {
  let 글 = '';
  await 될때까지(
    driver,
    async () => {
      글 = (await 지금토스트글들(driver))[0] ?? '';
      return 글 !== '';
    },
    시간,
  );
  return 글;
}

export async function 토스트글기다리기(driver: AppDriver, 글자: string, 시간 = 8_000): Promise<boolean> {
  return 될때까지(driver, async () => (await 지금토스트글들(driver)).some((글) => 글.includes(글자)), 시간);
}
