"""
Собирает исходники из папки D:\Наташа\Vue в файл sources_vue.txt.
"""

import os
from pathlib import Path

ROOT = Path(r"D:\Наташа\Vue")
OUTPUT = Path(__file__).parent / "sources_vue.txt"

SKIP_DIRS = {
    "node_modules", ".git", "dist", "build", ".cache",
    "__pycache__", ".vite",
}

INCLUDE_EXTENSIONS = {
    ".ts", ".tsx", ".vue", ".js", ".jsx",
    ".json", ".md", ".html", ".css", ".scss",
}

SKIP_FILES = {"package-lock.json"}


def should_include(path: Path) -> bool:
    if path.name in SKIP_FILES:
        return False
    return path.suffix in INCLUDE_EXTENSIONS


def collect_files() -> list[Path]:
    result = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [
            d for d in dirnames
            if d not in SKIP_DIRS and not d.startswith(".")
        ]
        for name in sorted(filenames):
            path = Path(dirpath) / name
            if should_include(path):
                result.append(path)
    return sorted(result)


def main() -> None:
    files = collect_files()
    print(f"Найдено файлов: {len(files)}")

    parts = []
    for path in files:
        rel = path.relative_to(ROOT).as_posix()
        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, PermissionError):
            content = "<не удалось прочитать файл>"
        parts.append(f"=== {rel} ===\n{content}\n")

    OUTPUT.write_text("\n".join(parts), encoding="utf-8")
    size = OUTPUT.stat().st_size
    print(f"sources_vue.txt готов: {size:,} байт ({size / 1024:.1f} КБ)")


if __name__ == "__main__":
    main()
