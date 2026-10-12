import type { Locator } from '@playwright/test';

export async function 본문줄들(본문: Locator): Promise<string[]> {
  return (await 본문.innerText()).split('\n').map((줄) => 줄.trim()).filter((줄) => 줄 !== '');
}

export async function 조항제목들(본문: Locator): Promise<string> {
  return (await 본문줄들(본문)).filter((줄) => /^제\d+조 \(.+\)$/.test(줄)).join(', ');
}

export async function 끝두줄(본문: Locator): Promise<string> {
  return (await 본문줄들(본문)).slice(-2).join(', ');
}
