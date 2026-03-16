#!/usr/bin/env python3
import argparse
import json
import quopri
import re
from email import policy
from email.parser import BytesParser
from html import unescape
from pathlib import Path


SECTION_LABELS = [
    "接口调用地址",
    "接口描述",
    "调用方式",
    "接口输入参数",
    "接口输出参数",
    "接口调用示例",
    "错误码说明",
]


def load_html_from_mhtml(path: Path) -> str:
    raw = path.read_bytes()
    message = BytesParser(policy=policy.default).parsebytes(raw)
    if message.is_multipart():
        for part in message.walk():
            if part.get_content_type() == "text/html":
                payload = part.get_payload(decode=False)
                if isinstance(payload, list):
                    continue
                text = payload if isinstance(payload, str) else payload.decode(part.get_content_charset() or "utf-8", errors="ignore")
                cte = (part.get("Content-Transfer-Encoding") or "").lower()
                if "quoted-printable" in cte:
                    return quopri.decodestring(text).decode(part.get_content_charset() or "utf-8", errors="ignore")
                if "base64" in cte:
                    return part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8", errors="ignore")
                return text
    match = re.search(
        rb"Content-Type:\s*text/html.*?\r?\n\r?\n(.*?)(?:\r?\n--[-A-Za-z0-9]+(?:--)?\r?\n|\Z)",
        raw,
        re.S,
    )
    if not match:
        raise ValueError("could not locate html part in mhtml")
    return quopri.decodestring(match.group(1)).decode("utf-8", errors="ignore")


