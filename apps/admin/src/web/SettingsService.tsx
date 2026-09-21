// 설정 화면의 서비스 구획 (SPEC §8.8). 접두사·이름·색·테스트 폴더·대상 서버·Slack 웹훅
// 지우지 않는다 — 비활성으로 내릴 뿐이다. 지우면 그 서비스로 돌린 과거 증적이 흔들린다

import { useState } from 'react';

import { api, ApiError, type SettingsServiceRow } from './api.js';
import {
  기본서비스색,
  색사유,
  서비스못보내는이유,
  설정오류문장,
  접두사사유,
  웹훅칸,
} from './settingsView.js';
import { EnvEditor, 보낼모양, 줄로, type 줄 } from './SettingsEnvs.js';
import { message } from './ui.js';

export function ServiceSection({ rows, onDone }: { rows: SettingsServiceRow[]; onDone: () => void }) {
  const [여는것, set여는것] = useState<number | 'new' | null>(null);

  return (
    <section className="sec">
      <div className="sec-h">
        <span>서비스</span>
        <button className="btn ghost" onClick={() => set여는것(여는것 === 'new' ? null : 'new')}>
          {여는것 === 'new' ? '닫기' : '더하기'}
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
          아직 서비스가 없습니다
          <small>위 「더하기」로 첫 서비스를 만듭니다</small>
        </div>
      ) : (
        rows.map((it) => (
          <div key={it.id}>
            <div className="set-row">
              {/* 띠에서 쓸 색을 그대로 보여준다. 글자만 보고는 어떤 색인지 모른다 */}
              <span className="set-swatch" style={{ background: it.color }} aria-hidden="true" />
              <span className="set-name">
                {it.name}
                {it.isActive ? null : <span className="set-off">비활성</span>}
              </span>
              <span className="set-sub">{it.prefix}-</span>
              <span className="set-sub">케이스 {it.caseCount}건</span>
              <span className="set-sub">
                {it.envs.length === 0 ? '대상 서버 없음' : `대상 서버 ${String(it.envs.length)}개`}
              </span>
              <button
                className="btn ghost"
                onClick={() => set여는것(여는것 === it.id ? null : it.id)}
              >
                {여는것 === it.id ? '닫기' : '편집'}
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
  const 새것 = row === undefined;
  const [prefix, setPrefix] = useState(row?.prefix ?? '');
  const [name, setName] = useState(row?.name ?? '');
  const [color, setColor] = useState(row?.color ?? 기본서비스색);
  const [testsRepo, setTestsRepo] = useState(row?.testsRepo ?? '');
  const [testsDir, setTestsDir] = useState(row?.testsDir ?? '');
  const [envs, setEnvs] = useState<줄[]>(() => 줄로(row?.envs ?? []));
  // 빈 글자와 「안 건드림」은 다르다. null 이면 서버에 아예 안 보낸다 (지금 것을 그대로 둔다)
  const [webhook, setWebhook] = useState<string | null>(새것 ? '' : null);
  const [보내는중, set보내는중] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const 접두사틀림 = 접두사사유(prefix);
  const 색경고 = 색사유(color);
  const 웹훅 = 웹훅칸(row?.hasSlackWebhook ?? false);
  const 못보내는이유 = 서비스못보내는이유({ 새것, prefix, name, testsDir, color, envs });


  async function 보낸다() {
    if (못보내는이유 !== null) return;
    set보내는중(true);
    setErr(null);
    try {
      if (새것) {
        await api.createService({
          prefix,
          name,
          color,
          testsRepo,
          testsDir,
          envs: 보낼모양(envs),
          ...(webhook === null || webhook === '' ? {} : { slackWebhook: webhook }),
        });
      } else {
        // 접두사는 안 보낸다. 보내면 서버가 400 PREFIX_IMMUTABLE 을 낸다 (SPEC §8.8)
        await api.updateService(row.id, {
          name,
          color,
          testsRepo,
          testsDir,
          envs: 보낼모양(envs),
          ...(webhook === null ? {} : { slackWebhook: webhook }),
        });
      }
      onDone();
    } catch (e) {
      setErr(오류문장(e));
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
      setErr(오류문장(e));
    } finally {
      set보내는중(false);
    }
  }

  return (
    <div className="set-form">
      <div className="field">
        <label htmlFor="sf-prefix">접두사</label>
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
              ? '만들 때만 정합니다. 케이스 번호(PAY-001) 안에 박히므로 나중에 바꿀 수 없습니다'
              : '만든 뒤에는 바꿀 수 없습니다. 케이스 번호 안에 이미 박혀 있습니다'}
          </div>
          {접두사틀림 === null ? null : <div className="err">{접두사틀림}</div>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="sf-name">이름</label>
        <input
          id="sf-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="결제 서비스"
        />
      </div>

      <div className="field">
        <label htmlFor="sf-color">색</label>
        <div className="set-color">
          <input id="sf-color" type="color" value={색을고른다(color)} onChange={(e) => setColor(e.target.value)} />
          <input
            className="set-hex"
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="색 코드"
          />
          {/* 명암비 숫자만으로는 감이 안 온다. 흰 글자가 실제로 읽히는지 눈으로 보는 자리다 */}
          <span className="set-preview" style={{ background: color }}>
            {name === '' ? '띠 미리보기' : name}
          </span>
        </div>
      </div>
      {/* 명암비는 막지 않고 알린다. 기준을 아는 사람이 일부러 쓸 수도 있다 (DESIGN.md) */}
      {색경고 === null ? null : (
        <div className="field">
          <span />
          <div className="err">{색경고}</div>
        </div>
      )}

      <div className="field">
        <label htmlFor="sf-dir">테스트 폴더</label>
        <div>
          <input
            id="sf-dir"
            type="text"
            value={testsDir}
            onChange={(e) => setTestsDir(e.target.value)}
            placeholder="pay"
          />
          <div className="hint">플랫폼이 실제로 훑을 폴더입니다</div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="sf-repo">테스트 저장소</label>
        <div>
          <input
            id="sf-repo"
            type="text"
            value={testsRepo}
            onChange={(e) => setTestsRepo(e.target.value)}
            placeholder="https://github.com/..."
          />
          <div className="hint">적어 두기만 합니다. 플랫폼이 받아오지는 않습니다</div>
        </div>
      </div>

      <EnvEditor envs={envs} onChange={setEnvs} />

      <div className="field">
        <label htmlFor="sf-hook">Slack 웹훅</label>
        <div>
          {webhook === null ? (
            <div className="set-hook">
              <span>{웹훅.글}</span>
              <button className="btn ghost" onClick={() => setWebhook('')}>
                {웹훅.버튼}
              </button>
            </div>
          ) : (
            <div className="set-hook">
              <input
                id="sf-hook"
                type="password"
                value={webhook}
                onChange={(e) => setWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/..."
              />
              {/* 되돌아갈 길이 없으면, 마음을 바꿔 그냥 저장했을 때 빈 글자가 가서 웹훅이 지워진다 */}
              {새것 ? null : (
                <button className="btn ghost" onClick={() => setWebhook(null)}>
                  그대로 두기
                </button>
              )}
            </div>
          )}
          <div className="hint">
            {webhook === '' && !새것
              ? '이대로 저장하면 알림을 끕니다. 그대로 두려면 「그대로 두기」를 누릅니다'
              : '비밀값이라 한 번 넣으면 되돌려 보여주지 않습니다'}
          </div>
        </div>
      </div>

      {err === null ? null : <div className="err">{err}</div>}

      <div className="set-foot">
        {새것 ? null : (
          <button className="btn ghost set-left" disabled={보내는중} onClick={() => void 활성을뒤집는다()}>
            {row.isActive ? '비활성으로 내리기' : '다시 활성으로'}
          </button>
        )}
        {/* 버튼은 살아 있고 왜 안 되는지를 아래에 말한다 (SPEC §8.2 · DESIGN.md) */}
        <button className="btn" disabled={보내는중} onClick={() => void 보낸다()}>
          {새것 ? '서비스 추가' : '저장'}
        </button>
      </div>
      {못보내는이유 === null ? null : <div className="hint set-why">{못보내는이유}</div>}
    </div>
  );
}

/** `type="color"` 는 여섯 자리 16진수만 받는다. 타이핑 중인 값을 그대로 주면 검정으로 튄다 */
function 색을고른다(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : 기본서비스색;
}

/** 서버가 코드를 주면 사람 말로, 아니면 원문 그대로. 한 화면 안에서 말투가 갈리지 않게 한자리에 둔다 */
export function 오류문장(e: unknown): string {
  if (!(e instanceof ApiError)) return message(e);
  // `INVALID_REQUEST` 일 때 서버가 어느 칸인지 짚어 준다. 그 값은 message 에 들어 있다
  const 짚어준것 = e.code === 'INVALID_REQUEST' ? e.message : undefined;
  return 설정오류문장(e.code, 짚어준것);
}
