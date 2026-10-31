#!/usr/bin/env python3
"""착한언니 노션(공개 페이지) → 사이트 가이드 동기화.

공개된 노션 페이지를 읽어 tools/guide/pages.js 와 tools/guide/img/ 로 저장한다.
루트 페이지와, 루트에서 바로 연결된 하위 페이지까지 사이트 안에서 열리게 하고,
그보다 깊은 링크는 노션 원본으로 연결한다. 인증키는 필요 없다(공개 페이지만).

사용법: python3 scripts/sync_notion.py
"""
import hashlib, html, json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

SITE = "https://leaf-millennium-9df.notion.site"
ROOTS = [  # (탭 키, 페이지 ID)
    ("jachwi", "409f7921-6746-81a2-abd9-e21b6cf59b0a"),  # 착한언니의 첫 자취방 가이드
    ("tips", "3b5f7921-6746-81ff-a419-c8c1ac2a7027"),    # 착한언니복덕방 : 부동산 꿀팁 모음
]
OUT = Path(__file__).resolve().parent.parent / "tools" / "guide"
IMG = OUT / "img"
HIDDEN = set()  # 루트에 연결됐지만 비공개라 못 읽은 페이지
UA = {"user-agent": "Mozilla/5.0 (goodsister-site-sync)"}
UUID = re.compile(r"([0-9a-f]{8})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{12})")


def norm(s):
    m = UUID.search(s.replace("-", "") if len(s.replace("-", "")) == 32 else s)
    return "-".join(m.groups()) if m else None


def post(path, body):
    req = urllib.request.Request(SITE + "/api/v3/" + path, json.dumps(body).encode(),
                                 {"content-type": "application/json", **UA})
    for i in range(5):
        try:
            return json.loads(urllib.request.urlopen(req, timeout=60).read())
        except Exception:
            if i == 4:
                raise
            time.sleep(2 * (i + 1))


def val(rec):
    v = rec.get("value", {})
    return v.get("value", v)


def load_page(pid):
    blocks, cursor = {}, {"stack": []}
    for _ in range(50):
        d = post("loadCachedPageChunkV2", {"page": {"id": pid}, "limit": 100, "cursor": cursor, "verticalColumns": False})
        for k, r in d.get("recordMap", {}).get("block", {}).items():
            if val(r):
                blocks[k] = val(r)
        cur = d.get("cursors") or []
        if not cur or not cur[0].get("stack"):
            break
        cursor = cur[0]
    # 커서로도 빠진 블록은 직접 요청
    for _ in range(5):
        missing = set()

        def walk(i, top):
            b = blocks.get(i)
            if b is None:
                missing.add(i)
                return
            if b.get("type") == "page" and not top:
                return
            for c in b.get("content", []) or []:
                walk(c, False)
        walk(pid, True)
        if not missing:
            break
        d = post("syncRecordValuesMain", {"requests": [{"pointer": {"table": "block", "id": m}, "version": -1} for m in missing]})
        got = d.get("recordMap", {}).get("block", {})
        if not got:
            print(f"  ! {len(missing)}개 블록을 못 받음", file=sys.stderr)
            break
        for k, r in got.items():
            if val(r):
                blocks[k] = val(r)
    return blocks


