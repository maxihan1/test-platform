// 사이드바 찾기 칸과 찾기 창 — 고른 애플리케이션의 케이스(TC ID · 이름)와 메뉴 이름을 찾는다 (SPEC 공통/5-화면공통 §8 「껍데기」 찾기 칸 · 2026-10-30 시안 11판)

import { useEffect, useState } from 'react';

import { api, type CaseRow } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 아이콘 } from './icons.js';
import type { 자리 } from './layout.js';
import { Modal } from './Modal.js';
import { 케이스주소 } from './route.js';
import { message } from './ui.js';

/** 케이스는 앞에서 이만큼만 보인다 — 더 찾으려면 말을 더 적는다. 다 보려면 케이스 목록의 검색 칸이다 */
const 케이스몇건 = 8;

interface 찾은것 {
  이름: string;
  해시: string;
  /** 케이스면 TC ID */
  번호?: string;
}

/** 메뉴 이름 — 하위는 「묶음 · 하위」 이름으로 찾는다. 바깥으로 여는 자리(그래프)는 새 탭이라 뺀다 */
export function 메뉴찾기(자리들: readonly 자리[], 말: string): 찾은것[] {
  const 찾을말 = 말.trim().toLowerCase();
  if (찾을말 === '') return [];
  return 자리들
    .filter((it) => it.바깥 !== true)
    .flatMap((it) => [{ 이름: it.이름, 해시: it.해시 }, ...(it.하위 ?? []).map((하위) => ({ 이름: 하위.라벨, 해시: 하위.해시 }))])
    .filter((it) => it.이름.toLowerCase().includes(찾을말));
}

// 맥이면 ⌘, 아니면 Ctrl 이다 — 글쇠 표시가 누를 글쇠와 달라 헷갈리지 않게
const 맥인가 = (): boolean => /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * 누르거나 ⌘K(Windows Ctrl K)로 연다. 케이스 찾기는 케이스 목록이 이미 쓰는 검색(`q`)을 그대로 부른다 — 새 통로를 만들지 않는다.
 * 다른 애플리케이션 · 실행 기록 · 요구사항은 찾지 않는다(각 화면의 검색 칸 몫)
 */
export function 찾기칸({ 자리들, prefix, 케이스볼수있나 }: { 자리들: readonly 자리[]; prefix: string | null; 케이스볼수있나: boolean }) {
  const t = use말();
  const [열림, set열림] = useState(false);

  useEffect(() => {
    const 눌림 = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        // 브라우저의 주소창 찾기(Ctrl K)보다 앞선다 — 화면 안에서 찾는 칸이 이것이다
        e.preventDefault();
        set열림(true);
      }
    };
    document.addEventListener('keydown', 눌림);
    return () => document.removeEventListener('keydown', 눌림);
  }, []);

  return (
    <>
      <button type="button" className="side-find" aria-label={t('찾기')} aria-haspopup="dialog" onClick={() => set열림(true)}>
        <아이콘 이름="search" />
        <span className="side-find-text">{t('찾기')}</span>
        <kbd>{맥인가() ? '⌘K' : 'Ctrl K'}</kbd>
      </button>
      {열림 ? <찾기창 자리들={자리들} prefix={케이스볼수있나 ? prefix : null} onClose={() => set열림(false)} /> : null}
    </>
  );
}

function 찾기창({ 자리들, prefix, onClose }: { 자리들: readonly 자리[]; prefix: string | null; onClose: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [말, set말] = useState('');
  const [케이스, set케이스] = useState<CaseRow[]>([]);
  const [오류, set오류] = useState<string | null>(null);
  // 케이스 답이 어느 말에 대한 것인가 — 치는 동안(답이 오기 전)에 「찾은 것이 없습니다」가 깜박이지 않게
  const [답한말, set답한말] = useState('');
  const [고른칸, set고른칸] = useState(0);

  useEffect(() => {
    const 찾을말 = 말.trim();
    if (prefix === null || 찾을말 === '') {
      set케이스([]);
      set오류(null);
      return;
    }
    // 글자마다 서버를 부르지 않는다 — 치는 동안은 기다렸다가 멈추면 한 번
    let 버림 = false;
    const 시계 = setTimeout(() => {
      api
        .cases({ service: prefix, q: 찾을말 })
        .then((답) => {
          if (버림) return;
          set케이스(답.items.slice(0, 케이스몇건));
          set오류(null);
          set답한말(찾을말);
        })
        .catch((e: unknown) => {
          if (버림) return;
          set오류(message(e, 언어));
          set답한말(찾을말);
        });
    }, 200);
    return () => {
      버림 = true;
      clearTimeout(시계);
    };
  }, [말, prefix, 언어]);

  const 찾은것들: 찾은것[] = [...메뉴찾기(자리들, 말), ...케이스.map((it) => ({ 이름: it.name, 해시: 케이스주소(it.tcId), 번호: it.tcId }))];
  const 간다 = (해시: string) => {
    onClose();
    window.location.hash = 해시;
  };

  return (
    <Modal
      제목={t('찾기')}
      onClose={onClose}
      버튼={
        <button type="button" className="btn ghost" onClick={onClose}>
          {t('닫기')}
        </button>
      }
    >
      <input
        className="find-input"
        type="search"
        aria-label={t('찾을 말')}
        placeholder={prefix === null ? t('메뉴 이름') : t('TC ID · 케이스 이름 · 메뉴 이름')}
        value={말}
        onChange={(e) => {
          set말(e.target.value);
          set고른칸(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const 끝 = Math.max(찾은것들.length - 1, 0);
            set고른칸((지금) => (e.key === 'ArrowDown' ? Math.min(지금 + 1, 끝) : Math.max(지금 - 1, 0)));
          } else if (e.key === 'Enter') {
            const 고른 = 찾은것들[고른칸];
            if (고른 !== undefined) 간다(고른.해시);
          }
        }}
      />
      {오류 === null ? null : <p className="find-error">{오류}</p>}
      {말.trim() === '' || 찾은것들.length > 0 || 오류 !== null || (prefix !== null && 답한말 !== 말.trim()) ? null : (
        <p className="find-none">{t('찾은 것이 없습니다')}</p>
      )}
      {찾은것들.length === 0 ? null : (
        <ul className="find-list" aria-label={t('찾은 것')}>
          {찾은것들.map((it, 차례) => (
            <li key={`${it.해시}·${it.번호 ?? ''}`}>
              <a
                href={it.해시}
                {...(차례 === 고른칸 ? { 'aria-current': 'true' as const, className: 'on' } : {})}
                onClick={(e) => {
                  e.preventDefault();
                  간다(it.해시);
                }}
              >
                {it.번호 === undefined ? <span className="find-kind">{t('메뉴')}</span> : <span className="find-kind mono">{it.번호}</span>}
                <span className="find-name">{it.이름}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
