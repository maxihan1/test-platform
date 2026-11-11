// 「PRD 관리」 목차의 「정리 필요」 묶음을 다른 묶음으로 옮기는 서랍 — 목차 규칙에 어긋난 이름을 고친다 (도메인/작성 §8.x 「목차」 · 2026-11-11 목록 시안 B)

import type { PrdItem } from '@platform/kit';
import { useId, useState } from 'react';

import { Drawer } from './Drawer.js';
import { use말 } from './i18n.js';
import type { 이름문제 } from './prdView.js';

/** 목차 줄과 이 서랍이 같이 보이는 까닭 글. 문제가 없으면 null */
export function 정리까닭(t: (키: string) => string, 문제: 이름문제 | null): string | null {
  if (문제 === null) return null;
  return 문제 === 'long' ? t('이름이 30자를 넘습니다') : 문제 === 'sentence' ? t('이름이 문장 꼴입니다') : t('기획서 제목에 없는 이름입니다');
}

export function 묶음정리서랍({
  feature,
  항목들,
  까닭,
  옮길곳들,
  쓰나,
  on옮기기,
  on닫기,
}: {
  feature: string;
  항목들: PrdItem[];
  까닭: string;
  /** 이름 규칙에 맞는 묶음들 */
  옮길곳들: string[];
  쓰나: boolean;
  on옮기기: (to: string) => Promise<boolean>;
  on닫기: () => void;
}) {
  const t = use말();
  const id = useId();
  // 요구 문장에 그 묶음 이름이 들어 있으면 거기가 고쳐 쓴 화면일 가능성이 크다
  const [to, setTo] = useState(() => 옮길곳들.find((h) => 항목들.some((x) => x.text.includes(h))) ?? 옮길곳들[0] ?? '');
  const [busy, setBusy] = useState(false);

  return (
    <Drawer className="prd-drawer" aria-labelledby={`${id}-title`} onClose={on닫기}>
      <div className="prd-drawer-head">
        <b id={`${id}-title`}>{t('묶음 정리')}</b>
        <button type="button" className="btn ghost icon prd-drawer-x" aria-label={t('상세 닫기')} onClick={on닫기}>
          ✕
        </button>
      </div>
      <div className="prd-drawer-body">
        <p className="prd-warn">
          <b>{t('이 묶음 이름은 목차 규칙에 맞지 않아요')}</b>
          <br />
          {까닭}
        </p>
        <section>
          <h3>{t('지금 이름')}</h3>
          <p className="prd-name">{feature}</p>
        </section>
        <section>
          <h3>{t('들어 있는 요구사항 {건수}건', { 건수: 항목들.length })}</h3>
          <ul className="prd-fixlist">
            {항목들.map((x) => (
              <li key={x.reqId}>
                <span className="prd-id">{x.reqId}</span> {x.text}
              </li>
            ))}
          </ul>
        </section>
        {!쓰나 || 옮길곳들.length === 0 ? null : (
          <section>
            <h3>
              <label htmlFor={`${id}-to`}>{t('옮길 묶음')}</label>
            </h3>
            <p className="hint">{t('목차 규칙에 맞는 묶음 가운데서 선택해요')}</p>
            <select id={`${id}-to`} value={to} onChange={(e) => setTo(e.target.value)}>
              {옮길곳들.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </section>
        )}
      </div>
      {!쓰나 || 옮길곳들.length === 0 ? null : (
        <div className="prd-drawer-foot">
          <button type="button" className="btn ghost small" onClick={on닫기}>
            {t('취소')}
          </button>
          <button
            type="button"
            className="btn small"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void on옮기기(to).then((됐나) => {
                if (!됐나) setBusy(false);
              });
            }}
          >
            {t('옮기기')}
          </button>
        </div>
      )}
    </Drawer>
  );
}