def html_to_text(html: str) -> str:
    text = re.sub(r"<script\b.*?</script>", "", html, flags=re.I | re.S)
    text = re.sub(r"<style\b.*?</style>", "", text, flags=re.I | re.S)
    replacements = {
        r"<br\s*/?>": "\n",
        r"</p>": "\n",
        r"</div>": "\n",
        r"</tr>": "\n",
        r"</li>": "\n",
        r"</td>": "\t",
        r"</th>": "\t",
    }
    for pattern, repl in replacements.items():
        text = re.sub(pattern, repl, text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    text = text.replace("\r", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def lines_from_text(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines() if line.strip()]


def extract_line(lines: list[str], prefix: str) -> str | None:
    for line in lines:
        if line.startswith(prefix):
            value = line[len(prefix) :].strip()
            return value or None
    return None


def extract_title(lines: list[str]) -> str | None:
    for idx, line in enumerate(lines):
        if line.startswith("开发文档 ") and idx + 1 < len(lines):
            return lines[idx + 1]
    return None


def extract_method(lines: list[str]) -> str | None:
    for line in lines:
        match = re.search(r"METHOD:\s*([A-Z]+)", line)
        if match:
            return match.group(1)
    return None


def extract_content_type(lines: list[str]) -> str | None:
    for line in lines:
        match = re.search(r"CONTENT-TYPE:\s*(.+)", line)
        if match:
            return match.group(1).strip()
    return None


def find_section(lines: list[str], title: str) -> list[str]:
    start = None
    for idx, line in enumerate(lines):
        if line == title or line.startswith(f"{title} "):
            start = idx
            break
    if start is None:
        return []
    end = len(lines)
    for i in range(start + 1, len(lines)):
        if any(lines[i] == label or lines[i].startswith(f"{label} ") for label in SECTION_LABELS if label != title):
            end = i
            break
    return lines[start + 1 : end]


def is_row_start(tokens: list[str], index: int) -> bool:
    if index + 2 >= len(tokens):
        return False
    return bool(
        re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", tokens[index])
        and tokens[index + 1] in {"是", "否"}
        and re.fullmatch(r"[A-Z]+", tokens[index + 2])
    )


def parse_parameter_section(section_lines: list[str], boundary_label: str | None = None) -> list[dict]:
    if not section_lines:
        return []
    tokens = []
    for line in section_lines:
        if boundary_label and line == boundary_label:
            break
        if line in {"请求体", "响应体", "仅必填 全部展开", "参数", "必填", "必存在", "类型", "最大长度", "名称", "示例值", "字段说明"}:
            continue
        tokens.append(line)

    rows = []
    i = 0
    while i < len(tokens):
        if not is_row_start(tokens, i):
            i += 1
            continue
        row = {
            "name": tokens[i],
            "required": tokens[i + 1] == "是",
            "type": tokens[i + 2],
            "maxLength": None if tokens[i + 3] == "-" else tokens[i + 3],
            "displayName": None if tokens[i + 4] == "-" else tokens[i + 4],
            "example": None if tokens[i + 5] == "-" else tokens[i + 5],
        }
        i += 6
        desc_parts = []
        while i < len(tokens) and not is_row_start(tokens, i):
            desc_parts.append(tokens[i])
            i += 1
        row["description"] = " ".join(desc_parts).strip() or None
        rows.append(row)
    return rows


def extract_examples(section_lines: list[str]) -> dict:
    joined = "\n".join(section_lines)
    result = {}
    request_match = re.search(r"请求示例：\s*(\{.*?\})\s*(?:响应示例：|$)", joined, re.S)
    if request_match:
        result["request"] = request_match.group(1).strip()
    success_match = re.search(r"正确返回：\s*(\{.*?\})\s*(?:错误返回：|$)", joined, re.S)
    if success_match:
        result["successResponse"] = success_match.group(1).strip()
    error_match = re.search(r"错误返回：\s*(\{.*?\})\s*(?:错误码说明|$)", joined, re.S)
    if error_match:
        result["errorResponse"] = error_match.group(1).strip()
    return result


def extract_error_codes(section_lines: list[str]) -> list[dict]:
    rows = []
    for line in section_lines:
        match = re.match(r"([A-Z0-9]+)\s+(.+)", line)
        if match and match.group(1) != "returnCode":
            rows.append({"code": match.group(1), "message": match.group(2).strip()})
    return rows


def normalize_schema_type(doc_type: str | None) -> tuple[str, dict | None]:
    if doc_type == "ARRAY":
        return "array", {"type": "string"}
    if doc_type == "OBJECT":
        return "object", None
    if doc_type in {"LONG", "INTEGER", "NUMBER"}:
        return "number", None
    if doc_type == "BOOLEAN":
        return "boolean", None
    return "string", None


def infer_enum(name: str, description: str) -> list[str] | None:
    if name == "status":
        return ["active", "delete", "stopped"]
    if name == "extOptions":
        return ["leader", "approver", "extData", "namePath", "allDisplayOrderNumber", "leaf"]
    return None


def build_body_schema(params: list[dict]) -> dict:
    properties = {}
    for param in params:
        schema_type, items = normalize_schema_type(param.get("type"))
        entry = {
            "type": schema_type,
            "required": bool(param.get("required")),
        }
        if param.get("description"):
            entry["description"] = param["description"]
        if items:
            entry["items"] = items
        enum_values = infer_enum(param["name"], param.get("description", ""))
        if enum_values:
            if schema_type == "array":
                entry.setdefault("items", {"type": "string"})
                entry["items"]["enum"] = enum_values
            else:
                entry["enum"] = enum_values
        properties[param["name"]] = entry
    return {"type": "object", "properties": properties}


def derive_feature_id(url: str | None) -> str | None:
    if not url:
        return None
    tail = re.sub(r"^https?://[^/]+/", "", url)
    parts = [part for part in re.split(r"[^A-Za-z0-9]+", tail.lower()) if part]
    if not parts:
        return None
    return "-".join(parts[-4:])


def build_response_notes(output_params: list[dict], error_codes: list[dict]) -> list[str]:
    notes = ["成功时 returnCode 为 SUC0000"]
    if any(item.get("name") == "records" for item in output_params):
        notes.append("body.records 为结果记录数组")
    highlighted = [item["name"] for item in output_params if item.get("name") in {"id", "code", "name", "namePath", "type", "leaders", "approvers", "extData", "isLeaf"}]
    if highlighted:
        notes.append(f"records 字段常见成员包括 {', '.join(highlighted)}")
    if error_codes:
        notes.append("错误码：" + "，".join(f"{item['code']} 表示{item['message']}" for item in error_codes))
    return notes


def parse_document(path: Path) -> dict:
    html = load_html_from_mhtml(path)
    text = html_to_text(html)
    lines = lines_from_text(text)

    input_section = find_section(lines, "接口输入参数")
    output_section = find_section(lines, "接口输出参数")
    example_section = find_section(lines, "接口调用示例")
    error_section = find_section(lines, "错误码说明")

    input_params = parse_parameter_section(input_section, boundary_label="接口输出参数")
    output_params = parse_parameter_section(output_section, boundary_label="接口调用示例")
    examples = extract_examples(example_section)
    error_codes = extract_error_codes(error_section)

    prod_url = extract_line(lines, "生产环境地址：")
    test_url = extract_line(lines, "测试环境地址：")
    title = extract_title(lines)
    description = extract_line(lines, "更新时间:")  # guard to position search; not used
    del description

    api_description = None
    desc_lines = find_section(lines, "接口描述")
    if desc_lines:
      api_description = " ".join(desc_lines).strip()

    feature = {
        "id": derive_feature_id(prod_url or test_url),
        "name": title,
        "description": api_description,
        "method": extract_method(lines),
        "url": prod_url,
        "encryptBody": True,
        "decryptResponse": True,
        "querySchema": {"type": "object", "properties": {}},
        "bodySchema": build_body_schema(input_params),
        "responseNotes": build_response_notes(output_params, error_codes),
    }

    return {
        "document": {
            "title": title,
            "updatedAt": extract_line(lines, "更新时间:"),
            "productionUrl": prod_url,
            "testUrl": test_url,
            "method": feature["method"],
            "contentType": extract_content_type(lines),
            "description": api_description,
            "requestParameters": input_params,
            "responseParameters": output_params,
            "examples": examples,
            "errorCodes": error_codes,
        },
        "suggestedFeature": feature,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract a XFT feature candidate from a saved MHTML API document.")
    parser.add_argument("mhtml_path", help="Path to the saved MHTML document")
    parser.add_argument("--output", help="Write JSON output to this path instead of stdout")
    args = parser.parse_args()

    result = parse_document(Path(args.mhtml_path))
    rendered = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(rendered + "\n", encoding="utf-8")
    else:
        print(rendered)


if __name__ == "__main__":
    main()
