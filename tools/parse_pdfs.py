"""Parse the 6 module PDFs into questions.json.

Correct answers are marked by a red (ff0000) option letter. Output is
validated: every question needs >= 2 options and exactly one correct option.
"""
import json
import re
import sys
import pymupdf

SRC = sys.argv[1]
OUT = sys.argv[2]
RED = 0xFF0000
# Answer drawn as a red circle (vector shape) instead of red text in the source PDF.
MANUAL_ANSWERS = {(2, 33): 1}
Q_RE = re.compile(r"^Câu\s*(\d+)\s*[:.]\s*(.*)$")
OPT_RE = re.compile(r"^([A-Ea-e])\s*[.)]\s*(.*)$")


def lines_of(doc):
    for page in doc:
        for blk in page.get_text("dict")["blocks"]:
            for ln in blk.get("lines", []):
                spans = ln["spans"]
                text = "".join(s["text"] for s in spans).strip()
                if text and not text.isdigit():  # drop bare page numbers
                    yield text, spans


def parse_module(path):
    doc = pymupdf.open(path)
    title = None
    questions = []
    cur = None
    state = "q"
    for text, spans in lines_of(doc):
        if title is None and text.lower().startswith("modul"):
            title = text
            continue
        qm = Q_RE.match(text)
        if qm:
            cur = {"n": int(qm.group(1)), "q": qm.group(2).strip(), "opts": [], "ans": []}
            questions.append(cur)
            state = "q"
            continue
        if cur is None:
            continue
        om = OPT_RE.match(text)
        if om:
            # The source sometimes re-types the correct option on its own line
            # with a different letter, so options are numbered by position.
            cur["opts"].append(om.group(2).strip())
            if spans[0]["color"] == RED:
                cur["ans"].append(len(cur["opts"]) - 1)
            state = "o"
            continue
        # continuation line
        if state == "q":
            cur["q"] += " " + text
        elif cur["opts"]:
            cur["opts"][-1] += " " + text
    return title, questions


def main():
    modules = []
    problems = []
    for i in range(1, 7):
        title, qs = parse_module(f"{SRC}/m{i}.pdf")
        nums = [q["n"] for q in qs]
        if nums != list(range(1, len(qs) + 1)):
            problems.append(f"m{i}: question numbering gap/dup: {nums[:5]}...")
        for q in qs:
            if (i, q["n"]) in MANUAL_ANSWERS:
                q["ans"] = [MANUAL_ANSWERS[(i, q["n"])]]
            q["q"] = re.sub(r"\s+", " ", q["q"]).strip()
            q["opts"] = [re.sub(r"\s+", " ", o).strip() for o in q["opts"]]
            if len(q["opts"]) < 2:
                problems.append(f"m{i} Q{q['n']}: only {len(q['opts'])} options")
            if len(q["ans"]) != 1:
                problems.append(f"m{i} Q{q['n']}: {len(q['ans'])} correct answers {q['ans']}")
        modules.append({"id": i, "title": title, "questions": qs})
        print(f"m{i}: {title!r} -> {len(qs)} questions")
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(modules, f, ensure_ascii=False, indent=1)
    print("PROBLEMS:" if problems else "no problems")
    for p in problems:
        print(" ", p)


main()
