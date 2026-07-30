(function () {
  "use strict";

  var API = "/api/sync";
  var SYNC_KEY_LS = "cap_sync_key";
  var DIRTY_LS = "cap_sync_dirty";
  var SUFFIXES = ["tasks", "sched", "exc", "tabOrder", "ach", "daily", "weeklyDone", "goalBonusWeek"];
  var DIARY_KEY = "ink_diary_data";
  var DEBOUNCE_MS = 2000;

  var rawSetItem = Storage.prototype.setItem;
  var rawRemoveItem = Storage.prototype.removeItem;
  var pendingTimer = null;

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // NOTE: this list intentionally duplicates app.js's own storeKey() naming
  // scheme (cap_${activeProfileId}_${suffix}). bootstrap.js must know these
  // keys BEFORE app.js has loaded, so it cannot call into app.js for this.
  // Keep SUFFIXES in lockstep with app.js's storeKey() call sites.
  function trackedKeys() {
    var pid = null;
    try {
      pid = localStorage.getItem("cap_active_v1");
    } catch (e) {}
    var keys = {};
    if (pid) {
      SUFFIXES.forEach(function (suf) {
        keys["cap_" + pid + "_" + suf] = suf;
      });
    }
    keys[DIARY_KEY] = "diary";
    return keys; // localStorage key -> wire field name
  }

  function isTracked(key) {
    return Object.prototype.hasOwnProperty.call(trackedKeys(), key);
  }

  function getSyncKey() {
    try {
      return localStorage.getItem(SYNC_KEY_LS);
    } catch (e) {
      return null;
    }
  }
  function setSyncKey(k) {
    try {
      rawSetItem.call(localStorage, SYNC_KEY_LS, k);
    } catch (e) {}
  }
  function isDirty() {
    try {
      return localStorage.getItem(DIRTY_LS) === "true";
    } catch (e) {
      return false;
    }
  }
  function clearDirty() {
    try {
      rawRemoveItem.call(localStorage, DIRTY_LS);
    } catch (e) {}
  }

  function readSnapshot() {
    var map = trackedKeys();
    var out = {};
    Object.keys(map).forEach(function (lsKey) {
      var v = null;
      try {
        v = localStorage.getItem(lsKey);
      } catch (e) {}
      out[map[lsKey]] = v;
    });
    return out;
  }

  function applySnapshot(data) {
    if (!data) return;
    var map = trackedKeys();
    var byField = {};
    Object.keys(map).forEach(function (lsKey) {
      byField[map[lsKey]] = lsKey;
    });
    Object.keys(data).forEach(function (field) {
      var lsKey = byField[field];
      if (!lsKey) return;
      var v = data[field];
      if (v === null || v === undefined) return; // never write literal "null"
      try {
        rawSetItem.call(localStorage, lsKey, v);
      } catch (e) {}
    });
  }

  // --- global wrap: catches every write path (normal app code, profile
  // switches, and the app's existing backup/restore feature) in one place ---
  Storage.prototype.setItem = function (key, value) {
    rawSetItem.call(this, key, value);
    if (this === localStorage && isTracked(key)) markDirtyAndSchedule();
  };
  Storage.prototype.removeItem = function (key) {
    rawRemoveItem.call(this, key);
    if (this === localStorage && isTracked(key)) markDirtyAndSchedule();
  };

  function markDirtyAndSchedule() {
    try {
      rawSetItem.call(localStorage, DIRTY_LS, "true");
    } catch (e) {}
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(function () {
      pendingTimer = null;
      push(false);
    }, DEBOUNCE_MS);
  }

  function push(useBeacon) {
    var key = getSyncKey();
    if (!key) return;
    var body = JSON.stringify({ key: key, data: readSnapshot() });
    if (useBeacon && navigator.sendBeacon) {
      var ok = navigator.sendBeacon(API, new Blob([body], { type: "application/json" }));
      if (ok) {
        clearDirty();
        updateStatus("送信済み " + nowLabel());
      }
      return;
    }
    fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true })
      .then(function (r) {
        if (r.ok) {
          clearDirty();
          updateStatus("同期済み " + nowLabel());
        } else {
          updateStatus("同期エラー");
        }
      })
      .catch(function () {
        updateStatus("同期エラー（オフライン？）");
      });
  }

  function flushIfPending() {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
      push(true);
    }
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") flushIfPending();
  });
  window.addEventListener("pagehide", flushIfPending);

  function nowLabel() {
    var d = new Date();
    function p(n) {
      return (n < 10 ? "0" : "") + n;
    }
    return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }

  function pullFromServer(key, cb) {
    fetch(API + "?key=" + encodeURIComponent(key))
      .then(function (r) {
        return r.json();
      })
      .then(function (res) {
        if (res && res.found) applySnapshot(res.data);
        updateStatus("受信済み " + nowLabel());
        cb();
      })
      .catch(function () {
        updateStatus("同期エラー（オフライン？）");
        cb();
      });
  }

  function pushToServer(key, cb) {
    var body = JSON.stringify({ key: key, data: readSnapshot() });
    fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: body })
      .then(function () {
        clearDirty();
        updateStatus("送信済み " + nowLabel());
        cb();
      })
      .catch(function () {
        updateStatus("同期エラー（オフライン？）");
        cb();
      });
  }

  function loadAppScript(cb) {
    var s = document.createElement("script");
    s.src = "/app.js";
    s.onload = cb;
    s.onerror = cb;
    document.body.appendChild(s);
  }

  function boot() {
    var params = new URLSearchParams(location.search);
    var incomingKey = params.get("syncKey");
    var currentKey = getSyncKey();

    function proceedWithKey(key) {
      if (!key) {
        // first-ever run on this device: nothing to link to yet.
        key = uuid();
        setSyncKey(key);
        loadAppScript(renderSyncUI);
        return;
      }
      if (isDirty()) {
        // an offline/unsent local edit exists — push it before any pull,
        // so a stale server copy can never clobber a newer local edit.
        pushToServer(key, function () {
          loadAppScript(renderSyncUI);
        });
      } else {
        pullFromServer(key, function () {
          loadAppScript(renderSyncUI);
        });
      }
    }

    if (incomingKey && incomingKey !== currentKey) {
      var proceed = window.confirm(
        "この端末のタスク・バッジ・日記を、指定された同期データで上書きします。よろしいですか？\n" +
          "(不安な場合はキャンセルして、先に設定画面からバックアップを取ってください)"
      );
      params.delete("syncKey");
      var clean = location.pathname + (params.toString() ? "?" + params.toString() : "");
      history.replaceState(null, "", clean);
      if (proceed) {
        setSyncKey(incomingKey);
        proceedWithKey(incomingKey);
      } else {
        proceedWithKey(currentKey);
      }
      return;
    }

    proceedWithKey(currentKey);
  }

  // --- settings-pane UI: appended after app.js has finished its own
  // initial render, so we never fight its own DOM management of that pane ---
  function renderSyncUI() {
    var host = document.getElementById("pane-settings");
    if (!host || document.getElementById("sync-box")) return;
    var key = getSyncKey() || "";
    var pairUrl = location.origin + location.pathname + "?syncKey=" + encodeURIComponent(key);

    var box = document.createElement("div");
    box.id = "sync-box";
    box.style.cssText =
      "margin-top:16px;padding:12px;border:1.5px solid var(--border,#ccc);border-radius:10px;font-size:12px;";
    box.innerHTML =
      '<div style="font-weight:700;margin-bottom:8px;">複数端末での同期（タスク・カレンダー・バッジ・日記のみ）</div>' +
      '<div style="margin-bottom:8px;">同期キー<br><code id="sync-key-text" style="user-select:all;word-break:break-all;">' +
      key +
      '</code> <button type="button" id="sync-copy-btn" style="margin-left:6px;">コピー</button></div>' +
      '<div style="margin-bottom:8px;word-break:break-all;">他の端末で開く用リンク（開くと確認ダイアログが出ます）<br><a id="sync-pair-link" href="' +
      pairUrl +
      '">' +
      pairUrl +
      "</a></div>" +
      '<div id="sync-status" style="color:var(--text-muted,#888);">最終同期: -</div>';
    host.appendChild(box);

    var copyBtn = document.getElementById("sync-copy-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        if (navigator.clipboard) navigator.clipboard.writeText(key);
      });
    }
  }

  function updateStatus(text) {
    var el = document.getElementById("sync-status");
    if (el) el.textContent = "最終同期: " + text;
  }

  boot();
})();
