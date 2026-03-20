import argparse
import json
import os
import re
import time
from html import escape
from html import unescape
from pathlib import Path
from urllib.parse import unquote

import requests


MENU_FILE = Path("文档目录.js")
OUT_DIR = Path("xft_docs")
FETCH_API = "https://xft.cmbchina.com/xft-gateway/xft-cust-open-new/xwapi/capi/homepage/doc/obtain-homepage-doc"
REFERER = "https://xft.cmbchina.com/open/"
ORIGIN = "https://xft.cmbchina.com"


def load_menu_tree(path: Path):
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"^\s*loc\s*=\s*", "", text.strip())
    text = text.rstrip(";\n\r ")
    return json.loads(text)


def build_headers():
    return {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json",
        "Referer": REFERER,
        "Origin": ORIGIN,
    }


def flatten_nodes(node, acc, path_names=None):
    if path_names is None:
        path_names = []
    menu = node.get("menuInf") or {}
    menu_id = menu.get("menuId") or node.get("id")
    path_ids = (node.get("_pathIds") or [])
    current_path_ids = path_ids + [menu_id]
    menu_name = menu.get("menuName") or node.get("name") or ""
    current_path_names = path_names + [menu_name]
    current = {
        "menuId": menu_id,
        "menuName": menu_name,
        "menuType": menu.get("menuType"),
        "restDocFlag": menu.get("restDocFlag"),
        "eventDocFlag": menu.get("eventDocFlag"),
        "pathIds": current_path_ids,
        "pathNames": current_path_names,
        "node": node,
    }
    acc.append(current)
    for child in node.get("children") or []:
        child["_pathIds"] = current_path_ids
        flatten_nodes(child, acc, current_path_names)


def parse_args():
    parser = argparse.ArgumentParser(description="抓取薪福通文档")
    parser.add_argument(
        "--docid",
        action="append",
        default=[],
        help="指定 menuId/docId 抓取，支持多次传入或逗号分隔，例如 --docid 12415 或 --docid 12415,12418",
    )
    parser.add_argument(
        "--menuid",
        action="append",
        default=[],
        help="指定 menuId，抓取该节点下所有子文档，支持多次传入或逗号分隔，例如 --menuid 10642 或 --menuid 10642,12036",
    )
    parser.add_argument(
        "--out-dir",
        default=str(OUT_DIR),
        help="输出目录，默认 xft_docs",
    )
    return parser.parse_args()


def parse_docid_args(values):
    docids = set()
    for value in values or []:
        for part in str(value).split(","):
            p = part.strip()
            if not p:
                continue
            if not p.isdigit():
                raise ValueError(f"无效 docid: {p}，仅支持数字")
            docids.add(int(p))
    return docids


def parse_menuid_args(values):
    menuids = set()
    for value in values or []:
        for part in str(value).split(","):
            p = part.strip()
            if not p:
                continue
            if not p.isdigit():
                raise ValueError(f"无效 menuid: {p}，仅支持数字")
            menuids.add(int(p))
    return menuids


def safe_name(name: str):
    name = re.sub(r"[\\/:*?\"<>|]+", "_", name)
    return name.strip()[:120] or "unnamed"


def decode_text(value):
    if value is None:
        return ""
    text = str(value)
    try:
        return unquote(text)
    except Exception:
        return text


def _clean_text(value):
    text = decode_text(value)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\xa0", " ")
    text = re.sub(r"\\([\[\]().])", r"\1", text)
    text = text.replace('\\"', '"')
    text = text.replace("\\n", "\n")
    text = unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _html_fragment_to_text(fragment: str):
    txt = re.sub(r"(?i)<br\s*/?>", "\n", fragment)
    txt = re.sub(r"<[^>]+>", "", txt)
    txt = _clean_text(txt)
    return txt.replace("\n", "<br>")


