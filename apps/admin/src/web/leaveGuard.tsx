// 해시 주소 이동 · 서비스 바꾸기를 저장 안 한 화면이 막을 수 있게 하는 useHash 와 창 닫기 막기 · 목록 조건을 주소에 남기기 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
// 모듈 상태인 이유 — 해시 이동은 React 바깥 이벤트라, 화면이 내려가기 전에 막으려면 훅 밖에서 막는 쪽을 알아야 한다

import { useEffect, useRef, useState } from 'react';

import { use말 } from './i18n.js';
import { Modal } from './Modal.js';
import { 화면을바꾼다 } from './motion.js';
import { route } from './route.js';

let 막는쪽: ((갈곳: string) => void) | null = null;
interface 막는것 {
  묻기: (간다: () => void) => void;
  버리기도: boolean;
  열쇠?: string;
}
// 떠나기상자가 건 것. 한 화면에 여럿 설 수 있다(PRD 새 요구 칸과 줄 고치기 칸) — 맨 나중에 건 것이 묻고, 내려간 것은 제 것만 뺀다
const 막는것들: 막는것[] = [];
let 한번통과 = false;
// 지금 그린 주소. 막혔을 때 되돌아갈 곳이고, 주소고치기가 바꾼 조건도 여기 든다 — 안 그러면 막힌 뒤 조건이 주소에서 빠진다
let 이전 = window.location.hash;
// 방문 기록에서 지금 선 칸. 쌓을 때 다음 번호를 주려고 모듈이 든다
let 지금칸 = 0;
// 주소의 조건 바뀜을 스스로 듣는 화면(마법사 · 결정 탭)이 듣는 칸들. 그 칸만 바뀌는 같은 화면 안 이동이면 앱 뿌리가 다시 그리지도, 떠나기를 묻지도 않는다 —
// 다시 그리면 쓰던 값을 잃고, 단계를 옮기는 것은 떠나는 일이 아니다. 다른 칸까지 바뀌면 그 칸에 걸린 떠나기 막기가 그대로 묻는다
const 듣는칸들: (readonly string[])[] = [];

export function 스스로듣기(칸들: readonly string[]): () => void {
  듣는칸들.push(칸들);
  return () => {
    const 자리 = 듣는칸들.indexOf(칸들);
    if (자리 !== -1) 듣는칸들.splice(자리, 1);
  };
}

function 바뀐칸들(앞: string, 뒤: string): string[] {
  const a = new URLSearchParams(조건글(앞).slice(1));
  const b = new URLSearchParams(조건글(뒤).slice(1));
  return [...new Set([...a.keys(), ...b.keys()])].filter((칸) => a.get(칸) !== b.get(칸));
}

/** null 이면 다 푼다 — 로그아웃 · 세션 끊김 · 저장 뒤 자기 이동은 무엇도 막으면 안 된다 */
export function 떠나기막기(쪽: ((갈곳: string) => void) | null): void {
  막는쪽 = 쪽;
  if (쪽 === null) 막는것들.length = 0;
}

export function 떠나기로했다(): void {
  한번통과 = true;
}

/**
 * 주소는 그대로인데 쓴 것이 사라지는 일 — 서비스 고르개 바꾸기 · PRD 의 줄 접기와 다른 줄 고치기 — 을 하기 전에 부른다.
 * `버리기도` 를 켠 떠나기상자만 묻는다. 열쇠를 주면 그 열쇠의 상자만 묻는다 — 줄을 접을 때 새 요구 칸에 쓴 글은 사라지지 않는다
 */
export function 버리기전(이어서: () => void, 열쇠?: string): void {
  const 걸린 = 막는것들.filter((it) => it.버리기도 && (열쇠 === undefined || it.열쇠 === 열쇠)).at(-1);
  if (걸린 === undefined) 이어서();
  else 걸린.묻기(이어서);
}

/**
 * 목록 조건을 주소 뒤 `?` 에 남긴다. 방문 기록을 쌓지 않고 지금 칸을 고친다 — 칩마다 칸이 쌓이면 뒤로 가기로 목록을 못 떠난다.
 * hashchange 가 나지 않아 화면은 다시 그려지지 않는다
 */
export function 주소고치기(새주소: string): void {
  if (새주소 === window.location.hash) return;
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + 새주소);
  이전 = 새주소;
}

