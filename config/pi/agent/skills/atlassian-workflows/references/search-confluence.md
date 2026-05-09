Search Confluence pages.

## Input

The user provides search keywords. `$ARGUMENTS` means arguments passed through the pi prompt template or the user's current request.

If no keyword is provided, ask the user for a search query.

## Workflow

### 1. Run search

```bash
confluence search "<KEYWORD>" --limit 10
```

To limit the search to a specific space, use CQL:

```bash
confluence search "type=page AND space=<SPACE_KEY> AND text~\"<KEYWORD>\"" --limit 10
```

### 2. Present results

Summarize and present the search results clearly.

### 3. Follow-up guidance

After showing results, tell the user they can read a specific page with:

```text
/read-confluence <URL or ID>
```

### 4. Missing environment variables

If the `confluence` command fails because credentials or environment variables are missing, show this guidance:

> Confluence environment variables are not configured. Add the following to `~/.zshrc`:
>
> ```sh
> export CONFLUENCE_DOMAIN="lunit.atlassian.net"
> export CONFLUENCE_API_PATH="/wiki/rest/api"
> export CONFLUENCE_AUTH_TYPE="basic"
> export CONFLUENCE_EMAIL="your-email@lunit.io"
> export CONFLUENCE_API_TOKEN="your-api-token"
> ```
>
> You can create an API token at https://id.atlassian.com/manage-profile/security/api-tokens.
