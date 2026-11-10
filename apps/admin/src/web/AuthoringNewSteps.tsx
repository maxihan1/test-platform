// 새 작성 마법사의 단계 본문 — 단계 띠 · 작성 방법 · 자료 · 대상 서버 · 확인 (2026-11-11 시안 WizardB). 값과 보내기는 AuthoringNew 가 든다

import { useRef, useState } from 'react';

import type { EnvRow } from './api.js';
import { 받는종류 } from './authoringNewText.js';
import { 크기글 } from './GuideSection.js';
import { use말 } from './i18n.js';

export type 단계 = 'guide' | 'method' | 'material' | 'server' | 'confirm';
export type 방법 = 'prd' | 'screen' | 'both';

export const 단계이름: Record<단계, string> = { guide: '가이드', method: '작성 방법', material: '자료', server: '대상 서버', confirm: '확인' };

export const 방법표: { 값: 방법; 제목: string; 설명: string }[] = [
  { 값: 'prd', 제목: '기획서로 작성', 설명: 'PRD 파일과 피그마를 읽고 요구사항마다 케이스를 작성합니다' },
  { 값: 'screen', 제목: '화면을 훑어서 작성', 설명: '기획서 없이 실제 화면을 훑어 PRD 에 아직 없는 화면의 케이스를 작성합니다' },
  { 값: 'both', 제목: '기획서 + 실제 화면 대조', 설명: '기획서 화면을 먼저 작성하고, 반영되면 기획서에 없는 화면을 이어서 작성합니다' },
];