/**
 * 하나를 「여는」 일(실행 하나 · 케이스 상세 · 마법사 단계)은 방문 기록을 쌓는다 — 뒤로 가기가 연 것을 닫고 앞 주소로 간다.
 * 칸 번호를 이어 적는다. 안 적으면 떠나기 막기가 이 칸을 새 칸으로 오해해 두 칸을 간다
 */
export function 주소쌓기(새주소: string): void {
  if (새주소 === window.location.hash) return;
  지금칸 = (칸번호() ?? 지금칸) + 1;
  window.history.pushState({ navIndex: 지금칸 }, '', window.location.pathname + window.location.search + 새주소);
  이전 = 새주소;
}

/**
 * 화면이 스스로 주소를 옮긴다(권한 없는 자리 · 옛 번호 → 지금 번호). 쌓으면 뒤로 가기가 옮기기 전 주소로 가서 다시 옮겨져 갇히니 그 칸을 덮는다.
 * `location.replace` 는 칸 번호를 지워 기록이 어긋나서, 칸을 그대로 두고 주소만 바꾼 뒤 hashchange 를 직접 낸다
 */
export function 주소덮기(새주소: string): void {
  if (새주소 === window.location.hash) return;
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + 새주소);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** 지금 주소의 `?` 뒤 조건. 목록이 처음 그릴 때 읽는다 */
export function 주소조건(): URLSearchParams {
  const 자리 = window.location.hash.indexOf('?');
  return new URLSearchParams(자리 === -1 ? '' : window.location.hash.slice(자리 + 1));
}

/** 경로에 조건을 붙인다. 빈 값 · 기본값은 넘기는 쪽이 뺀다 */
export function 조건붙인주소(경로: string, 조건: Record<string, string>): string {
  const 글 = new URLSearchParams(조건).toString();
  return 글 === '' ? 경로 : `${경로}?${글}`;
}

const 조건글 = (주소: string) => (주소.includes('?') ? 주소.slice(주소.indexOf('?')) : '');

/**
 * 목록이 조건을 바꿀 때마다 주소를 고친다. 그사이 다른 화면으로 떠났으면 그 주소를 덮지 않는다.
 * 같은 화면 · 같은 조건이면 그대로 둔다 — `#/cases` 로 들어온 사람의 주소를 `#/cases/fn` 으로 괜히 바꾸지 않는다.
 * 목록이 선 채로 같은 화면의 조건 없는 주소가 오면(메뉴를 다시 누름) 화면이 든 조건으로 되돌린다 — 화면과 주소가 갈리면 새로고침이 조건을 잃는다.
 * 뒤로 · 앞으로 가기로 온 조건 없는 주소는 되돌리지 않는다 — 되돌리면 한 번에 못 떠난다. 그때는 앱 뿌리가 화면을 새로 그려 주소를 따른다
 * @param 쌓는칸 이 칸이 바뀌면 기록을 쌓는다(「여는」 일). 나머지 칸만 바뀌면 지금 칸을 고친다
 * @param 딸린칸 연 것에 딸린 칸(고른 실행의 결과 칸 거르개 · 쪽). 쌓는 칸과 같이 바뀌어도 쌓는다 — 다른 실행을 고르면 앞 실행의 거르개가 풀리는 것이 당연해서다
 * @param 스스로 켜 두면 다음 한 번은 쌓지 않고 지금 칸을 고친다 — 화면이 스스로 연 것을 비울 때(애플리케이션을 바꿔 고른 실행을 버림). 쓰고 나면 끈다
 * @param 듣기 주소의 조건이 사람 손 없이 바뀌면(뒤로 가기 · 링크) 불린다. 주면 앱 뿌리가 이 화면을 다시 그리지 않는다 — 쓰던 값을 지키려고 상태를 이쪽에서 고친다
 */