def _html_table_to_markdown(table_html: str):
    row_html_list = re.findall(r"<tr[^>]*>([\s\S]*?)</tr>", table_html, flags=re.I)
    rows = []
    for row_html in row_html_list:
        cell_html_list = re.findall(r"<t[hd][^>]*>([\s\S]*?)</t[hd]>", row_html, flags=re.I)
        if not cell_html_list:
            continue
        row = []
        for cell in cell_html_list:
            text = _html_fragment_to_text(cell).replace("|", "\\|")
            row.append(text)
        rows.append(row)

    if not rows:
        return table_html

    max_cols = max(len(r) for r in rows)
    for r in rows:
        if len(r) < max_cols:
            r.extend([""] * (max_cols - len(r)))

    header = rows[0]
    body = rows[1:] if len(rows) > 1 else []
    lines = [
        "| " + " | ".join(header) + " |",
        "| " + " | ".join(["---"] * max_cols) + " |",
    ]
    for r in body:
        lines.append("| " + " | ".join(r) + " |")
    return "\n".join(lines)


def _flatten_param_rows(items, rows, parent=""):
    for item in items or []:
        element = (item or {}).get("elementData") or {}
        name = _clean_text(element.get("name") or "")
        param_name = f"{parent}.{name}" if parent and name else (name or parent)
        rows.append(
            {
                "name": param_name,
                "type": _clean_text(element.get("type") or ""),
                "required": element.get("required"),
                "label": _clean_text(element.get("label") or ""),
                "desc": _clean_text(element.get("desc") or ""),
                "example": _clean_text(element.get("exampleValue") or ""),
            }
        )
        children = (item or {}).get("children") or []
        if children:
            _flatten_param_rows(children, rows, param_name)


def rest_table_to_markdown(json_text: str):
    try:
        payload = json.loads(json_text)
    except Exception:
        return "```text\n" + json_text.strip() + "\n```"

    rows = []
    _flatten_param_rows(payload, rows)
    if not rows:
        return ""

    lines = [
        "| 参数 | 类型 | 必填 | 说明 | 示例 |",
        "|---|---|---|---|---|",
    ]
    for r in rows:
        required = "是" if r["required"] is True else ("否" if r["required"] is False else "")
        desc = (r["desc"] or r["label"]).replace("\n", "<br>").replace("|", "\\|")
        example = r["example"].replace("\n", "<br>").replace("|", "\\|")
        name = r["name"].replace("|", "\\|")
        typ = r["type"].replace("|", "\\|")
        line = f"| {name} | {typ} | {required} | {desc} | {example} |"
        lines.append(line)
    return "\n".join(lines)


