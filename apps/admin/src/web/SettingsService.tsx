// 설정 화면의 서비스 구획 (SPEC §8.8). 접두사·이름·색·테스트 폴더·대상 서버·Slack 웹훅·피그마 토큰
// 지우지 않는다 — 비활성으로 내릴 뿐이다. 지우면 그 서비스로 돌린 과거 증적이 흔들린다

import { useState, type ReactNode } from 'react';

import { api, ApiError, type SettingsServiceRow } from './api.js';
import { use말, use언어, type 언어 } from './i18n.js';
import {
  안쓰는서비스색,
  서비스못보내는이유,
  설정오류문장,
  접두사사유,
  웹훅칸,
  피그마설정주소,
} from './settingsView.js';
import { EnvEditor, 보낼모양, 줄로, type 줄 } from './SettingsEnvs.js';
import { message } from './ui.js';

export function ServiceSection({ rows, onDone }: { rows: SettingsServiceRow[]; onDone: () => void }) {
  const t = use말();
  const [여는것, set여는것] = useState<number | 'new' | null>(null);

  return (
    <section className="sec">
      <div className="sec-h">
        <span>{t('서비스')}</span>
        <button
          type="button"
          className="btn ghost icon"
          aria-label={여는것 === 'new' ? t('닫기') : t('더하기')}
          onClick={() => set여는것(여는것 === 'new' ? null : 'new')}
        >
          {여는것 === 'new' ? '×' : '+'}
        </button>
      </div>

      {여는것 === 'new' ? (
        <ServiceForm
          onDone={() => {
            set여는것(null);
            onDone();
          }}
        />
      ) : null}

      {rows.length === 0 ? (
        <div className="empty">
          {t('아직 서비스가 없습니다')}
          <small>{t('위 「+」로 첫 서비스를 만듭니다')}</small>
        </div>
      ) : (
        rows.map((it) => (
          <div key={it.id}>
            <div className="set-row">
              {/* 띠에서 쓸 색을 그대로 보여준다. 글자만 보고는 어떤 색인지 모른다 */}
              <span className="set-name">
                {it.name}
                {it.isActive ? null : <span className="set-off">{t('비활성')}</span>}
              </span>
              <span className="set-sub">{it.prefix}-</span>
              <span className="set-sub">{t('케이스 {건수}건', { 건수: it.caseCount })}</span>
              <span className="set-sub">
                {it.envs.length === 0
                  ? t('대상 서버 없음')
                  : t('대상 서버 {개수}개', { 개수: it.envs.length })}
              </span>
              <button
                className="btn ghost"
                onClick={() => set여는것(여는것 === it.id ? null : it.id)}
              >
                {여는것 === it.id ? t('닫기') : t('편집')}
              </button>
            </div>
            {여는것 === it.id ? (
              <ServiceForm
                row={it}
                onDone={() => {
                  set여는것(null);
                  onDone();
                }}
              />
            ) : null}
          </div>
        ))
      )}
    </section>
  );
}