export function use주소조건(
  경로: string,
  조건: Record<string, string>,
  { 쌓는칸 = [], 딸린칸 = [], 스스로, 듣기 }: { 쌓는칸?: readonly string[]; 딸린칸?: readonly string[]; 스스로?: { current: boolean }; 듣기?: (조건: URLSearchParams) => void } = {},
): void {
  const 주소 = 조건붙인주소(경로, 조건);
  const 최신 = useRef({ 쌓는칸, 딸린칸, 스스로, 듣기 });
  최신.current = { 쌓는칸, 딸린칸, 스스로, 듣기 };
  const 처음 = useRef(true);
  const 듣나 = 듣기 !== undefined;
  useEffect(() => (듣나 ? 스스로듣기(최신.current.쌓는칸) : undefined), [듣나]);
  useEffect(() => {
    // 처음 그릴 때는 쌓지 않는다 — 막 열린 화면이 주소를 정리하는 것이지 사람이 연 것이 아니다
    let 쌓아도됨 = !처음.current && 최신.current.스스로?.current !== true;
    처음.current = false;
    if (최신.current.스스로 !== undefined) 최신.current.스스로.current = false;
    const 맞춘다 = () => {
      const 지금 = window.location.hash;
      if (route(지금).name !== route(경로).name) return;
      if (JSON.stringify(route(지금)) === JSON.stringify(route(주소)) && 조건글(지금) === 조건글(주소)) return;
      // 쌓는 칸만 바뀔 때만 쌓는다 — 다른 칸(쪽 · 거르개 · 애플리케이션을 바꿔 비운 것)이 같이 바뀌면 사람이 연 것이 아니다
      const 바뀐 = 바뀐칸들(지금, 주소);
      const { 쌓는칸: 쌓는, 딸린칸: 딸린 } = 최신.current;
      const 열었다 = 바뀐.some((칸) => 쌓는.includes(칸)) && 바뀐.every((칸) => 쌓는.includes(칸) || 딸린.includes(칸));
      (쌓아도됨 && 열었다 ? 주소쌓기 : 주소고치기)(주소);
    };
    맞춘다();
    쌓아도됨 = false;
    const 들음 = () => {
      const 지금 = window.location.hash;
      if (route(지금).name !== route(경로).name) return;
      // 조건 붙은 주소 · 뒤로 가기는 되돌리지 않는다 — 고리를 눌러 온 것(「RUN N에서 통과」)이거나 기록의 한 칸이라 그 주소를 따른다.
      // 화면은 앱 뿌리가 새로 그리거나(use이동 의 조건번) `듣기` 가 고친다
      if (!이번이동이새칸 || 조건글(지금) !== '') {
        최신.current.듣기?.(주소조건());
        return;
      }
      if (JSON.stringify(route(지금)) === JSON.stringify(route(주소))) 맞춘다();
    };
    window.addEventListener('hashchange', 들음);
    return () => window.removeEventListener('hashchange', 들음);
  }, [주소, 경로]);
}

// 방문 기록 칸마다 몇 번째인지 적어 둔다. 막혔을 때 링크로 새 칸이 쌓인 것인지 뒤로 · 앞으로 가기로 옛 칸에 온 것인지 가려야
// 원래 칸으로 돌아갈 수 있다 — 가리지 않고 지금 칸을 이전 주소로 덮으면 같은 주소 칸이 둘이 돼 뒤로 가기를 두 번 눌러야 했다
function 칸번호(): number | null {
  const s: unknown = window.history.state;
  return typeof s === 'object' && s !== null && 'navIndex' in s && typeof s.navIndex === 'number' ? s.navIndex : null;
}

// 이번 hashchange 가 새 칸(링크 · 메뉴)인지 기록 이동(뒤로 · 앞으로 · 덮기)인지. 모듈이 맨 먼저 듣고 정해 둬서 듣는 차례에 기대지 않는다 —
// 앱 뿌리의 듣기가 먼저 서면 새 칸에도 칸 번호가 찍힌 뒤에 목록이 읽는다
let 이번이동이새칸 = false;
window.addEventListener('hashchange', () => {
  이번이동이새칸 = 칸번호() === null;
});

function 칸적기(번호: number): void {
  const s: unknown = window.history.state;
  window.history.replaceState({ ...(typeof s === 'object' && s !== null ? s : {}), navIndex: 번호 }, '');
}

/**
 * 그린 해시와 조건 붙은 주소로 온 횟수. 앱 뿌리는 그 횟수를 화면 열쇠로 쓴다 —
 * 목록은 조건을 그릴 때 한 번만 읽어서, 같은 화면에 조건만 다른 주소로 오면 새로 그려야 그 조건을 따른다
 */
