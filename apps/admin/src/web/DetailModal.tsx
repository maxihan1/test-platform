// 목록 한 줄의 상세 창 — 가운데 큰 창에 왼쪽은 읽는 내용, 오른쪽은 결과 · 세부 사항. 케이스 상세와 PRD 요구 상세가 같이 쓴다 (DESIGN.md 「상세 창」)
// 2026-11-27 사용자 — 오른쪽 서랍(480px)은 좁아 실행 기록이 꺾이고 출처가 길게 늘어졌다. Jira 이슈 창 모양 시안 C 2차을 골랐다

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';

import { use지금앱 } from './Head.js';
import { use말 } from './i18n.js';
import { 아이콘, type 아이콘이름 } from './icons.js';
import { 상자열렸나, 포커스가능 } from './Modal.js';

interface Props {
  id: string;
  /** 앱 이름 뒤에 설 자리 이름들(화면 이름 · 기능 묶음). 끝에 번호가 붙는다 */
  위치: string[];
  번호: string;
  /** 왼쪽 맨 위 큰 제목. 고치는 동안처럼 제목 자리를 비울 때는 null */
  제목: ReactNode;
  /** 주소 복사가 넘길 주소. `#/…` 도 되고 지금 주소에 붙여 완성한다. 없으면 지금 주소다 — 케이스 목록은 연 케이스를 주소에 담는다 */
  주소?: string;
  /** 목록에 보이는 차례의 앞 · 뒤 줄. 없으면 단추가 꺼진다 */
  on이전?: (() => void) | undefined;
  on다음?: (() => void) | undefined;
  onClose: () => void;
  왼쪽: ReactNode;
  오른쪽: ReactNode;
}

/** Tab 이 닿는 칸인가 — 접힌 상자 안 칸은 보이지 않는다. 접힌 상자의 머리(summary)는 닿는다 */
function 보이나(el: HTMLElement): boolean {
  const 접힌 = el.closest('details:not([open])');
  if (접힌 === null) return true;
  return el.tagName === 'SUMMARY' && el.parentElement === 접힌 && 접힌.parentElement?.closest('details:not([open])') == null;
}

/** 목록에서 지금 줄의 앞 · 뒤 줄을 여는 함수. 처음 · 끝이거나 목록에 없으면 없다 — 케이스 목록 · PRD 요구가 같이 쓴다 */
export function 옆열기<T>(목록: readonly T[], 지금: T | undefined, 차이: number, 열기: (것: T) => void): (() => void) | undefined {
  const 자리 = 지금 === undefined ? -1 : 목록.indexOf(지금);
  const 옆 = 자리 === -1 ? undefined : 목록[자리 + 차이];
  return 옆 === undefined ? undefined : () => 열기(옆);
}

