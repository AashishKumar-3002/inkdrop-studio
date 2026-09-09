"use strict";

/**
 * Per-install configuration, stored in Electron's userData directory.
 *
 * Two of these values are load-bearing across restarts:
 *   - ENCRYPTION_KEY encrypts the user's provider API keys in the database.
 *     If it were regenerated on each launch, every saved key would silently
 *     become undecryptable.
 *   - AUTH_SECRET signs the session cookie; regenerating it logs the user out
 *     on every launch.
 * Both are generated once and then persisted, encrypted with the OS keychain
 * via safeStorage when it's available.
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { app, safeStorage } = require("electron");

function configPath() {
  return path.join(app.getPath("userData"), "config.json");
}

function readRaw() {
  try {
    const buf = fs.readFileSync(configPath());
    // Encrypted blobs are stored base64 with a marker; plain JSON otherwise.
    const text = buf.toString("utf8");
    if (text.startsWith("enc:")) {
      if (!safeStorage.isEncryptionAvailable()) return {};
      const decrypted = safeStorage.decryptString(
        Buffer.from(text.slice(4), "base64")
      );
      return JSON.parse(decrypted);
    }
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function writeRaw(config) {
  const json = JSON.stringify(config, null, 2);
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  if (safeStorage.isEncryptionAvailable()) {
    const blob = safeStorage.encryptString(json).toString("base64");
    fs.writeFileSync(configPath(), `enc:${blob}`, { mode: 0o600 });
  } else {
    // No OS keychain (some Linux setups). Still restrict the file mode.
    fs.writeFileSync(configPath(), json, { mode: 0o600 });
  }
}

/** Loads config, generating and persisting any missing secrets. */
function loadConfig() {
  const config = readRaw();
  let dirty = false;

  if (!config.authSecret) {
    config.authSecret = crypto.randomBytes(32).toString("base64");
    dirty = true;
  }
  if (!config.encryptionKey) {
    config.encryptionKey = crypto.randomBytes(32).toString("hex");
    dirty = true;
  }
  if (dirty) writeRaw(config);
  return config;
}

function saveConfig(patch) {
  const next = { ...readRaw(), ...patch };
  writeRaw(next);
  return next;
}

module.exports = { loadConfig, saveConfig, configPath };
