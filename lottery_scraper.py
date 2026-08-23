#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sync official Pais Lotto results into the local archive."""

import runpy
from pathlib import Path

if __name__ == "__main__":
    script = Path(__file__).resolve().parent / "scripts" / "sync_pais_results.py"
    runpy.run_path(str(script), run_name="__main__")
