#!/usr/bin/env node
/**
 * IJFW dashboard-watcher.js
 * Wraps fs.watch on observations.jsonl with 50ms debounce.
 * Emits EventEmitter events the server can consume.
 * Zero deps. Built-in modules only.
 */

import { watch, existsSync, readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';

export class LedgerWatcher extends EventEmitter {
  constructor(ledgerPath) {
    super();
    this._path = ledgerPath;
    this._lastCount = 0;
    this._watcher = null;
    this._debounce = null;
    this._poll = null;

    // Seed line count
    this._seedCount();
    this._start();
  }

  _seedCount() {
    if (!existsSync(this._path)) return;
    try {
      this._lastCount = readFileSync(this._path, 'utf8').split('\n').filter(Boolean).length;
    } catch {}
  }

  _check() {
    if (!existsSync(this._path)) return;
    let lines;
    try {
      lines = readFileSync(this._path, 'utf8').split('\n').filter(Boolean);
    } catch { return; }

    if (lines.length <= this._lastCount) return;
    const newLines = lines.slice(this._lastCount);
    this._lastCount = lines.length;
    for (const line of newLines) {
      try {
        const record = JSON.parse(line);
        this.emit('observation', record, line);
      } catch {
        this.emit('raw', line);
      }
    }
  }

  _debounced() {
    clearTimeout(this._debounce);
    this._debounce = setTimeout(() => this._check(), 50);
  }

  _start() {
    // fs.watch for fast notification
    if (existsSync(this._path)) {
      try {
        this._watcher = watch(this._path, () => this._debounced());
      } catch {
        this._watcher = null;
      }
    }
    // 2s poll as fallback (handles file creation after start)
    this._poll = setInterval(() => {
      if (!this._watcher && existsSync(this._path)) {
        try {
          this._watcher = watch(this._path, () => this._debounced());
        } catch {}
      }
      this._check();
    }, 2000);
  }

  stop() {
    clearTimeout(this._debounce);
    clearInterval(this._poll);
    if (this._watcher) {
      try { this._watcher.close(); } catch {}
      this._watcher = null;
    }
  }
}
