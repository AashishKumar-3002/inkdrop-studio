"use strict";

const { contextBridge, ipcRenderer } = require("electron");

/**
 * The only bridge between the page and the shell. Deliberately tiny: the app
 * is a normal web app talking to its own local server, so it needs almost
 * nothing from Electron. `isDesktop` lets the UI show desktop-only affordances
 * such as Claude subscription mode.
 */
contextBridge.exposeInMainWorld("inkdrop", {
  isDesktop: true,
  platform: process.platform,
  getConfig: () => ipcRenderer.invoke("inkdrop:getConfig"),
  setDatabaseUrl: (url) => ipcRenderer.invoke("inkdrop:setDatabaseUrl", url),
});
