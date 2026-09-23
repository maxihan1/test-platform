# 작성 에이전트 컨테이너. 화면이 세운 줄을 서버 안에서 집어 claude -p 로 케이스를 만들고 PR 을 낸다 (SPEC 도메인/작성 §3.6)
# 러너와 같은 Playwright 이미지에서 시작한다 — 관문 3회 실행이 브라우저를 쓰고, 태그가 @playwright/test 와 같아야 한다
FROM mcr.microsoft.com/playwright:v1.63.0-jammy

# gh 는 배포판 것이 너무 낡아(`--match-head-commit` 등) GitHub 공식 저장소에서 받는다.
# pandoc 은 docx 를 글자로 바꾼다 — 맥의 textutil 자리다 (2026-09-23 게이트 1)
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl git pandoc \
 && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list \
 && apt-get update && apt-get install -y --no-install-recommends gh \
 && rm -rf /var/lib/apt/lists/*

# 판을 고정한다 — `-p`·`--disallowedTools` 인자 동작을 실측한 판이다. 자동 업데이트는 compose 가 끈다
RUN npm install -g @anthropic-ai/claude-code@2.1.280

# 저장소는 실행할 때 /repo 로 붙는다. node_modules 는 그 위에 리눅스용 볼륨으로 덮는다 —
# 호스트(맥)의 것은 네이티브 부품이 달라 못 쓴다. 어느 uid 로 돌든 쓸 수 있게 열어 둔다(볼륨이 이 권한을 물려받는다)
RUN mkdir -p /repo/node_modules && chmod 0777 /repo/node_modules

COPY apps/authoring/start.sh /usr/local/bin/authoring-start
RUN chmod 0755 /usr/local/bin/authoring-start

WORKDIR /repo
CMD ["authoring-start"]
