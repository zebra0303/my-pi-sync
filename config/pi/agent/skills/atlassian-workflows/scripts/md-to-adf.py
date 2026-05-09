#!/usr/bin/env python3

"""Convert Markdown to Jira Atlassian Document Format (ADF) JSON.

Supports: headings, paragraphs, bullet/ordered lists, tables,
code blocks, blockquotes, horizontal rules, and inline marks
(bold, italic, strikethrough, code, links).
"""

import json, re, sys


# ── Inline parsing ──────────────────────────────────────────────

def text_node(text, marks=None):
    node = {"type": "text", "text": text}
    if marks:
        node["marks"] = marks
    return node


def parse_inline(text):
    """Parse inline markdown into ADF text nodes with marks."""
    tokens = []
    # Pattern order matters: longer patterns first
    # bold+italic, bold, italic, strikethrough, inline code, links
    pattern = re.compile(
        r"(\*\*\*(.+?)\*\*\*)"      # ***bold italic***
        r"|(\*\*(.+?)\*\*)"          # **bold**
        r"|(__(.+?)__)"              # __bold__
        r"|(\*(.+?)\*)"             # *italic*
        r"|(_(.+?)_)"               # _italic_
        r"|(~~(.+?)~~)"             # ~~strikethrough~~
        r"|(`([^`]+)`)"             # `code`
        r"|(\[([^\]]+)\]\(([^)]+)\))"  # [text](url)
    )
    last = 0
    for m in pattern.finditer(text):
        # plain text before this match
        if m.start() > last:
            tokens.append(text_node(text[last:m.start()]))

        if m.group(2):    # ***bold italic***
            tokens.append(text_node(m.group(2), [{"type": "strong"}, {"type": "em"}]))
        elif m.group(4):  # **bold**
            tokens.append(text_node(m.group(4), [{"type": "strong"}]))
        elif m.group(6):  # __bold__
            tokens.append(text_node(m.group(6), [{"type": "strong"}]))
        elif m.group(8):  # *italic*
            tokens.append(text_node(m.group(8), [{"type": "em"}]))
        elif m.group(10): # _italic_
            tokens.append(text_node(m.group(10), [{"type": "em"}]))
        elif m.group(12): # ~~strikethrough~~
            tokens.append(text_node(m.group(12), [{"type": "strike"}]))
        elif m.group(14): # `code`
            tokens.append(text_node(m.group(14), [{"type": "code"}]))
        elif m.group(16): # [text](url)
            link_text = m.group(16)
            link_url = m.group(17)
            tokens.append(text_node(link_text, [{"type": "link", "attrs": {"href": link_url}}]))

        last = m.end()

    # trailing plain text
    if last < len(text):
        tokens.append(text_node(text[last:]))

    return tokens if tokens else [text_node(text)]


# ── Block-level helpers ─────────────────────────────────────────

def paragraph(children):
    if not children:
        children = [text_node(" ")]
    return {"type": "paragraph", "content": children}


def heading(level, text):
    return {"type": "heading", "attrs": {"level": min(level, 6)}, "content": parse_inline(text)}


def list_item(children_blocks):
    return {"type": "listItem", "content": children_blocks}


def bullet_list(items):
    return {"type": "bulletList", "content": items}


def ordered_list(items):
    return {"type": "orderedList", "content": items}


def code_block(text, language=None):
    node = {"type": "codeBlock", "content": [text_node(text)]}
    if language:
        node["attrs"] = {"language": language}
    return node


def blockquote(children):
    return {"type": "blockquote", "content": children}


def horizontal_rule():
    return {"type": "rule"}


def table_cell(inline_nodes, cell_type="tableCell"):
    return {
        "type": cell_type,
        "attrs": {},
        "content": [paragraph(inline_nodes)]
    }


def table_row(cells):
    return {"type": "tableRow", "content": cells}


def table_node(rows):
    return {
        "type": "table",
        "attrs": {"isNumberColumnEnabled": False, "layout": "center"},
        "content": rows
    }


# ── Table parsing ───────────────────────────────────────────────

def parse_table_row(line):
    """Split a markdown table row into cell texts."""
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|"):
        line = line[:-1]
    return [cell.strip() for cell in line.split("|")]


def is_separator_row(line):
    """Check if a line is a table separator row (|---|---|)."""
    cells = parse_table_row(line)
    return all(re.match(r"^:?-+:?$", c.strip()) for c in cells if c.strip())


# ── Main converter ──────────────────────────────────────────────

