// 해시 주소 이동 · 서비스 바꾸기를 저장 안 한 화면이 막을 수 있게 하는 useHash 와 창 닫기 막기 · 목록 조건을 주소에 남기기 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
// 모듈 상태인 이유 — 해시 이동은 React 바깥 이벤트라, 화면이 내려가기 전에 막으려면 훅 밖에서 막는 쪽을 알아야 한다

import { useEffect, useState } from 'react';

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
 * 목록이 선 채로 같은 화면의 조건 없는 주소가 오면(메뉴를 다시 누름) 화면이 든 조건으로 되돌린다 — 화면과 주소가 갈리면 새로고침이 조건을 잃는다
 */
export function use주소조건(경로: string, 조건: Record<string, string>): void {
  const 주소 = 조건붙인주소(경로, 조건);
  useEffect(() => {
    const 맞춘다 = () => {
      const 지금 = window.location.hash;
      if (route(지금).name !== route(경로).name) return;
      if (JSON.stringify(route(지금)) === JSON.stringify(route(주소)) && 조건글(지금) === 조건글(주소)) return;
      주소고치기(주소);
    };
    맞춘다();
    // 조건 붙은 주소는 되돌리지 않는다 — 고리를 눌러 온 것(「RUN N에서 통과」)이라 그 조건을 따르고, 화면은 앱 뿌리가 새로 그린다(use이동 의 조건번)
    const 들음 = () => {
      const 지금 = window.location.hash;
      if (조건글(지금) === '' && JSON.stringify(route(지금)) === JSON.stringify(route(주소))) 맞춘다();
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
    let 지금칸 = 칸번호() ?? 0;
    칸적기(지금칸);
    const onChange = () => {
      const 새것 = window.location.hash;
      if (새것 === 이전) return;
      const 온칸 = 칸번호();
      const 묻는것 = 막는것들.at(-1);
      if ((막는쪽 !== null || 묻는것 !== undefined) && !한번통과) {
        if (온칸 === null) {
          // 새 칸이 쌓였다. 그 칸을 이전 주소로 덮고 한 칸 물러난다 — 같은 주소끼리 옮겨 hashchange 가 다시 나지 않는다
          window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + 이전);
          window.history.back();
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
      화면을바꾼다(앞, 새것, () => set보는((전) => ({ hash: 새것, 조건번: 조건글(새것) === '' ? 전.조건번 : 전.조건번 + 1 })));
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return 보는;
}

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
