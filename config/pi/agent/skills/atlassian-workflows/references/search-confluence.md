Confluence에서 문서를 검색합니다.

## Input

사용자가 검색 키워드를 전달합니다. `$ARGUMENTS`는 pi prompt template에서 전달된 인자 또는 사용자의 현재 요청에서 받은 인자로 해석합니다.

키워드가 전달되지 않은 경우 사용자에게 검색어를 요청하세요.

## 동작 방식

### 1. 검색 실행

```bash
confluence search "<KEYWORD>" --limit 10
```

특정 Space로 제한하고 싶다면 CQL을 사용합니다:

```bash
confluence search "type=page AND space=<SPACE_KEY> AND text~\"<KEYWORD>\"" --limit 10
```

### 2. 결과 출력

검색 결과를 정리하여 보여주세요.

### 3. 후속 작업 안내

결과를 보여준 뒤, 특정 문서를 읽고 싶으면 `/read-confluence <URL 또는 ID>`를 사용하라고 안내합니다.

### 4. 환경변수 미설정 시

`confluence` 명령어가 실패하면 아래 안내를 출력합니다:

> Confluence 환경변수가 설정되지 않았습니다. `~/.zshrc`에 아래 내용을 추가하세요:
>
> ```sh
> export CONFLUENCE_DOMAIN="lunit.atlassian.net"
> export CONFLUENCE_API_PATH="/wiki/rest/api"
> export CONFLUENCE_AUTH_TYPE="basic"
> export CONFLUENCE_EMAIL="your-email@lunit.io"
> export CONFLUENCE_API_TOKEN="your-api-token"
> ```
>
> API 토큰은 https://id.atlassian.com/manage-profile/security/api-tokens 에서 생성할 수 있습니다.