// ponytail: 앱 뿌리(main.tsx) 한 곳에서만 부른다. 둘이 걸리면 막힐 때 둘 다 물러나 두 칸을 간다 — 더 필요해지면 듣는 쪽을 모듈 하나로 모은다
export function use이동(): { hash: string; 조건번: number } {
  const [보는, set보는] = useState({ hash: window.location.hash, 조건번: 0 });
  useEffect(() => {
    이전 = window.location.hash;
    지금칸 = 칸번호() ?? 0;
    칸적기(지금칸);
    const onChange = () => {
      const 새것 = window.location.hash;
      if (새것 === 이전) return;
      const 온칸 = 칸번호();
      // 단계 · 탭을 스스로 듣는 화면 안에서 뒤로 · 앞으로 가는 것은 떠나는 일이 아니다 — 막지도, 다시 그리지도 않는다
      const 안에서 =
        듣는칸들.length > 0 &&
        온칸 !== null &&
        JSON.stringify(route(새것)) === JSON.stringify(route(이전)) &&
        바뀐칸들(이전, 새것).every((칸) => 듣는칸들.some((들) => 들.includes(칸)));
      const 묻는것 = 막는것들.at(-1);
      if ((막는쪽 !== null || 묻는것 !== undefined) && !한번통과 && !안에서) {
        if (온칸 === null) {
          // 새 칸이 쌓였다. 그 칸을 이전 주소로 덮고 한 칸 물러난다 — 같은 주소끼리 옮겨 hashchange 가 다시 나지 않는다
          window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + 이전);
          window.history.back();
        } else if (온칸 === 지금칸) {
          // 주소덮기가 같은 칸의 주소를 바꿨다. 되돌아갈 다른 칸이 없으니 이 칸의 주소만 되돌린다
          window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + 이전);
        } else {
          // 옛 칸으로 왔다. 그 칸은 두고 원래 칸으로 되돌아간다 — 돌아올 때의 hashchange 는 위의 같은 주소 검사가 거른다
          window.history.go(지금칸 - 온칸);
        }
        if (막는쪽 !== null) 막는쪽(새것);
        else
          묻는것!.묻기(() => {
            떠나기로했다();
            window.location.hash = 새것;
          });
        return;
      }
      if (온칸 === null) 칸적기(++지금칸);
      else 지금칸 = 온칸;
      한번통과 = false;
      const 앞 = 이전;
      이전 = 새것;
      // 뒤로 · 앞으로 가기로 온 주소는 조건이 없어도 새로 그린다 — 화면이 든 상태(고른 실행 · 열린 케이스)를 그 칸의 주소로 되돌려야 한다
      const 새로 = !안에서 && (조건글(새것) !== '' || 온칸 !== null);
      화면을바꾼다(앞, 새것, () => set보는((전) => ({ hash: 새것, 조건번: 새로 ? 전.조건번 + 1 : 전.조건번 })));
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return 보는;
}

/** 앱 뿌리 없이 화면만 그리는 검사 감싸개가 쓴다 — 앱에서는 main.tsx 의 use이동 하나만 듣는다 */
export function useHash(): string {
  return use이동().hash;
}

export function useBeforeUnload(막나: boolean): void {
  useEffect(() => {
    if (!막나) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [막나]);
}

/**
 * 저장 안 한 것이 있으면 주소 이동 · 창 닫기를 막고 `저장 안 된 변경 있음` 상자를 띄운다 (DESIGN.md 「모달」 ①).
 * @param 버리기도 주소가 안 바뀌어도 쓴 것이 사라지는 일(버리기전)에도 묻는다 — 서비스마다 새로 그려지는 화면만 켠다
 */
export function 떠나기상자({ 막나, 버리기도 = false, 열쇠 }: { 막나: boolean; 버리기도?: boolean; 열쇠?: string }) {
  const t = use말();
  // 함수를 상태로 들면 React 가 갱신 함수로 읽는다 — 한 겹 감싼다
  const [다음, set다음] = useState<{ 간다: () => void } | null>(null);

  useEffect(() => {
    if (!막나) return;
    const 것: 막는것 = { 묻기: (간다) => set다음({ 간다 }), 버리기도, ...(열쇠 === undefined ? {} : { 열쇠 }) };
    막는것들.push(것);
    return () => {
      const 자리 = 막는것들.indexOf(것);
      if (자리 !== -1) 막는것들.splice(자리, 1);
    };
  }, [막나, 버리기도, 열쇠]);
  useBeforeUnload(막나);

  if (다음 === null) return null;
  return (
    <Modal
      제목={t('저장 안 된 변경 있음')}
      onClose={() => set다음(null)}
      버튼={
        <>
          <button type="button" className="btn" onClick={() => set다음(null)}>
            {t('머무르기')}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              set다음(null);
              다음.간다();
            }}
          >
            {t('저장하지 않고 떠나기')}
          </button>
        </>
      }
    >
      {t('이 화면을 떠나면 저장하지 않은 내용이 사라집니다')}
    </Modal>
  );
}