class Renderer:
    def __init__(self, blocks, pages, page_id):
        self.b, self.pages, self.pid, self.images = blocks, pages, page_id, []

    def link_for(self, target):
        t = norm(target)
        if t and t in self.pages:
            return f"#g-{t[:8]}{t[-4:]}", True
        if t and t in HIDDEN:
            return None, False
        if t:
            return f"https://www.notion.so/{t.replace('-', '')}", False
        return target, not target.startswith("http")

    def rich(self, prop):
        out = []
        for seg in prop or []:
            text, ann = seg[0], (seg[1] if len(seg) > 1 else [])
            s = html.escape(text).replace("\n", "<br>")
            for a in ann:
                k = a[0]
                if k == "p":  # 페이지 멘션
                    pid = a[1]
                    title = self.pages.get(pid, {}).get("title") or self.page_title(pid) or "노션 페이지"
                    href, internal = self.link_for(pid)
                    if href is None:
                        s = html.escape(title)
                        continue
                    s = f'<a class="mention" href="{href}"{"" if internal else " target=_blank rel=noopener"}>{html.escape(title)}</a>'
                elif k == "b": s = f"<b>{s}</b>"
                elif k == "i": s = f"<i>{s}</i>"
                elif k == "s": s = f"<s>{s}</s>"
                elif k == "_": s = f"<u>{s}</u>"
                elif k == "c": s = f"<code>{s}</code>"
                elif k == "h": s = f'<span class="c-{a[1]}">{s}</span>'
                elif k == "a":
                    href, internal = self.link_for(a[1]) if re.search(r"notion\.(so|site|com)", a[1]) else (a[1], False)
                    s = s if href is None else f'<a href="{html.escape(href)}"{"" if internal else " target=_blank rel=noopener"}>{s}</a>'
            out.append(s)
        return "".join(out)

    def page_title(self, pid):
        b = self.b.get(pid)
        return "".join(x[0] for x in (b or {}).get("properties", {}).get("title", [])) if b else None

    def children(self, ids):
        html_parts, i = [], 0
        ids = [c for c in (ids or []) if c in self.b and self.b[c].get("alive", True)]
        while i < len(ids):
            t = self.b[ids[i]]["type"]
            if t in ("bulleted_list", "numbered_list", "to_do"):
                tag = {"bulleted_list": "ul", "numbered_list": "ol", "to_do": "ul class=todo"}[t]
                items = []
                while i < len(ids) and self.b[ids[i]]["type"] == t:
                    items.append(self.block(ids[i]))
                    i += 1
                html_parts.append(f"<{tag}>{''.join(items)}</{tag.split()[0]}>")
            else:
                html_parts.append(self.block(ids[i]))
                i += 1
        return "".join(html_parts)

    def block(self, bid):
        b = self.b[bid]
        t, p, f = b["type"], b.get("properties", {}) or {}, b.get("format", {}) or {}
        title = self.rich(p.get("title"))
        kids = self.children(b.get("content")) if t != "page" else ""
        color = f.get("block_color")
        cls = f' class="c-{color}"' if color else ""
        if t == "text":
            return f"<p{cls}>{title or '&nbsp;'}</p>" + (f'<div class="indent">{kids}</div>' if kids else "")
        if t in ("header", "sub_header", "sub_sub_header"):
            tag = {"header": "h2", "sub_header": "h3", "sub_sub_header": "h4"}[t]
            if f.get("toggleable"):
                return f'<details class="toggle"><summary><{tag}{cls}>{title}</{tag}></summary>{kids}</details>'
            return f"<{tag}{cls}>{title}</{tag}>"
        if t in ("bulleted_list", "numbered_list"):
            return f"<li{cls}>{title}{kids}</li>"
        if t == "to_do":
            done = (p.get("checked") or [["No"]])[0][0] == "Yes"
            return f'<li><label><input type="checkbox"{" checked" if done else ""}> <span>{title}</span></label>{kids}</li>'
        if t == "toggle":
            return f'<details class="toggle"><summary{cls}>{title}</summary>{kids}</details>'
        if t == "quote":
            return f"<blockquote{cls}>{title}{kids}</blockquote>"
        if t == "callout":
            icon = f.get("page_icon", "")
            icon = icon if icon and not icon.startswith("http") else "💡"
            body = (f"<p>{title}</p>" if title else "") + kids
            return f'<div class="callout c-{color or "gray_background"}"><span class="ci">{icon}</span><div class="cb">{body}</div></div>'
        if t == "divider":
            return "<hr>"
        if t == "column_list":
            return f'<div class="cols">{kids}</div>'
        if t == "column":
            r = f.get("column_ratio")
            return f'<div class="col" style="flex:{r if r else 1}">{kids}</div>'
        if t == "table":
            order = f.get("table_block_column_order", [])
            hdr = f.get("table_block_column_header")
            rows = []
            for n, rid in enumerate(c for c in b.get("content", []) if c in self.b):
                rp = self.b[rid].get("properties", {}) or {}
                cell = "th" if hdr and n == 0 else "td"
                rows.append("<tr>" + "".join(f"<{cell}>{self.rich(rp.get(col))}</{cell}>" for col in order) + "</tr>")
            return f'<div class="tbl"><table>{"".join(rows)}</table></div>'
        if t == "code":
            return f"<pre><code>{html.escape(''.join(x[0] for x in p.get('title', [])))}</code></pre>"
        if t == "image":
            src = (p.get("source") or [[""]])[0][0] or f.get("display_source", "")
            if not src:
                return ""
            ext = (re.search(r"\.(png|jpe?g|gif|webp|svg)$", src.split("?")[0].lower()) or [None, "png"])[1].replace("jpeg", "jpg")
            name = hashlib.sha1(src.split("?")[0].encode()).hexdigest()[:16] + "." + ext
            self.images.append((bid, src, b.get("space_id", ""), name))
            cap = self.rich(p.get("caption"))
            return f'<figure><img loading="lazy" src="guide/img/{name}" alt="">{f"<figcaption>{cap}</figcaption>" if cap else ""}</figure>'
        if t == "page":
            href, internal = self.link_for(bid)
            if href is None:
                return ""
            icon = f.get("page_icon", "📄")
            return f'<a class="pagelink" href="{href}"{"" if internal else " target=_blank rel=noopener"}>{icon if not icon.startswith("http") else "📄"} {title}</a>'
        if t == "alias":
            tid = f.get("alias_pointer", {}).get("id", "")
            href, internal = self.link_for(tid)
            if href is None:
                return ""
            name = self.pages.get(tid, {}).get("title") or self.page_title(tid) or "노션 페이지"
            return f'<a class="pagelink" href="{href}"{"" if internal else " target=_blank rel=noopener"}>📄 {html.escape(name)}</a>'
        if t == "bookmark":
            link = (p.get("link") or [[""]])[0][0]
            return f'<a class="pagelink" href="{html.escape(link)}" target=_blank rel=noopener>🔗 {title or html.escape(link)}</a>'
        if t in ("collection_view", "collection_view_page"):
            return (f'<div class="callout c-gray_background"><span class="ci">🗂️</span><div class="cb"><p><b>{title or "노션 표"}</b> — '
                    f'이 표는 노션에서 복제해 쓰는 개인 기록용이에요. <a href="https://www.notion.so/{self.pid.replace("-", "")}" target=_blank rel=noopener>노션에서 열기</a></p></div></div>')
        if t in ("video", "embed", "file", "pdf"):
            src = (p.get("source") or [[""]])[0][0]
            return f'<a class="pagelink" href="{html.escape(src)}" target=_blank rel=noopener>🔗 첨부 열기</a>' if src.startswith("http") else ""
        return f"<div>{title}{kids}</div>" if (title or kids) else ""


