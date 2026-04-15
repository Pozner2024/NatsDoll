"""
Собирает все исходники проекта в один текстовый файл sources.txt.
Используется скиллом notebooklm для загрузки в Google NotebookLM.
"""

import os
from pathlib import Path

ROOT = Path(__file__).parent
OUTPUT = ROOT / "sources.txt"

SKIP_DIRS = {
    "node_modules", "venv", ".git", ".worktrees",
    "dist", "build", ".turbo", ".cache", "coverage",
    "__pycache__", ".pytest_cache", ".venv",
}

SKIP_FILES = {
    ".env", ".env.local", ".env.production", ".env.development",
    ".env.test", ".env.staging",
    "package-lock.json",
}

INCLUDE_EXTENSIONS = {
    ".ts", ".tsx", ".vue", ".js", ".jsx",
    ".py", ".json", ".md", ".yml", ".yaml",
    ".toml", ".sql", ".prisma", ".scss", ".css",
    ".html", ".sh",
}

INCLUDE_NAMES = {"Dockerfile", ".gitignore", ".dockerignore", "CLAUDE.md"}


def should_include(path: Path) -> bool:
    if path.name in SKIP_FILES:
        return False
    if path.name.startswith(".env"):
        return False
    if path.suffix in INCLUDE_EXTENSIONS:
        return True
    if path.name in INCLUDE_NAMES:
        return True
    if path.name.startswith("Dockerfile"):
        return True
    return False


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
    print(f"sources.txt готов: {size:,} байт ({size / 1024:.1f} КБ)")


if __name__ == "__main__":
    main()