export function DetailModal({ id, 위치, 번호, 제목, 주소, on이전, on다음, onClose, 왼쪽, 오른쪽 }: Props) {
  const t = use말();
  const 앱 = use지금앱();
  const 창 = useRef<HTMLDivElement>(null);
  const 몸 = useRef<HTMLDivElement>(null);
  // 연 자리는 그리기 전에 잡는다 — 창으로 옮긴 포커스가 아니라 누른 줄이 잡혀야 닫을 때 돌려준다
  const [연곳] = useState(() => document.activeElement);
  const [복사, set복사] = useState<'ok' | 'fail' | null>(null);

  // 가로막는 창이라 포커스를 창으로 옮긴다. 첫 단추(주소 복사)가 아니라 창 자체로 — Enter 한 번에 무엇이 눌리지 않게.
  // 이전 · 다음으로 창이 새로 떴으면(케이스 상세는 줄마다 새로 그린다) 누른 단추를 이어 잡는다 — 창 자체로 가면 Tab 을 다시 세 번 눌러야 했다
  useEffect(() => {
    const 누른글 = 연곳 instanceof HTMLElement && 연곳.closest('.dm') !== null ? 연곳.getAttribute('aria-label') : null;
    const 이어 = [...(창.current?.querySelectorAll<HTMLButtonElement>('.dm-icon') ?? [])].find((b) => b.getAttribute('aria-label') === 누른글 && !b.disabled);
    (이어 ?? 창.current)?.focus();
    return () => {
      // 옆 줄로 넘어가 새 창이 떠 있으면 건드리지 않는다 — 돌려주면 뒤 목록이 처음 누른 줄로 굴렀다
      if (document.querySelector('.dm') !== null) return;
      // 창 안에 있던 포커스는 창과 같이 사라져 body 로 간다 — 그때만 연 자리로 돌려준다
      const 지금 = document.activeElement;
      if ((지금 === null || 지금 === document.body) && 연곳 instanceof HTMLElement && 연곳.isConnected) 연곳.focus();
    };
  }, []);

  // 옆 줄로 넘어가면 두 칸을 맨 위로 — 앞 줄에서 내려 둔 자리가 남으면 새 제목이 안 보인다
  useEffect(() => {
    const 몸칸 = 몸.current;
    if (몸칸 === null) return;
    몸칸.scrollTop = 0;
    for (const 칸 of 몸칸.children) 칸.scrollTop = 0;
  }, [번호]);

  // 듣기는 열 때 한 번만 건다 — onClose 가 바뀔 때마다 다시 걸면 창 안에서 연 상자보다 뒤로 밀려 Esc 하나에 둘 다 닫힌다
  const 닫기 = useRef(onClose);
  닫기.current = onClose;
  useEffect(() => {
    const 누름 = (e: KeyboardEvent) => {
      // 창 안에서 연 상자(실행 창 · 확인 창)가 있으면 Esc · Tab 은 그쪽 몫이다. 알림 서랍은 덮개 아래라 양보하지 않는다 — 양보하면 보이지 않는 서랍만 닫혀 Esc 가 안 듣는 것처럼 보였다
      if (상자열렸나()) return;
      if (e.key === 'Escape') {
        닫기.current();
        return;
      }
      if (e.key !== 'Tab' || 창.current === null) return;
      // 뒤 목록은 덮여 있다 — 포커스가 밖으로 나가면 보이지 않는 줄을 누르게 된다
      const 것들 = [...창.current.querySelectorAll<HTMLElement>(`${포커스가능}, summary`)].filter(보이나);
      if (것들.length === 0) return;
      const 처음 = 것들[0]!;
      const 끝 = 것들[것들.length - 1]!;
      const 안 = 창.current.contains(document.activeElement);
      if (!e.shiftKey && (document.activeElement === 끝 || !안)) {
        e.preventDefault();
        처음.focus();
      } else if (e.shiftKey && (document.activeElement === 처음 || document.activeElement === 창.current || !안)) {
        e.preventDefault();
        끝.focus();
      }
    };
    document.addEventListener('keydown', 누름);
    return () => document.removeEventListener('keydown', 누름);
  }, []);

  // 알림은 2초 뒤 걷는다 — 계속 두면 다음에 누른 것이 복사된 것처럼 읽힌다
  useEffect(() => {
    if (복사 === null) return;
    const 타이머 = setTimeout(() => set복사(null), 2000);
    return () => clearTimeout(타이머);
  }, [복사]);

  // 클립보드는 https 에서만 열린다. http 로 연 사내 서버에는 navigator.clipboard 가 없어 그 자리에서 던진다 — 약속 안에서 불러 실패 갈래로 받는다(SettingsCiTokens.tsx 와 같다)
  function 복사하기() {
    void Promise.resolve()
      // 주소가 없으면 지금 주소 그대로다 — new URL('', …) 은 # 뒤를 버려 해시 주소의 케이스가 사라졌다
      .then(() => navigator.clipboard.writeText(주소 === undefined ? window.location.href : new URL(주소, window.location.href).href))
      .then(
        () => set복사('ok'),
        () => set복사('fail'),
      );
  }

  const 단추 = (이름: 아이콘이름, 글: string, 누름: (() => void) | undefined) => (
    <button type="button" className="dm-icon" aria-label={글} title={글} disabled={누름 === undefined} onClick={누름}>
      <아이콘 이름={이름} />
    </button>
  );
  const 자리 = [앱?.name, ...위치].filter((글): 글 is string => 글 !== undefined && 글 !== '');

  return (
    // 뒤 목록은 --scrim 으로 덮는다. 흐리게 하지 않는다 (DESIGN.md 「모달」)
    <div
      className="dm-back"
      onMouseDown={(e) => {
        // 바깥 누르기 — 창 안에서 시작한 드래그는 세지 않는다. 고친 값은 목록이 들고 있어 닫아도 잃지 않는다
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={창} id={id} className="dm" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} tabIndex={-1}>
        <div className="dm-head">
          <nav className="dm-crumb" aria-label={t('위치')}>
            {자리.map((글, i) => (
              <Fragment key={`${String(i)}:${글}`}>
                <span>{글}</span>
                <span aria-hidden="true">/</span>
              </Fragment>
            ))}
            <b>{번호}</b>
          </nav>
          <span className="dm-note" role="status">
            {복사 === 'ok' ? t('주소를 복사했습니다') : 복사 === 'fail' ? t('주소를 복사하지 못했습니다') : null}
          </span>
          <div className="dm-icons">
            {단추('link', t('주소 복사'), 복사하기)}
            {단추('up', t('이전'), on이전)}
            {단추('down', t('다음'), on다음)}
            {단추('close', t('상세 닫기'), onClose)}
          </div>
        </div>
        <div className="dm-body" ref={몸}>
          <div className="dm-main">
            {/* 제목을 비우는 동안(고치기)에도 창 이름은 번호로 남는다 */}
            {제목 === null ? (
              <h2 id={`${id}-title`} className="sr-only">
                {번호}
              </h2>
            ) : (
              <h2 id={`${id}-title`} className="dm-title">
                {제목}
              </h2>
            )}
            {왼쪽}
          </div>
          <div className="dm-side">{오른쪽}</div>
        </div>
      </div>
    </div>
  );
}

/** 오른쪽 칸의 접히는 상자 (Jira 「세부 사항」 모양). 열린 채로 시작한다 */
export function 상세상자({ 제목, 부제, 열림 = true, children }: { 제목: string; 부제?: string; 열림?: boolean; children: ReactNode }) {
  return (
    <details className="dm-card" open={열림}>
      <summary>
        {제목}
        {부제 === undefined ? null : <small>{부제}</small>}
      </summary>
      {children}
    </details>
  );
}