def linked_ids(blocks, root):
    """루트 페이지 본문에서 연결된 페이지 ID들(하위 페이지, 멘션, 노션 링크)."""
    ids, seen = [], set()

    def add(x):
        x = norm(x) if x else None
        if x and x != root and x not in seen:
            seen.add(x)
            ids.append(x)

    def walk(i, top):
        b = blocks.get(i)
        if not b:
            return
        if b["type"] == "page" and not top:
            add(i)
            return
        if b["type"] == "alias":
            add(b.get("format", {}).get("alias_pointer", {}).get("id"))
        for seg in (b.get("properties", {}) or {}).get("title", []):
            for a in (seg[1] if len(seg) > 1 else []):
                if a[0] == "p":
                    add(a[1])
                if a[0] == "a" and re.search(r"notion\.(so|site|com)", a[1]):
                    add(a[1])
        for c in b.get("content", []) or []:
            walk(c, False)
    walk(root, True)
    return ids


def main():
    IMG.mkdir(parents=True, exist_ok=True)
    loaded, pages, order = {}, {}, {}
    for key, rid in ROOTS:
        print(f"루트 {key}: {rid}", flush=True)
        loaded[rid] = load_page(rid)
        kids = linked_ids(loaded[rid], rid)
        order[key] = [rid] + kids
        for k in kids:
            if k not in loaded:
                try:
                    loaded[k] = load_page(k)
                    print(f"  하위: {k} ({len(loaded[k])} 블록)", flush=True)
                except Exception as e:
                    print(f"  ! {k} 읽기 실패(비공개일 수 있음): {e}", file=sys.stderr)
    for pid, blocks in loaded.items():
        b = blocks.get(pid)
        if not b or not b.get("content"):
            if pid not in dict(ROOTS).values():
                print(f"  ! {pid}: 웹에 공개되지 않은 페이지라 제외 (노션에서 '웹에 게시'를 켜면 다음 동기화에 포함)", file=sys.stderr)
            continue
        f = b.get("format", {}) or {}
        pages[pid] = {"title": "".join(x[0] for x in b.get("properties", {}).get("title", [])),
                      "icon": f.get("page_icon", "📄") if not str(f.get("page_icon", "")).startswith("http") else "📄",
                      "edited": b.get("last_edited_time")}
    HIDDEN.update(k for k in loaded if k not in pages)
    images, keep = [], set()
    for pid, blocks in loaded.items():
        if pid not in pages:
            continue
        r = Renderer(blocks, pages, pid)
        pages[pid]["html"] = r.children(blocks[pid].get("content"))
        pages[pid]["src"] = f"https://www.notion.so/{pid.replace('-', '')}"
        images += r.images
    for bid, src, space, name in images:
        if name in keep:
            continue
        keep.add(name)
        path = IMG / name
        if path.exists():
            continue
        u = (src if src.startswith("http") and "amazonaws" not in src and "notion" not in src else
             f"{SITE}/image/{urllib.parse.quote(src, safe='')}?table=block&id={bid}&spaceId={space}&width=1200&cache=v2")
        try:
            data = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read()
            path.write_bytes(data)
            print(f"  이미지 {name} {len(data)//1024}KB", flush=True)
        except Exception as e:
            print(f"  ! 이미지 실패 {bid}: {e}", file=sys.stderr)
    for old in IMG.iterdir():
        if old.name not in keep:
            old.unlink()
    data = {"synced": time.strftime("%Y-%m-%d"), "roots": {k: v for k, v in order.items()},
            "pages": {k: {kk: vv for kk, vv in v.items()} for k, v in pages.items() if "html" in v}}
    # 짧은 ID(#g-xxxxxxxxyyyy)로도 찾을 수 있게
    data["short"] = {f"{k[:8]}{k[-4:]}": k for k in data["pages"]}
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    (OUT / "pages.js").write_text(f"window.GS_GUIDE={body};\n", encoding="utf-8")
    # 랜딩페이지용 가벼운 목차 (제목·아이콘·링크만)
    toc = {k: [{"t": data["pages"][i]["title"], "i": data["pages"][i]["icon"], "h": f"g-{i[:8]}{i[-4:]}"}
               for i in ids[1:] if i in data["pages"]] for k, ids in data["roots"].items()}
    (OUT / "toc.js").write_text("window.GS_TOC=" + json.dumps({"synced": data["synced"], **toc}, ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"완료: 페이지 {len(data['pages'])}개, 이미지 {len(keep)}개 -> tools/guide/")


if __name__ == "__main__":
    main()
