// 게임 애플리케이션 작성의 앞뒤 — 자식 앞에 창 기록 저장본 · 게임 지도를 받아 두고, 자식 뒤에 훑은 창 · 게임 지도 요소를 올린다 (도메인/게임 §3.10 「창 훑기」 · 「게임에만 있는 지도 넷」 · §7)
// 에이전트는 서버에서 root 로 돈다 — 자식이 쓴 파일은 링크 · 큰 파일을 따라가지 않고 읽는다(authoring-screens-keep-io 와 같은 손)
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { type 견준창, type 저장한창, 견주기, 창목록 } from './authoring-game-crawl.js';
import { 부른다 } from './authoring-io.js';
import { 계정섞였나 } from './authoring-reverse.js';
import { type 상태, 상태인가 } from './authoring-screens-keep.js';
import { type 화면통로, 새로쓰기, 안전히읽기, 폴더인가 } from './authoring-screens-keep-io.js';

/** 자료 폴더 안 자리 — 자식 지침(tpx-author references/game.md)과 프롬프트 절이 같은 이름을 쓴다 */
export const 게임자리 = { 저장본: 'game-kept', 훑기: 'game-crawl', 지도: 'game-map.txt', 요소: 'game-elements.json' } as const;

const 기록상한 = 200_000;
// 서버 game-elements 본문 상한(prd 통로와 같은 4MiB)보다 작게 — 넘으면 서버가 413 으로 돌려보낸다
const 요소상한 = 4_000_000;

/** 서버 화면 기록 가운데 게임 창(`game:`)만 — 웹 저장본(받은저장본)은 기록 첫 줄이 http 주소인 것만 받아 게임 창을 버린다 */
function 받은창들(몸: unknown): (저장한창 & { 글: string })[] {
  const 행들 = (몸 as { screens?: unknown } | null)?.screens;
  return (Array.isArray(행들) ? (행들 as Record<string, unknown>[]) : []).flatMap((x) =>
    상태인가(x?.state) && typeof x.url === 'string' && x.url.startsWith('game:') && typeof x.structFp === 'string' &&
    typeof x.textFp === 'string' && typeof x.crawledAt === 'string' && typeof x.record === 'string'
      ? [{ 상태: x.state, 키: x.url, 지문: x.structFp, 글자지문: x.textFp, 훑은날: x.crawledAt.slice(0, 10), 글: x.record }]
      : [],
  );
}

const 까닭 = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * 자식을 띄우기 전 — 창 기록 저장본(그 게임의 앱 줄)을 `game-kept/` 로, 게임 지도 글을 `game-map.txt` 로 받는다.
 * 못 받아도 작성은 간다(창을 전부 다시 정리할 뿐 · 지도가 빌 뿐). 앞 실행이 남긴 것은 먼저 지운다 — 이어받은 폴더에 낡은 지도가 보이면 안 된다
 */
export async function 게임준비(통로: 화면통로, 자료: string): Promise<void> {
  const 저장본 = join(자료, 게임자리.저장본);
  rmSync(저장본, { force: true, recursive: true });
  rmSync(join(자료, 게임자리.지도), { force: true });
  const 못받음 = (무엇: string, 왜: string) => console.error(`[작성] ${통로.번호}번 — ${무엇}을 못 받았다(작성은 간다): ${왜}`);
  try {
    const 답 = await 부른다(통로.주소기지, 통로.토큰, `/authoring/requests/${통로.번호}/screens`);
    if (답.status !== 200) 못받음('창 기록 저장본', `서버 ${답.status}`);
    const 창들 = 답.status === 200 ? 받은창들(답.몸) : [];
    if (창들.length > 0) {
      mkdirSync(저장본, { mode: 0o755 });
      const 목록 = 창들.map(({ 글, ...c }, i) => {
        const 기록 = `${String(i + 1).padStart(3, '0')}.yml`;
        새로쓰기(join(저장본, 기록), 글);
        return { ...c, 기록 };
      });
      새로쓰기(join(저장본, 'index.json'), JSON.stringify(목록));
    }
  } catch (e) {
    못받음('창 기록 저장본', 까닭(e));
  }
  try {
    const 답 = await 부른다(통로.주소기지, 통로.토큰, `/authoring/requests/${통로.번호}/game-map`);
    const 글 = (답.몸 as { text?: unknown } | null)?.text;
    if (답.status === 200 && typeof 글 === 'string') 새로쓰기(join(자료, 게임자리.지도), 글);
    else 못받음('게임 지도', `서버 ${답.status}`);
  } catch (e) {
    못받음('게임 지도', 까닭(e));
  }
}