def normalize_markdown(doc_cnt: str):
    text = doc_cnt or ""
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    def _replace_table(match):
        inner = match.group(1)
        return "\n" + rest_table_to_markdown(inner) + "\n"

    text = re.sub(r"<restparamstable>([\s\S]*?)</restparamstable>", _replace_table, text, flags=re.I)
    text = re.sub(
        r"<table[^>]*>([\s\S]*?)</table>",
        lambda m: "\n" + _html_table_to_markdown(m.group(0)) + "\n",
        text,
        flags=re.I,
    )
    text = text.replace("```\n{\r", "```\n{")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\xa0", " ")
    text = re.sub(r"\\([\[\]().])", r"\1", text)
    text = re.sub(r"(?m)^(#{1,6})([^\s#])", r"\1 \2", text)
    text = re.sub(r"(?m)^\s*#{3,6}请求报文", "### 请求报文", text)
    text = re.sub(r"(?m)^\s*#{3,6}响应报文", "### 响应报文", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def markdown_to_html(md_text: str, title: str):
    lines = md_text.splitlines()
    out = []
    i = 0
    in_code = False

    def _table_row(line):
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        return cells

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if stripped.startswith("```"):
            if not in_code:
                in_code = True
                out.append("<pre><code>")
            else:
                in_code = False
                out.append("</code></pre>")
            i += 1
            continue

        if in_code:
            out.append(escape(line))
            i += 1
            continue

        if not stripped:
            out.append("")
            i += 1
            continue

        # headings
        m = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if m:
            level = len(m.group(1))
            text = escape(m.group(2))
            out.append(f"<h{level}>{text}</h{level}>")
            i += 1
            continue

        # markdown table
        if stripped.startswith("|") and "|" in stripped:
            j = i
            table_lines = []
            while j < len(lines):
                s = lines[j].strip()
                if s.startswith("|") and "|" in s:
                    table_lines.append(s)
                    j += 1
                else:
                    break

            # at least header + sep
            if len(table_lines) >= 2 and re.match(r"^\|\s*[-:|\s]+\|\s*$", table_lines[1]):
                header = _table_row(table_lines[0])
                body_rows = [_table_row(x) for x in table_lines[2:]]
                out.append("<table border=\"1\" cellspacing=\"0\" cellpadding=\"6\">")
                out.append("<thead><tr>" + "".join(f"<th>{escape(c)}</th>" for c in header) + "</tr></thead>")
                out.append("<tbody>")
                for row in body_rows:
                    out.append("<tr>" + "".join(f"<td>{escape(c).replace('&lt;br&gt;', '<br>')}</td>" for c in row) + "</tr>")
                out.append("</tbody></table>")
                i = j
                continue

        # paragraph
        out.append(f"<p>{escape(stripped).replace('&lt;br&gt;', '<br>')}</p>")
        i += 1

    body = "\n".join(out)
    return (
        "<!doctype html>\n"
        "<html lang=\"zh-CN\">\n"
        "<head>\n"
        "  <meta charset=\"utf-8\">\n"
        f"  <title>{escape(title)}</title>\n"
        "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
        "  <style>body{font-family:Segoe UI,Helvetica,Arial,sans-serif;line-height:1.6;max-width:1100px;margin:24px auto;padding:0 12px;}"
        "table{border-collapse:collapse;width:100%;margin:12px 0;}th,td{vertical-align:top;}"
        "pre{background:#f6f8fa;padding:12px;overflow:auto;}code{font-family:Consolas,monospace;}"
        "h1,h2,h3{margin-top:1.2em;}p{margin:0.5em 0;}</style>\n"
        "</head>\n"
        "<body>\n"
        f"{body}\n"
        "</body>\n"
        "</html>\n"
    )


def fetch_doc(session, url, headers, menu_id):
    resp = session.post(url, headers=headers, json={"menuId": str(menu_id)}, timeout=30)
    resp.raise_for_status()
    return resp.json()


def main():
    args = parse_args()
    selected_docids = parse_docid_args(args.docid)
    selected_menuids = parse_menuid_args(args.menuid)
    out_dir = Path(args.out_dir)

    data = load_menu_tree(MENU_FILE)
    body = data.get("body") or []
    fetch_url = FETCH_API
    headers = build_headers()

    out_dir.mkdir(parents=True, exist_ok=True)
    session = requests.Session()

    index = {
        "source": str(MENU_FILE),
        "fetch_api": fetch_url,
        "targets": "ALL_TOP_CATEGORIES",
        "docids": [],
        "generatedAt": int(time.time()),
        "categories": {},
    }

    found_docids = set()
    found_menuids = set()
    total_success = 0
    total_failed = 0
    all_menuids = set()

    for top_node in body:
        target = (top_node.get("menuInf") or {}).get("menuName") or "未命名分类"
        nodes = []
        flatten_nodes(top_node, nodes)

        matched_items = []
        for item in nodes:
            menu_id = item["menuId"]
            menu_type = str(item["menuType"]) if item["menuType"] is not None else ""
            path_ids = item.get("pathIds") or []
            if menu_id is not None:
                all_menuids.add(int(menu_id))
            if menu_id is None or menu_type == "1":
                continue
            if selected_docids and int(menu_id) not in selected_docids:
                continue
            if selected_menuids and not any(int(pid) in selected_menuids for pid in path_ids if pid is not None):
                continue
            matched_items.append(item)
            found_docids.add(int(menu_id))
            for pid in path_ids:
                if pid is not None and int(pid) in selected_menuids:
                    found_menuids.add(int(pid))

        if not matched_items:
            if not selected_docids:
                index["categories"][target] = {"totalNodes": len(nodes), "success": 0, "failed": 0, "items": []}
            continue

        cat_stat = {
            "totalNodes": len(nodes),
            "success": 0,
            "failed": 0,
            "items": [],
        }

        for item in matched_items:
            menu_id = item["menuId"]
            menu_name = item["menuName"]
            path_names = item.get("pathNames") or [menu_name]

            doc_parent_dir = out_dir
            for seg in path_names[:-1]:
                doc_parent_dir = doc_parent_dir / safe_name(seg)

            raw_dir = doc_parent_dir / "raw"
            md_dir = doc_parent_dir / "markdown"
            html_dir = doc_parent_dir / "html"
            raw_dir.mkdir(parents=True, exist_ok=True)
            md_dir.mkdir(parents=True, exist_ok=True)
            html_dir.mkdir(parents=True, exist_ok=True)

            output_name = f"{menu_id}_{safe_name(menu_name)}"
            raw_path = raw_dir / f"{output_name}.json"
            md_path = md_dir / f"{output_name}.md"
            html_path = html_dir / f"{output_name}.html"

            record = {
                "menuId": menu_id,
                "menuName": menu_name,
                "menuType": item["menuType"],
                "restDocFlag": item["restDocFlag"],
                "eventDocFlag": item["eventDocFlag"],
                "rawFile": str(raw_path).replace("\\", "/"),
                "mdFile": str(md_path).replace("\\", "/"),
                "htmlFile": str(html_path).replace("\\", "/"),
            }

            try:
                payload = fetch_doc(session, fetch_url, headers, menu_id)
                raw_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

                doc_body = (payload.get("body") or {}) if isinstance(payload, dict) else {}
                doc_name = doc_body.get("docName") or menu_name
                doc_cnt = doc_body.get("docCnt") or ""
                if isinstance(doc_cnt, str):
                    body_md = normalize_markdown(doc_cnt)
                else:
                    body_md = "```json\n" + json.dumps(doc_cnt, ensure_ascii=False, indent=2) + "\n```\n"
                md_content = f"# {doc_name}\n\n" + body_md
                md_path.write_text(md_content, encoding="utf-8")
                html_content = markdown_to_html(md_content, doc_name)
                html_path.write_text(html_content, encoding="utf-8")

                record["returnCode"] = payload.get("returnCode") if isinstance(payload, dict) else None
                record["ok"] = True
                cat_stat["success"] += 1
                total_success += 1
            except Exception as e:
                record["ok"] = False
                record["error"] = str(e)
                cat_stat["failed"] += 1
                total_failed += 1

            cat_stat["items"].append(record)

        if not selected_docids and not selected_menuids:
            index["categories"][target] = cat_stat

    print("done")
    if selected_docids or selected_menuids:
        missing = sorted(selected_docids - found_docids)
        missing_menuid_set = selected_menuids - all_menuids
        missing_menuid = sorted(missing_menuid_set)
        nomatch_menuid = sorted((selected_menuids - missing_menuid_set) - found_menuids)
        print(
            f"select_mode: success={total_success}, failed={total_failed}, "
            f"missing_docids={missing}, missing_menuids={missing_menuid}, nomatch_menuids={nomatch_menuid}"
        )
    else:
        index_path = out_dir / "index.json"
        index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"index={index_path}")
        for k, v in index["categories"].items():
            print(f"{k}: total={v['totalNodes']}, success={v['success']}, failed={v['failed']}")


if __name__ == "__main__":
    main()