def md_to_adf(md_text):
    lines = md_text.strip().split("\n")
    doc = {"type": "doc", "version": 1, "content": []}
    content = doc["content"]
    i = 0
    list_items = []
    list_type = None  # "bullet" or "ordered"

    def flush_list():
        nonlocal list_items, list_type
        if list_items:
            if list_type == "ordered":
                content.append(ordered_list(list_items))
            else:
                content.append(bullet_list(list_items))
            list_items = []
            list_type = None

    while i < len(lines):
        line = lines[i]

        # ── Frontmatter (skip YAML block) ──
        if i == 0 and line.strip() == "---":
            i += 1
            while i < len(lines) and lines[i].strip() != "---":
                i += 1
            i += 1  # skip closing ---
            continue

        # ── Code block ──
        m_code = re.match(r"^```(\w*)", line)
        if m_code:
            lang = m_code.group(1) or None
            flush_list()
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1  # skip closing ```
            content.append(code_block("\n".join(code_lines), lang))
            continue

        # ── Heading ──
        m_heading = re.match(r"^(#{1,6})\s+(.*)", line)
        if m_heading:
            flush_list()
            content.append(heading(len(m_heading.group(1)), m_heading.group(2)))
            i += 1
            continue

        # ── Horizontal rule ──
        if re.match(r"^-{3,}$|^\*{3,}$|^_{3,}$", line.strip()):
            flush_list()
            content.append(horizontal_rule())
            i += 1
            continue

        # ── Table ──
        if re.match(r"^\|", line) and i + 1 < len(lines) and re.match(r"^\|", lines[i + 1]):
            flush_list()
            table_lines = []
            while i < len(lines) and re.match(r"^\|", lines[i].strip()):
                table_lines.append(lines[i])
                i += 1

            if len(table_lines) < 2:
                # Not a real table, treat as paragraph
                content.append(paragraph(parse_inline(table_lines[0])))
                continue

            rows = []
            header_cells = parse_table_row(table_lines[0])

            # First row is header
            header = table_row([
                table_cell(parse_inline(c), "tableHeader") for c in header_cells
            ])
            rows.append(header)

            # Skip separator row, process data rows
            start = 2 if (len(table_lines) > 1 and is_separator_row(table_lines[1])) else 1
            for tl in table_lines[start:]:
                if is_separator_row(tl):
                    continue
                cells = parse_table_row(tl)
                # Pad or truncate to match header column count
                while len(cells) < len(header_cells):
                    cells.append("")
                cells = cells[:len(header_cells)]
                rows.append(table_row([
                    table_cell(parse_inline(c)) for c in cells
                ]))

            content.append(table_node(rows))
            continue

        # ── Blockquote ──
        if line.startswith("> ") or line == ">":
            flush_list()
            quote_lines = []
            while i < len(lines) and (lines[i].startswith("> ") or lines[i] == ">"):
                quote_lines.append(lines[i][2:] if lines[i].startswith("> ") else "")
                i += 1
            # Parse inner content as paragraphs
            quote_content = []
            current_para = []
            for ql in quote_lines:
                if ql.strip() == "":
                    if current_para:
                        quote_content.append(paragraph(parse_inline(" ".join(current_para))))
                        current_para = []
                else:
                    current_para.append(ql)
            if current_para:
                quote_content.append(paragraph(parse_inline(" ".join(current_para))))
            if quote_content:
                content.append(blockquote(quote_content))
            continue

        # ── Ordered list ──
        m_ol = re.match(r"^\s*(\d+)[.)]\s+(.*)", line)
        if m_ol:
            if list_type != "ordered":
                flush_list()
                list_type = "ordered"
            list_items.append(list_item([paragraph(parse_inline(m_ol.group(2)))]))
            i += 1
            continue

        # ── Bullet list ──
        m_ul = re.match(r"^\s*[-*+]\s+(.*)", line)
        if m_ul:
            if list_type != "bullet":
                flush_list()
                list_type = "bullet"
            list_items.append(list_item([paragraph(parse_inline(m_ul.group(1)))]))
            i += 1
            continue

        # ── Empty line ──
        if line.strip() == "":
            flush_list()
            i += 1
            continue

        # ── Paragraph (default) ──
        flush_list()
        content.append(paragraph(parse_inline(line)))
        i += 1

    flush_list()
    return doc


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--text":
        md = sys.argv[2].replace("\\n", "\n")
    elif len(sys.argv) > 1:
        with open(sys.argv[1]) as f:
            md = f.read()
    else:
        md = sys.stdin.read()
    print(json.dumps(md_to_adf(md)))