/** 올리기 전 — 훑은 창과 게임 지도 요소를 올리고 PR 본문 머리 줄을 돌려준다. 어느 쪽이 실패해도 작성은 간다(줄에 적는다) */
export async function 게임올리기(통로: 화면통로, 자료: string, 비밀: readonly string[], 지금 = new Date()): Promise<string[]> {
  return [await 창올리기(통로, 자료, 비밀, 지금), await 요소올리기(통로, 자료, 비밀)];
}

/**
 * 훑기 폴더(`game-crawl/<이름>/`)마다 control-cli 의 list.json 과 자식이 견주기 명령으로 남긴 game.json 의 상태를 읽어 올린다.
 * 같음은 올리기 직전 서버 저장본과 다시 견줘 안 올린다 — 자식이 고칠 수 있는 game.json 의 표시는 믿지 않는다. 훑은 날을 둬야 30일 그물이 돈다.
 * 못 본 창은 지우지 않는다(complete 빈 목록) — 한 화면에서 시작한 훑기라 그 상태를 다 봤는지 모른다. 본 창은 찾은 창으로 남는다.
 * 테스트 계정 비밀번호가 든 기록은 하나도 올리지 않는다
 */
async function 창올리기(통로: 화면통로, 자료: string, 비밀: readonly string[], 지금: Date): Promise<string> {
  const 훑기 = join(자료, 게임자리.훑기);
  const 폴더들 = 폴더인가(훑기) ? readdirSync(훑기).filter((이름) => /^[\w.-]+$/.test(이름) && 폴더인가(join(훑기, 이름))) : [];
  const 묶음: { 상태: 상태; 폴더: string; 창들: ReturnType<typeof 창목록> }[] = [];
  for (const 이름 of 폴더들) {
    const 폴더 = join(훑기, 이름);
    try {
      const 상태값 = (JSON.parse(안전히읽기(폴더, 'game.json', 기록상한 * 10) ?? '{}') as { 상태?: unknown }).상태;
      const 목록 = 안전히읽기(폴더, 'list.json', 2_000_000);
      if (상태인가(상태값) && 목록 !== null) 묶음.push({ 상태: 상태값, 폴더, 창들: 창목록(JSON.parse(목록)) });
    } catch {
      // 못 읽은 폴더는 건너뛴다 — 아래 셈에서 빠져 드러난다
    }
  }
  if (묶음.length === 0) return `게임 창 기록 저장: 견주기를 마친 훑기 폴더가 없어 건너뜀(폴더 ${폴더들.length}개)`;
  const 길 = `/authoring/requests/${통로.번호}/screens`;
  try {
    const 받음 = await 부른다(통로.주소기지, 통로.토큰, 길);
    if (받음.status !== 200) return `게임 창 기록 저장: 실패 — 저장본을 못 읽었다(서버 ${받음.status})`;
    const 오늘 = 지금.toISOString().slice(0, 10);
    // 같은 상태의 같은 창을 두 폴더에서 봤으면 뒤의 것 하나만
    const 본 = new Map<string, { state: 상태; url: string; name: string }>();
    const 올릴 = new Map<string, { 상태: 상태; 창: 견준창; 글: string }>();
    const 같음 = new Set<string>();
    for (const b of 묶음) {
      for (const c of 견주기(b.창들, b.상태, 받은창들(받음.몸), 오늘)) {
        const 키 = `${b.상태} ${c.키}`;
        본.set(키, { state: b.상태, url: c.키, name: c.이름.slice(0, 500) });
        같음.delete(키);
        올릴.delete(키);
        const 글 = c.저장본 === '같음' ? null : 안전히읽기(b.폴더, c.파일, 기록상한);
        if (c.저장본 === '같음') 같음.add(키);
        else if (글 !== null) 올릴.set(키, { 상태: b.상태, 창: c, 글 });
      }
    }
    const 못읽음 = 본.size - 같음.size - 올릴.size;
    const 볼글 = [...[...본.values()].map((x) => x.name), ...[...올릴.values()].flatMap((x) => [x.글, ...x.창.연결.flatMap((l) => [l.toUrl, l.via])])];
    if (계정섞였나(볼글, 비밀)) return '게임 창 기록 저장: 기록에 테스트 계정 비밀번호가 들어 있어 올리지 않음';
    let 못올림 = 0;
    for (const { 상태: state, 창: c, 글 } of 올릴.values()) {
      const body = { state, url: c.키, name: c.이름.slice(0, 500), textFp: c.글자지문, structFp: c.지문, record: 글, crawledAt: 지금.toISOString(), links: c.연결.slice(0, 1_000) };
      if ((await 부른다(통로.주소기지, 통로.토큰, 길, { method: 'PUT', body })).status !== 204) 못올림 += 1;
    }
    const 끝 = await 부른다(통로.주소기지, 통로.토큰, `${길}/done`, { method: 'POST', body: { seen: [...본.values()], complete: [] } });
    return (
      `게임 창 기록 저장: 본 창 ${본.size}개 · 그대로라 재사용 ${같음.size}개 · 새로 저장 ${올릴.size - 못올림}개` +
      (못올림 + 못읽음 > 0 ? ` · 못 올림 ${못올림 + 못읽음}개` : '') +
      (끝.status === 200 ? '' : ` · 찾은 창 저장 실패(서버 ${끝.status})`)
    );
  } catch (e) {
    return `게임 창 기록 저장: 실패 — ${까닭(e)}`;
  }
}