function ServiceForm({ row, onDone }: { row?: SettingsServiceRow; onDone: () => void }) {
  const t = use말();
  // 아래 판단 넷은 순수 모듈에 있어 훅을 못 쓴다. 언어를 여기서 꺼내 넘긴다
  const 언어 = use언어();
  const 새것 = row === undefined;
  const [prefix, setPrefix] = useState(row?.prefix ?? '');
  const [name, setName] = useState(row?.name ?? '');
  const [testsRepo, setTestsRepo] = useState(row?.testsRepo ?? '');
  const [testsDir, setTestsDir] = useState(row?.testsDir ?? '');
  const [envs, setEnvs] = useState<줄[]>(() => 줄로(row?.envs ?? []));
  // 빈 글자와 「안 건드림」은 다르다. null 이면 서버에 아예 안 보낸다 (지금 것을 그대로 둔다)
  const [webhook, setWebhook] = useState<string | null>(새것 ? '' : null);
  const [figma, setFigma] = useState<string | null>(새것 ? '' : null);
  const [보내는중, set보내는중] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const 접두사틀림 = 접두사사유(prefix, 언어);
  const 못보내는이유 = 서비스못보내는이유({ 새것, prefix, name, testsDir, envs }, 언어);


  async function 보낸다() {
    if (못보내는이유 !== null) return;
    set보내는중(true);
    setErr(null);
    try {
      if (새것) {
        await api.createService({
          prefix,
          name,
          color: 안쓰는서비스색,
          testsRepo,
          testsDir,
          envs: 보낼모양(envs),
          ...(webhook === null || webhook === '' ? {} : { slackWebhook: webhook }),
          ...(figma === null || figma === '' ? {} : { figmaToken: figma }),
        });
      } else {
        // 접두사는 안 보낸다. 보내면 서버가 400 PREFIX_IMMUTABLE 을 낸다 (SPEC §8.8)
        await api.updateService(row.id, {
          name,
          testsRepo,
          testsDir,
          envs: 보낼모양(envs),
          ...(webhook === null ? {} : { slackWebhook: webhook }),
          ...(figma === null ? {} : { figmaToken: figma }),
        });
      }
      onDone();
    } catch (e) {
      setErr(오류문장(e, 언어));
    } finally {
      set보내는중(false);
    }
  }

  /** 활성 여부만 뒤집는다. 적다 만 것은 저장하지 않으므로 그 사실을 먼저 알린다 */
  async function 활성을뒤집는다() {
    if (row === undefined) return;
    set보내는중(true);
    setErr(null);
    try {
      await api.updateService(row.id, { isActive: !row.isActive });
      onDone();
    } catch (e) {
      setErr(오류문장(e, 언어));
    } finally {
      set보내는중(false);
    }
  }

  return (
    <div className="set-form">
      <div className="field">
        <label htmlFor="sf-prefix">{t('접두사')}</label>
        <div>
          <input
            id="sf-prefix"
            type="text"
            value={prefix}
            disabled={!새것}
            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
            placeholder="PAY"
          />
          <div className="hint">
            {새것
              ? t('만들 때만 정합니다. 케이스 번호(PAY-001) 안에 박히므로 나중에 바꿀 수 없습니다')
              : t('만든 뒤에는 바꿀 수 없습니다. 케이스 번호 안에 이미 박혀 있습니다')}
          </div>
          {접두사틀림 === null ? null : <div className="err">{접두사틀림}</div>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="sf-name">{t('이름')}</label>
        <input
          id="sf-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('결제 서비스')}
        />
      </div>

      <div className="field">
        <label htmlFor="sf-dir">{t('테스트 폴더')}</label>
        <div>
          <input
            id="sf-dir"
            type="text"
            value={testsDir}
            onChange={(e) => setTestsDir(e.target.value)}
            placeholder="pay"
          />
          <div className="hint">{t('플랫폼이 실제로 훑을 폴더입니다')}</div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="sf-repo">{t('테스트 저장소')}</label>
        <div>
          <input
            id="sf-repo"
            type="text"
            value={testsRepo}
            onChange={(e) => setTestsRepo(e.target.value)}
            placeholder="https://github.com/..."
          />
          <div className="hint">{t('적어 두기만 합니다. 플랫폼이 받아오지는 않습니다')}</div>
        </div>
      </div>

      <EnvEditor envs={envs} onChange={setEnvs} />

      <비밀칸 id="sf-hook" 이름={t('Slack 웹훅')} 설정됨={row?.hasSlackWebhook ?? false} 새것={새것}
        값={webhook} 바꾼다={setWebhook} placeholder="https://hooks.slack.com/..."
        비울때={t('이대로 저장하면 알림을 끕니다. 그대로 두려면 「그대로 두기」를 누릅니다')} />

      {/* 규칙은 웹훅과 같다. 발급 안내를 옆에 둔다 — 어디서 만드는지 모르면 칸이 비어 남는다 (도메인/인증 §8.8) */}
      <비밀칸 id="sf-figma" 이름={t('피그마 토큰')} 설정됨={row?.hasFigmaToken ?? false} 새것={새것}
        값={figma} 바꾼다={setFigma} placeholder="figd_..."
        비울때={t('이대로 저장하면 토큰을 지웁니다. 피그마 자료를 못 읽게 됩니다')}>
        <div className="hint">
          {t('Figma → Settings → Security → Personal access tokens 에서 만듭니다. 권한은 File content 읽기만, 만료일을 정합니다')}{' '}
          <a href={피그마설정주소} target="_blank" rel="noopener noreferrer">
            {t('Figma 설정 열기')} ↗
          </a>
        </div>
      </비밀칸>

      {err === null ? null : <div className="err">{err}</div>}

      <div className="set-foot">
        {새것 ? null : (
          <button className="btn ghost set-left" disabled={보내는중} onClick={() => void 활성을뒤집는다()}>
            {row.isActive ? t('비활성으로 내리기') : t('다시 활성으로')}
          </button>
        )}
        {/* 버튼은 살아 있고 왜 안 되는지를 아래에 말한다 (SPEC §8.2 · DESIGN.md) */}
        <button className="btn" disabled={보내는중} onClick={() => void 보낸다()}>
          {새것 ? t('서비스 추가') : t('저장')}
        </button>
      </div>
      {못보내는이유 === null ? null : <div className="hint set-why">{못보내는이유}</div>}
    </div>
  );
}

/** 비밀값 칸 — 웹훅과 피그마 토큰이 같이 쓴다. 값을 되돌려 안 보여서 고치는 길이 「다시 넣기」다 (§8.8) */
function 비밀칸(p: {
  id: string; 이름: string; 설정됨: boolean; 새것: boolean; placeholder: string; 비울때: string;
  값: string | null; 바꾼다: (값: string | null) => void; children?: ReactNode;
}) {
  const t = use말();
  const 칸 = 웹훅칸(p.설정됨, use언어());
  return (
    <div className="field">
      <label htmlFor={p.id}>{p.이름}</label>
      <div>
        {p.값 === null ? (
          <div className="set-hook">
            <span>{칸.글}</span>
            <button className="btn ghost" onClick={() => p.바꾼다('')}>{칸.버튼}</button>
          </div>
        ) : (
          <div className="set-hook">
            <input id={p.id} type="password" value={p.값} placeholder={p.placeholder}
              onChange={(e) => p.바꾼다(e.target.value)} />
            {/* 되돌아갈 길이 없으면, 마음을 바꿔 그냥 저장했을 때 빈 글자가 가서 값이 지워진다 */}
            {p.새것 ? null : (
              <button className="btn ghost" onClick={() => p.바꾼다(null)}>{t('그대로 두기')}</button>
            )}
          </div>
        )}
        <div className="hint">
          {p.값 === '' && !p.새것 ? p.비울때 : t('비밀값이라 한 번 넣으면 되돌려 보여주지 않습니다')}
        </div>
        {p.children}
      </div>
    </div>
  );
}

/** `type="color"` 는 여섯 자리 16진수만 받는다. 타이핑 중인 값을 그대로 주면 검정으로 튄다 */
/** 서버가 코드를 주면 사람 말로, 아니면 원문 그대로. 한 화면 안에서 말투가 갈리지 않게 한자리에 둔다 */
export function 오류문장(e: unknown, 언어: 언어): string {
  if (!(e instanceof ApiError)) return message(e, 언어);
  // `INVALID_REQUEST` 일 때 서버가 어느 칸인지 짚어 준다. 그 값은 message 에 들어 있다
  const 짚어준것 = e.code === 'INVALID_REQUEST' ? e.message : undefined;
  return 설정오류문장(e.code, 언어, 짚어준것);
}
