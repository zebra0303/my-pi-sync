#!/usr/bin/env python3
"""Publish a Markdown file to Confluence with full native formatting.

The `confluence` CLI defaults `--format` to `storage`, so passing a Markdown file
without `--format markdown` uploads the raw Markdown as literal text. This script
removes that footgun and adds the post-processing Confluence needs for native
rendering (task lists, panels, TOC, attached images).

Usage:
    # create a child page under a page or folder
    confluence-publish.py page.md --parent <PARENT_ID> --title "제목"

    # update an existing page (title optional)
    confluence-publish.py page.md --page <PAGE_ID> [--title "새 제목"]

    # inspect the generated storage XML without touching Confluence
    confluence-publish.py page.md --dry-run -o /tmp/page.xml

Markdown extensions understood by this script
---------------------------------------------
[[TOC]]                       -> Confluence table-of-contents macro
[[IMAGE:diagram.png]]         -> attaches ./diagram.png, centered, scaled to 760px wide
[[IMAGE:diagram.png|설명|900]] -> ... with a caption and an explicit pixel width
> [!WARNING] first line       -> warning panel  (also NOTE / INFO / TIP / SUCCESS)
- [ ] / - [x] list items      -> native task list with real checkboxes

Image paths are resolved relative to the Markdown file. Attachments are uploaded with
--replace so re-publishing refreshes them. Images are capped at the 760px Confluence
content column so they never force horizontal scrolling; author diagrams at that logical
width so their text renders at true CSS pixel size.
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

CONTENT_WIDTH = 760  # Confluence fixed-width page column

PANELS = {
    "WARNING": "warning",
    "CAUTION": "warning",
    "NOTE": "note",
    "INFO": "info",
    "IMPORTANT": "info",
    "TIP": "tip",
    "SUCCESS": "tip",
}

IMAGE_TOKEN = re.compile(r"\[\[IMAGE:([^\]|]+?)(?:\|([^\]|]*))?(?:\|(\d+))?\]\]")


def run(cmd: list[str]) -> str:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.exit(f"command failed: {' '.join(cmd)}\n{proc.stdout}{proc.stderr}")
    return proc.stdout


def markdown_to_storage(md_path: Path) -> str:
    with tempfile.NamedTemporaryFile("r", suffix=".xml", delete=False) as tmp:
        out = Path(tmp.name)
    run(["confluence", "convert", "-i", str(md_path), "--input-format", "markdown",
         "--output-format", "storage", "-o", str(out)])
    storage = out.read_text(encoding="utf-8")
    out.unlink(missing_ok=True)
    return storage


def apply_task_lists(storage: str) -> tuple[str, int]:
    """<ul> blocks whose every <li> starts with [ ] or [x] become native task lists."""
    ul_re = re.compile(r"<ul>\s*((?:<li><p>\[[ xX]\].*?</p></li>\s*)+)</ul>", re.DOTALL)
    li_re = re.compile(r"<li><p>\[([ xX])\]\s*(.*?)</p></li>", re.DOTALL)
    counter = [0]

    def convert(match: re.Match) -> str:
        tasks = []
        for li in li_re.finditer(match.group(1)):
            mark, body = li.group(1), li.group(2).strip()
            counter[0] += 1
            status = "complete" if mark.lower() == "x" else "incomplete"
            tasks.append(
                f"<ac:task><ac:task-id>{counter[0]}</ac:task-id>"
                f"<ac:task-status>{status}</ac:task-status>"
                f"<ac:task-body><span>{body}</span></ac:task-body></ac:task>"
            )
        return "<ac:task-list>\n" + "\n".join(tasks) + "\n</ac:task-list>"

    return ul_re.sub(convert, storage), counter[0]


def apply_panels(storage: str) -> tuple[str, int]:
    """Blockquotes opening with [!WARNING] & friends become Confluence panel macros."""
    pattern = re.compile(
        r"<blockquote>\s*<p>\[!(" + "|".join(PANELS) + r")\]\s*(.*?)</blockquote>",
        re.DOTALL,
    )
    count = [0]

    def convert(match: re.Match) -> str:
        count[0] += 1
        macro = PANELS[match.group(1).upper()]
        body = match.group(2)
        # Re-open the paragraph the token was stripped from, unless it is now empty.
        body = body.lstrip()
        body = f"<p>{body}" if not body.startswith("</p>") else body
        return (f'<ac:structured-macro ac:name="{macro}"><ac:rich-text-body>'
                f"{body}</ac:rich-text-body></ac:structured-macro>")

    return pattern.sub(convert, storage), count[0]


def apply_toc(storage: str) -> tuple[str, int]:
    macro = ('<ac:structured-macro ac:name="toc">'
             '<ac:parameter ac:name="maxLevel">3</ac:parameter>'
             '<ac:parameter ac:name="minLevel">2</ac:parameter>'
             '<ac:parameter ac:name="outline">true</ac:parameter>'
             "</ac:structured-macro>")
    pattern = re.compile(r"<p>\s*\[\[TOC\]\]\s*</p>")
    storage, n = pattern.subn(macro, storage)
    return storage, n


def apply_images(storage: str, base_dir: Path) -> tuple[str, list[Path]]:
    uploads: list[Path] = []

    def convert(match: re.Match) -> str:
        name, alt, width = match.group(1).strip(), (match.group(2) or "").strip(), match.group(3)
        source = (base_dir / name)
        if not source.exists():
            sys.exit(f"image not found: {source}")
        uploads.append(source)
        attrs = (f' ac:align="center" ac:layout="center" ac:alt="{alt or source.name}"'
                 f' ac:width="{width or CONTENT_WIDTH}"')
        image = f'<ac:image{attrs}><ri:attachment ri:filename="{source.name}"/></ac:image>'
        if alt:
            return (f"<p>{image}</p>"
                    f'<p style="text-align: center;"><em>{alt}</em></p>')
        return f"<p>{image}</p>"

    # The converter wraps a lone token in its own paragraph; strip that wrapper so the
    # image macro is not nested inside a paragraph that also holds the caption.
    storage = re.sub(r"<p>\s*(\[\[IMAGE:[^\]]*\]\])\s*</p>", r"\1", storage)
    return IMAGE_TOKEN.sub(convert, storage), uploads


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("markdown", type=Path)
    parser.add_argument("--parent", help="parent page or folder id (create a child page)")
    parser.add_argument("--page", help="existing page id (update in place)")
    parser.add_argument("--title")
    parser.add_argument("-o", "--output", type=Path, help="also write the storage XML here")
    parser.add_argument("--dry-run", action="store_true", help="convert only, do not publish")
    args = parser.parse_args()

    if not args.dry_run and bool(args.parent) == bool(args.page):
        parser.error("pass exactly one of --parent or --page")
    if args.parent and not args.title:
        parser.error("--parent requires --title")
    if not shutil.which("confluence"):
        sys.exit("confluence CLI not found on PATH")

    md_path = args.markdown.resolve()
    storage = markdown_to_storage(md_path)
    storage, images = apply_images(storage, md_path.parent)
    storage, tasks = apply_task_lists(storage)
    storage, panels = apply_panels(storage)
    storage, tocs = apply_toc(storage)

    report = (f"storage {len(storage)}B · images {len(images)} · tasks {tasks} · "
              f"panels {panels} · toc {tocs}")

    out_path = args.output
    if out_path is None:
        out_path = Path(tempfile.mkdtemp()) / (md_path.stem + ".xml")
    out_path.write_text(storage, encoding="utf-8")

    if args.dry_run:
        print(f"{report}\nwrote {out_path}")
        return

    if args.page:
        cmd = ["confluence", "update", args.page, "--file", str(out_path), "--format", "storage"]
        if args.title:
            cmd += ["--title", args.title]
        print(run(cmd).strip())
        page_id = args.page
    else:
        output = run(["confluence", "create-child", args.title, args.parent,
                      "--file", str(out_path), "--format", "storage"])
        print(output.strip())
        found = re.search(r"^ID:\s*(\d+)", output, re.MULTILINE)
        if not found:
            sys.exit("could not parse the created page id")
        page_id = found.group(1)

    for image in dict.fromkeys(images):
        run(["confluence", "attachment-upload", page_id, "--file", str(image), "--replace"])
        print(f"attached {image.name}")

    print(report)


if __name__ == "__main__":
    main()