/** 자식이 쓴 `game-elements.json`(PUT game-elements 본문 그대로)을 올린다. 모양 검사는 서버가 한다 — 틀린 자리를 줄에 싣는다 */
async function 요소올리기(통로: 화면통로, 자료: string, 비밀: readonly string[]): Promise<string> {
  const 글 = 안전히읽기(자료, 게임자리.요소, 요소상한);
  if (글 === null) return `게임 지도: ${게임자리.요소} 이 없어 안 올림`;
  let 몸: { elements?: unknown; remove?: unknown };
  try {
    몸 = JSON.parse(글) as typeof 몸;
  } catch {
    return `게임 지도: ${게임자리.요소} 을 JSON 으로 못 읽어 안 올림`;
  }
  if (계정섞였나([글], 비밀)) return '게임 지도: 테스트 계정 비밀번호가 들어 있어 안 올림';
  try {
    const 답 = await 부른다(통로.주소기지, 통로.토큰, `/authoring/requests/${통로.번호}/game-elements`, { method: 'PUT', body: 몸 });
    const 수 = (v: unknown) => (Array.isArray(v) ? v.length : 0);
    if (답.status === 204) return `게임 지도: 요소 ${수(몸.elements)}개 올림${수(몸.remove) > 0 ? ` · ${수(몸.remove)}개 지움` : ''}`;
    const 자리 = (답.몸 as { detail?: unknown } | null)?.detail;
    return `게임 지도: 못 올림 — 서버 ${답.status}${typeof 자리 === 'string' ? ` (${자리.slice(0, 100)})` : ''}`;
  } catch (e) {
    return `게임 지도: 못 올림 — ${까닭(e)}`;
  }
}
