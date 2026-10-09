// 설정 화면의 서비스 하나 (SPEC §8.8). 기본 정보 · 대상 서버 · 실행 알림 · 테스트 작성 · 서비스 끄기 구획
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
  제외경로값,
  피그마설정주소,
} from './settingsView.js';
import { CrawlExcludeField } from './SettingsCrawlExclude.js';
import { EnvEditor, 보낼모양, 줄로, type 줄 } from './SettingsEnvs.js';
import { message } from './ui.js';

/**
 * 고른 서비스 하나의 설정 — 구획마다 「어디에 쓰이나」를 한 줄로 단다 (2026-10-09 시안 A).
 * 앞 판은 목록 줄을 펴면 칸 열 개가 한 줄로 이어져 무슨 설정인지 안 읽혔다(2026-10-07 사용자)
 *
 * @param onDone 저장했다. 접두사를 넘긴다 — 새로 만들었으면 그 서비스로 옮겨 간다
 */
export function ServicePanel({ row, onDone }: { row?: SettingsServiceRow; onDone: (접두사: string) => void }) {
  const t = use말();
  // 아래 판단 넷은 순수 모듈에 있어 훅을 못 쓴다. 언어를 여기서 꺼내 넘긴다
  const 언어 = use언어();
  const 새것 = row === undefined;
  const [prefix, setPrefix] = useState(row?.prefix ?? '');
  const [name, setName] = useState(row?.name ?? '');
  const [testsRepo, setTestsRepo] = useState(row?.testsRepo ?? '');
  const [testsDir, setTestsDir] = useState(row?.testsDir ?? '');
  const [envs, setEnvs] = useState<줄[]>(() => 줄로(row?.envs ?? []));
  const [제외, set제외] = useState((row?.crawlExclude ?? []).join('\n'));
  // 빈 글자와 「안 건드림」은 다르다. null 이면 서버에 아예 안 보낸다 (지금 것을 그대로 둔다)
  const [webhook, setWebhook] = useState<string | null>(새것 ? '' : null);
  const [figma, setFigma] = useState<string | null>(새것 ? '' : null);
  const [보내는중, set보내는중] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const 접두사틀림 = 접두사사유(prefix, 언어);
  const 못보내는이유 = 서비스못보내는이유({ 새것, prefix, name, testsDir, envs, 제외 }, 언어);

  async function 보낸다() {
    if (못보내는이유 !== null) return;
    set보내는중(true);
    setErr(null);
    try {
      const 같은칸 = { name, testsRepo, testsDir, envs: 보낼모양(envs), crawlExclude: 제외경로값(제외) };
      if (새것) {
        await api.createService({
          prefix,
          color: 안쓰는서비스색,
          ...같은칸,
          ...(webhook === null || webhook === '' ? {} : { slackWebhook: webhook }),
          ...(figma === null || figma === '' ? {} : { figmaToken: figma }),
        });
      } else {
        // 접두사는 안 보낸다. 보내면 서버가 400 PREFIX_IMMUTABLE 을 낸다 (SPEC §8.8)
        await api.updateService(row.id, {
          ...같은칸,
          ...(webhook === null ? {} : { slackWebhook: webhook }),
          ...(figma === null ? {} : { figmaToken: figma }),
        });
      }
      onDone(prefix);
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
      onDone(row.prefix);
    } catch (e) {
      setErr(오류문장(e, 언어));
    } finally {
      set보내는중(false);
    }
  }

  return (
    <div className="set-panel">
      <h2 className="set-panel-h">
        {새것 ? (
          t('새 서비스')
        ) : (
          <>
            {row.name}
            <span className="set-sub">{row.prefix}-</span>
            {row.isActive ? null : <span className="set-off">{t('비활성')}</span>}
            <span className="set-sub">{t('케이스 {건수}건', { 건수: row.caseCount })}</span>
          </>
        )}
      </h2>

      <구획 제목={t('기본 정보')} 쓰임={t('케이스 번호 · 사이드바 맨 위 서비스 고르개 · 스크립트를 읽어 올 폴더에 쓰입니다')}>
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
                ? t('만들 때만 정합니다. 케이스 번호(PAY-001)에 들어가므로 나중에 바꿀 수 없습니다')
                : t('만든 뒤에는 바꿀 수 없습니다. 케이스 번호에 이미 들어가 있습니다')}
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
            <div className="hint">{t('기록용으로만 적어 둡니다. 플랫폼이 이 저장소를 받아오지는 않습니다')}</div>
          </div>
        </div>
      </구획>

      <구획 제목={t('대상 서버')} 쓰임={t('실행할 때 「대상 서버」에서 고르는 목록입니다. 하나도 없으면 실행할 수 없습니다')}>
        <EnvEditor envs={envs} onChange={setEnvs} />
      </구획>

      <구획 제목={t('실행 알림')} 쓰임={t('실행할 때 「끝나면 Slack 으로 알리기」를 켜면 이 채널로 결과를 보냅니다')}>
        <비밀칸 id="sf-hook" 이름={t('Slack 웹훅')} 설정됨={row?.hasSlackWebhook ?? false} 새것={새것}
          값={webhook} 바꾼다={setWebhook} placeholder="https://hooks.slack.com/..."
          비울때={t('이대로 저장하면 알림을 끕니다. 그대로 두려면 「그대로 두기」를 누릅니다')} />
      </구획>

      <구획 제목={t('테스트 작성')} 쓰임={t('기획서 · 피그마로 테스트 스크립트를 만들 때만 씁니다. 실행에는 영향이 없습니다')}>
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
        <CrawlExcludeField 값={제외} 바꾼다={set제외} />
      </구획>

      {err === null ? null : <div className="err">{err}</div>}

      <div className="set-foot">
        {/* 버튼은 살아 있고 왜 안 되는지를 아래에 말한다 (SPEC §8.2 · DESIGN.md) */}
        <button className="btn" disabled={보내는중} onClick={() => void 보낸다()}>
          {새것 ? t('서비스 추가') : t('저장')}
        </button>
      </div>
      {못보내는이유 === null ? null : <div className="hint set-why">{못보내는이유}</div>}

      {/* 저장과 다른 일이라 따로 둔다 — 적다 만 칸은 저장하지 않고 상태만 뒤집는다 */}
      {새것 ? null : (
        <구획 제목={t('서비스 끄기')} 쓰임={t('끄면 사이드바의 서비스 고르개에서 빠집니다. 실행 기록과 스크립트는 남습니다')} 경고>
          <div>
            <button className="btn ghost" disabled={보내는중} onClick={() => void 활성을뒤집는다()}>
              {row.isActive ? t('비활성으로 내리기') : t('다시 활성으로')}
            </button>
          </div>
        </구획>
      )}
    </div>
  );
}

/** 설정 구획 하나 — 제목과 「어디에 쓰이나」 한 줄. 무슨 설정인지 칸 이름만으로는 안 읽혔다 (2026-10-07 사용자) */
function 구획({ 제목, 쓰임, 경고 = false, children }: { 제목: string; 쓰임: string; 경고?: boolean; children: ReactNode }) {
  return (
    <section className={경고 ? 'set-card warn' : 'set-card'}>
      <div className="set-card-h">
        <h3>{제목}</h3>
        <p>{쓰임}</p>
      </div>
      {children}
    </section>
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
          {p.값 === '' && !p.새것 ? p.비울때 : t('비밀값이라 한 번 넣으면 다시 보여 주지 않습니다')}
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