/** 위쪽 막대 — 지난 단계와 지금 단계를 대표색으로 칠한다 */
export function 단계띠({ 단계들, 지금 }: { 단계들: 단계[]; 지금: number }) {
  const t = use말();
  return (
    <ol className="wiz-new-steps" aria-label={t('단계')}>
      {단계들.map((s, i) => (
        <li key={s} className={i <= 지금 ? 'done' : undefined} aria-current={i === 지금 ? 'step' : undefined}>
          <i aria-hidden="true" />
          <span>
            {i + 1} {t(단계이름[s])}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function 단계머리({ 제목, 설명 }: { 제목: string; 설명?: string }) {
  return (
    <div className="wiz-new-head">
      <h3>{제목}</h3>
      {설명 === undefined ? null : <p>{설명}</p>}
    </div>
  );
}

export function 방법칸({
  고른,
  on고름,
  화면읽기,
}: {
  고른: 방법 | null;
  on고름: (값: 방법) => void;
  /** Android 앱 · 게임은 Device VISION 디바이스에서 화면을 읽는다는 안내 (kind.ts 화면읽기) */
  화면읽기: { 제목: string; 줄들: readonly string[] } | null;
}) {
  const t = use말();
  return (
    <>
      <단계머리 제목={t('무엇으로 케이스를 작성할까요?')} 설명={t('기대 결과는 요구사항에서만 가져옵니다. 화면에서 읽은 값은 미확정으로 표시됩니다')} />
      <div className="wiz-new-cards">
        {방법표.map((it) => (
          <button key={it.값} type="button" className="wiz-new-card" aria-pressed={고른 === it.값} aria-label={t(it.제목)} onClick={() => on고름(it.값)}>
            <strong>{t(it.제목)}</strong>
            <small>{t(it.설명)}</small>
          </button>
        ))}
      </div>
      {/* Device VISION 은 메뉴가 아니라 작성 · 실행이 지나가는 통로라 그 일을 하는 자리에서 보인다 (도메인/러너 §5.2 결정 4) */}
      {화면읽기 === null ? null : (
        <div className="wiz-new-note">
          <strong>{t(화면읽기.제목)}</strong>
          {화면읽기.줄들.map((it) => (
            <small key={it}>{t(it)}</small>
          ))}
        </div>
      )}
    </>
  );
}

const 같은파일 = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

/** 파일 끌어다 놓기 · 첨부 · 목록. 브라우저 파일 칸은 숨기고 단추로 연다 — 값을 늘 비우므로 그대로 두면 「선택된 파일 없음」이 보인다 */
export function 파일칸({ 파일들, set파일들, disabled }: { 파일들: File[]; set파일들: (바꾸기: (앞: File[]) => File[]) => void; disabled: boolean }) {
  const t = use말();
  const 고르개 = useRef<HTMLInputElement>(null);
  const [위, set위] = useState(false);
  // 앞에 고른 것에 이어 붙인다. 같은 파일을 두 번 고르면 하나만 남는다
  function 더한다(고른: File[]) {
    set파일들((앞) => [...앞, ...고른.filter((f) => !앞.some((g) => 같은파일(f, g)))]);
  }
  return (
    <div className="authoring-field">
      <span>{t('PRD 파일')}</span>
      <div
        className={위 ? 'wiz-new-drop over' : 'wiz-new-drop'}
        onDragOver={(e) => {
          e.preventDefault();
          set위(true);
        }}
        onDragLeave={() => set위(false)}
        onDrop={(e) => {
          e.preventDefault();
          set위(false);
          if (!disabled) 더한다(Array.from(e.dataTransfer.files));
        }}
      >
        <span>
          {t('파일을 여기로 끌어다 놓거나')}{' '}
          <button type="button" className="btn ghost small" disabled={disabled} onClick={() => 고르개.current?.click()}>
            {t('파일 첨부')}
          </button>
        </span>
        <small>{t('PDF · 워드 · 엑셀 · md · txt · csv · 파일 하나 20MB 까지')}</small>
      </div>
      <input
        ref={고르개}
        type="file"
        hidden
        multiple
        accept={받는종류}
        aria-label={t('PRD')}
        onChange={(e) => {
          // 목록을 읽은 뒤 값을 비워야 같은 파일을 다시 골라도 change 가 난다
          const 고른 = Array.from(e.target.files ?? []);
          e.target.value = '';
          더한다(고른);
        }}
      />
      {파일들.length === 0 ? null : (
        <ul className="guide-files">
          {파일들.map((f) => (
            <li key={`${f.name}|${String(f.size)}|${String(f.lastModified)}`} className="guide-file">
              <span className="guide-name">{f.name}</span>
              <span className="guide-meta">{크기글(f.size)}</span>
              <button
                type="button"
                className="btn ghost small"
                disabled={disabled}
                aria-label={t('{이름} 제거', { 이름: f.name })}
                onClick={() => set파일들((앞) => 앞.filter((g) => g !== f))}
              >
                {t('제거')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function 서버칸({
  envs,
  서버,
  on서버,
  웹,
  시작주소,
  on시작주소,
  운영자,
}: {
  envs: EnvRow[];
  서버: string | null;
  on서버: (값: string) => void;
  /** 웹만 시작 주소가 있다 — 앱 · 게임은 디바이스에서 켠 첫 화면에서 시작한다(보내면 서버가 400 BAD_ENV) */
  웹: boolean;
  시작주소: string;
  on시작주소: (값: string) => void;
  운영자: boolean;
}) {
  const t = use말();
  return (
    <>
      <단계머리 제목={t('어느 서버의 화면과 대조할까요?')} 설명={t('이 서버의 화면을 읽어 기획서와 대조합니다')} />
      {envs.length === 0 ? (
        <span className="error-text">
          {운영자
            ? t('이 애플리케이션에는 대상 서버가 없습니다. 설정 > 애플리케이션에서 먼저 넣으세요')
            : t('이 애플리케이션에는 대상 서버가 없습니다. 관리자에게 대상 서버를 넣어 달라고 요청하세요')}
        </span>
      ) : (
        <>
          <div className="authoring-field">
            <span aria-hidden="true">{t('대상 서버')}</span>
            {/* 감싸는 label 로 이름을 주면 선택지 글자까지 이름에 섞인다 */}
            <select aria-label={t('대상 서버')} value={서버 ?? ''} onChange={(e) => on서버(e.target.value)}>
              {envs.map((it) => (
                <option key={it.env} value={it.env}>
                  {it.env}
                </option>
              ))}
            </select>
          </div>
          {웹 ? (
            <div className="wiz-new-start">
              <label className="authoring-field">
              <span>{t('시작 주소')}</span>
              <input
                className="mono"
                // url 로 두면 브라우저가 제 말풍선으로 막는다 — 거절은 서버가 하고 사유는 이 폼이 적는다
                type="text"
                inputMode="url"
                value={시작주소}
                placeholder={envs.find((it) => it.env === 서버)?.baseUrl ?? ''}
                onChange={(e) => on시작주소(e.target.value)}
              />
              </label>
              {/* 이름표 밖에 둔다 — 안에 두면 칸 이름에 설명까지 섞인다 */}
              <small>{t('비우면 대상 서버 주소에서 시작합니다')}</small>
            </div>
          ) : (
            <small className="wiz-new-hint">{t('디바이스에서 앱을 켠 첫 화면에서 시작합니다')}</small>
          )}
        </>
      )}
    </>
  );
}

/** 마지막 단계 — 넣은 것을 한눈에 보이고 무엇을 하는지 말한다 */
export function 확인칸({ 줄들, 할일 }: { 줄들: [string, string][]; 할일: string }) {
  const t = use말();
  return (
    <>
      <단계머리 제목={t('이렇게 작성합니다')} />
      <dl className="wiz-new-sum">
        {줄들.map(([이름, 값]) => (
          <div key={이름}>
            <dt>{이름}</dt>
            <dd>{값}</dd>
          </div>
        ))}
      </dl>
      <p className="wiz-new-hint">{할일}</p>
      <p className="wiz-new-hint">{t('시작한 뒤 이 창을 닫아도 작성은 계속됩니다')}</p>
    </>
  );
}
