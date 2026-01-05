#!/usr/bin/env node
import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// node_modules/.bun/@libsql+core@0.15.15/node_modules/@libsql/core/lib-esm/api.js
var LibsqlError;
var init_api = __esm(() => {
  LibsqlError = class LibsqlError extends Error {
    code;
    rawCode;
    constructor(message, code, rawCode, cause) {
      if (code !== undefined) {
        message = `${code}: ${message}`;
      }
      super(message, { cause });
      this.code = code;
      this.rawCode = rawCode;
      this.name = "LibsqlError";
    }
  };
});

// node_modules/.bun/@libsql+core@0.15.15/node_modules/@libsql/core/lib-esm/uri.js
function parseUri(text) {
  const match = URI_RE.exec(text);
  if (match === null) {
    throw new LibsqlError(`The URL '${text}' is not in a valid format`, "URL_INVALID");
  }
  const groups = match.groups;
  const scheme = groups["scheme"];
  const authority = groups["authority"] !== undefined ? parseAuthority(groups["authority"]) : undefined;
  const path = percentDecode(groups["path"]);
  const query = groups["query"] !== undefined ? parseQuery(groups["query"]) : undefined;
  const fragment = groups["fragment"] !== undefined ? percentDecode(groups["fragment"]) : undefined;
  return { scheme, authority, path, query, fragment };
}
function parseAuthority(text) {
  const match = AUTHORITY_RE.exec(text);
  if (match === null) {
    throw new LibsqlError("The authority part of the URL is not in a valid format", "URL_INVALID");
  }
  const groups = match.groups;
  const host = percentDecode(groups["host_br"] ?? groups["host"]);
  const port = groups["port"] ? parseInt(groups["port"], 10) : undefined;
  const userinfo = groups["username"] !== undefined ? {
    username: percentDecode(groups["username"]),
    password: groups["password"] !== undefined ? percentDecode(groups["password"]) : undefined
  } : undefined;
  return { host, port, userinfo };
}
function parseQuery(text) {
  const sequences = text.split("&");
  const pairs = [];
  for (const sequence of sequences) {
    if (sequence === "") {
      continue;
    }
    let key;
    let value;
    const splitIdx = sequence.indexOf("=");
    if (splitIdx < 0) {
      key = sequence;
      value = "";
    } else {
      key = sequence.substring(0, splitIdx);
      value = sequence.substring(splitIdx + 1);
    }
    pairs.push({
      key: percentDecode(key.replaceAll("+", " ")),
      value: percentDecode(value.replaceAll("+", " "))
    });
  }
  return { pairs };
}
function percentDecode(text) {
  try {
    return decodeURIComponent(text);
  } catch (e) {
    if (e instanceof URIError) {
      throw new LibsqlError(`URL component has invalid percent encoding: ${e}`, "URL_INVALID", undefined, e);
    }
    throw e;
  }
}
function encodeBaseUrl(scheme, authority, path) {
  if (authority === undefined) {
    throw new LibsqlError(`URL with scheme ${JSON.stringify(scheme + ":")} requires authority (the "//" part)`, "URL_INVALID");
  }
  const schemeText = `${scheme}:`;
  const hostText = encodeHost(authority.host);
  const portText = encodePort(authority.port);
  const userinfoText = encodeUserinfo(authority.userinfo);
  const authorityText = `//${userinfoText}${hostText}${portText}`;
  let pathText = path.split("/").map(encodeURIComponent).join("/");
  if (pathText !== "" && !pathText.startsWith("/")) {
    pathText = "/" + pathText;
  }
  return new URL(`${schemeText}${authorityText}${pathText}`);
}
function encodeHost(host) {
  return host.includes(":") ? `[${encodeURI(host)}]` : encodeURI(host);
}
function encodePort(port) {
  return port !== undefined ? `:${port}` : "";
}
function encodeUserinfo(userinfo) {
  if (userinfo === undefined) {
    return "";
  }
  const usernameText = encodeURIComponent(userinfo.username);
  const passwordText = userinfo.password !== undefined ? `:${encodeURIComponent(userinfo.password)}` : "";
  return `${usernameText}${passwordText}@`;
}
var URI_RE, AUTHORITY_RE;
var init_uri = __esm(() => {
  init_api();
  URI_RE = (() => {
    const SCHEME = "(?<scheme>[A-Za-z][A-Za-z.+-]*)";
    const AUTHORITY = "(?<authority>[^/?#]*)";
    const PATH = "(?<path>[^?#]*)";
    const QUERY = "(?<query>[^#]*)";
    const FRAGMENT = "(?<fragment>.*)";
    return new RegExp(`^${SCHEME}:(//${AUTHORITY})?${PATH}(\\?${QUERY})?(#${FRAGMENT})?$`, "su");
  })();
  AUTHORITY_RE = (() => {
    return new RegExp(`^((?<username>[^:]*)(:(?<password>.*))?@)?((?<host>[^:\\[\\]]*)|(\\[(?<host_br>[^\\[\\]]*)\\]))(:(?<port>[0-9]*))?$`, "su");
  })();
});

// node_modules/.bun/js-base64@3.7.8/node_modules/js-base64/base64.mjs
var version = "3.7.8", VERSION, _hasBuffer, _TD, _TE, b64ch = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", b64chs, b64tab, b64re, _fromCC, _U8Afrom, _mkUriSafe = (src) => src.replace(/=/g, "").replace(/[+\/]/g, (m0) => m0 == "+" ? "-" : "_"), _tidyB64 = (s) => s.replace(/[^A-Za-z0-9\+\/]/g, ""), btoaPolyfill = (bin) => {
  let u32, c0, c1, c2, asc = "";
  const pad = bin.length % 3;
  for (let i = 0;i < bin.length; ) {
    if ((c0 = bin.charCodeAt(i++)) > 255 || (c1 = bin.charCodeAt(i++)) > 255 || (c2 = bin.charCodeAt(i++)) > 255)
      throw new TypeError("invalid character found");
    u32 = c0 << 16 | c1 << 8 | c2;
    asc += b64chs[u32 >> 18 & 63] + b64chs[u32 >> 12 & 63] + b64chs[u32 >> 6 & 63] + b64chs[u32 & 63];
  }
  return pad ? asc.slice(0, pad - 3) + "===".substring(pad) : asc;
}, _btoa, _fromUint8Array, fromUint8Array = (u8a, urlsafe = false) => urlsafe ? _mkUriSafe(_fromUint8Array(u8a)) : _fromUint8Array(u8a), cb_utob = (c) => {
  if (c.length < 2) {
    var cc = c.charCodeAt(0);
    return cc < 128 ? c : cc < 2048 ? _fromCC(192 | cc >>> 6) + _fromCC(128 | cc & 63) : _fromCC(224 | cc >>> 12 & 15) + _fromCC(128 | cc >>> 6 & 63) + _fromCC(128 | cc & 63);
  } else {
    var cc = 65536 + (c.charCodeAt(0) - 55296) * 1024 + (c.charCodeAt(1) - 56320);
    return _fromCC(240 | cc >>> 18 & 7) + _fromCC(128 | cc >>> 12 & 63) + _fromCC(128 | cc >>> 6 & 63) + _fromCC(128 | cc & 63);
  }
}, re_utob, utob = (u) => u.replace(re_utob, cb_utob), _encode, encode = (src, urlsafe = false) => urlsafe ? _mkUriSafe(_encode(src)) : _encode(src), encodeURI2 = (src) => encode(src, true), re_btou, cb_btou = (cccc) => {
  switch (cccc.length) {
    case 4:
      var cp = (7 & cccc.charCodeAt(0)) << 18 | (63 & cccc.charCodeAt(1)) << 12 | (63 & cccc.charCodeAt(2)) << 6 | 63 & cccc.charCodeAt(3), offset = cp - 65536;
      return _fromCC((offset >>> 10) + 55296) + _fromCC((offset & 1023) + 56320);
    case 3:
      return _fromCC((15 & cccc.charCodeAt(0)) << 12 | (63 & cccc.charCodeAt(1)) << 6 | 63 & cccc.charCodeAt(2));
    default:
      return _fromCC((31 & cccc.charCodeAt(0)) << 6 | 63 & cccc.charCodeAt(1));
  }
}, btou = (b) => b.replace(re_btou, cb_btou), atobPolyfill = (asc) => {
  asc = asc.replace(/\s+/g, "");
  if (!b64re.test(asc))
    throw new TypeError("malformed base64.");
  asc += "==".slice(2 - (asc.length & 3));
  let u24, r1, r2;
  let binArray = [];
  for (let i = 0;i < asc.length; ) {
    u24 = b64tab[asc.charAt(i++)] << 18 | b64tab[asc.charAt(i++)] << 12 | (r1 = b64tab[asc.charAt(i++)]) << 6 | (r2 = b64tab[asc.charAt(i++)]);
    if (r1 === 64) {
      binArray.push(_fromCC(u24 >> 16 & 255));
    } else if (r2 === 64) {
      binArray.push(_fromCC(u24 >> 16 & 255, u24 >> 8 & 255));
    } else {
      binArray.push(_fromCC(u24 >> 16 & 255, u24 >> 8 & 255, u24 & 255));
    }
  }
  return binArray.join("");
}, _atob, _toUint8Array, toUint8Array = (a) => _toUint8Array(_unURI(a)), _decode, _unURI = (a) => _tidyB64(a.replace(/[-_]/g, (m0) => m0 == "-" ? "+" : "/")), decode = (src) => _decode(_unURI(src)), isValid = (src) => {
  if (typeof src !== "string")
    return false;
  const s = src.replace(/\s+/g, "").replace(/={0,2}$/, "");
  return !/[^\s0-9a-zA-Z\+/]/.test(s) || !/[^\s0-9a-zA-Z\-_]/.test(s);
}, _noEnum = (v) => {
  return {
    value: v,
    enumerable: false,
    writable: true,
    configurable: true
  };
}, extendString = function() {
  const _add = (name, body) => Object.defineProperty(String.prototype, name, _noEnum(body));
  _add("fromBase64", function() {
    return decode(this);
  });
  _add("toBase64", function(urlsafe) {
    return encode(this, urlsafe);
  });
  _add("toBase64URI", function() {
    return encode(this, true);
  });
  _add("toBase64URL", function() {
    return encode(this, true);
  });
  _add("toUint8Array", function() {
    return toUint8Array(this);
  });
}, extendUint8Array = function() {
  const _add = (name, body) => Object.defineProperty(Uint8Array.prototype, name, _noEnum(body));
  _add("toBase64", function(urlsafe) {
    return fromUint8Array(this, urlsafe);
  });
  _add("toBase64URI", function() {
    return fromUint8Array(this, true);
  });
  _add("toBase64URL", function() {
    return fromUint8Array(this, true);
  });
}, extendBuiltins = () => {
  extendString();
  extendUint8Array();
}, gBase64;
var init_base64 = __esm(() => {
  VERSION = version;
  _hasBuffer = typeof Buffer === "function";
  _TD = typeof TextDecoder === "function" ? new TextDecoder : undefined;
  _TE = typeof TextEncoder === "function" ? new TextEncoder : undefined;
  b64chs = Array.prototype.slice.call(b64ch);
  b64tab = ((a) => {
    let tab = {};
    a.forEach((c, i) => tab[c] = i);
    return tab;
  })(b64chs);
  b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
  _fromCC = String.fromCharCode.bind(String);
  _U8Afrom = typeof Uint8Array.from === "function" ? Uint8Array.from.bind(Uint8Array) : (it) => new Uint8Array(Array.prototype.slice.call(it, 0));
  _btoa = typeof btoa === "function" ? (bin) => btoa(bin) : _hasBuffer ? (bin) => Buffer.from(bin, "binary").toString("base64") : btoaPolyfill;
  _fromUint8Array = _hasBuffer ? (u8a) => Buffer.from(u8a).toString("base64") : (u8a) => {
    const maxargs = 4096;
    let strs = [];
    for (let i = 0, l = u8a.length;i < l; i += maxargs) {
      strs.push(_fromCC.apply(null, u8a.subarray(i, i + maxargs)));
    }
    return _btoa(strs.join(""));
  };
  re_utob = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;
  _encode = _hasBuffer ? (s) => Buffer.from(s, "utf8").toString("base64") : _TE ? (s) => _fromUint8Array(_TE.encode(s)) : (s) => _btoa(utob(s));
  re_btou = /[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3}/g;
  _atob = typeof atob === "function" ? (asc) => atob(_tidyB64(asc)) : _hasBuffer ? (asc) => Buffer.from(asc, "base64").toString("binary") : atobPolyfill;
  _toUint8Array = _hasBuffer ? (a) => _U8Afrom(Buffer.from(a, "base64")) : (a) => _U8Afrom(_atob(a).split("").map((c) => c.charCodeAt(0)));
  _decode = _hasBuffer ? (a) => Buffer.from(a, "base64").toString("utf8") : _TD ? (a) => _TD.decode(_toUint8Array(a)) : (a) => btou(_atob(a));
  gBase64 = {
    version,
    VERSION,
    atob: _atob,
    atobPolyfill,
    btoa: _btoa,
    btoaPolyfill,
    fromBase64: decode,
    toBase64: encode,
    encode,
    encodeURI: encodeURI2,
    encodeURL: encodeURI2,
    utob,
    btou,
    decode,
    isValid,
    fromUint8Array,
    toUint8Array,
    extendString,
    extendUint8Array,
    extendBuiltins
  };
});

// node_modules/.bun/@libsql+core@0.15.15/node_modules/@libsql/core/lib-esm/util.js
function transactionModeToBegin(mode) {
  if (mode === "write") {
    return "BEGIN IMMEDIATE";
  } else if (mode === "read") {
    return "BEGIN TRANSACTION READONLY";
  } else if (mode === "deferred") {
    return "BEGIN DEFERRED";
  } else {
    throw RangeError('Unknown transaction mode, supported values are "write", "read" and "deferred"');
  }
}

class ResultSetImpl {
  columns;
  columnTypes;
  rows;
  rowsAffected;
  lastInsertRowid;
  constructor(columns, columnTypes, rows, rowsAffected, lastInsertRowid) {
    this.columns = columns;
    this.columnTypes = columnTypes;
    this.rows = rows;
    this.rowsAffected = rowsAffected;
    this.lastInsertRowid = lastInsertRowid;
  }
  toJSON() {
    return {
      columns: this.columns,
      columnTypes: this.columnTypes,
      rows: this.rows.map(rowToJson),
      rowsAffected: this.rowsAffected,
      lastInsertRowid: this.lastInsertRowid !== undefined ? "" + this.lastInsertRowid : null
    };
  }
}
function rowToJson(row) {
  return Array.prototype.map.call(row, valueToJson);
}
function valueToJson(value) {
  if (typeof value === "bigint") {
    return "" + value;
  } else if (value instanceof ArrayBuffer) {
    return gBase64.fromUint8Array(new Uint8Array(value));
  } else {
    return value;
  }
}
var supportedUrlLink = "https://github.com/libsql/libsql-client-ts#supported-urls";
var init_util = __esm(() => {
  init_base64();
});

// node_modules/.bun/@libsql+core@0.15.15/node_modules/@libsql/core/lib-esm/config.js
function isInMemoryConfig(config) {
  return config.scheme === "file" && (config.path === ":memory:" || config.path.startsWith(":memory:?"));
}
function expandConfig(config, preferHttp) {
  if (typeof config !== "object") {
    throw new TypeError(`Expected client configuration as object, got ${typeof config}`);
  }
  let { url, authToken, tls, intMode, concurrency } = config;
  concurrency = Math.max(0, concurrency || 20);
  intMode ??= "number";
  let connectionQueryParams = [];
  if (url === inMemoryMode) {
    url = "file::memory:";
  }
  const uri = parseUri(url);
  const originalUriScheme = uri.scheme.toLowerCase();
  const isInMemoryMode = originalUriScheme === "file" && uri.path === inMemoryMode && uri.authority === undefined;
  let queryParamsDef;
  if (isInMemoryMode) {
    queryParamsDef = {
      cache: {
        values: ["shared", "private"],
        update: (key, value) => connectionQueryParams.push(`${key}=${value}`)
      }
    };
  } else {
    queryParamsDef = {
      tls: {
        values: ["0", "1"],
        update: (_, value) => tls = value === "1"
      },
      authToken: {
        update: (_, value) => authToken = value
      }
    };
  }
  for (const { key, value } of uri.query?.pairs ?? []) {
    if (!Object.hasOwn(queryParamsDef, key)) {
      throw new LibsqlError(`Unsupported URL query parameter ${JSON.stringify(key)}`, "URL_PARAM_NOT_SUPPORTED");
    }
    const queryParamDef = queryParamsDef[key];
    if (queryParamDef.values !== undefined && !queryParamDef.values.includes(value)) {
      throw new LibsqlError(`Unknown value for the "${key}" query argument: ${JSON.stringify(value)}. Supported values are: [${queryParamDef.values.map((x) => '"' + x + '"').join(", ")}]`, "URL_INVALID");
    }
    if (queryParamDef.update !== undefined) {
      queryParamDef?.update(key, value);
    }
  }
  const connectionQueryParamsString = connectionQueryParams.length === 0 ? "" : `?${connectionQueryParams.join("&")}`;
  const path = uri.path + connectionQueryParamsString;
  let scheme;
  if (originalUriScheme === "libsql") {
    if (tls === false) {
      if (uri.authority?.port === undefined) {
        throw new LibsqlError('A "libsql:" URL with ?tls=0 must specify an explicit port', "URL_INVALID");
      }
      scheme = preferHttp ? "http" : "ws";
    } else {
      scheme = preferHttp ? "https" : "wss";
    }
  } else {
    scheme = originalUriScheme;
  }
  if (scheme === "http" || scheme === "ws") {
    tls ??= false;
  } else {
    tls ??= true;
  }
  if (scheme !== "http" && scheme !== "ws" && scheme !== "https" && scheme !== "wss" && scheme !== "file") {
    throw new LibsqlError('The client supports only "libsql:", "wss:", "ws:", "https:", "http:" and "file:" URLs, ' + `got ${JSON.stringify(uri.scheme + ":")}. ` + `For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
  }
  if (intMode !== "number" && intMode !== "bigint" && intMode !== "string") {
    throw new TypeError(`Invalid value for intMode, expected "number", "bigint" or "string", got ${JSON.stringify(intMode)}`);
  }
  if (uri.fragment !== undefined) {
    throw new LibsqlError(`URL fragments are not supported: ${JSON.stringify("#" + uri.fragment)}`, "URL_INVALID");
  }
  if (isInMemoryMode) {
    return {
      scheme: "file",
      tls: false,
      path,
      intMode,
      concurrency,
      syncUrl: config.syncUrl,
      syncInterval: config.syncInterval,
      readYourWrites: config.readYourWrites,
      offline: config.offline,
      fetch: config.fetch,
      authToken: undefined,
      encryptionKey: undefined,
      authority: undefined
    };
  }
  return {
    scheme,
    tls,
    authority: uri.authority,
    path,
    authToken,
    intMode,
    concurrency,
    encryptionKey: config.encryptionKey,
    syncUrl: config.syncUrl,
    syncInterval: config.syncInterval,
    readYourWrites: config.readYourWrites,
    offline: config.offline,
    fetch: config.fetch
  };
}
var inMemoryMode = ":memory:";
var init_config = __esm(() => {
  init_api();
  init_uri();
  init_util();
});

// node_modules/.bun/@neon-rs+load@0.0.4/node_modules/@neon-rs/load/dist/index.js
var require_dist = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  } : function(o, v) {
    o["default"] = v;
  });
  var __importStar = exports && exports.__importStar || function(mod) {
    if (mod && mod.__esModule)
      return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    }
    __setModuleDefault(result, mod);
    return result;
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.load = exports.currentTarget = undefined;
  var path = __importStar(__require("path"));
  var fs = __importStar(__require("fs"));
  function currentTarget() {
    let os = null;
    switch (process.platform) {
      case "android":
        switch (process.arch) {
          case "arm":
            return "android-arm-eabi";
          case "arm64":
            return "android-arm64";
        }
        os = "Android";
        break;
      case "win32":
        switch (process.arch) {
          case "x64":
            return "win32-x64-msvc";
          case "arm64":
            return "win32-arm64-msvc";
          case "ia32":
            return "win32-ia32-msvc";
        }
        os = "Windows";
        break;
      case "darwin":
        switch (process.arch) {
          case "x64":
            return "darwin-x64";
          case "arm64":
            return "darwin-arm64";
        }
        os = "macOS";
        break;
      case "linux":
        switch (process.arch) {
          case "x64":
          case "arm64":
            return isGlibc() ? `linux-${process.arch}-gnu` : `linux-${process.arch}-musl`;
          case "arm":
            return "linux-arm-gnueabihf";
        }
        os = "Linux";
        break;
      case "freebsd":
        if (process.arch === "x64") {
          return "freebsd-x64";
        }
        os = "FreeBSD";
        break;
    }
    if (os) {
      throw new Error(`Neon: unsupported ${os} architecture: ${process.arch}`);
    }
    throw new Error(`Neon: unsupported system: ${process.platform}`);
  }
  exports.currentTarget = currentTarget;
  function isGlibc() {
    const report = process.report?.getReport();
    if (typeof report !== "object" || !report || !("header" in report)) {
      return false;
    }
    const header = report.header;
    return typeof header === "object" && !!header && "glibcVersionRuntime" in header;
  }
  function load(dirname) {
    const m = path.join(dirname, "index.node");
    return fs.existsSync(m) ? __require(m) : null;
  }
  exports.load = load;
});

// node_modules/.bun/detect-libc@2.0.2/node_modules/detect-libc/lib/process.js
var require_process = __commonJS((exports, module) => {
  var isLinux = () => process.platform === "linux";
  var report = null;
  var getReport = () => {
    if (!report) {
      report = isLinux() && process.report ? process.report.getReport() : {};
    }
    return report;
  };
  module.exports = { isLinux, getReport };
});

// node_modules/.bun/detect-libc@2.0.2/node_modules/detect-libc/lib/filesystem.js
var require_filesystem = __commonJS((exports, module) => {
  var fs = __require("fs");
  var LDD_PATH = "/usr/bin/ldd";
  var readFileSync = (path) => fs.readFileSync(path, "utf-8");
  var readFile = (path) => new Promise((resolve, reject) => {
    fs.readFile(path, "utf-8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
  module.exports = {
    LDD_PATH,
    readFileSync,
    readFile
  };
});

// node_modules/.bun/detect-libc@2.0.2/node_modules/detect-libc/lib/detect-libc.js
var require_detect_libc = __commonJS((exports, module) => {
  var childProcess = __require("child_process");
  var { isLinux, getReport } = require_process();
  var { LDD_PATH, readFile, readFileSync } = require_filesystem();
  var cachedFamilyFilesystem;
  var cachedVersionFilesystem;
  var command = "getconf GNU_LIBC_VERSION 2>&1 || true; ldd --version 2>&1 || true";
  var commandOut = "";
  var safeCommand = () => {
    if (!commandOut) {
      return new Promise((resolve) => {
        childProcess.exec(command, (err, out) => {
          commandOut = err ? " " : out;
          resolve(commandOut);
        });
      });
    }
    return commandOut;
  };
  var safeCommandSync = () => {
    if (!commandOut) {
      try {
        commandOut = childProcess.execSync(command, { encoding: "utf8" });
      } catch (_err) {
        commandOut = " ";
      }
    }
    return commandOut;
  };
  var GLIBC = "glibc";
  var RE_GLIBC_VERSION = /GLIBC\s(\d+\.\d+)/;
  var MUSL = "musl";
  var GLIBC_ON_LDD = GLIBC.toUpperCase();
  var MUSL_ON_LDD = MUSL.toLowerCase();
  var isFileMusl = (f) => f.includes("libc.musl-") || f.includes("ld-musl-");
  var familyFromReport = () => {
    const report = getReport();
    if (report.header && report.header.glibcVersionRuntime) {
      return GLIBC;
    }
    if (Array.isArray(report.sharedObjects)) {
      if (report.sharedObjects.some(isFileMusl)) {
        return MUSL;
      }
    }
    return null;
  };
  var familyFromCommand = (out) => {
    const [getconf, ldd1] = out.split(/[\r\n]+/);
    if (getconf && getconf.includes(GLIBC)) {
      return GLIBC;
    }
    if (ldd1 && ldd1.includes(MUSL)) {
      return MUSL;
    }
    return null;
  };
  var getFamilyFromLddContent = (content) => {
    if (content.includes(MUSL_ON_LDD)) {
      return MUSL;
    }
    if (content.includes(GLIBC_ON_LDD)) {
      return GLIBC;
    }
    return null;
  };
  var familyFromFilesystem = async () => {
    if (cachedFamilyFilesystem !== undefined) {
      return cachedFamilyFilesystem;
    }
    cachedFamilyFilesystem = null;
    try {
      const lddContent = await readFile(LDD_PATH);
      cachedFamilyFilesystem = getFamilyFromLddContent(lddContent);
    } catch (e) {}
    return cachedFamilyFilesystem;
  };
  var familyFromFilesystemSync = () => {
    if (cachedFamilyFilesystem !== undefined) {
      return cachedFamilyFilesystem;
    }
    cachedFamilyFilesystem = null;
    try {
      const lddContent = readFileSync(LDD_PATH);
      cachedFamilyFilesystem = getFamilyFromLddContent(lddContent);
    } catch (e) {}
    return cachedFamilyFilesystem;
  };
  var family = async () => {
    let family2 = null;
    if (isLinux()) {
      family2 = await familyFromFilesystem();
      if (!family2) {
        family2 = familyFromReport();
      }
      if (!family2) {
        const out = await safeCommand();
        family2 = familyFromCommand(out);
      }
    }
    return family2;
  };
  var familySync = () => {
    let family2 = null;
    if (isLinux()) {
      family2 = familyFromFilesystemSync();
      if (!family2) {
        family2 = familyFromReport();
      }
      if (!family2) {
        const out = safeCommandSync();
        family2 = familyFromCommand(out);
      }
    }
    return family2;
  };
  var isNonGlibcLinux = async () => isLinux() && await family() !== GLIBC;
  var isNonGlibcLinuxSync = () => isLinux() && familySync() !== GLIBC;
  var versionFromFilesystem = async () => {
    if (cachedVersionFilesystem !== undefined) {
      return cachedVersionFilesystem;
    }
    cachedVersionFilesystem = null;
    try {
      const lddContent = await readFile(LDD_PATH);
      const versionMatch = lddContent.match(RE_GLIBC_VERSION);
      if (versionMatch) {
        cachedVersionFilesystem = versionMatch[1];
      }
    } catch (e) {}
    return cachedVersionFilesystem;
  };
  var versionFromFilesystemSync = () => {
    if (cachedVersionFilesystem !== undefined) {
      return cachedVersionFilesystem;
    }
    cachedVersionFilesystem = null;
    try {
      const lddContent = readFileSync(LDD_PATH);
      const versionMatch = lddContent.match(RE_GLIBC_VERSION);
      if (versionMatch) {
        cachedVersionFilesystem = versionMatch[1];
      }
    } catch (e) {}
    return cachedVersionFilesystem;
  };
  var versionFromReport = () => {
    const report = getReport();
    if (report.header && report.header.glibcVersionRuntime) {
      return report.header.glibcVersionRuntime;
    }
    return null;
  };
  var versionSuffix = (s) => s.trim().split(/\s+/)[1];
  var versionFromCommand = (out) => {
    const [getconf, ldd1, ldd2] = out.split(/[\r\n]+/);
    if (getconf && getconf.includes(GLIBC)) {
      return versionSuffix(getconf);
    }
    if (ldd1 && ldd2 && ldd1.includes(MUSL)) {
      return versionSuffix(ldd2);
    }
    return null;
  };
  var version2 = async () => {
    let version3 = null;
    if (isLinux()) {
      version3 = await versionFromFilesystem();
      if (!version3) {
        version3 = versionFromReport();
      }
      if (!version3) {
        const out = await safeCommand();
        version3 = versionFromCommand(out);
      }
    }
    return version3;
  };
  var versionSync = () => {
    let version3 = null;
    if (isLinux()) {
      version3 = versionFromFilesystemSync();
      if (!version3) {
        version3 = versionFromReport();
      }
      if (!version3) {
        const out = safeCommandSync();
        version3 = versionFromCommand(out);
      }
    }
    return version3;
  };
  module.exports = {
    GLIBC,
    MUSL,
    family,
    familySync,
    isNonGlibcLinux,
    isNonGlibcLinuxSync,
    version: version2,
    versionSync
  };
});

// node_modules/.bun/libsql@0.5.22/node_modules/libsql/auth.js
var require_auth = __commonJS((exports, module) => {
  var Authorization = {
    ALLOW: 0,
    DENY: 1
  };
  module.exports = Authorization;
});

// node_modules/.bun/libsql@0.5.22/node_modules/libsql/sqlite-error.js
var require_sqlite_error = __commonJS((exports, module) => {
  var descriptor = { value: "SqliteError", writable: true, enumerable: false, configurable: true };
  function SqliteError(message, code, rawCode) {
    if (new.target !== SqliteError) {
      return new SqliteError(message, code);
    }
    if (typeof code !== "string") {
      throw new TypeError("Expected second argument to be a string");
    }
    Error.call(this, message);
    descriptor.value = "" + message;
    Object.defineProperty(this, "message", descriptor);
    Error.captureStackTrace(this, SqliteError);
    this.code = code;
    this.rawCode = rawCode;
  }
  Object.setPrototypeOf(SqliteError, Error);
  Object.setPrototypeOf(SqliteError.prototype, Error.prototype);
  Object.defineProperty(SqliteError.prototype, "name", descriptor);
  module.exports = SqliteError;
});

// node_modules/.bun/libsql@0.5.22/node_modules/libsql/index.js
var require_libsql = __commonJS((exports, module) => {
  var __dirname = "/home/max/workspace/code/claude-parallel/node_modules/.bun/libsql@0.5.22/node_modules/libsql";
  var { load, currentTarget } = require_dist();
  var { familySync, GLIBC, MUSL } = require_detect_libc();
  function requireNative() {
    if (process.env.LIBSQL_JS_DEV) {
      return load(__dirname);
    }
    let target = currentTarget();
    if (familySync() == GLIBC) {
      switch (target) {
        case "linux-x64-musl":
          target = "linux-x64-gnu";
          break;
        case "linux-arm64-musl":
          target = "linux-arm64-gnu";
          break;
      }
    }
    if (target === "linux-arm-gnueabihf" && familySync() == MUSL) {
      target = "linux-arm-musleabihf";
    }
    return __require(`@libsql/${target}`);
  }
  var {
    databaseOpen,
    databaseOpenWithSync,
    databaseInTransaction,
    databaseInterrupt,
    databaseClose,
    databaseSyncSync,
    databaseSyncUntilSync,
    databaseExecSync,
    databasePrepareSync,
    databaseDefaultSafeIntegers,
    databaseAuthorizer,
    databaseLoadExtension,
    databaseMaxWriteReplicationIndex,
    statementRaw,
    statementIsReader,
    statementGet,
    statementRun,
    statementInterrupt,
    statementRowsSync,
    statementColumns,
    statementSafeIntegers,
    rowsNext
  } = requireNative();
  var Authorization = require_auth();
  var SqliteError = require_sqlite_error();
  function convertError(err) {
    if (err.libsqlError) {
      return new SqliteError(err.message, err.code, err.rawCode);
    }
    return err;
  }

  class Database {
    constructor(path, opts) {
      const encryptionCipher = opts?.encryptionCipher ?? "aes256cbc";
      if (opts && opts.syncUrl) {
        var authToken = "";
        if (opts.syncAuth) {
          console.warn("Warning: The `syncAuth` option is deprecated, please use `authToken` option instead.");
          authToken = opts.syncAuth;
        } else if (opts.authToken) {
          authToken = opts.authToken;
        }
        const encryptionKey = opts?.encryptionKey ?? "";
        const syncPeriod = opts?.syncPeriod ?? 0;
        const readYourWrites = opts?.readYourWrites ?? true;
        const offline = opts?.offline ?? false;
        const remoteEncryptionKey = opts?.remoteEncryptionKey ?? "";
        this.db = databaseOpenWithSync(path, opts.syncUrl, authToken, encryptionCipher, encryptionKey, syncPeriod, readYourWrites, offline, remoteEncryptionKey);
      } else {
        const authToken2 = opts?.authToken ?? "";
        const encryptionKey = opts?.encryptionKey ?? "";
        const timeout = opts?.timeout ?? 0;
        const remoteEncryptionKey = opts?.remoteEncryptionKey ?? "";
        this.db = databaseOpen(path, authToken2, encryptionCipher, encryptionKey, timeout, remoteEncryptionKey);
      }
      this.memory = path === ":memory:";
      this.readonly = false;
      this.name = "";
      this.open = true;
      const db = this.db;
      Object.defineProperties(this, {
        inTransaction: {
          get() {
            return databaseInTransaction(db);
          }
        }
      });
    }
    sync() {
      return databaseSyncSync.call(this.db);
    }
    syncUntil(replicationIndex) {
      return databaseSyncUntilSync.call(this.db, replicationIndex);
    }
    prepare(sql) {
      try {
        const stmt = databasePrepareSync.call(this.db, sql);
        return new Statement(stmt);
      } catch (err) {
        throw convertError(err);
      }
    }
    transaction(fn) {
      if (typeof fn !== "function")
        throw new TypeError("Expected first argument to be a function");
      const db = this;
      const wrapTxn = (mode) => {
        return (...bindParameters) => {
          db.exec("BEGIN " + mode);
          try {
            const result = fn(...bindParameters);
            db.exec("COMMIT");
            return result;
          } catch (err) {
            db.exec("ROLLBACK");
            throw err;
          }
        };
      };
      const properties = {
        default: { value: wrapTxn("") },
        deferred: { value: wrapTxn("DEFERRED") },
        immediate: { value: wrapTxn("IMMEDIATE") },
        exclusive: { value: wrapTxn("EXCLUSIVE") },
        database: { value: this, enumerable: true }
      };
      Object.defineProperties(properties.default.value, properties);
      Object.defineProperties(properties.deferred.value, properties);
      Object.defineProperties(properties.immediate.value, properties);
      Object.defineProperties(properties.exclusive.value, properties);
      return properties.default.value;
    }
    pragma(source, options) {
      if (options == null)
        options = {};
      if (typeof source !== "string")
        throw new TypeError("Expected first argument to be a string");
      if (typeof options !== "object")
        throw new TypeError("Expected second argument to be an options object");
      const simple = options["simple"];
      const stmt = this.prepare(`PRAGMA ${source}`, this, true);
      return simple ? stmt.pluck().get() : stmt.all();
    }
    backup(filename, options) {
      throw new Error("not implemented");
    }
    serialize(options) {
      throw new Error("not implemented");
    }
    function(name, options, fn) {
      if (options == null)
        options = {};
      if (typeof options === "function") {
        fn = options;
        options = {};
      }
      if (typeof name !== "string")
        throw new TypeError("Expected first argument to be a string");
      if (typeof fn !== "function")
        throw new TypeError("Expected last argument to be a function");
      if (typeof options !== "object")
        throw new TypeError("Expected second argument to be an options object");
      if (!name)
        throw new TypeError("User-defined function name cannot be an empty string");
      throw new Error("not implemented");
    }
    aggregate(name, options) {
      if (typeof name !== "string")
        throw new TypeError("Expected first argument to be a string");
      if (typeof options !== "object" || options === null)
        throw new TypeError("Expected second argument to be an options object");
      if (!name)
        throw new TypeError("User-defined function name cannot be an empty string");
      throw new Error("not implemented");
    }
    table(name, factory) {
      if (typeof name !== "string")
        throw new TypeError("Expected first argument to be a string");
      if (!name)
        throw new TypeError("Virtual table module name cannot be an empty string");
      throw new Error("not implemented");
    }
    authorizer(rules) {
      databaseAuthorizer.call(this.db, rules);
    }
    loadExtension(...args) {
      databaseLoadExtension.call(this.db, ...args);
    }
    maxWriteReplicationIndex() {
      return databaseMaxWriteReplicationIndex.call(this.db);
    }
    exec(sql) {
      try {
        databaseExecSync.call(this.db, sql);
      } catch (err) {
        throw convertError(err);
      }
    }
    interrupt() {
      databaseInterrupt.call(this.db);
    }
    close() {
      databaseClose.call(this.db);
      this.open = false;
    }
    defaultSafeIntegers(toggle) {
      databaseDefaultSafeIntegers.call(this.db, toggle ?? true);
      return this;
    }
    unsafeMode(...args) {
      throw new Error("not implemented");
    }
  }

  class Statement {
    constructor(stmt) {
      this.stmt = stmt;
      this.pluckMode = false;
    }
    raw(raw) {
      statementRaw.call(this.stmt, raw ?? true);
      return this;
    }
    pluck(pluckMode) {
      this.pluckMode = pluckMode ?? true;
      return this;
    }
    get reader() {
      return statementIsReader.call(this.stmt);
    }
    run(...bindParameters) {
      try {
        if (bindParameters.length == 1 && typeof bindParameters[0] === "object") {
          return statementRun.call(this.stmt, bindParameters[0]);
        } else {
          return statementRun.call(this.stmt, bindParameters.flat());
        }
      } catch (err) {
        throw convertError(err);
      }
    }
    get(...bindParameters) {
      try {
        if (bindParameters.length == 1 && typeof bindParameters[0] === "object") {
          return statementGet.call(this.stmt, bindParameters[0]);
        } else {
          return statementGet.call(this.stmt, bindParameters.flat());
        }
      } catch (err) {
        throw convertError(err);
      }
    }
    iterate(...bindParameters) {
      var rows = undefined;
      if (bindParameters.length == 1 && typeof bindParameters[0] === "object") {
        rows = statementRowsSync.call(this.stmt, bindParameters[0]);
      } else {
        rows = statementRowsSync.call(this.stmt, bindParameters.flat());
      }
      const iter = {
        nextRows: Array(100),
        nextRowIndex: 100,
        next() {
          try {
            if (this.nextRowIndex === 100) {
              rowsNext.call(rows, this.nextRows);
              this.nextRowIndex = 0;
            }
            const row = this.nextRows[this.nextRowIndex];
            this.nextRows[this.nextRowIndex] = undefined;
            if (!row) {
              return { done: true };
            }
            this.nextRowIndex++;
            return { value: row, done: false };
          } catch (err) {
            throw convertError(err);
          }
        },
        [Symbol.iterator]() {
          return this;
        }
      };
      return iter;
    }
    all(...bindParameters) {
      try {
        const result = [];
        for (const row of this.iterate(...bindParameters)) {
          if (this.pluckMode) {
            result.push(row[Object.keys(row)[0]]);
          } else {
            result.push(row);
          }
        }
        return result;
      } catch (err) {
        throw convertError(err);
      }
    }
    interrupt() {
      statementInterrupt.call(this.stmt);
    }
    columns() {
      return statementColumns.call(this.stmt);
    }
    safeIntegers(toggle) {
      statementSafeIntegers.call(this.stmt, toggle ?? true);
      return this;
    }
  }
  module.exports = Database;
  module.exports.Authorization = Authorization;
  module.exports.SqliteError = SqliteError;
});

// node_modules/.bun/@libsql+client@0.15.15/node_modules/@libsql/client/lib-esm/sqlite3.js
import { Buffer as Buffer2 } from "node:buffer";
function _createClient(config) {
  if (config.scheme !== "file") {
    throw new LibsqlError(`URL scheme ${JSON.stringify(config.scheme + ":")} is not supported by the local sqlite3 client. ` + `For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
  }
  const authority = config.authority;
  if (authority !== undefined) {
    const host = authority.host.toLowerCase();
    if (host !== "" && host !== "localhost") {
      throw new LibsqlError(`Invalid host in file URL: ${JSON.stringify(authority.host)}. ` + 'A "file:" URL with an absolute path should start with one slash ("file:/absolute/path.db") ' + 'or with three slashes ("file:///absolute/path.db"). ' + `For more information, please read ${supportedUrlLink}`, "URL_INVALID");
    }
    if (authority.port !== undefined) {
      throw new LibsqlError("File URL cannot have a port", "URL_INVALID");
    }
    if (authority.userinfo !== undefined) {
      throw new LibsqlError("File URL cannot have username and password", "URL_INVALID");
    }
  }
  let isInMemory = isInMemoryConfig(config);
  if (isInMemory && config.syncUrl) {
    throw new LibsqlError(`Embedded replica must use file for local db but URI with in-memory mode were provided instead: ${config.path}`, "URL_INVALID");
  }
  let path = config.path;
  if (isInMemory) {
    path = `${config.scheme}:${config.path}`;
  }
  const options = {
    authToken: config.authToken,
    encryptionKey: config.encryptionKey,
    syncUrl: config.syncUrl,
    syncPeriod: config.syncInterval,
    readYourWrites: config.readYourWrites,
    offline: config.offline
  };
  const db = new import_libsql.default(path, options);
  executeStmt(db, "SELECT 1 AS checkThatTheDatabaseCanBeOpened", config.intMode);
  return new Sqlite3Client(path, options, db, config.intMode);
}

class Sqlite3Client {
  #path;
  #options;
  #db;
  #intMode;
  closed;
  protocol;
  constructor(path, options, db, intMode) {
    this.#path = path;
    this.#options = options;
    this.#db = db;
    this.#intMode = intMode;
    this.closed = false;
    this.protocol = "file";
  }
  async execute(stmtOrSql, args) {
    let stmt;
    if (typeof stmtOrSql === "string") {
      stmt = {
        sql: stmtOrSql,
        args: args || []
      };
    } else {
      stmt = stmtOrSql;
    }
    this.#checkNotClosed();
    return executeStmt(this.#getDb(), stmt, this.#intMode);
  }
  async batch(stmts, mode = "deferred") {
    this.#checkNotClosed();
    const db = this.#getDb();
    try {
      executeStmt(db, transactionModeToBegin(mode), this.#intMode);
      const resultSets = stmts.map((stmt) => {
        if (!db.inTransaction) {
          throw new LibsqlError("The transaction has been rolled back", "TRANSACTION_CLOSED");
        }
        const normalizedStmt = Array.isArray(stmt) ? { sql: stmt[0], args: stmt[1] || [] } : stmt;
        return executeStmt(db, normalizedStmt, this.#intMode);
      });
      executeStmt(db, "COMMIT", this.#intMode);
      return resultSets;
    } finally {
      if (db.inTransaction) {
        executeStmt(db, "ROLLBACK", this.#intMode);
      }
    }
  }
  async migrate(stmts) {
    this.#checkNotClosed();
    const db = this.#getDb();
    try {
      executeStmt(db, "PRAGMA foreign_keys=off", this.#intMode);
      executeStmt(db, transactionModeToBegin("deferred"), this.#intMode);
      const resultSets = stmts.map((stmt) => {
        if (!db.inTransaction) {
          throw new LibsqlError("The transaction has been rolled back", "TRANSACTION_CLOSED");
        }
        return executeStmt(db, stmt, this.#intMode);
      });
      executeStmt(db, "COMMIT", this.#intMode);
      return resultSets;
    } finally {
      if (db.inTransaction) {
        executeStmt(db, "ROLLBACK", this.#intMode);
      }
      executeStmt(db, "PRAGMA foreign_keys=on", this.#intMode);
    }
  }
  async transaction(mode = "write") {
    const db = this.#getDb();
    executeStmt(db, transactionModeToBegin(mode), this.#intMode);
    this.#db = null;
    return new Sqlite3Transaction(db, this.#intMode);
  }
  async executeMultiple(sql) {
    this.#checkNotClosed();
    const db = this.#getDb();
    try {
      return executeMultiple(db, sql);
    } finally {
      if (db.inTransaction) {
        executeStmt(db, "ROLLBACK", this.#intMode);
      }
    }
  }
  async sync() {
    this.#checkNotClosed();
    const rep = await this.#getDb().sync();
    return {
      frames_synced: rep.frames_synced,
      frame_no: rep.frame_no
    };
  }
  async reconnect() {
    try {
      if (!this.closed && this.#db !== null) {
        this.#db.close();
      }
    } finally {
      this.#db = new import_libsql.default(this.#path, this.#options);
      this.closed = false;
    }
  }
  close() {
    this.closed = true;
    if (this.#db !== null) {
      this.#db.close();
      this.#db = null;
    }
  }
  #checkNotClosed() {
    if (this.closed) {
      throw new LibsqlError("The client is closed", "CLIENT_CLOSED");
    }
  }
  #getDb() {
    if (this.#db === null) {
      this.#db = new import_libsql.default(this.#path, this.#options);
    }
    return this.#db;
  }
}

class Sqlite3Transaction {
  #database;
  #intMode;
  constructor(database, intMode) {
    this.#database = database;
    this.#intMode = intMode;
  }
  async execute(stmtOrSql, args) {
    let stmt;
    if (typeof stmtOrSql === "string") {
      stmt = {
        sql: stmtOrSql,
        args: args || []
      };
    } else {
      stmt = stmtOrSql;
    }
    this.#checkNotClosed();
    return executeStmt(this.#database, stmt, this.#intMode);
  }
  async batch(stmts) {
    return stmts.map((stmt) => {
      this.#checkNotClosed();
      const normalizedStmt = Array.isArray(stmt) ? { sql: stmt[0], args: stmt[1] || [] } : stmt;
      return executeStmt(this.#database, normalizedStmt, this.#intMode);
    });
  }
  async executeMultiple(sql) {
    this.#checkNotClosed();
    return executeMultiple(this.#database, sql);
  }
  async rollback() {
    if (!this.#database.open) {
      return;
    }
    this.#checkNotClosed();
    executeStmt(this.#database, "ROLLBACK", this.#intMode);
  }
  async commit() {
    this.#checkNotClosed();
    executeStmt(this.#database, "COMMIT", this.#intMode);
  }
  close() {
    if (this.#database.inTransaction) {
      executeStmt(this.#database, "ROLLBACK", this.#intMode);
    }
  }
  get closed() {
    return !this.#database.inTransaction;
  }
  #checkNotClosed() {
    if (this.closed) {
      throw new LibsqlError("The transaction is closed", "TRANSACTION_CLOSED");
    }
  }
}
function executeStmt(db, stmt, intMode) {
  let sql;
  let args;
  if (typeof stmt === "string") {
    sql = stmt;
    args = [];
  } else {
    sql = stmt.sql;
    if (Array.isArray(stmt.args)) {
      args = stmt.args.map((value) => valueToSql(value, intMode));
    } else {
      args = {};
      for (const name in stmt.args) {
        const argName = name[0] === "@" || name[0] === "$" || name[0] === ":" ? name.substring(1) : name;
        args[argName] = valueToSql(stmt.args[name], intMode);
      }
    }
  }
  try {
    const sqlStmt = db.prepare(sql);
    sqlStmt.safeIntegers(true);
    let returnsData = true;
    try {
      sqlStmt.raw(true);
    } catch {
      returnsData = false;
    }
    if (returnsData) {
      const columns = Array.from(sqlStmt.columns().map((col) => col.name));
      const columnTypes = Array.from(sqlStmt.columns().map((col) => col.type ?? ""));
      const rows = sqlStmt.all(args).map((sqlRow) => {
        return rowFromSql(sqlRow, columns, intMode);
      });
      const rowsAffected = 0;
      const lastInsertRowid = undefined;
      return new ResultSetImpl(columns, columnTypes, rows, rowsAffected, lastInsertRowid);
    } else {
      const info = sqlStmt.run(args);
      const rowsAffected = info.changes;
      const lastInsertRowid = BigInt(info.lastInsertRowid);
      return new ResultSetImpl([], [], [], rowsAffected, lastInsertRowid);
    }
  } catch (e) {
    throw mapSqliteError(e);
  }
}
function rowFromSql(sqlRow, columns, intMode) {
  const row = {};
  Object.defineProperty(row, "length", { value: sqlRow.length });
  for (let i = 0;i < sqlRow.length; ++i) {
    const value = valueFromSql(sqlRow[i], intMode);
    Object.defineProperty(row, i, { value });
    const column = columns[i];
    if (!Object.hasOwn(row, column)) {
      Object.defineProperty(row, column, {
        value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
  }
  return row;
}
function valueFromSql(sqlValue, intMode) {
  if (typeof sqlValue === "bigint") {
    if (intMode === "number") {
      if (sqlValue < minSafeBigint || sqlValue > maxSafeBigint) {
        throw new RangeError("Received integer which cannot be safely represented as a JavaScript number");
      }
      return Number(sqlValue);
    } else if (intMode === "bigint") {
      return sqlValue;
    } else if (intMode === "string") {
      return "" + sqlValue;
    } else {
      throw new Error("Invalid value for IntMode");
    }
  } else if (sqlValue instanceof Buffer2) {
    return sqlValue.buffer;
  }
  return sqlValue;
}
function valueToSql(value, intMode) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new RangeError("Only finite numbers (not Infinity or NaN) can be passed as arguments");
    }
    return value;
  } else if (typeof value === "bigint") {
    if (value < minInteger || value > maxInteger) {
      throw new RangeError("bigint is too large to be represented as a 64-bit integer and passed as argument");
    }
    return value;
  } else if (typeof value === "boolean") {
    switch (intMode) {
      case "bigint":
        return value ? 1n : 0n;
      case "string":
        return value ? "1" : "0";
      default:
        return value ? 1 : 0;
    }
  } else if (value instanceof ArrayBuffer) {
    return Buffer2.from(value);
  } else if (value instanceof Date) {
    return value.valueOf();
  } else if (value === undefined) {
    throw new TypeError("undefined cannot be passed as argument to the database");
  } else {
    return value;
  }
}
function executeMultiple(db, sql) {
  try {
    db.exec(sql);
  } catch (e) {
    throw mapSqliteError(e);
  }
}
function mapSqliteError(e) {
  if (e instanceof import_libsql.default.SqliteError) {
    return new LibsqlError(e.message, e.code, e.rawCode, e);
  }
  return e;
}
var import_libsql, minSafeBigint, maxSafeBigint = 9007199254740991n, minInteger, maxInteger = 9223372036854775807n;
var init_sqlite3 = __esm(() => {
  init_api();
  init_config();
  init_util();
  import_libsql = __toESM(require_libsql(), 1);
  init_api();
  minSafeBigint = -9007199254740991n;
  minInteger = -9223372036854775808n;
});

// node_modules/.bun/ws@8.18.3/node_modules/ws/lib/constants.js
var require_constants = __commonJS((exports, module) => {
  var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
  var hasBlob = typeof Blob !== "undefined";
  if (hasBlob)
    BINARY_TYPES.push("blob");
  module.exports = {
    BINARY_TYPES,
    EMPTY_BUFFER: Buffer.alloc(0),
    GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
    hasBlob,
    kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
    kListener: Symbol("kListener"),
    kStatusCode: Symbol("status-code"),
    kWebSocket: Symbol("websocket"),
    NOOP: () => {}
  };
});

// node_modules/.bun/ws@8.18.3/node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS((exports, module) => {
  var { EMPTY_BUFFER } = require_constants();
  var FastBuffer = Buffer[Symbol.species];
  function concat(list, totalLength) {
    if (list.length === 0)
      return EMPTY_BUFFER;
    if (list.length === 1)
      return list[0];
    const target = Buffer.allocUnsafe(totalLength);
    let offset = 0;
    for (let i = 0;i < list.length; i++) {
      const buf = list[i];
      target.set(buf, offset);
      offset += buf.length;
    }
    if (offset < totalLength) {
      return new FastBuffer(target.buffer, target.byteOffset, offset);
    }
    return target;
  }
  function _mask(source, mask, output, offset, length) {
    for (let i = 0;i < length; i++) {
      output[offset + i] = source[i] ^ mask[i & 3];
    }
  }
  function _unmask(buffer, mask) {
    for (let i = 0;i < buffer.length; i++) {
      buffer[i] ^= mask[i & 3];
    }
  }
  function toArrayBuffer(buf) {
    if (buf.length === buf.buffer.byteLength) {
      return buf.buffer;
    }
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
  }
  function toBuffer(data) {
    toBuffer.readOnly = true;
    if (Buffer.isBuffer(data))
      return data;
    let buf;
    if (data instanceof ArrayBuffer) {
      buf = new FastBuffer(data);
    } else if (ArrayBuffer.isView(data)) {
      buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
    } else {
      buf = Buffer.from(data);
      toBuffer.readOnly = false;
    }
    return buf;
  }
  module.exports = {
    concat,
    mask: _mask,
    toArrayBuffer,
    toBuffer,
    unmask: _unmask
  };
  if (!process.env.WS_NO_BUFFER_UTIL) {
    try {
      const bufferUtil = (()=>{throw new Error("Cannot require module "+"bufferutil");})();
      module.exports.mask = function(source, mask, output, offset, length) {
        if (length < 48)
          _mask(source, mask, output, offset, length);
        else
          bufferUtil.mask(source, mask, output, offset, length);
      };
      module.exports.unmask = function(buffer, mask) {
        if (buffer.length < 32)
          _unmask(buffer, mask);
        else
          bufferUtil.unmask(buffer, mask);
      };
    } catch (e) {}
  }
});

// node_modules/.bun/ws@8.18.3/node_modules/ws/lib/limiter.js
var require_limiter = __commonJS((exports, module) => {
  var kDone = Symbol("kDone");
  var kRun = Symbol("kRun");

  class Limiter {
    constructor(concurrency) {
      this[kDone] = () => {
        this.pending--;
        this[kRun]();
      };
      this.concurrency = concurrency || Infinity;
      this.jobs = [];
      this.pending = 0;
    }
    add(job) {
      this.jobs.push(job);
      this[kRun]();
    }
    [kRun]() {
      if (this.pending === this.concurrency)
        return;
      if (this.jobs.length) {
        const job = this.jobs.shift();
        this.pending++;
        job(this[kDone]);
      }
    }
  }
  module.exports = Limiter;
});

// node_modules/.bun/ws@8.18.3/node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS((exports, module) => {
  var zlib = __require("zlib");
  var bufferUtil = require_buffer_util();
  var Limiter = require_limiter();
  var { kStatusCode } = require_constants();
  var FastBuffer = Buffer[Symbol.species];
  var TRAILER = Buffer.from([0, 0, 255, 255]);
  var kPerMessageDeflate = Symbol("permessage-deflate");
  var kTotalLength = Symbol("total-length");
  var kCallback = Symbol("callback");
  var kBuffers = Symbol("buffers");
  var kError = Symbol("error");
  var zlibLimiter;

  class PerMessageDeflate {
    constructor(options, isServer, maxPayload) {
      this._maxPayload = maxPayload | 0;
      this._options = options || {};
      this._threshold = this._options.threshold !== undefined ? this._options.threshold : 1024;
      this._isServer = !!isServer;
      this._deflate = null;
      this._inflate = null;
      this.params = null;
      if (!zlibLimiter) {
        const concurrency = this._options.concurrencyLimit !== undefined ? this._options.concurrencyLimit : 10;
        zlibLimiter = new Limiter(concurrency);
      }
    }
    static get extensionName() {
      return "permessage-deflate";
    }
    offer() {
      const params = {};
      if (this._options.serverNoContextTakeover) {
        params.server_no_context_takeover = true;
      }
      if (this._options.clientNoContextTakeover) {
        params.client_no_context_takeover = true;
      }
      if (this._options.serverMaxWindowBits) {
        params.server_max_window_bits = this._options.serverMaxWindowBits;
      }
      if (this._options.clientMaxWindowBits) {
        params.client_max_window_bits = this._options.clientMaxWindowBits;
      } else if (this._options.clientMaxWindowBits == null) {
        params.client_max_window_bits = true;
      }
      return params;
    }
    accept(configurations) {
      configurations = this.normalizeParams(configurations);
      this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
      return this.params;
    }
    cleanup() {
      if (this._inflate) {
        this._inflate.close();
        this._inflate = null;
      }
      if (this._deflate) {
        const callback = this._deflate[kCallback];
        this._deflate.close();
        this._deflate = null;
        if (callback) {
          callback(new Error("The deflate stream was closed while data was being processed"));
        }
      }
    }
    acceptAsServer(offers) {
      const opts = this._options;
      const accepted = offers.find((params) => {
        if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && !params.client_max_window_bits) {
          return false;
        }
        return true;
      });
      if (!accepted) {
        throw new Error("None of the extension offers can be accepted");
      }
      if (opts.serverNoContextTakeover) {
        accepted.server_no_context_takeover = true;
      }
      if (opts.clientNoContextTakeover) {
        accepted.client_no_context_takeover = true;
      }
      if (typeof opts.serverMaxWindowBits === "number") {
        accepted.server_max_window_bits = opts.serverMaxWindowBits;
      }
      if (typeof opts.clientMaxWindowBits === "number") {
        accepted.client_max_window_bits = opts.clientMaxWindowBits;
      } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
        delete accepted.client_max_window_bits;
      }
      return accepted;
    }
    acceptAsClient(response) {
      const params = response[0];
      if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
        throw new Error('Unexpected parameter "client_no_context_takeover"');
      }
      if (!params.client_max_window_bits) {
        if (typeof this._options.clientMaxWindowBits === "number") {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        }
      } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
        throw new Error('Unexpected or invalid parameter "client_max_window_bits"');
      }
      return params;
    }
    normalizeParams(configurations) {
      configurations.forEach((params) => {
        Object.keys(params).forEach((key) => {
          let value = params[key];
          if (value.length > 1) {
            throw new Error(`Parameter "${key}" must have only a single value`);
          }
          value = value[0];
          if (key === "client_max_window_bits") {
            if (value !== true) {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
              }
              value = num;
            } else if (!this._isServer) {
              throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
            }
          } else if (key === "server_max_window_bits") {
            const num = +value;
            if (!Number.isInteger(num) || num < 8 || num > 15) {
              throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
            }
            value = num;
          } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
            if (value !== true) {
              throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
            }
          } else {
            throw new Error(`Unknown parameter "${key}"`);
          }
          params[key] = value;
        });
      });
      return configurations;
    }
    decompress(data, fin, callback) {
      zlibLimiter.add((done) => {
        this._decompress(data, fin, (err, result) => {
          done();
          callback(err, result);
        });
      });
    }
    compress(data, fin, callback) {
      zlibLimiter.add((done) => {
        this._compress(data, fin, (err, result) => {
          done();
          callback(err, result);
        });
      });
    }
    _decompress(data, fin, callback) {
      const endpoint = this._isServer ? "client" : "server";
      if (!this._inflate) {
        const key = `${endpoint}_max_window_bits`;
        const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
        this._inflate = zlib.createInflateRaw({
          ...this._options.zlibInflateOptions,
          windowBits
        });
        this._inflate[kPerMessageDeflate] = this;
        this._inflate[kTotalLength] = 0;
        this._inflate[kBuffers] = [];
        this._inflate.on("error", inflateOnError);
        this._inflate.on("data", inflateOnData);
      }
      this._inflate[kCallback] = callback;
      this._inflate.write(data);
      if (fin)
        this._inflate.write(TRAILER);
      this._inflate.flush(() => {
        const err = this._inflate[kError];
        if (err) {
          this._inflate.close();
          this._inflate = null;
          callback(err);
          return;
        }
        const data2 = bufferUtil.concat(this._inflate[kBuffers], this._inflate[kTotalLength]);
        if (this._inflate._readableState.endEmitted) {
          this._inflate.close();
          this._inflate = null;
        } else {
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._inflate.reset();
          }
        }
        callback(null, data2);
      });
    }
    _compress(data, fin, callback) {
      const endpoint = this._isServer ? "server" : "client";
      if (!this._deflate) {
        const key = `${endpoint}_max_window_bits`;
        const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
        this._deflate = zlib.createDeflateRaw({
          ...this._options.zlibDeflateOptions,
          windowBits
        });
        this._deflate[kTotalLength] = 0;
        this._deflate[kBuffers] = [];
        this._deflate.on("data", deflateOnData);
      }
      this._deflate[kCallback] = callback;
      this._deflate.write(data);
      this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
        if (!this._deflate) {
          return;
        }
        let data2 = bufferUtil.concat(this._deflate[kBuffers], this._deflate[kTotalLength]);
        if (fin) {
          data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
        }
        this._deflate[kCallback] = null;
        this._deflate[kTotalLength] = 0;
        this._deflate[kBuffers] = [];
        if (fin && this.params[`${endpoint}_no_context_takeover`]) {
          this._deflate.reset();
        }
        callback(null, data2);
      });
    }
  }
  module.exports = PerMessageDeflate;
  function deflateOnData(chunk) {
    this[kBuffers].push(chunk);
    this[kTotalLength] += chunk.length;
  }
  function inflateOnData(chunk) {
    this[kTotalLength] += chunk.length;
    if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
      this[kBuffers].push(chunk);
      return;
    }
    this[kError] = new RangeError("Max payload size exceeded");
    this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
    this[kError][kStatusCode] = 1009;
    this.removeListener("data", inflateOnData);
    this.reset();
  }
  function inflateOnError(err) {
    this[kPerMessageDeflate]._inflate = null;
    if (this[kError]) {
      this[kCallback](this[kError]);
      return;
    }
    err[kStatusCode] = 1007;
    this[kCallback](err);
  }
});

// node_modules/.bun/ws@8.18.3/node_modules/ws/lib/validation.js
var require_validation = __commonJS((exports, module) => {
  var { isUtf8 } = __require("buffer");
  var { hasBlob } = require_constants();
  var tokenChars = [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    1,
    1,
    0,
    1,
    1,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    1,
    0,
    1,
    0
  ];
  function isValidStatusCode(code) {
    return code >= 1000 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3000 && code <= 4999;
  }
  function _isValidUTF8(buf) {
    const len = buf.length;
    let i = 0;
    while (i < len) {
      if ((buf[i] & 128) === 0) {
        i++;
      } else if ((buf[i] & 224) === 192) {
        if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
          return false;
        }
        i += 2;
      } else if ((buf[i] & 240) === 224) {
        if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || buf[i] === 237 && (buf[i + 1] & 224) === 160) {
          return false;
        }
        i += 3;
      } else if ((buf[i] & 248) === 240) {
        if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
          return false;
        }
        i += 4;
      } else {
        return false;
      }
    }
    return true;
  }
  function isBlob(value) {
    return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
  }
  module.exports = {
    isBlob,
    isValidStatusCode,
    isValidUTF8: _isValidUTF8,
    tokenChars
  };
  if (isUtf8) {
    module.exports.isValidUTF8 = function(buf) {
      return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
    };
  } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
    try {
      const isValidUTF8 = (()=>{throw new Error("Cannot require module "+"utf-8-validate");})();
      module.exports.isValidUTF8 = function(buf) {
        return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
      };
    } catch (e) {}
  }
});

// node_modules/.bun/ws@8.18.3/node_modules/ws/lib/receiver.js
var require_receiver = __commonJS((exports, module) => {
  var { Writable } = __require("stream");
  var PerMessageDeflate = require_permessage_deflate();
  var {
    BINARY_TYPES,
    EMPTY_BUFFER,
    kStatusCode,
    kWebSocket
  } = require_constants();
  var { concat, toArrayBuffer, unmask } = require_buffer_util();
  var { isValidStatusCode, isValidUTF8 } = require_validation();
  var FastBuffer = Buffer[Symbol.species];
  var GET_INFO = 0;
  var GET_PAYLOAD_LENGTH_16 = 1;
  var GET_PAYLOAD_LENGTH_64 = 2;
  var GET_MASK = 3;
  var GET_DATA = 4;
  var INFLATING = 5;
  var DEFER_EVENT = 6;

  class Receiver extends Writable {
    constructor(options = {}) {
      super();
      this._allowSynchronousEvents = options.allowSynchronousEvents !== undefined ? options.allowSynchronousEvents : true;
      this._binaryType = options.binaryType || BINARY_TYPES[0];
      this._extensions = options.extensions || {};
      this._isServer = !!options.isServer;
      this._maxPayload = options.maxPayload | 0;
      this._skipUTF8Validation = !!options.skipUTF8Validation;
      this[kWebSocket] = undefined;
      this._bufferedBytes = 0;
      this._buffers = [];
      this._compressed = false;
      this._payloadLength = 0;
      this._mask = undefined;
      this._fragmented = 0;
      this._masked = false;
      this._fin = false;
      this._opcode = 0;
      this._totalPayloadLength = 0;
      this._messageLength = 0;
      this._fragments = [];
      this._errored = false;
      this._loop = false;
      this._state = GET_INFO;
    }
    _write(chunk, encoding, cb) {
      if (this._opcode === 8 && this._state == GET_INFO)
        return cb();
      this._bufferedBytes += chunk.length;
      this._buffers.push(chunk);
      this.startLoop(cb);
    }
    consume(n) {
      this._bufferedBytes -= n;
      if (n === this._buffers[0].length)
        return this._buffers.shift();
      if (n < this._buffers[0].length) {
        const buf = this._buffers[0];
        this._buffers[0] = new FastBuffer(buf.buffer, buf.byteOffset + n, buf.length - n);
        return new FastBuffer(buf.buffer, buf.byteOffset, n);
      }
      const dst = Buffer.allocUnsafe(n);
      do {
        const buf = this._buffers[0];
        const offset = dst.length - n;
        if (n >= buf.length) {
          dst.set(this._buffers.shift(), offset);
        } else {
          dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
          this._buffers[0] = new FastBuffer(buf.buffer, buf.byteOffset + n, buf.length - n);
        }
        n -= buf.length;
      } while (n > 0);
      return dst;
    }
    startLoop(cb) {
      this._loop = true;
      do {
        switch (this._state) {
          case GET_INFO:
            this.getInfo(cb);
            break;
          case GET_PAYLOAD_LENGTH_16:
            this.getPayloadLength16(cb);
            break;
          case GET_PAYLOAD_LENGTH_64:
            this.getPayloadLength64(cb);
            break;
          case GET_MASK:
            this.getMask();
            break;
          case GET_DATA:
            this.getData(cb);
            break;
          case INFLATING:
          case DEFER_EVENT:
            this._loop = false;
            return;
        }
      } while (this._loop);
      if (!this._errored)
        cb();
    }
    getInfo(cb) {
      if (this._bufferedBytes < 2) {
        this._loop = false;
        return;
      }
      const buf = this.consume(2);
      if ((buf[0] & 48) !== 0) {
        const error = this.createError(RangeError, "RSV2 and RSV3 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_2_3");
        cb(error);
        return;
      }
      const compressed = (buf[0] & 64) === 64;
      if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
        const error = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
        cb(error);
        return;
      }
      this._fin = (buf[0] & 128) === 128;
      this._opcode = buf[0] & 15;
      this._payloadLength = buf[1] & 127;
      if (this._opcode === 0) {
        if (compressed) {
          const error = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
          cb(error);
          return;
        }
        if (!this._fragmented) {
          const error = this.createError(RangeError, "invalid opcode 0", true, 1002, "WS_ERR_INVALID_OPCODE");
          cb(error);
          return;
        }
        this._opcode = this._fragmented;
      } else if (this._opcode === 1 || this._opcode === 2) {
        if (this._fragmented) {
          const error = this.createError(RangeError, `invalid opcode ${this._opcode}`, true, 1002, "WS_ERR_INVALID_OPCODE");
          cb(error);
          return;
        }
        this._compressed = compressed;
      } else if (this._opcode > 7 && this._opcode < 11) {
        if (!this._fin) {
          const error = this.createError(RangeError, "FIN must be set", true, 1002, "WS_ERR_EXPECTED_FIN");
          cb(error);
          return;
        }
        if (compressed) {
          const error = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
          cb(error);
          return;
        }
        if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
          const error = this.createError(RangeError, `invalid payload length ${this._payloadLength}`, true, 1002, "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH");
          cb(error);
          return;
        }
      } else {
        const error = this.createError(RangeError, `invalid opcode ${this._opcode}`, true, 1002, "WS_ERR_INVALID_OPCODE");
        cb(error);
        return;
      }
      if (!this._fin && !this._fragmented)
        this._fragmented = this._opcode;
      this._masked = (buf[1] & 128) === 128;
      if (this._isServer) {
        if (!this._masked) {
          const error = this.createError(RangeError, "MASK must be set", true, 1002, "WS_ERR_EXPECTED_MASK");
          cb(error);
          return;
        }
      } else if (this._masked) {
        const error = this.createError(RangeError, "MASK must be clear", true, 1002, "WS_ERR_UNEXPECTED_MASK");
        cb(error);
        return;
      }
      if (this._payloadLength === 126)
        this._state = GET_PAYLOAD_LENGTH_16;
      else if (this._payloadLength === 127)
        this._state = GET_PAYLOAD_LENGTH_64;
      else
        this.haveLength(cb);
    }
    getPayloadLength16(cb) {
      if (this._bufferedBytes < 2) {
        this._loop = false;
        return;
      }
      this._payloadLength = this.consume(2).readUInt16BE(0);
      this.haveLength(cb);
    }
    getPayloadLength64(cb) {
      if (this._bufferedBytes < 8) {
        this._loop = false;
        return;
      }
      const buf = this.consume(8);
      const num = buf.readUInt32BE(0);
      if (num > Math.pow(2, 53 - 32) - 1) {
        const error = this.createError(RangeError, "Unsupported WebSocket frame: payload length > 2^53 - 1", false, 1009, "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH");
        cb(error);
        return;
      }
      this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
      this.haveLength(cb);
    }
    haveLength(cb) {
      if (this._payloadLength && this._opcode < 8) {
        this._totalPayloadLength += this._payloadLength;
        if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
          const error = this.createError(RangeError, "Max payload size exceeded", false, 1009, "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");
          cb(error);
          return;
        }
      }
      if (this._masked)
        this._state = GET_MASK;
      else
        this._state = GET_DATA;
    }
    getMask() {
      if (this._bufferedBytes < 4) {
        this._loop = false;
        return;
      }
      this._mask = this.consume(4);
      this._state = GET_DATA;
    }
    getData(cb) {
      let data = EMPTY_BUFFER;
      if (this._payloadLength) {
        if (this._bufferedBytes < this._payloadLength) {
          this._loop = false;
          return;
        }
        data = this.consume(this._payloadLength);
        if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
          unmask(data, this._mask);
        }
      }
      if (this._opcode > 7) {
        this.controlMessage(data, cb);
        return;
      }
      if (this._compressed) {
        this._state = INFLATING;
        this.decompress(data, cb);
        return;
      }
      if (data.length) {
        this._messageLength = this._totalPayloadLength;
        this._fragments.push(data);
      }
      this.dataMessage(cb);
    }
    decompress(data, cb) {
      const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
      perMessageDeflate.decompress(data, this._fin, (err, buf) => {
        if (err)
          return cb(err);
        if (buf.length) {
          this._messageLength += buf.length;
          if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(RangeError, "Max payload size exceeded", false, 1009, "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");
            cb(error);
            return;
          }
          this._fragments.push(buf);
        }
        this.dataMessage(cb);
        if (this._state === GET_INFO)
          this.startLoop(cb);
      });
    }
    dataMessage(cb) {
      if (!this._fin) {
        this._state = GET_INFO;
        return;
      }
      const messageLength = this._messageLength;
      const fragments = this._fragments;
      this._totalPayloadLength = 0;
      this._messageLength = 0;
      this._fragmented = 0;
      this._fragments = [];
      if (this._opcode === 2) {
        let data;
        if (this._binaryType === "nodebuffer") {
          data = concat(fragments, messageLength);
        } else if (this._binaryType === "arraybuffer") {
          data = toArrayBuffer(concat(fragments, messageLength));
        } else if (this._binaryType === "blob") {
          data = new Blob(fragments);
        } else {
          data = fragments;
        }
        if (this._allowSynchronousEvents) {
          this.emit("message", data, true);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit("message", data, true);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      } else {
        const buf = concat(fragments, messageLength);
        if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
          const error = this.createError(Error, "invalid UTF-8 sequence", true, 1007, "WS_ERR_INVALID_UTF8");
          cb(error);
          return;
        }
        if (this._state === INFLATING || this._allowSynchronousEvents) {
          this.emit("message", buf, false);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit("message", buf, false);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
    }
    controlMessage(data, cb) {
      if (this._opcode === 8) {
        if (data.length === 0) {
          this._loop = false;
          this.emit("conclude", 1005, EMPTY_BUFFER);
          this.end();
        } else {
          const code = data.readUInt16BE(0);
          if (!isValidStatusCode(code)) {
            const error = this.createError(RangeError, `invalid status code ${code}`, true, 1002, "WS_ERR_INVALID_CLOSE_CODE");
            cb(error);
            return;
          }
          const buf = new FastBuffer(data.buffer, data.byteOffset + 2, data.length - 2);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(Error, "invalid UTF-8 sequence", true, 1007, "WS_ERR_INVALID_UTF8");
            cb(error);
            return;
          }
          this._loop = false;
          this.emit("conclude", code, buf);
          this.end();
        }
        this._state = GET_INFO;
        return;
      }
      if (this._allowSynchronousEvents) {
        this.emit(this._opcode === 9 ? "ping" : "pong", data);
        this._state = GET_INFO;
      } else {
        this._state = DEFER_EVENT;
        setImmediate(() => {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
          this.startLoop(cb);
        });
      }
    }
    createError(ErrorCtor, message, prefix, statusCode, errorCode) {
      this._loop = false;
      this._errored = true;
      const err = new ErrorCtor(prefix ? `Invalid WebSocket frame: ${message}` : message);
      Error.captureStackTrace(err, this.createError);
      err.code = errorCode;
      err[kStatusCode] = statusCode;
      return err;
    }
  }
  module.exports = Receiver;
});

// node_modules/.bun/ws@8.18.3/node_modules/ws/lib/sender.js
var require_sender = __commonJS((exports, module) => {
  var { Duplex } = __require("stream");
  var { randomFillSync } = __require("crypto");
  var PerMessageDeflate = require_permessage_deflate();
  var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
  var { isBlob, isValidStatusCode } = require_validation();
  var { mask: applyMask, toBuffer } = require_buffer_util();
  var kByteLength = Symbol("kByteLength");
  var maskBuffer = Buffer.alloc(4);
  var RANDOM_POOL_SIZE = 8 * 1024;
  var randomPool;
  var randomPoolPointer = RANDOM_POOL_SIZE;
  var DEFAULT = 0;
  var DEFLATING = 1;
  var GET_BLOB_DATA = 2;

  class Sender {
    constructor(socket, extensions, generateMask) {
      this._extensions = extensions || {};
      if (generateMask) {
        this._generateMask = generateMask;
        this._maskBuffer = Buffer.alloc(4);
      }
      this._socket = socket;
      this._firstFragment = true;
      this._compress = false;
      this._bufferedBytes = 0;
      this._queue = [];
      this._state = DEFAULT;
      this.onerror = NOOP;
      this[kWebSocket] = undefined;
    }
    static frame(data, options) {
      let mask;
      let merge = false;
      let offset = 2;
      let skipMasking = false;
      if (options.mask) {
        mask = options.maskBuffer || maskBuffer;
        if (options.generateMask) {
          options.generateMask(mask);
        } else {
          if (randomPoolPointer === RANDOM_POOL_SIZE) {
            if (randomPool === undefined) {
              randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
            }
            randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
            randomPoolPointer = 0;
          }
          mask[0] = randomPool[randomPoolPointer++];
          mask[1] = randomPool[randomPoolPointer++];
          mask[2] = randomPool[randomPoolPointer++];
          mask[3] = randomPool[randomPoolPointer++];
        }
        skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
        offset = 6;
      }
      let dataLength;
      if (typeof data === "string") {
        if ((!options.mask || skipMasking) && options[kByteLength] !== undefined) {
          dataLength = options[kByteLength];
        } else {
          data = Buffer.from(data);
          dataLength = data.length;
        }
      } else {
        dataLength = data.length;
        merge = options.mask && options.readOnly && !skipMasking;
      }
      let payloadLength = dataLength;
      if (dataLength >= 65536) {
        offset += 8;
        payloadLength = 127;
      } else if (dataLength > 125) {
        offset += 2;
        payloadLength = 126;
      }
      const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
      target[0] = options.fin ? options.opcode | 128 : options.opcode;
      if (options.rsv1)
        target[0] |= 64;
      target[1] = payloadLength;
      if (payloadLength === 126) {
        target.writeUInt16BE(dataLength, 2);
      } else if (payloadLength === 127) {
        target[2] = target[3] = 0;
        target.writeUIntBE(dataLength, 4, 6);
      }
      if (!options.mask)
        return [target, data];
      target[1] |= 128;
      target[offset - 4] = mask[0];
      target[offset - 3] = mask[1];
      target[offset - 2] = mask[2];
      target[offset - 1] = mask[3];
      if (skipMasking)
        return [target, data];
      if (merge) {
        applyMask(data, mask, target, offset, dataLength);
        return [target];
      }
      applyMask(data, mask, data, 0, dataLength);
      return [target, data];
    }
    close(code, data, mask, cb) {
      let buf;
      if (code === undefined) {
        buf = EMPTY_BUFFER;
      } else if (typeof code !== "number" || !isValidStatusCode(code)) {
        throw new TypeError("First argument must be a valid error code number");
      } else if (data === undefined || !data.length) {
        buf = Buffer.allocUnsafe(2);
        buf.writeUInt16BE(code, 0);
      } else {
        const length = Buffer.byteLength(data);
        if (length > 123) {
          throw new RangeError("The message must not be greater than 123 bytes");
        }
        buf = Buffer.allocUnsafe(2 + length);
        buf.writeUInt16BE(code, 0);
        if (typeof data === "string") {
          buf.write(data, 2);
        } else {
          buf.set(data, 2);
        }
      }
      const options = {
        [kByteLength]: buf.length,
        fin: true,
        generateMask: this._generateMask,
        mask,
        maskBuffer: this._maskBuffer,
        opcode: 8,
        readOnly: false,
        rsv1: false
      };
      if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, buf, false, options, cb]);
      } else {
        this.sendFrame(Sender.frame(buf, options), cb);
      }
    }
    ping(data, mask, cb) {
      let byteLength;
      let readOnly;
      if (typeof data === "string") {
        byteLength = Buffer.byteLength(data);
        readOnly = false;
      } else if (isBlob(data)) {
        byteLength = data.size;
        readOnly = false;
      } else {
        data = toBuffer(data);
        byteLength = data.length;
        readOnly = toBuffer.readOnly;
      }
      if (byteLength > 125) {
        throw new RangeError("The data size must not be greater than 125 bytes");
      }
      const options = {
        [kByteLength]: byteLength,
        fin: true,
        generateMask: this._generateMask,
        mask,
        maskBuffer: this._maskBuffer,
        opcode: 9,
        readOnly,
        rsv1: false
      };
      if (isBlob(data)) {
        if (this._state !== DEFAULT) {
          this.enqueue([this.getBlobData, data, false, options, cb]);
        } else {
          this.getBlobData(data, false, options, cb);
        }
      } else if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, data, false, options, cb]);
      } else {
        this.sendFrame(Sender.frame(data, options), cb);
      }
    }
    pong(data, mask, cb) {
      let byteLength;
      let readOnly;
      if (typeof data === "string") {
        byteLength = Buffer.byteLength(data);
        readOnly = false;
      } else if (isBlob(data)) {
        byteLength = data.size;
        readOnly = false;
      } else {
        data = toBuffer(data);
        byteLength = data.length;
        readOnly = toBuffer.readOnly;
      }
      if (byteLength > 125) {
        throw new RangeError("The data size must not be greater than 125 bytes");
      }
      const options = {
        [kByteLength]: byteLength,
        fin: true,
        generateMask: this._generateMask,
        mask,
        maskBuffer: this._maskBuffer,
        opcode: 10,
        readOnly,
        rsv1: false
      };
      if (isBlob(data)) {
        if (this._state !== DEFAULT) {
          this.enqueue([this.getBlobData, data, false, options, cb]);
        } else {
          this.getBlobData(data, false, options, cb);
        }
      } else if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, data, false, options, cb]);
      } else {
        this.sendFrame(Sender.frame(data, options), cb);
      }
    }
    send(data, options, cb) {
      const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
      let opcode = options.binary ? 2 : 1;
      let rsv1 = options.compress;
      let byteLength;
      let readOnly;
      if (typeof data === "string") {
        byteLength = Buffer.byteLength(data);
        readOnly = false;
      } else if (isBlob(data)) {
        byteLength = data.size;
        readOnly = false;
      } else {
        data = toBuffer(data);
        byteLength = data.length;
        readOnly = toBuffer.readOnly;
      }
      if (this._firstFragment) {
        this._firstFragment = false;
        if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
          rsv1 = byteLength >= perMessageDeflate._threshold;
        }
        this._compress = rsv1;
      } else {
        rsv1 = false;
        opcode = 0;
      }
      if (options.fin)
        this._firstFragment = true;
      const opts = {
        [kByteLength]: byteLength,
        fin: options.fin,
        generateMask: this._generateMask,
        mask: options.mask,
        maskBuffer: this._maskBuffer,
        opcode,
        readOnly,
        rsv1
      };
      if (isBlob(data)) {
        if (this._state !== DEFAULT) {
          this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
        } else {
          this.getBlobData(data, this._compress, opts, cb);
        }
      } else if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, data, this._compress, opts, cb]);
      } else {
        this.dispatch(data, this._compress, opts, cb);
      }
    }
    getBlobData(blob, compress, options, cb) {
      this._bufferedBytes += options[kByteLength];
      this._state = GET_BLOB_DATA;
      blob.arrayBuffer().then((arrayBuffer) => {
        if (this._socket.destroyed) {
          const err = new Error("The socket was closed while the blob was being read");
          process.nextTick(callCallbacks, this, err, cb);
          return;
        }
        this._bufferedBytes -= options[kByteLength];
        const data = toBuffer(arrayBuffer);
        if (!compress) {
          this._state = DEFAULT;
          this.sendFrame(Sender.frame(data, options), cb);
          this.dequeue();
        } else {
          this.dispatch(data, compress, options, cb);
        }
      }).catch((err) => {
        process.nextTick(onError, this, err, cb);
      });
    }
    dispatch(data, compress, options, cb) {
      if (!compress) {
        this.sendFrame(Sender.frame(data, options), cb);
        return;
      }
      const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
      this._bufferedBytes += options[kByteLength];
      this._state = DEFLATING;
      perMessageDeflate.compress(data, options.fin, (_, buf) => {
        if (this._socket.destroyed) {
          const err = new Error("The socket was closed while data was being compressed");
          callCallbacks(this, err, cb);
          return;
        }
        this._bufferedBytes -= options[kByteLength];
        this._state = DEFAULT;
        options.readOnly = false;
        this.sendFrame(Sender.frame(buf, options), cb);
        this.dequeue();
      });
    }
    dequeue() {
      while (this._state === DEFAULT && this._queue.length) {
        const params = this._queue.shift();
        this._bufferedBytes -= params[3][kByteLength];
        Reflect.apply(params[0], this, params.slice(1));
      }
    }
    enqueue(params) {
      this._bufferedBytes += params[3][kByteLength];
      this._queue.push(params);
    }
    sendFrame(list, cb) {
      if (list.length === 2) {
        this._socket.cork();
        this._socket.write(list[0]);
        this._socket.write(list[1], cb);
        this._socket.uncork();
      } else {
        this._socket.write(list[0], cb);
      }
    }
  }
  module.exports = Sender;
  function callCallbacks(sender, err, cb) {
    if (typeof cb === "function")
      cb(err);
    for (let i = 0;i < sender._queue.length; i++) {
      const params = sender._queue[i];
      const callback = params[params.length - 1];
      if (typeof callback === "function")
        callback(err);
    }
  }
  function onError(sender, err, cb) {
    callCallbacks(sender, err, cb);
    sender.onerror(err);
  }
});

// node_modules/.bun/ws@8.18.3/node_modules/ws/lib/event-target.js
var require_event_target = __commonJS((exports, module) => {
  var { kForOnEventAttribute, kListener } = require_constants();
  var kCode = Symbol("kCode");
  var kData = Symbol("kData");
  var kError = Symbol("kError");
  var kMessage = Symbol("kMessage");
  var kReason = Symbol("kReason");
  var kTarget = Symbol("kTarget");
  var kType = Symbol("kType");
  var kWasClean = Symbol("kWasClean");

  class Event {
    constructor(type) {
      this[kTarget] = null;
      this[kType] = type;
    }
    get target() {
      return this[kTarget];
    }
    get type() {
      return this[kType];
    }
  }
  Object.defineProperty(Event.prototype, "target", { enumerable: true });
  Object.defineProperty(Event.prototype, "type", { enumerable: true });

  class CloseEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this[kCode] = options.code === undefined ? 0 : options.code;
      this[kReason] = options.reason === undefined ? "" : options.reason;
      this[kWasClean] = options.wasClean === undefined ? false : options.wasClean;
    }
    get code() {
      return this[kCode];
    }
    get reason() {
      return this[kReason];
    }
    get wasClean() {
      return this[kWasClean];
    }
  }
  Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
  Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
  Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });

  class ErrorEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this[kError] = options.error === undefined ? null : options.error;
      this[kMessage] = options.message === undefined ? "" : options.message;
    }
    get error() {
      return this[kError];
    }
    get message() {
      return this[kMessage];
    }
  }
  Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
  Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });

  class MessageEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this[kData] = options.data === undefined ? null : options.data;
    }
    get data() {
      return this[kData];
    }
  }
  Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
  var EventTarget = {
    addEventListener(type, handler, options = {}) {
      for (const listener of this.listeners(type)) {
        if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
          return;
        }
      }
      let wrapper;
      if (type === "message") {
        wrapper = function onMessage(data, isBinary) {
          const event = new MessageEvent("message", {
            data: isBinary ? data : data.toString()
          });
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else if (type === "close") {
        wrapper = function onClose(code, message) {
          const event = new CloseEvent("close", {
            code,
            reason: message.toString(),
            wasClean: this._closeFrameReceived && this._closeFrameSent
          });
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else if (type === "error") {
        wrapper = function onError(error) {
          const event = new ErrorEvent("error", {
            error,
            message: error.message
          });
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else if (type === "open") {
        wrapper = function onOpen() {
          const event = new Event("open");
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else {
        return;
      }
      wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
      wrapper[kListener] = handler;
      if (options.once) {
        this.once(type, wrapper);
      } else {
        this.on(type, wrapper);
      }
    },
    removeEventListener(type, handler) {
      for (const listener of this.listeners(type)) {
        if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
          this.removeListener(type, listener);
          break;
        }
      }
    }
  };
  module.exports = {
    CloseEvent,
    ErrorEvent,
    Event,
    EventTarget,
    MessageEvent
  };
  function callListener(listener, thisArg, event) {
    if (typeof listener === "object" && listener.handleEvent) {
      listener.handleEvent.call(listener, event);
    } else {
      listener.call(thisArg, event);
    }
  }
});

// node_modules/.bun/ws@8.18.3/node_modules/ws/lib/extension.js
var require_extension = __commonJS((exports, module) => {
  var { tokenChars } = require_validation();
  function push(dest, name, elem) {
    if (dest[name] === undefined)
      dest[name] = [elem];
    else
      dest[name].push(elem);
  }
  function parse(header) {
    const offers = Object.create(null);
    let params = Object.create(null);
    let mustUnescape = false;
    let isEscaping = false;
    let inQuotes = false;
    let extensionName;
    let paramName;
    let start = -1;
    let code = -1;
    let end = -1;
    let i = 0;
    for (;i < header.length; i++) {
      code = header.charCodeAt(i);
      if (extensionName === undefined) {
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1)
            start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1)
            end = i;
        } else if (code === 59 || code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1)
            end = i;
          const name = header.slice(start, end);
          if (code === 44) {
            push(offers, name, params);
            params = Object.create(null);
          } else {
            extensionName = name;
          }
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      } else if (paramName === undefined) {
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1)
            start = i;
        } else if (code === 32 || code === 9) {
          if (end === -1 && start !== -1)
            end = i;
        } else if (code === 59 || code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1)
            end = i;
          push(params, header.slice(start, end), true);
          if (code === 44) {
            push(offers, extensionName, params);
            params = Object.create(null);
            extensionName = undefined;
          }
          start = end = -1;
        } else if (code === 61 && start !== -1 && end === -1) {
          paramName = header.slice(start, i);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      } else {
        if (isEscaping) {
          if (tokenChars[code] !== 1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (start === -1)
            start = i;
          else if (!mustUnescape)
            mustUnescape = true;
          isEscaping = false;
        } else if (inQuotes) {
          if (tokenChars[code] === 1) {
            if (start === -1)
              start = i;
          } else if (code === 34 && start !== -1) {
            inQuotes = false;
            end = i;
          } else if (code === 92) {
            isEscaping = true;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
          inQuotes = true;
        } else if (end === -1 && tokenChars[code] === 1) {
          if (start === -1)
            start = i;
        } else if (start !== -1 && (code === 32 || code === 9)) {
          if (end === -1)
            end = i;
        } else if (code === 59 || code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1)
            end = i;
          let value = header.slice(start, end);
          if (mustUnescape) {
            value = value.replace(/\\/g, "");
            mustUnescape = false;
          }
          push(params, paramName, value);
          if (code === 44) {
            push(offers, extensionName, params);
            params = Object.create(null);
            extensionName = undefined;
          }
          paramName = undefined;
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
    }
    if (start === -1 || inQuotes || code === 32 || code === 9) {
      throw new SyntaxError("Unexpected end of input");
    }
    if (end === -1)
      end = i;
    const token = header.slice(start, end);
    if (extensionName === undefined) {
      push(offers, token, params);
    } else {
      if (paramName === undefined) {
        push(params, token, true);
      } else if (mustUnescape) {
        push(params, paramName, token.replace(/\\/g, ""));
      } else {
        push(params, paramName, token);
      }
      push(offers, extensionName, params);
    }
    return offers;
  }
  function format(extensions) {
    return Object.keys(extensions).map((extension) => {
      let configurations = extensions[extension];
      if (!Array.isArray(configurations))
        configurations = [configurations];
      return configurations.map((params) => {
        return [extension].concat(Object.keys(params).map((k) => {
          let values = params[k];
          if (!Array.isArray(values))
            values = [values];
          return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
        })).join("; ");
      }).join(", ");
    }).join(", ");
  }
  module.exports = { format, parse };
});

// node_modules/.bun/ws@8.18.3/node_modules/ws/lib/websocket.js
var require_websocket = __commonJS((exports, module) => {
  var EventEmitter = __require("events");
  var https = __require("https");
  var http = __require("http");
  var net = __require("net");
  var tls = __require("tls");
  var { randomBytes, createHash } = __require("crypto");
  var { Duplex, Readable } = __require("stream");
  var { URL: URL2 } = __require("url");
  var PerMessageDeflate = require_permessage_deflate();
  var Receiver = require_receiver();
  var Sender = require_sender();
  var { isBlob } = require_validation();
  var {
    BINARY_TYPES,
    EMPTY_BUFFER,
    GUID,
    kForOnEventAttribute,
    kListener,
    kStatusCode,
    kWebSocket,
    NOOP
  } = require_constants();
  var {
    EventTarget: { addEventListener, removeEventListener }
  } = require_event_target();
  var { format, parse } = require_extension();
  var { toBuffer } = require_buffer_util();
  var closeTimeout = 30 * 1000;
  var kAborted = Symbol("kAborted");
  var protocolVersions = [8, 13];
  var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
  var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;

  class WebSocket extends EventEmitter {
    constructor(address, protocols, options) {
      super();
      this._binaryType = BINARY_TYPES[0];
      this._closeCode = 1006;
      this._closeFrameReceived = false;
      this._closeFrameSent = false;
      this._closeMessage = EMPTY_BUFFER;
      this._closeTimer = null;
      this._errorEmitted = false;
      this._extensions = {};
      this._paused = false;
      this._protocol = "";
      this._readyState = WebSocket.CONNECTING;
      this._receiver = null;
      this._sender = null;
      this._socket = null;
      if (address !== null) {
        this._bufferedAmount = 0;
        this._isServer = false;
        this._redirects = 0;
        if (protocols === undefined) {
          protocols = [];
        } else if (!Array.isArray(protocols)) {
          if (typeof protocols === "object" && protocols !== null) {
            options = protocols;
            protocols = [];
          } else {
            protocols = [protocols];
          }
        }
        initAsClient(this, address, protocols, options);
      } else {
        this._autoPong = options.autoPong;
        this._isServer = true;
      }
    }
    get binaryType() {
      return this._binaryType;
    }
    set binaryType(type) {
      if (!BINARY_TYPES.includes(type))
        return;
      this._binaryType = type;
      if (this._receiver)
        this._receiver._binaryType = type;
    }
    get bufferedAmount() {
      if (!this._socket)
        return this._bufferedAmount;
      return this._socket._writableState.length + this._sender._bufferedBytes;
    }
    get extensions() {
      return Object.keys(this._extensions).join();
    }
    get isPaused() {
      return this._paused;
    }
    get onclose() {
      return null;
    }
    get onerror() {
      return null;
    }
    get onopen() {
      return null;
    }
    get onmessage() {
      return null;
    }
    get protocol() {
      return this._protocol;
    }
    get readyState() {
      return this._readyState;
    }
    get url() {
      return this._url;
    }
    setSocket(socket, head, options) {
      const receiver = new Receiver({
        allowSynchronousEvents: options.allowSynchronousEvents,
        binaryType: this.binaryType,
        extensions: this._extensions,
        isServer: this._isServer,
        maxPayload: options.maxPayload,
        skipUTF8Validation: options.skipUTF8Validation
      });
      const sender = new Sender(socket, this._extensions, options.generateMask);
      this._receiver = receiver;
      this._sender = sender;
      this._socket = socket;
      receiver[kWebSocket] = this;
      sender[kWebSocket] = this;
      socket[kWebSocket] = this;
      receiver.on("conclude", receiverOnConclude);
      receiver.on("drain", receiverOnDrain);
      receiver.on("error", receiverOnError);
      receiver.on("message", receiverOnMessage);
      receiver.on("ping", receiverOnPing);
      receiver.on("pong", receiverOnPong);
      sender.onerror = senderOnError;
      if (socket.setTimeout)
        socket.setTimeout(0);
      if (socket.setNoDelay)
        socket.setNoDelay();
      if (head.length > 0)
        socket.unshift(head);
      socket.on("close", socketOnClose);
      socket.on("data", socketOnData);
      socket.on("end", socketOnEnd);
      socket.on("error", socketOnError);
      this._readyState = WebSocket.OPEN;
      this.emit("open");
    }
    emitClose() {
      if (!this._socket) {
        this._readyState = WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
        return;
      }
      if (this._extensions[PerMessageDeflate.extensionName]) {
        this._extensions[PerMessageDeflate.extensionName].cleanup();
      }
      this._receiver.removeAllListeners();
      this._readyState = WebSocket.CLOSED;
      this.emit("close", this._closeCode, this._closeMessage);
    }
    close(code, data) {
      if (this.readyState === WebSocket.CLOSED)
        return;
      if (this.readyState === WebSocket.CONNECTING) {
        const msg = "WebSocket was closed before the connection was established";
        abortHandshake(this, this._req, msg);
        return;
      }
      if (this.readyState === WebSocket.CLOSING) {
        if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
          this._socket.end();
        }
        return;
      }
      this._readyState = WebSocket.CLOSING;
      this._sender.close(code, data, !this._isServer, (err) => {
        if (err)
          return;
        this._closeFrameSent = true;
        if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
          this._socket.end();
        }
      });
      setCloseTimer(this);
    }
    pause() {
      if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.CLOSED) {
        return;
      }
      this._paused = true;
      this._socket.pause();
    }
    ping(data, mask, cb) {
      if (this.readyState === WebSocket.CONNECTING) {
        throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
      }
      if (typeof data === "function") {
        cb = data;
        data = mask = undefined;
      } else if (typeof mask === "function") {
        cb = mask;
        mask = undefined;
      }
      if (typeof data === "number")
        data = data.toString();
      if (this.readyState !== WebSocket.OPEN) {
        sendAfterClose(this, data, cb);
        return;
      }
      if (mask === undefined)
        mask = !this._isServer;
      this._sender.ping(data || EMPTY_BUFFER, mask, cb);
    }
    pong(data, mask, cb) {
      if (this.readyState === WebSocket.CONNECTING) {
        throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
      }
      if (typeof data === "function") {
        cb = data;
        data = mask = undefined;
      } else if (typeof mask === "function") {
        cb = mask;
        mask = undefined;
      }
      if (typeof data === "number")
        data = data.toString();
      if (this.readyState !== WebSocket.OPEN) {
        sendAfterClose(this, data, cb);
        return;
      }
      if (mask === undefined)
        mask = !this._isServer;
      this._sender.pong(data || EMPTY_BUFFER, mask, cb);
    }
    resume() {
      if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.CLOSED) {
        return;
      }
      this._paused = false;
      if (!this._receiver._writableState.needDrain)
        this._socket.resume();
    }
    send(data, options, cb) {
      if (this.readyState === WebSocket.CONNECTING) {
        throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
      }
      if (typeof options === "function") {
        cb = options;
        options = {};
      }
      if (typeof data === "number")
        data = data.toString();
      if (this.readyState !== WebSocket.OPEN) {
        sendAfterClose(this, data, cb);
        return;
      }
      const opts = {
        binary: typeof data !== "string",
        mask: !this._isServer,
        compress: true,
        fin: true,
        ...options
      };
      if (!this._extensions[PerMessageDeflate.extensionName]) {
        opts.compress = false;
      }
      this._sender.send(data || EMPTY_BUFFER, opts, cb);
    }
    terminate() {
      if (this.readyState === WebSocket.CLOSED)
        return;
      if (this.readyState === WebSocket.CONNECTING) {
        const msg = "WebSocket was closed before the connection was established";
        abortHandshake(this, this._req, msg);
        return;
      }
      if (this._socket) {
        this._readyState = WebSocket.CLOSING;
        this._socket.destroy();
      }
    }
  }
  Object.defineProperty(WebSocket, "CONNECTING", {
    enumerable: true,
    value: readyStates.indexOf("CONNECTING")
  });
  Object.defineProperty(WebSocket.prototype, "CONNECTING", {
    enumerable: true,
    value: readyStates.indexOf("CONNECTING")
  });
  Object.defineProperty(WebSocket, "OPEN", {
    enumerable: true,
    value: readyStates.indexOf("OPEN")
  });
  Object.defineProperty(WebSocket.prototype, "OPEN", {
    enumerable: true,
    value: readyStates.indexOf("OPEN")
  });
  Object.defineProperty(WebSocket, "CLOSING", {
    enumerable: true,
    value: readyStates.indexOf("CLOSING")
  });
  Object.defineProperty(WebSocket.prototype, "CLOSING", {
    enumerable: true,
    value: readyStates.indexOf("CLOSING")
  });
  Object.defineProperty(WebSocket, "CLOSED", {
    enumerable: true,
    value: readyStates.indexOf("CLOSED")
  });
  Object.defineProperty(WebSocket.prototype, "CLOSED", {
    enumerable: true,
    value: readyStates.indexOf("CLOSED")
  });
  [
    "binaryType",
    "bufferedAmount",
    "extensions",
    "isPaused",
    "protocol",
    "readyState",
    "url"
  ].forEach((property) => {
    Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
  });
  ["open", "error", "close", "message"].forEach((method) => {
    Object.defineProperty(WebSocket.prototype, `on${method}`, {
      enumerable: true,
      get() {
        for (const listener of this.listeners(method)) {
          if (listener[kForOnEventAttribute])
            return listener[kListener];
        }
        return null;
      },
      set(handler) {
        for (const listener of this.listeners(method)) {
          if (listener[kForOnEventAttribute]) {
            this.removeListener(method, listener);
            break;
          }
        }
        if (typeof handler !== "function")
          return;
        this.addEventListener(method, handler, {
          [kForOnEventAttribute]: true
        });
      }
    });
  });
  WebSocket.prototype.addEventListener = addEventListener;
  WebSocket.prototype.removeEventListener = removeEventListener;
  module.exports = WebSocket;
  function initAsClient(websocket, address, protocols, options) {
    const opts = {
      allowSynchronousEvents: true,
      autoPong: true,
      protocolVersion: protocolVersions[1],
      maxPayload: 100 * 1024 * 1024,
      skipUTF8Validation: false,
      perMessageDeflate: true,
      followRedirects: false,
      maxRedirects: 10,
      ...options,
      socketPath: undefined,
      hostname: undefined,
      protocol: undefined,
      timeout: undefined,
      method: "GET",
      host: undefined,
      path: undefined,
      port: undefined
    };
    websocket._autoPong = opts.autoPong;
    if (!protocolVersions.includes(opts.protocolVersion)) {
      throw new RangeError(`Unsupported protocol version: ${opts.protocolVersion} ` + `(supported versions: ${protocolVersions.join(", ")})`);
    }
    let parsedUrl;
    if (address instanceof URL2) {
      parsedUrl = address;
    } else {
      try {
        parsedUrl = new URL2(address);
      } catch (e) {
        throw new SyntaxError(`Invalid URL: ${address}`);
      }
    }
    if (parsedUrl.protocol === "http:") {
      parsedUrl.protocol = "ws:";
    } else if (parsedUrl.protocol === "https:") {
      parsedUrl.protocol = "wss:";
    }
    websocket._url = parsedUrl.href;
    const isSecure = parsedUrl.protocol === "wss:";
    const isIpcUrl = parsedUrl.protocol === "ws+unix:";
    let invalidUrlMessage;
    if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
      invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", ` + '"http:", "https:", or "ws+unix:"';
    } else if (isIpcUrl && !parsedUrl.pathname) {
      invalidUrlMessage = "The URL's pathname is empty";
    } else if (parsedUrl.hash) {
      invalidUrlMessage = "The URL contains a fragment identifier";
    }
    if (invalidUrlMessage) {
      const err = new SyntaxError(invalidUrlMessage);
      if (websocket._redirects === 0) {
        throw err;
      } else {
        emitErrorAndClose(websocket, err);
        return;
      }
    }
    const defaultPort = isSecure ? 443 : 80;
    const key = randomBytes(16).toString("base64");
    const request = isSecure ? https.request : http.request;
    const protocolSet = new Set;
    let perMessageDeflate;
    opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
    opts.defaultPort = opts.defaultPort || defaultPort;
    opts.port = parsedUrl.port || defaultPort;
    opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
    opts.headers = {
      ...opts.headers,
      "Sec-WebSocket-Version": opts.protocolVersion,
      "Sec-WebSocket-Key": key,
      Connection: "Upgrade",
      Upgrade: "websocket"
    };
    opts.path = parsedUrl.pathname + parsedUrl.search;
    opts.timeout = opts.handshakeTimeout;
    if (opts.perMessageDeflate) {
      perMessageDeflate = new PerMessageDeflate(opts.perMessageDeflate !== true ? opts.perMessageDeflate : {}, false, opts.maxPayload);
      opts.headers["Sec-WebSocket-Extensions"] = format({
        [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
      });
    }
    if (protocols.length) {
      for (const protocol of protocols) {
        if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
          throw new SyntaxError("An invalid or duplicated subprotocol was specified");
        }
        protocolSet.add(protocol);
      }
      opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
    }
    if (opts.origin) {
      if (opts.protocolVersion < 13) {
        opts.headers["Sec-WebSocket-Origin"] = opts.origin;
      } else {
        opts.headers.Origin = opts.origin;
      }
    }
    if (parsedUrl.username || parsedUrl.password) {
      opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
    }
    if (isIpcUrl) {
      const parts = opts.path.split(":");
      opts.socketPath = parts[0];
      opts.path = parts[1];
    }
    let req;
    if (opts.followRedirects) {
      if (websocket._redirects === 0) {
        websocket._originalIpc = isIpcUrl;
        websocket._originalSecure = isSecure;
        websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
        const headers = options && options.headers;
        options = { ...options, headers: {} };
        if (headers) {
          for (const [key2, value] of Object.entries(headers)) {
            options.headers[key2.toLowerCase()] = value;
          }
        }
      } else if (websocket.listenerCount("redirect") === 0) {
        const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
        if (!isSameHost || websocket._originalSecure && !isSecure) {
          delete opts.headers.authorization;
          delete opts.headers.cookie;
          if (!isSameHost)
            delete opts.headers.host;
          opts.auth = undefined;
        }
      }
      if (opts.auth && !options.headers.authorization) {
        options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
      }
      req = websocket._req = request(opts);
      if (websocket._redirects) {
        websocket.emit("redirect", websocket.url, req);
      }
    } else {
      req = websocket._req = request(opts);
    }
    if (opts.timeout) {
      req.on("timeout", () => {
        abortHandshake(websocket, req, "Opening handshake has timed out");
      });
    }
    req.on("error", (err) => {
      if (req === null || req[kAborted])
        return;
      req = websocket._req = null;
      emitErrorAndClose(websocket, err);
    });
    req.on("response", (res) => {
      const location = res.headers.location;
      const statusCode = res.statusCode;
      if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
        if (++websocket._redirects > opts.maxRedirects) {
          abortHandshake(websocket, req, "Maximum redirects exceeded");
          return;
        }
        req.abort();
        let addr;
        try {
          addr = new URL2(location, address);
        } catch (e) {
          const err = new SyntaxError(`Invalid URL: ${location}`);
          emitErrorAndClose(websocket, err);
          return;
        }
        initAsClient(websocket, addr, protocols, options);
      } else if (!websocket.emit("unexpected-response", req, res)) {
        abortHandshake(websocket, req, `Unexpected server response: ${res.statusCode}`);
      }
    });
    req.on("upgrade", (res, socket, head) => {
      websocket.emit("upgrade", res);
      if (websocket.readyState !== WebSocket.CONNECTING)
        return;
      req = websocket._req = null;
      const upgrade = res.headers.upgrade;
      if (upgrade === undefined || upgrade.toLowerCase() !== "websocket") {
        abortHandshake(websocket, socket, "Invalid Upgrade header");
        return;
      }
      const digest = createHash("sha1").update(key + GUID).digest("base64");
      if (res.headers["sec-websocket-accept"] !== digest) {
        abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
        return;
      }
      const serverProt = res.headers["sec-websocket-protocol"];
      let protError;
      if (serverProt !== undefined) {
        if (!protocolSet.size) {
          protError = "Server sent a subprotocol but none was requested";
        } else if (!protocolSet.has(serverProt)) {
          protError = "Server sent an invalid subprotocol";
        }
      } else if (protocolSet.size) {
        protError = "Server sent no subprotocol";
      }
      if (protError) {
        abortHandshake(websocket, socket, protError);
        return;
      }
      if (serverProt)
        websocket._protocol = serverProt;
      const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
      if (secWebSocketExtensions !== undefined) {
        if (!perMessageDeflate) {
          const message = "Server sent a Sec-WebSocket-Extensions header but no extension " + "was requested";
          abortHandshake(websocket, socket, message);
          return;
        }
        let extensions;
        try {
          extensions = parse(secWebSocketExtensions);
        } catch (err) {
          const message = "Invalid Sec-WebSocket-Extensions header";
          abortHandshake(websocket, socket, message);
          return;
        }
        const extensionNames = Object.keys(extensions);
        if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate.extensionName) {
          const message = "Server indicated an extension that was not requested";
          abortHandshake(websocket, socket, message);
          return;
        }
        try {
          perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
        } catch (err) {
          const message = "Invalid Sec-WebSocket-Extensions header";
          abortHandshake(websocket, socket, message);
          return;
        }
        websocket._extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
      }
      websocket.setSocket(socket, head, {
        allowSynchronousEvents: opts.allowSynchronousEvents,
        generateMask: opts.generateMask,
        maxPayload: opts.maxPayload,
        skipUTF8Validation: opts.skipUTF8Validation
      });
    });
    if (opts.finishRequest) {
      opts.finishRequest(req, websocket);
    } else {
      req.end();
    }
  }
  function emitErrorAndClose(websocket, err) {
    websocket._readyState = WebSocket.CLOSING;
    websocket._errorEmitted = true;
    websocket.emit("error", err);
    websocket.emitClose();
  }
  function netConnect(options) {
    options.path = options.socketPath;
    return net.connect(options);
  }
  function tlsConnect(options) {
    options.path = undefined;
    if (!options.servername && options.servername !== "") {
      options.servername = net.isIP(options.host) ? "" : options.host;
    }
    return tls.connect(options);
  }
  function abortHandshake(websocket, stream, message) {
    websocket._readyState = WebSocket.CLOSING;
    const err = new Error(message);
    Error.captureStackTrace(err, abortHandshake);
    if (stream.setHeader) {
      stream[kAborted] = true;
      stream.abort();
      if (stream.socket && !stream.socket.destroyed) {
        stream.socket.destroy();
      }
      process.nextTick(emitErrorAndClose, websocket, err);
    } else {
      stream.destroy(err);
      stream.once("error", websocket.emit.bind(websocket, "error"));
      stream.once("close", websocket.emitClose.bind(websocket));
    }
  }
  function sendAfterClose(websocket, data, cb) {
    if (data) {
      const length = isBlob(data) ? data.size : toBuffer(data).length;
      if (websocket._socket)
        websocket._sender._bufferedBytes += length;
      else
        websocket._bufferedAmount += length;
    }
    if (cb) {
      const err = new Error(`WebSocket is not open: readyState ${websocket.readyState} ` + `(${readyStates[websocket.readyState]})`);
      process.nextTick(cb, err);
    }
  }
  function receiverOnConclude(code, reason) {
    const websocket = this[kWebSocket];
    websocket._closeFrameReceived = true;
    websocket._closeMessage = reason;
    websocket._closeCode = code;
    if (websocket._socket[kWebSocket] === undefined)
      return;
    websocket._socket.removeListener("data", socketOnData);
    process.nextTick(resume, websocket._socket);
    if (code === 1005)
      websocket.close();
    else
      websocket.close(code, reason);
  }
  function receiverOnDrain() {
    const websocket = this[kWebSocket];
    if (!websocket.isPaused)
      websocket._socket.resume();
  }
  function receiverOnError(err) {
    const websocket = this[kWebSocket];
    if (websocket._socket[kWebSocket] !== undefined) {
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      websocket.close(err[kStatusCode]);
    }
    if (!websocket._errorEmitted) {
      websocket._errorEmitted = true;
      websocket.emit("error", err);
    }
  }
  function receiverOnFinish() {
    this[kWebSocket].emitClose();
  }
  function receiverOnMessage(data, isBinary) {
    this[kWebSocket].emit("message", data, isBinary);
  }
  function receiverOnPing(data) {
    const websocket = this[kWebSocket];
    if (websocket._autoPong)
      websocket.pong(data, !this._isServer, NOOP);
    websocket.emit("ping", data);
  }
  function receiverOnPong(data) {
    this[kWebSocket].emit("pong", data);
  }
  function resume(stream) {
    stream.resume();
  }
  function senderOnError(err) {
    const websocket = this[kWebSocket];
    if (websocket.readyState === WebSocket.CLOSED)
      return;
    if (websocket.readyState === WebSocket.OPEN) {
      websocket._readyState = WebSocket.CLOSING;
      setCloseTimer(websocket);
    }
    this._socket.end();
    if (!websocket._errorEmitted) {
      websocket._errorEmitted = true;
      websocket.emit("error", err);
    }
  }
  function setCloseTimer(websocket) {
    websocket._closeTimer = setTimeout(websocket._socket.destroy.bind(websocket._socket), closeTimeout);
  }
  function socketOnClose() {
    const websocket = this[kWebSocket];
    this.removeListener("close", socketOnClose);
    this.removeListener("data", socketOnData);
    this.removeListener("end", socketOnEnd);
    websocket._readyState = WebSocket.CLOSING;
    let chunk;
    if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && (chunk = websocket._socket.read()) !== null) {
      websocket._receiver.write(chunk);
    }
    websocket._receiver.end();
    this[kWebSocket] = undefined;
    clearTimeout(websocket._closeTimer);
    if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
      websocket.emitClose();
    } else {
      websocket._receiver.on("error", receiverOnFinish);
      websocket._receiver.on("finish", receiverOnFinish);
    }
  }
  function socketOnData(chunk) {
    if (!this[kWebSocket]._receiver.write(chunk)) {
      this.pause();
    }
  }
  function socketOnEnd() {
    const websocket = this[kWebSocket];
    websocket._readyState = WebSocket.CLOSING;
    websocket._receiver.end();
    this.end();
  }
  function socketOnError() {
    const websocket = this[kWebSocket];
    this.removeListener("error", socketOnError);
    this.on("error", NOOP);
    if (websocket) {
      websocket._readyState = WebSocket.CLOSING;
      this.destroy();
    }
  }
});

// node_modules/.bun/ws@8.18.3/node_modules/ws/lib/stream.js
var require_stream = __commonJS((exports, module) => {
  var WebSocket = require_websocket();
  var { Duplex } = __require("stream");
  function emitClose(stream) {
    stream.emit("close");
  }
  function duplexOnEnd() {
    if (!this.destroyed && this._writableState.finished) {
      this.destroy();
    }
  }
  function duplexOnError(err) {
    this.removeListener("error", duplexOnError);
    this.destroy();
    if (this.listenerCount("error") === 0) {
      this.emit("error", err);
    }
  }
  function createWebSocketStream(ws, options) {
    let terminateOnDestroy = true;
    const duplex = new Duplex({
      ...options,
      autoDestroy: false,
      emitClose: false,
      objectMode: false,
      writableObjectMode: false
    });
    ws.on("message", function message(msg, isBinary) {
      const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
      if (!duplex.push(data))
        ws.pause();
    });
    ws.once("error", function error(err) {
      if (duplex.destroyed)
        return;
      terminateOnDestroy = false;
      duplex.destroy(err);
    });
    ws.once("close", function close() {
      if (duplex.destroyed)
        return;
      duplex.push(null);
    });
    duplex._destroy = function(err, callback) {
      if (ws.readyState === ws.CLOSED) {
        callback(err);
        process.nextTick(emitClose, duplex);
        return;
      }
      let called = false;
      ws.once("error", function error(err2) {
        called = true;
        callback(err2);
      });
      ws.once("close", function close() {
        if (!called)
          callback(err);
        process.nextTick(emitClose, duplex);
      });
      if (terminateOnDestroy)
        ws.terminate();
    };
    duplex._final = function(callback) {
      if (ws.readyState === ws.CONNECTING) {
        ws.once("open", function open() {
          duplex._final(callback);
        });
        return;
      }
      if (ws._socket === null)
        return;
      if (ws._socket._writableState.finished) {
        callback();
        if (duplex._readableState.endEmitted)
          duplex.destroy();
      } else {
        ws._socket.once("finish", function finish() {
          callback();
        });
        ws.close();
      }
    };
    duplex._read = function() {
      if (ws.isPaused)
        ws.resume();
    };
    duplex._write = function(chunk, encoding, callback) {
      if (ws.readyState === ws.CONNECTING) {
        ws.once("open", function open() {
          duplex._write(chunk, encoding, callback);
        });
        return;
      }
      ws.send(chunk, callback);
    };
    duplex.on("end", duplexOnEnd);
    duplex.on("error", duplexOnError);
    return duplex;
  }
  module.exports = createWebSocketStream;
});

// node_modules/.bun/ws@8.18.3/node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS((exports, module) => {
  var { tokenChars } = require_validation();
  function parse(header) {
    const protocols = new Set;
    let start = -1;
    let end = -1;
    let i = 0;
    for (i;i < header.length; i++) {
      const code = header.charCodeAt(i);
      if (end === -1 && tokenChars[code] === 1) {
        if (start === -1)
          start = i;
      } else if (i !== 0 && (code === 32 || code === 9)) {
        if (end === -1 && start !== -1)
          end = i;
      } else if (code === 44) {
        if (start === -1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
        if (end === -1)
          end = i;
        const protocol2 = header.slice(start, end);
        if (protocols.has(protocol2)) {
          throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
        }
        protocols.add(protocol2);
        start = end = -1;
      } else {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }
    }
    if (start === -1 || end !== -1) {
      throw new SyntaxError("Unexpected end of input");
    }
    const protocol = header.slice(start, i);
    if (protocols.has(protocol)) {
      throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
    }
    protocols.add(protocol);
    return protocols;
  }
  module.exports = { parse };
});

// node_modules/.bun/ws@8.18.3/node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS((exports, module) => {
  var EventEmitter = __require("events");
  var http = __require("http");
  var { Duplex } = __require("stream");
  var { createHash } = __require("crypto");
  var extension = require_extension();
  var PerMessageDeflate = require_permessage_deflate();
  var subprotocol = require_subprotocol();
  var WebSocket = require_websocket();
  var { GUID, kWebSocket } = require_constants();
  var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
  var RUNNING = 0;
  var CLOSING = 1;
  var CLOSED = 2;

  class WebSocketServer extends EventEmitter {
    constructor(options, callback) {
      super();
      options = {
        allowSynchronousEvents: true,
        autoPong: true,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: false,
        handleProtocols: null,
        clientTracking: true,
        verifyClient: null,
        noServer: false,
        backlog: null,
        server: null,
        host: null,
        path: null,
        port: null,
        WebSocket,
        ...options
      };
      if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
        throw new TypeError('One and only one of the "port", "server", or "noServer" options ' + "must be specified");
      }
      if (options.port != null) {
        this._server = http.createServer((req, res) => {
          const body = http.STATUS_CODES[426];
          res.writeHead(426, {
            "Content-Length": body.length,
            "Content-Type": "text/plain"
          });
          res.end(body);
        });
        this._server.listen(options.port, options.host, options.backlog, callback);
      } else if (options.server) {
        this._server = options.server;
      }
      if (this._server) {
        const emitConnection = this.emit.bind(this, "connection");
        this._removeListeners = addListeners(this._server, {
          listening: this.emit.bind(this, "listening"),
          error: this.emit.bind(this, "error"),
          upgrade: (req, socket, head) => {
            this.handleUpgrade(req, socket, head, emitConnection);
          }
        });
      }
      if (options.perMessageDeflate === true)
        options.perMessageDeflate = {};
      if (options.clientTracking) {
        this.clients = new Set;
        this._shouldEmitClose = false;
      }
      this.options = options;
      this._state = RUNNING;
    }
    address() {
      if (this.options.noServer) {
        throw new Error('The server is operating in "noServer" mode');
      }
      if (!this._server)
        return null;
      return this._server.address();
    }
    close(cb) {
      if (this._state === CLOSED) {
        if (cb) {
          this.once("close", () => {
            cb(new Error("The server is not running"));
          });
        }
        process.nextTick(emitClose, this);
        return;
      }
      if (cb)
        this.once("close", cb);
      if (this._state === CLOSING)
        return;
      this._state = CLOSING;
      if (this.options.noServer || this.options.server) {
        if (this._server) {
          this._removeListeners();
          this._removeListeners = this._server = null;
        }
        if (this.clients) {
          if (!this.clients.size) {
            process.nextTick(emitClose, this);
          } else {
            this._shouldEmitClose = true;
          }
        } else {
          process.nextTick(emitClose, this);
        }
      } else {
        const server = this._server;
        this._removeListeners();
        this._removeListeners = this._server = null;
        server.close(() => {
          emitClose(this);
        });
      }
    }
    shouldHandle(req) {
      if (this.options.path) {
        const index = req.url.indexOf("?");
        const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
        if (pathname !== this.options.path)
          return false;
      }
      return true;
    }
    handleUpgrade(req, socket, head, cb) {
      socket.on("error", socketOnError);
      const key = req.headers["sec-websocket-key"];
      const upgrade = req.headers.upgrade;
      const version2 = +req.headers["sec-websocket-version"];
      if (req.method !== "GET") {
        const message = "Invalid HTTP method";
        abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
        return;
      }
      if (upgrade === undefined || upgrade.toLowerCase() !== "websocket") {
        const message = "Invalid Upgrade header";
        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
        return;
      }
      if (key === undefined || !keyRegex.test(key)) {
        const message = "Missing or invalid Sec-WebSocket-Key header";
        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
        return;
      }
      if (version2 !== 13 && version2 !== 8) {
        const message = "Missing or invalid Sec-WebSocket-Version header";
        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
          "Sec-WebSocket-Version": "13, 8"
        });
        return;
      }
      if (!this.shouldHandle(req)) {
        abortHandshake(socket, 400);
        return;
      }
      const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
      let protocols = new Set;
      if (secWebSocketProtocol !== undefined) {
        try {
          protocols = subprotocol.parse(secWebSocketProtocol);
        } catch (err) {
          const message = "Invalid Sec-WebSocket-Protocol header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
      }
      const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
      const extensions = {};
      if (this.options.perMessageDeflate && secWebSocketExtensions !== undefined) {
        const perMessageDeflate = new PerMessageDeflate(this.options.perMessageDeflate, true, this.options.maxPayload);
        try {
          const offers = extension.parse(secWebSocketExtensions);
          if (offers[PerMessageDeflate.extensionName]) {
            perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
            extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
          }
        } catch (err) {
          const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
      }
      if (this.options.verifyClient) {
        const info = {
          origin: req.headers[`${version2 === 8 ? "sec-websocket-origin" : "origin"}`],
          secure: !!(req.socket.authorized || req.socket.encrypted),
          req
        };
        if (this.options.verifyClient.length === 2) {
          this.options.verifyClient(info, (verified, code, message, headers) => {
            if (!verified) {
              return abortHandshake(socket, code || 401, message, headers);
            }
            this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
          });
          return;
        }
        if (!this.options.verifyClient(info))
          return abortHandshake(socket, 401);
      }
      this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
    }
    completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
      if (!socket.readable || !socket.writable)
        return socket.destroy();
      if (socket[kWebSocket]) {
        throw new Error("server.handleUpgrade() was called more than once with the same " + "socket, possibly due to a misconfiguration");
      }
      if (this._state > RUNNING)
        return abortHandshake(socket, 503);
      const digest = createHash("sha1").update(key + GUID).digest("base64");
      const headers = [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${digest}`
      ];
      const ws = new this.options.WebSocket(null, undefined, this.options);
      if (protocols.size) {
        const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
        if (protocol) {
          headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
          ws._protocol = protocol;
        }
      }
      if (extensions[PerMessageDeflate.extensionName]) {
        const params = extensions[PerMessageDeflate.extensionName].params;
        const value = extension.format({
          [PerMessageDeflate.extensionName]: [params]
        });
        headers.push(`Sec-WebSocket-Extensions: ${value}`);
        ws._extensions = extensions;
      }
      this.emit("headers", headers, req);
      socket.write(headers.concat(`\r
`).join(`\r
`));
      socket.removeListener("error", socketOnError);
      ws.setSocket(socket, head, {
        allowSynchronousEvents: this.options.allowSynchronousEvents,
        maxPayload: this.options.maxPayload,
        skipUTF8Validation: this.options.skipUTF8Validation
      });
      if (this.clients) {
        this.clients.add(ws);
        ws.on("close", () => {
          this.clients.delete(ws);
          if (this._shouldEmitClose && !this.clients.size) {
            process.nextTick(emitClose, this);
          }
        });
      }
      cb(ws, req);
    }
  }
  module.exports = WebSocketServer;
  function addListeners(server, map) {
    for (const event of Object.keys(map))
      server.on(event, map[event]);
    return function removeListeners() {
      for (const event of Object.keys(map)) {
        server.removeListener(event, map[event]);
      }
    };
  }
  function emitClose(server) {
    server._state = CLOSED;
    server.emit("close");
  }
  function socketOnError() {
    this.destroy();
  }
  function abortHandshake(socket, code, message, headers) {
    message = message || http.STATUS_CODES[code];
    headers = {
      Connection: "close",
      "Content-Type": "text/html",
      "Content-Length": Buffer.byteLength(message),
      ...headers
    };
    socket.once("finish", socket.destroy);
    socket.end(`HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join(`\r
`) + `\r
\r
` + message);
  }
  function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
    if (server.listenerCount("wsClientError")) {
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
      server.emit("wsClientError", err, socket, req);
    } else {
      abortHandshake(socket, code, message, headers);
    }
  }
});

// node_modules/.bun/ws@8.18.3/node_modules/ws/wrapper.mjs
var import_stream, import_receiver, import_sender, import_websocket, import_websocket_server;
var init_wrapper = __esm(() => {
  import_stream = __toESM(require_stream(), 1);
  import_receiver = __toESM(require_receiver(), 1);
  import_sender = __toESM(require_sender(), 1);
  import_websocket = __toESM(require_websocket(), 1);
  import_websocket_server = __toESM(require_websocket_server(), 1);
});

// node_modules/.bun/@libsql+isomorphic-ws@0.1.5/node_modules/@libsql/isomorphic-ws/node.mjs
var init_node = __esm(() => {
  init_wrapper();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/client.js
class Client {
  constructor() {
    this.intMode = "number";
  }
  intMode;
}

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/errors.js
var ClientError, ProtoError, ResponseError, ClosedError, WebSocketUnsupportedError, WebSocketError, HttpServerError, ProtocolVersionError, InternalError, MisuseError;
var init_errors = __esm(() => {
  ClientError = class ClientError extends Error {
    constructor(message) {
      super(message);
      this.name = "ClientError";
    }
  };
  ProtoError = class ProtoError extends ClientError {
    constructor(message) {
      super(message);
      this.name = "ProtoError";
    }
  };
  ResponseError = class ResponseError extends ClientError {
    code;
    proto;
    constructor(message, protoError) {
      super(message);
      this.name = "ResponseError";
      this.code = protoError.code;
      this.proto = protoError;
      this.stack = undefined;
    }
  };
  ClosedError = class ClosedError extends ClientError {
    constructor(message, cause) {
      if (cause !== undefined) {
        super(`${message}: ${cause}`);
        this.cause = cause;
      } else {
        super(message);
      }
      this.name = "ClosedError";
    }
  };
  WebSocketUnsupportedError = class WebSocketUnsupportedError extends ClientError {
    constructor(message) {
      super(message);
      this.name = "WebSocketUnsupportedError";
    }
  };
  WebSocketError = class WebSocketError extends ClientError {
    constructor(message) {
      super(message);
      this.name = "WebSocketError";
    }
  };
  HttpServerError = class HttpServerError extends ClientError {
    status;
    constructor(message, status) {
      super(message);
      this.status = status;
      this.name = "HttpServerError";
    }
  };
  ProtocolVersionError = class ProtocolVersionError extends ClientError {
    constructor(message) {
      super(message);
      this.name = "ProtocolVersionError";
    }
  };
  InternalError = class InternalError extends ClientError {
    constructor(message) {
      super(message);
      this.name = "InternalError";
    }
  };
  MisuseError = class MisuseError extends ClientError {
    constructor(message) {
      super(message);
      this.name = "MisuseError";
    }
  };
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/encoding/json/decode.js
function string(value) {
  if (typeof value === "string") {
    return value;
  }
  throw typeError(value, "string");
}
function stringOpt(value) {
  if (value === null || value === undefined) {
    return;
  } else if (typeof value === "string") {
    return value;
  }
  throw typeError(value, "string or null");
}
function number(value) {
  if (typeof value === "number") {
    return value;
  }
  throw typeError(value, "number");
}
function boolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  throw typeError(value, "boolean");
}
function array(value) {
  if (Array.isArray(value)) {
    return value;
  }
  throw typeError(value, "array");
}
function object(value) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  throw typeError(value, "object");
}
function arrayObjectsMap(value, fun) {
  return array(value).map((elemValue) => fun(object(elemValue)));
}
function typeError(value, expected) {
  if (value === undefined) {
    return new ProtoError(`Expected ${expected}, but the property was missing`);
  }
  let received = typeof value;
  if (value === null) {
    received = "null";
  } else if (Array.isArray(value)) {
    received = "array";
  }
  return new ProtoError(`Expected ${expected}, received ${received}`);
}
function readJsonObject(value, fun) {
  return fun(object(value));
}
var init_decode = __esm(() => {
  init_errors();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/encoding/json/encode.js
class ObjectWriter {
  #output;
  #isFirst;
  constructor(output) {
    this.#output = output;
    this.#isFirst = false;
  }
  begin() {
    this.#output.push("{");
    this.#isFirst = true;
  }
  end() {
    this.#output.push("}");
    this.#isFirst = false;
  }
  #key(name) {
    if (this.#isFirst) {
      this.#output.push('"');
      this.#isFirst = false;
    } else {
      this.#output.push(',"');
    }
    this.#output.push(name);
    this.#output.push('":');
  }
  string(name, value) {
    this.#key(name);
    this.#output.push(JSON.stringify(value));
  }
  stringRaw(name, value) {
    this.#key(name);
    this.#output.push('"');
    this.#output.push(value);
    this.#output.push('"');
  }
  number(name, value) {
    this.#key(name);
    this.#output.push("" + value);
  }
  boolean(name, value) {
    this.#key(name);
    this.#output.push(value ? "true" : "false");
  }
  object(name, value, valueFun) {
    this.#key(name);
    this.begin();
    valueFun(this, value);
    this.end();
  }
  arrayObjects(name, values, valueFun) {
    this.#key(name);
    this.#output.push("[");
    for (let i = 0;i < values.length; ++i) {
      if (i !== 0) {
        this.#output.push(",");
      }
      this.begin();
      valueFun(this, values[i]);
      this.end();
    }
    this.#output.push("]");
  }
}
function writeJsonObject(value, fun) {
  const output = [];
  const writer = new ObjectWriter(output);
  writer.begin();
  fun(writer, value);
  writer.end();
  return output.join("");
}

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/util.js
var VARINT = 0, FIXED_64 = 1, LENGTH_DELIMITED = 2, FIXED_32 = 5;

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/decode.js
class MessageReader {
  #array;
  #view;
  #pos;
  constructor(array2) {
    this.#array = array2;
    this.#view = new DataView(array2.buffer, array2.byteOffset, array2.byteLength);
    this.#pos = 0;
  }
  varint() {
    let value = 0;
    for (let shift = 0;; shift += 7) {
      const byte = this.#array[this.#pos++];
      value |= (byte & 127) << shift;
      if (!(byte & 128)) {
        break;
      }
    }
    return value;
  }
  varintBig() {
    let value = 0n;
    for (let shift = 0n;; shift += 7n) {
      const byte = this.#array[this.#pos++];
      value |= BigInt(byte & 127) << shift;
      if (!(byte & 128)) {
        break;
      }
    }
    return value;
  }
  bytes(length) {
    const array2 = new Uint8Array(this.#array.buffer, this.#array.byteOffset + this.#pos, length);
    this.#pos += length;
    return array2;
  }
  double() {
    const value = this.#view.getFloat64(this.#pos, true);
    this.#pos += 8;
    return value;
  }
  skipVarint() {
    for (;; ) {
      const byte = this.#array[this.#pos++];
      if (!(byte & 128)) {
        break;
      }
    }
  }
  skip(count) {
    this.#pos += count;
  }
  eof() {
    return this.#pos >= this.#array.byteLength;
  }
}

class FieldReader {
  #reader;
  #wireType;
  constructor(reader) {
    this.#reader = reader;
    this.#wireType = -1;
  }
  setup(wireType) {
    this.#wireType = wireType;
  }
  #expect(expectedWireType) {
    if (this.#wireType !== expectedWireType) {
      throw new ProtoError(`Expected wire type ${expectedWireType}, got ${this.#wireType}`);
    }
    this.#wireType = -1;
  }
  bytes() {
    this.#expect(LENGTH_DELIMITED);
    const length = this.#reader.varint();
    return this.#reader.bytes(length);
  }
  string() {
    return new TextDecoder().decode(this.bytes());
  }
  message(def) {
    return readProtobufMessage(this.bytes(), def);
  }
  int32() {
    this.#expect(VARINT);
    return this.#reader.varint();
  }
  uint32() {
    return this.int32();
  }
  bool() {
    return this.int32() !== 0;
  }
  uint64() {
    this.#expect(VARINT);
    return this.#reader.varintBig();
  }
  sint64() {
    const value = this.uint64();
    return value >> 1n ^ -(value & 1n);
  }
  double() {
    this.#expect(FIXED_64);
    return this.#reader.double();
  }
  maybeSkip() {
    if (this.#wireType < 0) {
      return;
    } else if (this.#wireType === VARINT) {
      this.#reader.skipVarint();
    } else if (this.#wireType === FIXED_64) {
      this.#reader.skip(8);
    } else if (this.#wireType === LENGTH_DELIMITED) {
      const length = this.#reader.varint();
      this.#reader.skip(length);
    } else if (this.#wireType === FIXED_32) {
      this.#reader.skip(4);
    } else {
      throw new ProtoError(`Unexpected wire type ${this.#wireType}`);
    }
    this.#wireType = -1;
  }
}
function readProtobufMessage(data, def) {
  const msgReader = new MessageReader(data);
  const fieldReader = new FieldReader(msgReader);
  let value = def.default();
  while (!msgReader.eof()) {
    const key = msgReader.varint();
    const tag = key >> 3;
    const wireType = key & 7;
    fieldReader.setup(wireType);
    const tagFun = def[tag];
    if (tagFun !== undefined) {
      const returnedValue = tagFun(fieldReader, value);
      if (returnedValue !== undefined) {
        value = returnedValue;
      }
    }
    fieldReader.maybeSkip();
  }
  return value;
}
var init_decode2 = __esm(() => {
  init_errors();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/encode.js
class MessageWriter {
  #buf;
  #array;
  #view;
  #pos;
  constructor() {
    this.#buf = new ArrayBuffer(256);
    this.#array = new Uint8Array(this.#buf);
    this.#view = new DataView(this.#buf);
    this.#pos = 0;
  }
  #ensure(extra) {
    if (this.#pos + extra <= this.#buf.byteLength) {
      return;
    }
    let newCap = this.#buf.byteLength;
    while (newCap < this.#pos + extra) {
      newCap *= 2;
    }
    const newBuf = new ArrayBuffer(newCap);
    const newArray = new Uint8Array(newBuf);
    const newView = new DataView(newBuf);
    newArray.set(new Uint8Array(this.#buf, 0, this.#pos));
    this.#buf = newBuf;
    this.#array = newArray;
    this.#view = newView;
  }
  #varint(value) {
    this.#ensure(5);
    value = 0 | value;
    do {
      let byte = value & 127;
      value >>>= 7;
      byte |= value ? 128 : 0;
      this.#array[this.#pos++] = byte;
    } while (value);
  }
  #varintBig(value) {
    this.#ensure(10);
    value = value & 0xffffffffffffffffn;
    do {
      let byte = Number(value & 0x7fn);
      value >>= 7n;
      byte |= value ? 128 : 0;
      this.#array[this.#pos++] = byte;
    } while (value);
  }
  #tag(tag, wireType) {
    this.#varint(tag << 3 | wireType);
  }
  bytes(tag, value) {
    this.#tag(tag, LENGTH_DELIMITED);
    this.#varint(value.byteLength);
    this.#ensure(value.byteLength);
    this.#array.set(value, this.#pos);
    this.#pos += value.byteLength;
  }
  string(tag, value) {
    this.bytes(tag, new TextEncoder().encode(value));
  }
  message(tag, value, fun) {
    const writer = new MessageWriter;
    fun(writer, value);
    this.bytes(tag, writer.data());
  }
  int32(tag, value) {
    this.#tag(tag, VARINT);
    this.#varint(value);
  }
  uint32(tag, value) {
    this.int32(tag, value);
  }
  bool(tag, value) {
    this.int32(tag, value ? 1 : 0);
  }
  sint64(tag, value) {
    this.#tag(tag, VARINT);
    this.#varintBig(value << 1n ^ value >> 63n);
  }
  double(tag, value) {
    this.#tag(tag, FIXED_64);
    this.#ensure(8);
    this.#view.setFloat64(this.#pos, value, true);
    this.#pos += 8;
  }
  data() {
    return new Uint8Array(this.#buf, 0, this.#pos);
  }
}
function writeProtobufMessage(value, fun) {
  const w = new MessageWriter;
  fun(w, value);
  return w.data();
}
var init_encode = () => {};

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/encoding/index.js
var init_encoding = __esm(() => {
  init_decode();
  init_decode2();
  init_encode();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/id_alloc.js
class IdAlloc {
  #usedIds;
  #freeIds;
  constructor() {
    this.#usedIds = new Set;
    this.#freeIds = new Set;
  }
  alloc() {
    for (const freeId2 of this.#freeIds) {
      this.#freeIds.delete(freeId2);
      this.#usedIds.add(freeId2);
      if (!this.#usedIds.has(this.#usedIds.size - 1)) {
        this.#freeIds.add(this.#usedIds.size - 1);
      }
      return freeId2;
    }
    const freeId = this.#usedIds.size;
    this.#usedIds.add(freeId);
    return freeId;
  }
  free(id) {
    if (!this.#usedIds.delete(id)) {
      throw new InternalError("Freeing an id that is not allocated");
    }
    this.#freeIds.delete(this.#usedIds.size);
    if (id < this.#usedIds.size) {
      this.#freeIds.add(id);
    }
  }
}
var init_id_alloc = __esm(() => {
  init_errors();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/util.js
function impossible(value, message) {
  throw new InternalError(message);
}
var init_util2 = __esm(() => {
  init_errors();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/value.js
function valueToProto(value) {
  if (value === null) {
    return null;
  } else if (typeof value === "string") {
    return value;
  } else if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new RangeError("Only finite numbers (not Infinity or NaN) can be passed as arguments");
    }
    return value;
  } else if (typeof value === "bigint") {
    if (value < minInteger2 || value > maxInteger2) {
      throw new RangeError("This bigint value is too large to be represented as a 64-bit integer and passed as argument");
    }
    return value;
  } else if (typeof value === "boolean") {
    return value ? 1n : 0n;
  } else if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  } else if (value instanceof Uint8Array) {
    return value;
  } else if (value instanceof Date) {
    return +value.valueOf();
  } else if (typeof value === "object") {
    return "" + value.toString();
  } else {
    throw new TypeError("Unsupported type of value");
  }
}
function valueFromProto(value, intMode) {
  if (value === null) {
    return null;
  } else if (typeof value === "number") {
    return value;
  } else if (typeof value === "string") {
    return value;
  } else if (typeof value === "bigint") {
    if (intMode === "number") {
      const num = Number(value);
      if (!Number.isSafeInteger(num)) {
        throw new RangeError("Received integer which is too large to be safely represented as a JavaScript number");
      }
      return num;
    } else if (intMode === "bigint") {
      return value;
    } else if (intMode === "string") {
      return "" + value;
    } else {
      throw new MisuseError("Invalid value for IntMode");
    }
  } else if (value instanceof Uint8Array) {
    return value.slice().buffer;
  } else if (value === undefined) {
    throw new ProtoError("Received unrecognized type of Value");
  } else {
    throw impossible(value, "Impossible type of Value");
  }
}
var minInteger2, maxInteger2 = 9223372036854775807n;
var init_value = __esm(() => {
  init_errors();
  init_util2();
  minInteger2 = -9223372036854775808n;
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/result.js
function stmtResultFromProto(result) {
  return {
    affectedRowCount: result.affectedRowCount,
    lastInsertRowid: result.lastInsertRowid,
    columnNames: result.cols.map((col) => col.name),
    columnDecltypes: result.cols.map((col) => col.decltype)
  };
}
function rowsResultFromProto(result, intMode) {
  const stmtResult = stmtResultFromProto(result);
  const rows = result.rows.map((row) => rowFromProto(stmtResult.columnNames, row, intMode));
  return { ...stmtResult, rows };
}
function rowResultFromProto(result, intMode) {
  const stmtResult = stmtResultFromProto(result);
  let row;
  if (result.rows.length > 0) {
    row = rowFromProto(stmtResult.columnNames, result.rows[0], intMode);
  }
  return { ...stmtResult, row };
}
function valueResultFromProto(result, intMode) {
  const stmtResult = stmtResultFromProto(result);
  let value;
  if (result.rows.length > 0 && stmtResult.columnNames.length > 0) {
    value = valueFromProto(result.rows[0][0], intMode);
  }
  return { ...stmtResult, value };
}
function rowFromProto(colNames, values, intMode) {
  const row = {};
  Object.defineProperty(row, "length", { value: values.length });
  for (let i = 0;i < values.length; ++i) {
    const value = valueFromProto(values[i], intMode);
    Object.defineProperty(row, i, { value });
    const colName = colNames[i];
    if (colName !== undefined && !Object.hasOwn(row, colName)) {
      Object.defineProperty(row, colName, { value, enumerable: true, configurable: true, writable: true });
    }
  }
  return row;
}
function errorFromProto(error) {
  return new ResponseError(error.message, error);
}
var init_result = __esm(() => {
  init_errors();
  init_value();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/sql.js
class Sql {
  #owner;
  #sqlId;
  #closed;
  constructor(owner, sqlId) {
    this.#owner = owner;
    this.#sqlId = sqlId;
    this.#closed = undefined;
  }
  _getSqlId(owner) {
    if (this.#owner !== owner) {
      throw new MisuseError("Attempted to use SQL text opened with other object");
    } else if (this.#closed !== undefined) {
      throw new ClosedError("SQL text is closed", this.#closed);
    }
    return this.#sqlId;
  }
  close() {
    this._setClosed(new ClientError("SQL text was manually closed"));
  }
  _setClosed(error) {
    if (this.#closed === undefined) {
      this.#closed = error;
      this.#owner._closeSql(this.#sqlId);
    }
  }
  get closed() {
    return this.#closed !== undefined;
  }
}
function sqlToProto(owner, sql) {
  if (sql instanceof Sql) {
    return { sqlId: sql._getSqlId(owner) };
  } else {
    return { sql: "" + sql };
  }
}
var init_sql = __esm(() => {
  init_errors();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/queue.js
class Queue {
  #pushStack;
  #shiftStack;
  constructor() {
    this.#pushStack = [];
    this.#shiftStack = [];
  }
  get length() {
    return this.#pushStack.length + this.#shiftStack.length;
  }
  push(elem) {
    this.#pushStack.push(elem);
  }
  shift() {
    if (this.#shiftStack.length === 0 && this.#pushStack.length > 0) {
      this.#shiftStack = this.#pushStack.reverse();
      this.#pushStack = [];
    }
    return this.#shiftStack.pop();
  }
  first() {
    return this.#shiftStack.length !== 0 ? this.#shiftStack[this.#shiftStack.length - 1] : this.#pushStack[0];
  }
}

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/stmt.js
class Stmt {
  sql;
  _args;
  _namedArgs;
  constructor(sql) {
    this.sql = sql;
    this._args = [];
    this._namedArgs = new Map;
  }
  bindIndexes(values) {
    this._args.length = 0;
    for (const value of values) {
      this._args.push(valueToProto(value));
    }
    return this;
  }
  bindIndex(index, value) {
    if (index !== (index | 0) || index <= 0) {
      throw new RangeError("Index of a positional argument must be positive integer");
    }
    while (this._args.length < index) {
      this._args.push(null);
    }
    this._args[index - 1] = valueToProto(value);
    return this;
  }
  bindName(name, value) {
    this._namedArgs.set(name, valueToProto(value));
    return this;
  }
  unbindAll() {
    this._args.length = 0;
    this._namedArgs.clear();
    return this;
  }
}
function stmtToProto(sqlOwner, stmt, wantRows) {
  let inSql;
  let args = [];
  let namedArgs = [];
  if (stmt instanceof Stmt) {
    inSql = stmt.sql;
    args = stmt._args;
    for (const [name, value] of stmt._namedArgs.entries()) {
      namedArgs.push({ name, value });
    }
  } else if (Array.isArray(stmt)) {
    inSql = stmt[0];
    if (Array.isArray(stmt[1])) {
      args = stmt[1].map((arg) => valueToProto(arg));
    } else {
      namedArgs = Object.entries(stmt[1]).map(([name, value]) => {
        return { name, value: valueToProto(value) };
      });
    }
  } else {
    inSql = stmt;
  }
  const { sql, sqlId } = sqlToProto(sqlOwner, inSql);
  return { sql, sqlId, args, namedArgs, wantRows };
}
var init_stmt = __esm(() => {
  init_sql();
  init_value();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/batch.js
class Batch {
  _stream;
  #useCursor;
  _steps;
  #executed;
  constructor(stream, useCursor) {
    this._stream = stream;
    this.#useCursor = useCursor;
    this._steps = [];
    this.#executed = false;
  }
  step() {
    return new BatchStep(this);
  }
  execute() {
    if (this.#executed) {
      throw new MisuseError("This batch has already been executed");
    }
    this.#executed = true;
    const batch = {
      steps: this._steps.map((step) => step.proto)
    };
    if (this.#useCursor) {
      return executeCursor(this._stream, this._steps, batch);
    } else {
      return executeRegular(this._stream, this._steps, batch);
    }
  }
}
function executeRegular(stream, steps, batch) {
  return stream._batch(batch).then((result) => {
    for (let step = 0;step < steps.length; ++step) {
      const stepResult = result.stepResults.get(step);
      const stepError = result.stepErrors.get(step);
      steps[step].callback(stepResult, stepError);
    }
  });
}
async function executeCursor(stream, steps, batch) {
  const cursor = await stream._openCursor(batch);
  try {
    let nextStep = 0;
    let beginEntry = undefined;
    let rows = [];
    for (;; ) {
      const entry = await cursor.next();
      if (entry === undefined) {
        break;
      }
      if (entry.type === "step_begin") {
        if (entry.step < nextStep || entry.step >= steps.length) {
          throw new ProtoError("Server produced StepBeginEntry for unexpected step");
        } else if (beginEntry !== undefined) {
          throw new ProtoError("Server produced StepBeginEntry before terminating previous step");
        }
        for (let step = nextStep;step < entry.step; ++step) {
          steps[step].callback(undefined, undefined);
        }
        nextStep = entry.step + 1;
        beginEntry = entry;
        rows = [];
      } else if (entry.type === "step_end") {
        if (beginEntry === undefined) {
          throw new ProtoError("Server produced StepEndEntry but no step is active");
        }
        const stmtResult = {
          cols: beginEntry.cols,
          rows,
          affectedRowCount: entry.affectedRowCount,
          lastInsertRowid: entry.lastInsertRowid
        };
        steps[beginEntry.step].callback(stmtResult, undefined);
        beginEntry = undefined;
        rows = [];
      } else if (entry.type === "step_error") {
        if (beginEntry === undefined) {
          if (entry.step >= steps.length) {
            throw new ProtoError("Server produced StepErrorEntry for unexpected step");
          }
          for (let step = nextStep;step < entry.step; ++step) {
            steps[step].callback(undefined, undefined);
          }
        } else {
          if (entry.step !== beginEntry.step) {
            throw new ProtoError("Server produced StepErrorEntry for unexpected step");
          }
          beginEntry = undefined;
          rows = [];
        }
        steps[entry.step].callback(undefined, entry.error);
        nextStep = entry.step + 1;
      } else if (entry.type === "row") {
        if (beginEntry === undefined) {
          throw new ProtoError("Server produced RowEntry but no step is active");
        }
        rows.push(entry.row);
      } else if (entry.type === "error") {
        throw errorFromProto(entry.error);
      } else if (entry.type === "none") {
        throw new ProtoError("Server produced unrecognized CursorEntry");
      } else {
        throw impossible(entry, "Impossible CursorEntry");
      }
    }
    if (beginEntry !== undefined) {
      throw new ProtoError("Server closed Cursor before terminating active step");
    }
    for (let step = nextStep;step < steps.length; ++step) {
      steps[step].callback(undefined, undefined);
    }
  } finally {
    cursor.close();
  }
}

class BatchStep {
  _batch;
  #conds;
  _index;
  constructor(batch) {
    this._batch = batch;
    this.#conds = [];
    this._index = undefined;
  }
  condition(cond) {
    this.#conds.push(cond._proto);
    return this;
  }
  query(stmt) {
    return this.#add(stmt, true, rowsResultFromProto);
  }
  queryRow(stmt) {
    return this.#add(stmt, true, rowResultFromProto);
  }
  queryValue(stmt) {
    return this.#add(stmt, true, valueResultFromProto);
  }
  run(stmt) {
    return this.#add(stmt, false, stmtResultFromProto);
  }
  #add(inStmt, wantRows, fromProto) {
    if (this._index !== undefined) {
      throw new MisuseError("This BatchStep has already been added to the batch");
    }
    const stmt = stmtToProto(this._batch._stream._sqlOwner(), inStmt, wantRows);
    let condition;
    if (this.#conds.length === 0) {
      condition = undefined;
    } else if (this.#conds.length === 1) {
      condition = this.#conds[0];
    } else {
      condition = { type: "and", conds: this.#conds.slice() };
    }
    const proto = { stmt, condition };
    return new Promise((outputCallback, errorCallback) => {
      const callback = (stepResult, stepError) => {
        if (stepResult !== undefined && stepError !== undefined) {
          errorCallback(new ProtoError("Server returned both result and error"));
        } else if (stepError !== undefined) {
          errorCallback(errorFromProto(stepError));
        } else if (stepResult !== undefined) {
          outputCallback(fromProto(stepResult, this._batch._stream.intMode));
        } else {
          outputCallback(undefined);
        }
      };
      this._index = this._batch._steps.length;
      this._batch._steps.push({ proto, callback });
    });
  }
}

class BatchCond {
  _batch;
  _proto;
  constructor(batch, proto) {
    this._batch = batch;
    this._proto = proto;
  }
  static ok(step) {
    return new BatchCond(step._batch, { type: "ok", step: stepIndex(step) });
  }
  static error(step) {
    return new BatchCond(step._batch, { type: "error", step: stepIndex(step) });
  }
  static not(cond) {
    return new BatchCond(cond._batch, { type: "not", cond: cond._proto });
  }
  static and(batch, conds) {
    for (const cond of conds) {
      checkCondBatch(batch, cond);
    }
    return new BatchCond(batch, { type: "and", conds: conds.map((e) => e._proto) });
  }
  static or(batch, conds) {
    for (const cond of conds) {
      checkCondBatch(batch, cond);
    }
    return new BatchCond(batch, { type: "or", conds: conds.map((e) => e._proto) });
  }
  static isAutocommit(batch) {
    batch._stream.client()._ensureVersion(3, "BatchCond.isAutocommit()");
    return new BatchCond(batch, { type: "is_autocommit" });
  }
}
function stepIndex(step) {
  if (step._index === undefined) {
    throw new MisuseError("Cannot add a condition referencing a step that has not been added to the batch");
  }
  return step._index;
}
function checkCondBatch(expectedBatch, cond) {
  if (cond._batch !== expectedBatch) {
    throw new MisuseError("Cannot mix BatchCond objects for different Batch objects");
  }
}
var init_batch = __esm(() => {
  init_errors();
  init_result();
  init_stmt();
  init_util2();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/describe.js
function describeResultFromProto(result) {
  return {
    paramNames: result.params.map((p) => p.name),
    columns: result.cols,
    isExplain: result.isExplain,
    isReadonly: result.isReadonly
  };
}

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/stream.js
class Stream {
  constructor(intMode) {
    this.intMode = intMode;
  }
  query(stmt) {
    return this.#execute(stmt, true, rowsResultFromProto);
  }
  queryRow(stmt) {
    return this.#execute(stmt, true, rowResultFromProto);
  }
  queryValue(stmt) {
    return this.#execute(stmt, true, valueResultFromProto);
  }
  run(stmt) {
    return this.#execute(stmt, false, stmtResultFromProto);
  }
  #execute(inStmt, wantRows, fromProto) {
    const stmt = stmtToProto(this._sqlOwner(), inStmt, wantRows);
    return this._execute(stmt).then((r) => fromProto(r, this.intMode));
  }
  batch(useCursor = false) {
    return new Batch(this, useCursor);
  }
  describe(inSql) {
    const protoSql = sqlToProto(this._sqlOwner(), inSql);
    return this._describe(protoSql).then(describeResultFromProto);
  }
  sequence(inSql) {
    const protoSql = sqlToProto(this._sqlOwner(), inSql);
    return this._sequence(protoSql);
  }
  intMode;
}
var init_stream = __esm(() => {
  init_batch();
  init_result();
  init_sql();
  init_stmt();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/cursor.js
class Cursor {
}

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/ws/cursor.js
var fetchChunkSize = 1000, fetchQueueSize = 10, WsCursor;
var init_cursor = __esm(() => {
  init_errors();
  WsCursor = class WsCursor extends Cursor {
    #client;
    #stream;
    #cursorId;
    #entryQueue;
    #fetchQueue;
    #closed;
    #done;
    constructor(client, stream, cursorId) {
      super();
      this.#client = client;
      this.#stream = stream;
      this.#cursorId = cursorId;
      this.#entryQueue = new Queue;
      this.#fetchQueue = new Queue;
      this.#closed = undefined;
      this.#done = false;
    }
    async next() {
      for (;; ) {
        if (this.#closed !== undefined) {
          throw new ClosedError("Cursor is closed", this.#closed);
        }
        while (!this.#done && this.#fetchQueue.length < fetchQueueSize) {
          this.#fetchQueue.push(this.#fetch());
        }
        const entry = this.#entryQueue.shift();
        if (this.#done || entry !== undefined) {
          return entry;
        }
        await this.#fetchQueue.shift().then((response) => {
          if (response === undefined) {
            return;
          }
          for (const entry2 of response.entries) {
            this.#entryQueue.push(entry2);
          }
          this.#done ||= response.done;
        });
      }
    }
    #fetch() {
      return this.#stream._sendCursorRequest(this, {
        type: "fetch_cursor",
        cursorId: this.#cursorId,
        maxCount: fetchChunkSize
      }).then((resp) => resp, (error) => {
        this._setClosed(error);
        return;
      });
    }
    _setClosed(error) {
      if (this.#closed !== undefined) {
        return;
      }
      this.#closed = error;
      this.#stream._sendCursorRequest(this, {
        type: "close_cursor",
        cursorId: this.#cursorId
      }).catch(() => {
        return;
      });
      this.#stream._cursorClosed(this);
    }
    close() {
      this._setClosed(new ClientError("Cursor was manually closed"));
    }
    get closed() {
      return this.#closed !== undefined;
    }
  };
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/ws/stream.js
var WsStream;
var init_stream2 = __esm(() => {
  init_errors();
  init_stream();
  init_cursor();
  WsStream = class WsStream extends Stream {
    #client;
    #streamId;
    #queue;
    #cursor;
    #closing;
    #closed;
    static open(client) {
      const streamId = client._streamIdAlloc.alloc();
      const stream = new WsStream(client, streamId);
      const responseCallback = () => {
        return;
      };
      const errorCallback = (e) => stream.#setClosed(e);
      const request = { type: "open_stream", streamId };
      client._sendRequest(request, { responseCallback, errorCallback });
      return stream;
    }
    constructor(client, streamId) {
      super(client.intMode);
      this.#client = client;
      this.#streamId = streamId;
      this.#queue = new Queue;
      this.#cursor = undefined;
      this.#closing = false;
      this.#closed = undefined;
    }
    client() {
      return this.#client;
    }
    _sqlOwner() {
      return this.#client;
    }
    _execute(stmt) {
      return this.#sendStreamRequest({
        type: "execute",
        streamId: this.#streamId,
        stmt
      }).then((response) => {
        return response.result;
      });
    }
    _batch(batch) {
      return this.#sendStreamRequest({
        type: "batch",
        streamId: this.#streamId,
        batch
      }).then((response) => {
        return response.result;
      });
    }
    _describe(protoSql) {
      this.#client._ensureVersion(2, "describe()");
      return this.#sendStreamRequest({
        type: "describe",
        streamId: this.#streamId,
        sql: protoSql.sql,
        sqlId: protoSql.sqlId
      }).then((response) => {
        return response.result;
      });
    }
    _sequence(protoSql) {
      this.#client._ensureVersion(2, "sequence()");
      return this.#sendStreamRequest({
        type: "sequence",
        streamId: this.#streamId,
        sql: protoSql.sql,
        sqlId: protoSql.sqlId
      }).then((_response) => {
        return;
      });
    }
    getAutocommit() {
      this.#client._ensureVersion(3, "getAutocommit()");
      return this.#sendStreamRequest({
        type: "get_autocommit",
        streamId: this.#streamId
      }).then((response) => {
        return response.isAutocommit;
      });
    }
    #sendStreamRequest(request) {
      return new Promise((responseCallback, errorCallback) => {
        this.#pushToQueue({ type: "request", request, responseCallback, errorCallback });
      });
    }
    _openCursor(batch) {
      this.#client._ensureVersion(3, "cursor");
      return new Promise((cursorCallback, errorCallback) => {
        this.#pushToQueue({ type: "cursor", batch, cursorCallback, errorCallback });
      });
    }
    _sendCursorRequest(cursor, request) {
      if (cursor !== this.#cursor) {
        throw new InternalError("Cursor not associated with the stream attempted to execute a request");
      }
      return new Promise((responseCallback, errorCallback) => {
        if (this.#closed !== undefined) {
          errorCallback(new ClosedError("Stream is closed", this.#closed));
        } else {
          this.#client._sendRequest(request, { responseCallback, errorCallback });
        }
      });
    }
    _cursorClosed(cursor) {
      if (cursor !== this.#cursor) {
        throw new InternalError("Cursor was closed, but it was not associated with the stream");
      }
      this.#cursor = undefined;
      this.#flushQueue();
    }
    #pushToQueue(entry) {
      if (this.#closed !== undefined) {
        entry.errorCallback(new ClosedError("Stream is closed", this.#closed));
      } else if (this.#closing) {
        entry.errorCallback(new ClosedError("Stream is closing", undefined));
      } else {
        this.#queue.push(entry);
        this.#flushQueue();
      }
    }
    #flushQueue() {
      for (;; ) {
        const entry = this.#queue.first();
        if (entry === undefined && this.#cursor === undefined && this.#closing) {
          this.#setClosed(new ClientError("Stream was gracefully closed"));
          break;
        } else if (entry?.type === "request" && this.#cursor === undefined) {
          const { request, responseCallback, errorCallback } = entry;
          this.#queue.shift();
          this.#client._sendRequest(request, { responseCallback, errorCallback });
        } else if (entry?.type === "cursor" && this.#cursor === undefined) {
          const { batch, cursorCallback } = entry;
          this.#queue.shift();
          const cursorId = this.#client._cursorIdAlloc.alloc();
          const cursor = new WsCursor(this.#client, this, cursorId);
          const request = {
            type: "open_cursor",
            streamId: this.#streamId,
            cursorId,
            batch
          };
          const responseCallback = () => {
            return;
          };
          const errorCallback = (e) => cursor._setClosed(e);
          this.#client._sendRequest(request, { responseCallback, errorCallback });
          this.#cursor = cursor;
          cursorCallback(cursor);
        } else {
          break;
        }
      }
    }
    #setClosed(error) {
      if (this.#closed !== undefined) {
        return;
      }
      this.#closed = error;
      if (this.#cursor !== undefined) {
        this.#cursor._setClosed(error);
      }
      for (;; ) {
        const entry = this.#queue.shift();
        if (entry !== undefined) {
          entry.errorCallback(error);
        } else {
          break;
        }
      }
      const request = { type: "close_stream", streamId: this.#streamId };
      const responseCallback = () => this.#client._streamIdAlloc.free(this.#streamId);
      const errorCallback = () => {
        return;
      };
      this.#client._sendRequest(request, { responseCallback, errorCallback });
    }
    close() {
      this.#setClosed(new ClientError("Stream was manually closed"));
    }
    closeGracefully() {
      this.#closing = true;
      this.#flushQueue();
    }
    get closed() {
      return this.#closed !== undefined || this.#closing;
    }
  };
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/shared/json_encode.js
function Stmt2(w, msg) {
  if (msg.sql !== undefined) {
    w.string("sql", msg.sql);
  }
  if (msg.sqlId !== undefined) {
    w.number("sql_id", msg.sqlId);
  }
  w.arrayObjects("args", msg.args, Value);
  w.arrayObjects("named_args", msg.namedArgs, NamedArg);
  w.boolean("want_rows", msg.wantRows);
}
function NamedArg(w, msg) {
  w.string("name", msg.name);
  w.object("value", msg.value, Value);
}
function Batch2(w, msg) {
  w.arrayObjects("steps", msg.steps, BatchStep2);
}
function BatchStep2(w, msg) {
  if (msg.condition !== undefined) {
    w.object("condition", msg.condition, BatchCond2);
  }
  w.object("stmt", msg.stmt, Stmt2);
}
function BatchCond2(w, msg) {
  w.stringRaw("type", msg.type);
  if (msg.type === "ok" || msg.type === "error") {
    w.number("step", msg.step);
  } else if (msg.type === "not") {
    w.object("cond", msg.cond, BatchCond2);
  } else if (msg.type === "and" || msg.type === "or") {
    w.arrayObjects("conds", msg.conds, BatchCond2);
  } else if (msg.type === "is_autocommit") {} else {
    throw impossible(msg, "Impossible type of BatchCond");
  }
}
function Value(w, msg) {
  if (msg === null) {
    w.stringRaw("type", "null");
  } else if (typeof msg === "bigint") {
    w.stringRaw("type", "integer");
    w.stringRaw("value", "" + msg);
  } else if (typeof msg === "number") {
    w.stringRaw("type", "float");
    w.number("value", msg);
  } else if (typeof msg === "string") {
    w.stringRaw("type", "text");
    w.string("value", msg);
  } else if (msg instanceof Uint8Array) {
    w.stringRaw("type", "blob");
    w.stringRaw("base64", gBase64.fromUint8Array(msg));
  } else if (msg === undefined) {} else {
    throw impossible(msg, "Impossible type of Value");
  }
}
var init_json_encode = __esm(() => {
  init_base64();
  init_util2();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/ws/json_encode.js
function ClientMsg(w, msg) {
  w.stringRaw("type", msg.type);
  if (msg.type === "hello") {
    if (msg.jwt !== undefined) {
      w.string("jwt", msg.jwt);
    }
  } else if (msg.type === "request") {
    w.number("request_id", msg.requestId);
    w.object("request", msg.request, Request2);
  } else {
    throw impossible(msg, "Impossible type of ClientMsg");
  }
}
function Request2(w, msg) {
  w.stringRaw("type", msg.type);
  if (msg.type === "open_stream") {
    w.number("stream_id", msg.streamId);
  } else if (msg.type === "close_stream") {
    w.number("stream_id", msg.streamId);
  } else if (msg.type === "execute") {
    w.number("stream_id", msg.streamId);
    w.object("stmt", msg.stmt, Stmt2);
  } else if (msg.type === "batch") {
    w.number("stream_id", msg.streamId);
    w.object("batch", msg.batch, Batch2);
  } else if (msg.type === "open_cursor") {
    w.number("stream_id", msg.streamId);
    w.number("cursor_id", msg.cursorId);
    w.object("batch", msg.batch, Batch2);
  } else if (msg.type === "close_cursor") {
    w.number("cursor_id", msg.cursorId);
  } else if (msg.type === "fetch_cursor") {
    w.number("cursor_id", msg.cursorId);
    w.number("max_count", msg.maxCount);
  } else if (msg.type === "sequence") {
    w.number("stream_id", msg.streamId);
    if (msg.sql !== undefined) {
      w.string("sql", msg.sql);
    }
    if (msg.sqlId !== undefined) {
      w.number("sql_id", msg.sqlId);
    }
  } else if (msg.type === "describe") {
    w.number("stream_id", msg.streamId);
    if (msg.sql !== undefined) {
      w.string("sql", msg.sql);
    }
    if (msg.sqlId !== undefined) {
      w.number("sql_id", msg.sqlId);
    }
  } else if (msg.type === "store_sql") {
    w.number("sql_id", msg.sqlId);
    w.string("sql", msg.sql);
  } else if (msg.type === "close_sql") {
    w.number("sql_id", msg.sqlId);
  } else if (msg.type === "get_autocommit") {
    w.number("stream_id", msg.streamId);
  } else {
    throw impossible(msg, "Impossible type of Request");
  }
}
var init_json_encode2 = __esm(() => {
  init_json_encode();
  init_util2();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/shared/protobuf_encode.js
function Stmt3(w, msg) {
  if (msg.sql !== undefined) {
    w.string(1, msg.sql);
  }
  if (msg.sqlId !== undefined) {
    w.int32(2, msg.sqlId);
  }
  for (const arg of msg.args) {
    w.message(3, arg, Value2);
  }
  for (const arg of msg.namedArgs) {
    w.message(4, arg, NamedArg2);
  }
  w.bool(5, msg.wantRows);
}
function NamedArg2(w, msg) {
  w.string(1, msg.name);
  w.message(2, msg.value, Value2);
}
function Batch3(w, msg) {
  for (const step of msg.steps) {
    w.message(1, step, BatchStep3);
  }
}
function BatchStep3(w, msg) {
  if (msg.condition !== undefined) {
    w.message(1, msg.condition, BatchCond3);
  }
  w.message(2, msg.stmt, Stmt3);
}
function BatchCond3(w, msg) {
  if (msg.type === "ok") {
    w.uint32(1, msg.step);
  } else if (msg.type === "error") {
    w.uint32(2, msg.step);
  } else if (msg.type === "not") {
    w.message(3, msg.cond, BatchCond3);
  } else if (msg.type === "and") {
    w.message(4, msg.conds, BatchCondList);
  } else if (msg.type === "or") {
    w.message(5, msg.conds, BatchCondList);
  } else if (msg.type === "is_autocommit") {
    w.message(6, undefined, Empty);
  } else {
    throw impossible(msg, "Impossible type of BatchCond");
  }
}
function BatchCondList(w, msg) {
  for (const cond of msg) {
    w.message(1, cond, BatchCond3);
  }
}
function Value2(w, msg) {
  if (msg === null) {
    w.message(1, undefined, Empty);
  } else if (typeof msg === "bigint") {
    w.sint64(2, msg);
  } else if (typeof msg === "number") {
    w.double(3, msg);
  } else if (typeof msg === "string") {
    w.string(4, msg);
  } else if (msg instanceof Uint8Array) {
    w.bytes(5, msg);
  } else if (msg === undefined) {} else {
    throw impossible(msg, "Impossible type of Value");
  }
}
function Empty(_w, _msg) {}
var init_protobuf_encode = __esm(() => {
  init_util2();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/ws/protobuf_encode.js
function ClientMsg2(w, msg) {
  if (msg.type === "hello") {
    w.message(1, msg, HelloMsg);
  } else if (msg.type === "request") {
    w.message(2, msg, RequestMsg);
  } else {
    throw impossible(msg, "Impossible type of ClientMsg");
  }
}
function HelloMsg(w, msg) {
  if (msg.jwt !== undefined) {
    w.string(1, msg.jwt);
  }
}
function RequestMsg(w, msg) {
  w.int32(1, msg.requestId);
  const request = msg.request;
  if (request.type === "open_stream") {
    w.message(2, request, OpenStreamReq);
  } else if (request.type === "close_stream") {
    w.message(3, request, CloseStreamReq);
  } else if (request.type === "execute") {
    w.message(4, request, ExecuteReq);
  } else if (request.type === "batch") {
    w.message(5, request, BatchReq);
  } else if (request.type === "open_cursor") {
    w.message(6, request, OpenCursorReq);
  } else if (request.type === "close_cursor") {
    w.message(7, request, CloseCursorReq);
  } else if (request.type === "fetch_cursor") {
    w.message(8, request, FetchCursorReq);
  } else if (request.type === "sequence") {
    w.message(9, request, SequenceReq);
  } else if (request.type === "describe") {
    w.message(10, request, DescribeReq);
  } else if (request.type === "store_sql") {
    w.message(11, request, StoreSqlReq);
  } else if (request.type === "close_sql") {
    w.message(12, request, CloseSqlReq);
  } else if (request.type === "get_autocommit") {
    w.message(13, request, GetAutocommitReq);
  } else {
    throw impossible(request, "Impossible type of Request");
  }
}
function OpenStreamReq(w, msg) {
  w.int32(1, msg.streamId);
}
function CloseStreamReq(w, msg) {
  w.int32(1, msg.streamId);
}
function ExecuteReq(w, msg) {
  w.int32(1, msg.streamId);
  w.message(2, msg.stmt, Stmt3);
}
function BatchReq(w, msg) {
  w.int32(1, msg.streamId);
  w.message(2, msg.batch, Batch3);
}
function OpenCursorReq(w, msg) {
  w.int32(1, msg.streamId);
  w.int32(2, msg.cursorId);
  w.message(3, msg.batch, Batch3);
}
function CloseCursorReq(w, msg) {
  w.int32(1, msg.cursorId);
}
function FetchCursorReq(w, msg) {
  w.int32(1, msg.cursorId);
  w.uint32(2, msg.maxCount);
}
function SequenceReq(w, msg) {
  w.int32(1, msg.streamId);
  if (msg.sql !== undefined) {
    w.string(2, msg.sql);
  }
  if (msg.sqlId !== undefined) {
    w.int32(3, msg.sqlId);
  }
}
function DescribeReq(w, msg) {
  w.int32(1, msg.streamId);
  if (msg.sql !== undefined) {
    w.string(2, msg.sql);
  }
  if (msg.sqlId !== undefined) {
    w.int32(3, msg.sqlId);
  }
}
function StoreSqlReq(w, msg) {
  w.int32(1, msg.sqlId);
  w.string(2, msg.sql);
}
function CloseSqlReq(w, msg) {
  w.int32(1, msg.sqlId);
}
function GetAutocommitReq(w, msg) {
  w.int32(1, msg.streamId);
}
var init_protobuf_encode2 = __esm(() => {
  init_protobuf_encode();
  init_util2();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/shared/json_decode.js
function Error2(obj) {
  const message = string(obj["message"]);
  const code = stringOpt(obj["code"]);
  return { message, code };
}
function StmtResult(obj) {
  const cols = arrayObjectsMap(obj["cols"], Col);
  const rows = array(obj["rows"]).map((rowObj) => arrayObjectsMap(rowObj, Value3));
  const affectedRowCount = number(obj["affected_row_count"]);
  const lastInsertRowidStr = stringOpt(obj["last_insert_rowid"]);
  const lastInsertRowid = lastInsertRowidStr !== undefined ? BigInt(lastInsertRowidStr) : undefined;
  return { cols, rows, affectedRowCount, lastInsertRowid };
}
function Col(obj) {
  const name = stringOpt(obj["name"]);
  const decltype = stringOpt(obj["decltype"]);
  return { name, decltype };
}
function BatchResult(obj) {
  const stepResults = new Map;
  array(obj["step_results"]).forEach((value, i) => {
    if (value !== null) {
      stepResults.set(i, StmtResult(object(value)));
    }
  });
  const stepErrors = new Map;
  array(obj["step_errors"]).forEach((value, i) => {
    if (value !== null) {
      stepErrors.set(i, Error2(object(value)));
    }
  });
  return { stepResults, stepErrors };
}
function CursorEntry(obj) {
  const type = string(obj["type"]);
  if (type === "step_begin") {
    const step = number(obj["step"]);
    const cols = arrayObjectsMap(obj["cols"], Col);
    return { type: "step_begin", step, cols };
  } else if (type === "step_end") {
    const affectedRowCount = number(obj["affected_row_count"]);
    const lastInsertRowidStr = stringOpt(obj["last_insert_rowid"]);
    const lastInsertRowid = lastInsertRowidStr !== undefined ? BigInt(lastInsertRowidStr) : undefined;
    return { type: "step_end", affectedRowCount, lastInsertRowid };
  } else if (type === "step_error") {
    const step = number(obj["step"]);
    const error = Error2(object(obj["error"]));
    return { type: "step_error", step, error };
  } else if (type === "row") {
    const row = arrayObjectsMap(obj["row"], Value3);
    return { type: "row", row };
  } else if (type === "error") {
    const error = Error2(object(obj["error"]));
    return { type: "error", error };
  } else {
    throw new ProtoError("Unexpected type of CursorEntry");
  }
}
function DescribeResult(obj) {
  const params = arrayObjectsMap(obj["params"], DescribeParam);
  const cols = arrayObjectsMap(obj["cols"], DescribeCol);
  const isExplain = boolean(obj["is_explain"]);
  const isReadonly = boolean(obj["is_readonly"]);
  return { params, cols, isExplain, isReadonly };
}
function DescribeParam(obj) {
  const name = stringOpt(obj["name"]);
  return { name };
}
function DescribeCol(obj) {
  const name = string(obj["name"]);
  const decltype = stringOpt(obj["decltype"]);
  return { name, decltype };
}
function Value3(obj) {
  const type = string(obj["type"]);
  if (type === "null") {
    return null;
  } else if (type === "integer") {
    const value = string(obj["value"]);
    return BigInt(value);
  } else if (type === "float") {
    return number(obj["value"]);
  } else if (type === "text") {
    return string(obj["value"]);
  } else if (type === "blob") {
    return gBase64.toUint8Array(string(obj["base64"]));
  } else {
    throw new ProtoError("Unexpected type of Value");
  }
}
var init_json_decode = __esm(() => {
  init_base64();
  init_errors();
  init_decode();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/ws/json_decode.js
function ServerMsg(obj) {
  const type = string(obj["type"]);
  if (type === "hello_ok") {
    return { type: "hello_ok" };
  } else if (type === "hello_error") {
    const error = Error2(object(obj["error"]));
    return { type: "hello_error", error };
  } else if (type === "response_ok") {
    const requestId = number(obj["request_id"]);
    const response = Response(object(obj["response"]));
    return { type: "response_ok", requestId, response };
  } else if (type === "response_error") {
    const requestId = number(obj["request_id"]);
    const error = Error2(object(obj["error"]));
    return { type: "response_error", requestId, error };
  } else {
    throw new ProtoError("Unexpected type of ServerMsg");
  }
}
function Response(obj) {
  const type = string(obj["type"]);
  if (type === "open_stream") {
    return { type: "open_stream" };
  } else if (type === "close_stream") {
    return { type: "close_stream" };
  } else if (type === "execute") {
    const result = StmtResult(object(obj["result"]));
    return { type: "execute", result };
  } else if (type === "batch") {
    const result = BatchResult(object(obj["result"]));
    return { type: "batch", result };
  } else if (type === "open_cursor") {
    return { type: "open_cursor" };
  } else if (type === "close_cursor") {
    return { type: "close_cursor" };
  } else if (type === "fetch_cursor") {
    const entries = arrayObjectsMap(obj["entries"], CursorEntry);
    const done = boolean(obj["done"]);
    return { type: "fetch_cursor", entries, done };
  } else if (type === "sequence") {
    return { type: "sequence" };
  } else if (type === "describe") {
    const result = DescribeResult(object(obj["result"]));
    return { type: "describe", result };
  } else if (type === "store_sql") {
    return { type: "store_sql" };
  } else if (type === "close_sql") {
    return { type: "close_sql" };
  } else if (type === "get_autocommit") {
    const isAutocommit = boolean(obj["is_autocommit"]);
    return { type: "get_autocommit", isAutocommit };
  } else {
    throw new ProtoError("Unexpected type of Response");
  }
}
var init_json_decode2 = __esm(() => {
  init_errors();
  init_decode();
  init_json_decode();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/shared/protobuf_decode.js
var Error3, StmtResult2, Col2, Row, BatchResult2, BatchResultStepResult, BatchResultStepError, CursorEntry2, StepBeginEntry, StepEndEntry, StepErrorEntry, DescribeResult2, DescribeParam2, DescribeCol2, Value4;
var init_protobuf_decode = __esm(() => {
  Error3 = {
    default() {
      return { message: "", code: undefined };
    },
    1(r, msg) {
      msg.message = r.string();
    },
    2(r, msg) {
      msg.code = r.string();
    }
  };
  StmtResult2 = {
    default() {
      return {
        cols: [],
        rows: [],
        affectedRowCount: 0,
        lastInsertRowid: undefined
      };
    },
    1(r, msg) {
      msg.cols.push(r.message(Col2));
    },
    2(r, msg) {
      msg.rows.push(r.message(Row));
    },
    3(r, msg) {
      msg.affectedRowCount = Number(r.uint64());
    },
    4(r, msg) {
      msg.lastInsertRowid = r.sint64();
    }
  };
  Col2 = {
    default() {
      return { name: undefined, decltype: undefined };
    },
    1(r, msg) {
      msg.name = r.string();
    },
    2(r, msg) {
      msg.decltype = r.string();
    }
  };
  Row = {
    default() {
      return [];
    },
    1(r, msg) {
      msg.push(r.message(Value4));
    }
  };
  BatchResult2 = {
    default() {
      return { stepResults: new Map, stepErrors: new Map };
    },
    1(r, msg) {
      const [key, value] = r.message(BatchResultStepResult);
      msg.stepResults.set(key, value);
    },
    2(r, msg) {
      const [key, value] = r.message(BatchResultStepError);
      msg.stepErrors.set(key, value);
    }
  };
  BatchResultStepResult = {
    default() {
      return [0, StmtResult2.default()];
    },
    1(r, msg) {
      msg[0] = r.uint32();
    },
    2(r, msg) {
      msg[1] = r.message(StmtResult2);
    }
  };
  BatchResultStepError = {
    default() {
      return [0, Error3.default()];
    },
    1(r, msg) {
      msg[0] = r.uint32();
    },
    2(r, msg) {
      msg[1] = r.message(Error3);
    }
  };
  CursorEntry2 = {
    default() {
      return { type: "none" };
    },
    1(r) {
      return r.message(StepBeginEntry);
    },
    2(r) {
      return r.message(StepEndEntry);
    },
    3(r) {
      return r.message(StepErrorEntry);
    },
    4(r) {
      return { type: "row", row: r.message(Row) };
    },
    5(r) {
      return { type: "error", error: r.message(Error3) };
    }
  };
  StepBeginEntry = {
    default() {
      return { type: "step_begin", step: 0, cols: [] };
    },
    1(r, msg) {
      msg.step = r.uint32();
    },
    2(r, msg) {
      msg.cols.push(r.message(Col2));
    }
  };
  StepEndEntry = {
    default() {
      return {
        type: "step_end",
        affectedRowCount: 0,
        lastInsertRowid: undefined
      };
    },
    1(r, msg) {
      msg.affectedRowCount = r.uint32();
    },
    2(r, msg) {
      msg.lastInsertRowid = r.uint64();
    }
  };
  StepErrorEntry = {
    default() {
      return {
        type: "step_error",
        step: 0,
        error: Error3.default()
      };
    },
    1(r, msg) {
      msg.step = r.uint32();
    },
    2(r, msg) {
      msg.error = r.message(Error3);
    }
  };
  DescribeResult2 = {
    default() {
      return {
        params: [],
        cols: [],
        isExplain: false,
        isReadonly: false
      };
    },
    1(r, msg) {
      msg.params.push(r.message(DescribeParam2));
    },
    2(r, msg) {
      msg.cols.push(r.message(DescribeCol2));
    },
    3(r, msg) {
      msg.isExplain = r.bool();
    },
    4(r, msg) {
      msg.isReadonly = r.bool();
    }
  };
  DescribeParam2 = {
    default() {
      return { name: undefined };
    },
    1(r, msg) {
      msg.name = r.string();
    }
  };
  DescribeCol2 = {
    default() {
      return { name: "", decltype: undefined };
    },
    1(r, msg) {
      msg.name = r.string();
    },
    2(r, msg) {
      msg.decltype = r.string();
    }
  };
  Value4 = {
    default() {
      return;
    },
    1(r) {
      return null;
    },
    2(r) {
      return r.sint64();
    },
    3(r) {
      return r.double();
    },
    4(r) {
      return r.string();
    },
    5(r) {
      return r.bytes();
    }
  };
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/ws/protobuf_decode.js
var ServerMsg2, HelloErrorMsg, ResponseErrorMsg, ResponseOkMsg, ExecuteResp, BatchResp, FetchCursorResp, DescribeResp, GetAutocommitResp;
var init_protobuf_decode2 = __esm(() => {
  init_protobuf_decode();
  ServerMsg2 = {
    default() {
      return { type: "none" };
    },
    1(r) {
      return { type: "hello_ok" };
    },
    2(r) {
      return r.message(HelloErrorMsg);
    },
    3(r) {
      return r.message(ResponseOkMsg);
    },
    4(r) {
      return r.message(ResponseErrorMsg);
    }
  };
  HelloErrorMsg = {
    default() {
      return { type: "hello_error", error: Error3.default() };
    },
    1(r, msg) {
      msg.error = r.message(Error3);
    }
  };
  ResponseErrorMsg = {
    default() {
      return { type: "response_error", requestId: 0, error: Error3.default() };
    },
    1(r, msg) {
      msg.requestId = r.int32();
    },
    2(r, msg) {
      msg.error = r.message(Error3);
    }
  };
  ResponseOkMsg = {
    default() {
      return {
        type: "response_ok",
        requestId: 0,
        response: { type: "none" }
      };
    },
    1(r, msg) {
      msg.requestId = r.int32();
    },
    2(r, msg) {
      msg.response = { type: "open_stream" };
    },
    3(r, msg) {
      msg.response = { type: "close_stream" };
    },
    4(r, msg) {
      msg.response = r.message(ExecuteResp);
    },
    5(r, msg) {
      msg.response = r.message(BatchResp);
    },
    6(r, msg) {
      msg.response = { type: "open_cursor" };
    },
    7(r, msg) {
      msg.response = { type: "close_cursor" };
    },
    8(r, msg) {
      msg.response = r.message(FetchCursorResp);
    },
    9(r, msg) {
      msg.response = { type: "sequence" };
    },
    10(r, msg) {
      msg.response = r.message(DescribeResp);
    },
    11(r, msg) {
      msg.response = { type: "store_sql" };
    },
    12(r, msg) {
      msg.response = { type: "close_sql" };
    },
    13(r, msg) {
      msg.response = r.message(GetAutocommitResp);
    }
  };
  ExecuteResp = {
    default() {
      return { type: "execute", result: StmtResult2.default() };
    },
    1(r, msg) {
      msg.result = r.message(StmtResult2);
    }
  };
  BatchResp = {
    default() {
      return { type: "batch", result: BatchResult2.default() };
    },
    1(r, msg) {
      msg.result = r.message(BatchResult2);
    }
  };
  FetchCursorResp = {
    default() {
      return { type: "fetch_cursor", entries: [], done: false };
    },
    1(r, msg) {
      msg.entries.push(r.message(CursorEntry2));
    },
    2(r, msg) {
      msg.done = r.bool();
    }
  };
  DescribeResp = {
    default() {
      return { type: "describe", result: DescribeResult2.default() };
    },
    1(r, msg) {
      msg.result = r.message(DescribeResult2);
    }
  };
  GetAutocommitResp = {
    default() {
      return { type: "get_autocommit", isAutocommit: false };
    },
    1(r, msg) {
      msg.isAutocommit = r.bool();
    }
  };
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/ws/client.js
var subprotocolsV2, subprotocolsV3, WsClient;
var init_client = __esm(() => {
  init_encoding();
  init_errors();
  init_id_alloc();
  init_result();
  init_sql();
  init_util2();
  init_stream2();
  init_json_encode2();
  init_protobuf_encode2();
  init_json_decode2();
  init_protobuf_decode2();
  subprotocolsV2 = new Map([
    ["hrana2", { version: 2, encoding: "json" }],
    ["hrana1", { version: 1, encoding: "json" }]
  ]);
  subprotocolsV3 = new Map([
    ["hrana3-protobuf", { version: 3, encoding: "protobuf" }],
    ["hrana3", { version: 3, encoding: "json" }],
    ["hrana2", { version: 2, encoding: "json" }],
    ["hrana1", { version: 1, encoding: "json" }]
  ]);
  WsClient = class WsClient extends Client {
    #socket;
    #openCallbacks;
    #opened;
    #closed;
    #recvdHello;
    #subprotocol;
    #getVersionCalled;
    #responseMap;
    #requestIdAlloc;
    _streamIdAlloc;
    _cursorIdAlloc;
    #sqlIdAlloc;
    constructor(socket, jwt) {
      super();
      this.#socket = socket;
      this.#openCallbacks = [];
      this.#opened = false;
      this.#closed = undefined;
      this.#recvdHello = false;
      this.#subprotocol = undefined;
      this.#getVersionCalled = false;
      this.#responseMap = new Map;
      this.#requestIdAlloc = new IdAlloc;
      this._streamIdAlloc = new IdAlloc;
      this._cursorIdAlloc = new IdAlloc;
      this.#sqlIdAlloc = new IdAlloc;
      this.#socket.binaryType = "arraybuffer";
      this.#socket.addEventListener("open", () => this.#onSocketOpen());
      this.#socket.addEventListener("close", (event) => this.#onSocketClose(event));
      this.#socket.addEventListener("error", (event) => this.#onSocketError(event));
      this.#socket.addEventListener("message", (event) => this.#onSocketMessage(event));
      this.#send({ type: "hello", jwt });
    }
    #send(msg) {
      if (this.#closed !== undefined) {
        throw new InternalError("Trying to send a message on a closed client");
      }
      if (this.#opened) {
        this.#sendToSocket(msg);
      } else {
        const openCallback = () => this.#sendToSocket(msg);
        const errorCallback = () => {
          return;
        };
        this.#openCallbacks.push({ openCallback, errorCallback });
      }
    }
    #onSocketOpen() {
      const protocol = this.#socket.protocol;
      if (protocol === undefined) {
        this.#setClosed(new ClientError("The `WebSocket.protocol` property is undefined. This most likely means that the WebSocket " + "implementation provided by the environment is broken. If you are using Miniflare 2, " + "please update to Miniflare 3, which fixes this problem."));
        return;
      } else if (protocol === "") {
        this.#subprotocol = { version: 1, encoding: "json" };
      } else {
        this.#subprotocol = subprotocolsV3.get(protocol);
        if (this.#subprotocol === undefined) {
          this.#setClosed(new ProtoError(`Unrecognized WebSocket subprotocol: ${JSON.stringify(protocol)}`));
          return;
        }
      }
      for (const callbacks of this.#openCallbacks) {
        callbacks.openCallback();
      }
      this.#openCallbacks.length = 0;
      this.#opened = true;
    }
    #sendToSocket(msg) {
      const encoding = this.#subprotocol.encoding;
      if (encoding === "json") {
        const jsonMsg = writeJsonObject(msg, ClientMsg);
        this.#socket.send(jsonMsg);
      } else if (encoding === "protobuf") {
        const protobufMsg = writeProtobufMessage(msg, ClientMsg2);
        this.#socket.send(protobufMsg);
      } else {
        throw impossible(encoding, "Impossible encoding");
      }
    }
    getVersion() {
      return new Promise((versionCallback, errorCallback) => {
        this.#getVersionCalled = true;
        if (this.#closed !== undefined) {
          errorCallback(this.#closed);
        } else if (!this.#opened) {
          const openCallback = () => versionCallback(this.#subprotocol.version);
          this.#openCallbacks.push({ openCallback, errorCallback });
        } else {
          versionCallback(this.#subprotocol.version);
        }
      });
    }
    _ensureVersion(minVersion, feature) {
      if (this.#subprotocol === undefined || !this.#getVersionCalled) {
        throw new ProtocolVersionError(`${feature} is supported only on protocol version ${minVersion} and higher, ` + "but the version supported by the WebSocket server is not yet known. " + "Use Client.getVersion() to wait until the version is available.");
      } else if (this.#subprotocol.version < minVersion) {
        throw new ProtocolVersionError(`${feature} is supported on protocol version ${minVersion} and higher, ` + `but the WebSocket server only supports version ${this.#subprotocol.version}`);
      }
    }
    _sendRequest(request, callbacks) {
      if (this.#closed !== undefined) {
        callbacks.errorCallback(new ClosedError("Client is closed", this.#closed));
        return;
      }
      const requestId = this.#requestIdAlloc.alloc();
      this.#responseMap.set(requestId, { ...callbacks, type: request.type });
      this.#send({ type: "request", requestId, request });
    }
    #onSocketError(event) {
      const eventMessage = event.message;
      const message = eventMessage ?? "WebSocket was closed due to an error";
      this.#setClosed(new WebSocketError(message));
    }
    #onSocketClose(event) {
      let message = `WebSocket was closed with code ${event.code}`;
      if (event.reason) {
        message += `: ${event.reason}`;
      }
      this.#setClosed(new WebSocketError(message));
    }
    #setClosed(error) {
      if (this.#closed !== undefined) {
        return;
      }
      this.#closed = error;
      for (const callbacks of this.#openCallbacks) {
        callbacks.errorCallback(error);
      }
      this.#openCallbacks.length = 0;
      for (const [requestId, responseState] of this.#responseMap.entries()) {
        responseState.errorCallback(error);
        this.#requestIdAlloc.free(requestId);
      }
      this.#responseMap.clear();
      this.#socket.close();
    }
    #onSocketMessage(event) {
      if (this.#closed !== undefined) {
        return;
      }
      try {
        let msg;
        const encoding = this.#subprotocol.encoding;
        if (encoding === "json") {
          if (typeof event.data !== "string") {
            this.#socket.close(3003, "Only text messages are accepted with JSON encoding");
            this.#setClosed(new ProtoError("Received non-text message from server with JSON encoding"));
            return;
          }
          msg = readJsonObject(JSON.parse(event.data), ServerMsg);
        } else if (encoding === "protobuf") {
          if (!(event.data instanceof ArrayBuffer)) {
            this.#socket.close(3003, "Only binary messages are accepted with Protobuf encoding");
            this.#setClosed(new ProtoError("Received non-binary message from server with Protobuf encoding"));
            return;
          }
          msg = readProtobufMessage(new Uint8Array(event.data), ServerMsg2);
        } else {
          throw impossible(encoding, "Impossible encoding");
        }
        this.#handleMsg(msg);
      } catch (e) {
        this.#socket.close(3007, "Could not handle message");
        this.#setClosed(e);
      }
    }
    #handleMsg(msg) {
      if (msg.type === "none") {
        throw new ProtoError("Received an unrecognized ServerMsg");
      } else if (msg.type === "hello_ok" || msg.type === "hello_error") {
        if (this.#recvdHello) {
          throw new ProtoError("Received a duplicated hello response");
        }
        this.#recvdHello = true;
        if (msg.type === "hello_error") {
          throw errorFromProto(msg.error);
        }
        return;
      } else if (!this.#recvdHello) {
        throw new ProtoError("Received a non-hello message before a hello response");
      }
      if (msg.type === "response_ok") {
        const requestId = msg.requestId;
        const responseState = this.#responseMap.get(requestId);
        this.#responseMap.delete(requestId);
        if (responseState === undefined) {
          throw new ProtoError("Received unexpected OK response");
        }
        this.#requestIdAlloc.free(requestId);
        try {
          if (responseState.type !== msg.response.type) {
            console.dir({ responseState, msg });
            throw new ProtoError("Received unexpected type of response");
          }
          responseState.responseCallback(msg.response);
        } catch (e) {
          responseState.errorCallback(e);
          throw e;
        }
      } else if (msg.type === "response_error") {
        const requestId = msg.requestId;
        const responseState = this.#responseMap.get(requestId);
        this.#responseMap.delete(requestId);
        if (responseState === undefined) {
          throw new ProtoError("Received unexpected error response");
        }
        this.#requestIdAlloc.free(requestId);
        responseState.errorCallback(errorFromProto(msg.error));
      } else {
        throw impossible(msg, "Impossible ServerMsg type");
      }
    }
    openStream() {
      return WsStream.open(this);
    }
    storeSql(sql) {
      this._ensureVersion(2, "storeSql()");
      const sqlId = this.#sqlIdAlloc.alloc();
      const sqlObj = new Sql(this, sqlId);
      const responseCallback = () => {
        return;
      };
      const errorCallback = (e) => sqlObj._setClosed(e);
      const request = { type: "store_sql", sqlId, sql };
      this._sendRequest(request, { responseCallback, errorCallback });
      return sqlObj;
    }
    _closeSql(sqlId) {
      if (this.#closed !== undefined) {
        return;
      }
      const responseCallback = () => this.#sqlIdAlloc.free(sqlId);
      const errorCallback = (e) => this.#setClosed(e);
      const request = { type: "close_sql", sqlId };
      this._sendRequest(request, { responseCallback, errorCallback });
    }
    close() {
      this.#setClosed(new ClientError("Client was manually closed"));
    }
    get closed() {
      return this.#closed !== undefined;
    }
  };
});

// node_modules/.bun/@libsql+isomorphic-fetch@0.3.1/node_modules/@libsql/isomorphic-fetch/node.js
var _Request, _Headers, _fetch;
var init_node2 = __esm(() => {
  _Request = Request;
  _Headers = Headers;
  _fetch = fetch;
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/queue_microtask.js
var _queueMicrotask;
var init_queue_microtask = __esm(() => {
  if (typeof queueMicrotask !== "undefined") {
    _queueMicrotask = queueMicrotask;
  } else {
    const resolved = Promise.resolve();
    _queueMicrotask = (callback) => {
      resolved.then(callback);
    };
  }
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/byte_queue.js
class ByteQueue {
  #array;
  #shiftPos;
  #pushPos;
  constructor(initialCap) {
    this.#array = new Uint8Array(new ArrayBuffer(initialCap));
    this.#shiftPos = 0;
    this.#pushPos = 0;
  }
  get length() {
    return this.#pushPos - this.#shiftPos;
  }
  data() {
    return this.#array.slice(this.#shiftPos, this.#pushPos);
  }
  push(chunk) {
    this.#ensurePush(chunk.byteLength);
    this.#array.set(chunk, this.#pushPos);
    this.#pushPos += chunk.byteLength;
  }
  #ensurePush(pushLength) {
    if (this.#pushPos + pushLength <= this.#array.byteLength) {
      return;
    }
    const filledLength = this.#pushPos - this.#shiftPos;
    if (filledLength + pushLength <= this.#array.byteLength && 2 * this.#pushPos >= this.#array.byteLength) {
      this.#array.copyWithin(0, this.#shiftPos, this.#pushPos);
    } else {
      let newCap = this.#array.byteLength;
      do {
        newCap *= 2;
      } while (filledLength + pushLength > newCap);
      const newArray = new Uint8Array(new ArrayBuffer(newCap));
      newArray.set(this.#array.slice(this.#shiftPos, this.#pushPos), 0);
      this.#array = newArray;
    }
    this.#pushPos = filledLength;
    this.#shiftPos = 0;
  }
  shift(length) {
    this.#shiftPos += length;
  }
}

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/http/json_decode.js
function PipelineRespBody(obj) {
  const baton = stringOpt(obj["baton"]);
  const baseUrl = stringOpt(obj["base_url"]);
  const results = arrayObjectsMap(obj["results"], StreamResult);
  return { baton, baseUrl, results };
}
function StreamResult(obj) {
  const type = string(obj["type"]);
  if (type === "ok") {
    const response = StreamResponse(object(obj["response"]));
    return { type: "ok", response };
  } else if (type === "error") {
    const error = Error2(object(obj["error"]));
    return { type: "error", error };
  } else {
    throw new ProtoError("Unexpected type of StreamResult");
  }
}
function StreamResponse(obj) {
  const type = string(obj["type"]);
  if (type === "close") {
    return { type: "close" };
  } else if (type === "execute") {
    const result = StmtResult(object(obj["result"]));
    return { type: "execute", result };
  } else if (type === "batch") {
    const result = BatchResult(object(obj["result"]));
    return { type: "batch", result };
  } else if (type === "sequence") {
    return { type: "sequence" };
  } else if (type === "describe") {
    const result = DescribeResult(object(obj["result"]));
    return { type: "describe", result };
  } else if (type === "store_sql") {
    return { type: "store_sql" };
  } else if (type === "close_sql") {
    return { type: "close_sql" };
  } else if (type === "get_autocommit") {
    const isAutocommit = boolean(obj["is_autocommit"]);
    return { type: "get_autocommit", isAutocommit };
  } else {
    throw new ProtoError("Unexpected type of StreamResponse");
  }
}
function CursorRespBody(obj) {
  const baton = stringOpt(obj["baton"]);
  const baseUrl = stringOpt(obj["base_url"]);
  return { baton, baseUrl };
}
var init_json_decode3 = __esm(() => {
  init_errors();
  init_decode();
  init_json_decode();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/http/protobuf_decode.js
var PipelineRespBody2, StreamResult2, StreamResponse2, ExecuteStreamResp, BatchStreamResp, DescribeStreamResp, GetAutocommitStreamResp, CursorRespBody2;
var init_protobuf_decode3 = __esm(() => {
  init_protobuf_decode();
  PipelineRespBody2 = {
    default() {
      return { baton: undefined, baseUrl: undefined, results: [] };
    },
    1(r, msg) {
      msg.baton = r.string();
    },
    2(r, msg) {
      msg.baseUrl = r.string();
    },
    3(r, msg) {
      msg.results.push(r.message(StreamResult2));
    }
  };
  StreamResult2 = {
    default() {
      return { type: "none" };
    },
    1(r) {
      return { type: "ok", response: r.message(StreamResponse2) };
    },
    2(r) {
      return { type: "error", error: r.message(Error3) };
    }
  };
  StreamResponse2 = {
    default() {
      return { type: "none" };
    },
    1(r) {
      return { type: "close" };
    },
    2(r) {
      return r.message(ExecuteStreamResp);
    },
    3(r) {
      return r.message(BatchStreamResp);
    },
    4(r) {
      return { type: "sequence" };
    },
    5(r) {
      return r.message(DescribeStreamResp);
    },
    6(r) {
      return { type: "store_sql" };
    },
    7(r) {
      return { type: "close_sql" };
    },
    8(r) {
      return r.message(GetAutocommitStreamResp);
    }
  };
  ExecuteStreamResp = {
    default() {
      return { type: "execute", result: StmtResult2.default() };
    },
    1(r, msg) {
      msg.result = r.message(StmtResult2);
    }
  };
  BatchStreamResp = {
    default() {
      return { type: "batch", result: BatchResult2.default() };
    },
    1(r, msg) {
      msg.result = r.message(BatchResult2);
    }
  };
  DescribeStreamResp = {
    default() {
      return { type: "describe", result: DescribeResult2.default() };
    },
    1(r, msg) {
      msg.result = r.message(DescribeResult2);
    }
  };
  GetAutocommitStreamResp = {
    default() {
      return { type: "get_autocommit", isAutocommit: false };
    },
    1(r, msg) {
      msg.isAutocommit = r.bool();
    }
  };
  CursorRespBody2 = {
    default() {
      return { baton: undefined, baseUrl: undefined };
    },
    1(r, msg) {
      msg.baton = r.string();
    },
    2(r, msg) {
      msg.baseUrl = r.string();
    }
  };
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/http/cursor.js
var HttpCursor;
var init_cursor2 = __esm(() => {
  init_decode();
  init_decode2();
  init_errors();
  init_util2();
  init_json_decode3();
  init_protobuf_decode3();
  init_json_decode();
  init_protobuf_decode();
  HttpCursor = class HttpCursor extends Cursor {
    #stream;
    #encoding;
    #reader;
    #queue;
    #closed;
    #done;
    constructor(stream, encoding) {
      super();
      this.#stream = stream;
      this.#encoding = encoding;
      this.#reader = undefined;
      this.#queue = new ByteQueue(16 * 1024);
      this.#closed = undefined;
      this.#done = false;
    }
    async open(response) {
      if (response.body === null) {
        throw new ProtoError("No response body for cursor request");
      }
      this.#reader = response.body.getReader();
      const respBody = await this.#nextItem(CursorRespBody, CursorRespBody2);
      if (respBody === undefined) {
        throw new ProtoError("Empty response to cursor request");
      }
      return respBody;
    }
    next() {
      return this.#nextItem(CursorEntry, CursorEntry2);
    }
    close() {
      this._setClosed(new ClientError("Cursor was manually closed"));
    }
    _setClosed(error) {
      if (this.#closed !== undefined) {
        return;
      }
      this.#closed = error;
      this.#stream._cursorClosed(this);
      if (this.#reader !== undefined) {
        this.#reader.cancel();
      }
    }
    get closed() {
      return this.#closed !== undefined;
    }
    async#nextItem(jsonFun, protobufDef) {
      for (;; ) {
        if (this.#done) {
          return;
        } else if (this.#closed !== undefined) {
          throw new ClosedError("Cursor is closed", this.#closed);
        }
        if (this.#encoding === "json") {
          const jsonData = this.#parseItemJson();
          if (jsonData !== undefined) {
            const jsonText = new TextDecoder().decode(jsonData);
            const jsonValue = JSON.parse(jsonText);
            return readJsonObject(jsonValue, jsonFun);
          }
        } else if (this.#encoding === "protobuf") {
          const protobufData = this.#parseItemProtobuf();
          if (protobufData !== undefined) {
            return readProtobufMessage(protobufData, protobufDef);
          }
        } else {
          throw impossible(this.#encoding, "Impossible encoding");
        }
        if (this.#reader === undefined) {
          throw new InternalError("Attempted to read from HTTP cursor before it was opened");
        }
        const { value, done } = await this.#reader.read();
        if (done && this.#queue.length === 0) {
          this.#done = true;
        } else if (done) {
          throw new ProtoError("Unexpected end of cursor stream");
        } else {
          this.#queue.push(value);
        }
      }
    }
    #parseItemJson() {
      const data = this.#queue.data();
      const newlineByte = 10;
      const newlinePos = data.indexOf(newlineByte);
      if (newlinePos < 0) {
        return;
      }
      const jsonData = data.slice(0, newlinePos);
      this.#queue.shift(newlinePos + 1);
      return jsonData;
    }
    #parseItemProtobuf() {
      const data = this.#queue.data();
      let varintValue = 0;
      let varintLength = 0;
      for (;; ) {
        if (varintLength >= data.byteLength) {
          return;
        }
        const byte = data[varintLength];
        varintValue |= (byte & 127) << 7 * varintLength;
        varintLength += 1;
        if (!(byte & 128)) {
          break;
        }
      }
      if (data.byteLength < varintLength + varintValue) {
        return;
      }
      const protobufData = data.slice(varintLength, varintLength + varintValue);
      this.#queue.shift(varintLength + varintValue);
      return protobufData;
    }
  };
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/http/json_encode.js
function PipelineReqBody(w, msg) {
  if (msg.baton !== undefined) {
    w.string("baton", msg.baton);
  }
  w.arrayObjects("requests", msg.requests, StreamRequest);
}
function StreamRequest(w, msg) {
  w.stringRaw("type", msg.type);
  if (msg.type === "close") {} else if (msg.type === "execute") {
    w.object("stmt", msg.stmt, Stmt2);
  } else if (msg.type === "batch") {
    w.object("batch", msg.batch, Batch2);
  } else if (msg.type === "sequence") {
    if (msg.sql !== undefined) {
      w.string("sql", msg.sql);
    }
    if (msg.sqlId !== undefined) {
      w.number("sql_id", msg.sqlId);
    }
  } else if (msg.type === "describe") {
    if (msg.sql !== undefined) {
      w.string("sql", msg.sql);
    }
    if (msg.sqlId !== undefined) {
      w.number("sql_id", msg.sqlId);
    }
  } else if (msg.type === "store_sql") {
    w.number("sql_id", msg.sqlId);
    w.string("sql", msg.sql);
  } else if (msg.type === "close_sql") {
    w.number("sql_id", msg.sqlId);
  } else if (msg.type === "get_autocommit") {} else {
    throw impossible(msg, "Impossible type of StreamRequest");
  }
}
function CursorReqBody(w, msg) {
  if (msg.baton !== undefined) {
    w.string("baton", msg.baton);
  }
  w.object("batch", msg.batch, Batch2);
}
var init_json_encode3 = __esm(() => {
  init_json_encode();
  init_util2();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/http/protobuf_encode.js
function PipelineReqBody2(w, msg) {
  if (msg.baton !== undefined) {
    w.string(1, msg.baton);
  }
  for (const req of msg.requests) {
    w.message(2, req, StreamRequest2);
  }
}
function StreamRequest2(w, msg) {
  if (msg.type === "close") {
    w.message(1, msg, CloseStreamReq2);
  } else if (msg.type === "execute") {
    w.message(2, msg, ExecuteStreamReq);
  } else if (msg.type === "batch") {
    w.message(3, msg, BatchStreamReq);
  } else if (msg.type === "sequence") {
    w.message(4, msg, SequenceStreamReq);
  } else if (msg.type === "describe") {
    w.message(5, msg, DescribeStreamReq);
  } else if (msg.type === "store_sql") {
    w.message(6, msg, StoreSqlStreamReq);
  } else if (msg.type === "close_sql") {
    w.message(7, msg, CloseSqlStreamReq);
  } else if (msg.type === "get_autocommit") {
    w.message(8, msg, GetAutocommitStreamReq);
  } else {
    throw impossible(msg, "Impossible type of StreamRequest");
  }
}
function CloseStreamReq2(_w, _msg) {}
function ExecuteStreamReq(w, msg) {
  w.message(1, msg.stmt, Stmt3);
}
function BatchStreamReq(w, msg) {
  w.message(1, msg.batch, Batch3);
}
function SequenceStreamReq(w, msg) {
  if (msg.sql !== undefined) {
    w.string(1, msg.sql);
  }
  if (msg.sqlId !== undefined) {
    w.int32(2, msg.sqlId);
  }
}
function DescribeStreamReq(w, msg) {
  if (msg.sql !== undefined) {
    w.string(1, msg.sql);
  }
  if (msg.sqlId !== undefined) {
    w.int32(2, msg.sqlId);
  }
}
function StoreSqlStreamReq(w, msg) {
  w.int32(1, msg.sqlId);
  w.string(2, msg.sql);
}
function CloseSqlStreamReq(w, msg) {
  w.int32(1, msg.sqlId);
}
function GetAutocommitStreamReq(_w, _msg) {}
function CursorReqBody2(w, msg) {
  if (msg.baton !== undefined) {
    w.string(1, msg.baton);
  }
  w.message(2, msg.batch, Batch3);
}
var init_protobuf_encode3 = __esm(() => {
  init_protobuf_encode();
  init_util2();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/http/stream.js
function handlePipelineResponse(pipeline, respBody) {
  if (respBody.results.length !== pipeline.length) {
    throw new ProtoError("Server returned unexpected number of pipeline results");
  }
  for (let i = 0;i < pipeline.length; ++i) {
    const result = respBody.results[i];
    const entry = pipeline[i];
    if (result.type === "ok") {
      if (result.response.type !== entry.request.type) {
        throw new ProtoError("Received unexpected type of response");
      }
      entry.responseCallback(result.response);
    } else if (result.type === "error") {
      entry.errorCallback(errorFromProto(result.error));
    } else if (result.type === "none") {
      throw new ProtoError("Received unrecognized type of StreamResult");
    } else {
      throw impossible(result, "Received impossible type of StreamResult");
    }
  }
}
async function decodePipelineResponse(resp, encoding) {
  if (encoding === "json") {
    const respJson = await resp.json();
    return readJsonObject(respJson, PipelineRespBody);
  }
  if (encoding === "protobuf") {
    const respData = await resp.arrayBuffer();
    return readProtobufMessage(new Uint8Array(respData), PipelineRespBody2);
  }
  await resp.body?.cancel();
  throw impossible(encoding, "Impossible encoding");
}
async function errorFromResponse(resp) {
  const respType = resp.headers.get("content-type") ?? "text/plain";
  let message = `Server returned HTTP status ${resp.status}`;
  if (respType === "application/json") {
    const respBody = await resp.json();
    if ("message" in respBody) {
      return errorFromProto(respBody);
    }
    return new HttpServerError(message, resp.status);
  }
  if (respType === "text/plain") {
    const respBody = (await resp.text()).trim();
    if (respBody !== "") {
      message += `: ${respBody}`;
    }
    return new HttpServerError(message, resp.status);
  }
  await resp.body?.cancel();
  return new HttpServerError(message, resp.status);
}
var HttpStream;
var init_stream3 = __esm(() => {
  init_node2();
  init_errors();
  init_encoding();
  init_id_alloc();
  init_queue_microtask();
  init_result();
  init_sql();
  init_stream();
  init_util2();
  init_cursor2();
  init_json_encode3();
  init_protobuf_encode3();
  init_json_encode3();
  init_protobuf_encode3();
  init_json_decode3();
  init_protobuf_decode3();
  HttpStream = class HttpStream extends Stream {
    #client;
    #baseUrl;
    #jwt;
    #fetch;
    #baton;
    #queue;
    #flushing;
    #cursor;
    #closing;
    #closeQueued;
    #closed;
    #sqlIdAlloc;
    constructor(client, baseUrl, jwt, customFetch) {
      super(client.intMode);
      this.#client = client;
      this.#baseUrl = baseUrl.toString();
      this.#jwt = jwt;
      this.#fetch = customFetch;
      this.#baton = undefined;
      this.#queue = new Queue;
      this.#flushing = false;
      this.#closing = false;
      this.#closeQueued = false;
      this.#closed = undefined;
      this.#sqlIdAlloc = new IdAlloc;
    }
    client() {
      return this.#client;
    }
    _sqlOwner() {
      return this;
    }
    storeSql(sql) {
      const sqlId = this.#sqlIdAlloc.alloc();
      this.#sendStreamRequest({ type: "store_sql", sqlId, sql }).then(() => {
        return;
      }, (error) => this._setClosed(error));
      return new Sql(this, sqlId);
    }
    _closeSql(sqlId) {
      if (this.#closed !== undefined) {
        return;
      }
      this.#sendStreamRequest({ type: "close_sql", sqlId }).then(() => this.#sqlIdAlloc.free(sqlId), (error) => this._setClosed(error));
    }
    _execute(stmt) {
      return this.#sendStreamRequest({ type: "execute", stmt }).then((response) => {
        return response.result;
      });
    }
    _batch(batch) {
      return this.#sendStreamRequest({ type: "batch", batch }).then((response) => {
        return response.result;
      });
    }
    _describe(protoSql) {
      return this.#sendStreamRequest({
        type: "describe",
        sql: protoSql.sql,
        sqlId: protoSql.sqlId
      }).then((response) => {
        return response.result;
      });
    }
    _sequence(protoSql) {
      return this.#sendStreamRequest({
        type: "sequence",
        sql: protoSql.sql,
        sqlId: protoSql.sqlId
      }).then((_response) => {
        return;
      });
    }
    getAutocommit() {
      this.#client._ensureVersion(3, "getAutocommit()");
      return this.#sendStreamRequest({
        type: "get_autocommit"
      }).then((response) => {
        return response.isAutocommit;
      });
    }
    #sendStreamRequest(request) {
      return new Promise((responseCallback, errorCallback) => {
        this.#pushToQueue({ type: "pipeline", request, responseCallback, errorCallback });
      });
    }
    _openCursor(batch) {
      return new Promise((cursorCallback, errorCallback) => {
        this.#pushToQueue({ type: "cursor", batch, cursorCallback, errorCallback });
      });
    }
    _cursorClosed(cursor) {
      if (cursor !== this.#cursor) {
        throw new InternalError("Cursor was closed, but it was not associated with the stream");
      }
      this.#cursor = undefined;
      _queueMicrotask(() => this.#flushQueue());
    }
    close() {
      this._setClosed(new ClientError("Stream was manually closed"));
    }
    closeGracefully() {
      this.#closing = true;
      _queueMicrotask(() => this.#flushQueue());
    }
    get closed() {
      return this.#closed !== undefined || this.#closing;
    }
    _setClosed(error) {
      if (this.#closed !== undefined) {
        return;
      }
      this.#closed = error;
      if (this.#cursor !== undefined) {
        this.#cursor._setClosed(error);
      }
      this.#client._streamClosed(this);
      for (;; ) {
        const entry = this.#queue.shift();
        if (entry !== undefined) {
          entry.errorCallback(error);
        } else {
          break;
        }
      }
      if ((this.#baton !== undefined || this.#flushing) && !this.#closeQueued) {
        this.#queue.push({
          type: "pipeline",
          request: { type: "close" },
          responseCallback: () => {
            return;
          },
          errorCallback: () => {
            return;
          }
        });
        this.#closeQueued = true;
        _queueMicrotask(() => this.#flushQueue());
      }
    }
    #pushToQueue(entry) {
      if (this.#closed !== undefined) {
        throw new ClosedError("Stream is closed", this.#closed);
      } else if (this.#closing) {
        throw new ClosedError("Stream is closing", undefined);
      } else {
        this.#queue.push(entry);
        _queueMicrotask(() => this.#flushQueue());
      }
    }
    #flushQueue() {
      if (this.#flushing || this.#cursor !== undefined) {
        return;
      }
      if (this.#closing && this.#queue.length === 0) {
        this._setClosed(new ClientError("Stream was gracefully closed"));
        return;
      }
      const endpoint = this.#client._endpoint;
      if (endpoint === undefined) {
        this.#client._endpointPromise.then(() => this.#flushQueue(), (error) => this._setClosed(error));
        return;
      }
      const firstEntry = this.#queue.shift();
      if (firstEntry === undefined) {
        return;
      } else if (firstEntry.type === "pipeline") {
        const pipeline = [firstEntry];
        for (;; ) {
          const entry = this.#queue.first();
          if (entry !== undefined && entry.type === "pipeline") {
            pipeline.push(entry);
            this.#queue.shift();
          } else if (entry === undefined && this.#closing && !this.#closeQueued) {
            pipeline.push({
              type: "pipeline",
              request: { type: "close" },
              responseCallback: () => {
                return;
              },
              errorCallback: () => {
                return;
              }
            });
            this.#closeQueued = true;
            break;
          } else {
            break;
          }
        }
        this.#flushPipeline(endpoint, pipeline);
      } else if (firstEntry.type === "cursor") {
        this.#flushCursor(endpoint, firstEntry);
      } else {
        throw impossible(firstEntry, "Impossible type of QueueEntry");
      }
    }
    #flushPipeline(endpoint, pipeline) {
      this.#flush(() => this.#createPipelineRequest(pipeline, endpoint), (resp) => decodePipelineResponse(resp, endpoint.encoding), (respBody) => respBody.baton, (respBody) => respBody.baseUrl, (respBody) => handlePipelineResponse(pipeline, respBody), (error) => pipeline.forEach((entry) => entry.errorCallback(error)));
    }
    #flushCursor(endpoint, entry) {
      const cursor = new HttpCursor(this, endpoint.encoding);
      this.#cursor = cursor;
      this.#flush(() => this.#createCursorRequest(entry, endpoint), (resp) => cursor.open(resp), (respBody) => respBody.baton, (respBody) => respBody.baseUrl, (_respBody) => entry.cursorCallback(cursor), (error) => entry.errorCallback(error));
    }
    #flush(createRequest, decodeResponse, getBaton, getBaseUrl, handleResponse, handleError) {
      let promise;
      try {
        const request = createRequest();
        const fetch2 = this.#fetch;
        promise = fetch2(request);
      } catch (error) {
        promise = Promise.reject(error);
      }
      this.#flushing = true;
      promise.then((resp) => {
        if (!resp.ok) {
          return errorFromResponse(resp).then((error) => {
            throw error;
          });
        }
        return decodeResponse(resp);
      }).then((r) => {
        this.#baton = getBaton(r);
        this.#baseUrl = getBaseUrl(r) ?? this.#baseUrl;
        handleResponse(r);
      }).catch((error) => {
        this._setClosed(error);
        handleError(error);
      }).finally(() => {
        this.#flushing = false;
        this.#flushQueue();
      });
    }
    #createPipelineRequest(pipeline, endpoint) {
      return this.#createRequest(new URL(endpoint.pipelinePath, this.#baseUrl), {
        baton: this.#baton,
        requests: pipeline.map((entry) => entry.request)
      }, endpoint.encoding, PipelineReqBody, PipelineReqBody2);
    }
    #createCursorRequest(entry, endpoint) {
      if (endpoint.cursorPath === undefined) {
        throw new ProtocolVersionError("Cursors are supported only on protocol version 3 and higher, " + `but the HTTP server only supports version ${endpoint.version}.`);
      }
      return this.#createRequest(new URL(endpoint.cursorPath, this.#baseUrl), {
        baton: this.#baton,
        batch: entry.batch
      }, endpoint.encoding, CursorReqBody, CursorReqBody2);
    }
    #createRequest(url, reqBody, encoding, jsonFun, protobufFun) {
      let bodyData;
      let contentType;
      if (encoding === "json") {
        bodyData = writeJsonObject(reqBody, jsonFun);
        contentType = "application/json";
      } else if (encoding === "protobuf") {
        bodyData = writeProtobufMessage(reqBody, protobufFun);
        contentType = "application/x-protobuf";
      } else {
        throw impossible(encoding, "Impossible encoding");
      }
      const headers = new _Headers;
      headers.set("content-type", contentType);
      if (this.#jwt !== undefined) {
        headers.set("authorization", `Bearer ${this.#jwt}`);
      }
      return new _Request(url.toString(), { method: "POST", headers, body: bodyData });
    }
  };
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/http/client.js
async function findEndpoint(customFetch, clientUrl) {
  const fetch2 = customFetch;
  for (const endpoint of checkEndpoints) {
    const url = new URL(endpoint.versionPath, clientUrl);
    const request = new _Request(url.toString(), { method: "GET" });
    const response = await fetch2(request);
    await response.arrayBuffer();
    if (response.ok) {
      return endpoint;
    }
  }
  return fallbackEndpoint;
}
var checkEndpoints, fallbackEndpoint, HttpClient;
var init_client2 = __esm(() => {
  init_node2();
  init_errors();
  init_stream3();
  checkEndpoints = [
    {
      versionPath: "v3-protobuf",
      pipelinePath: "v3-protobuf/pipeline",
      cursorPath: "v3-protobuf/cursor",
      version: 3,
      encoding: "protobuf"
    }
  ];
  fallbackEndpoint = {
    versionPath: "v2",
    pipelinePath: "v2/pipeline",
    cursorPath: undefined,
    version: 2,
    encoding: "json"
  };
  HttpClient = class HttpClient extends Client {
    #url;
    #jwt;
    #fetch;
    #closed;
    #streams;
    _endpointPromise;
    _endpoint;
    constructor(url, jwt, customFetch, protocolVersion = 2) {
      super();
      this.#url = url;
      this.#jwt = jwt;
      this.#fetch = customFetch ?? _fetch;
      this.#closed = undefined;
      this.#streams = new Set;
      if (protocolVersion == 3) {
        this._endpointPromise = findEndpoint(this.#fetch, this.#url);
        this._endpointPromise.then((endpoint) => this._endpoint = endpoint, (error) => this.#setClosed(error));
      } else {
        this._endpointPromise = Promise.resolve(fallbackEndpoint);
        this._endpointPromise.then((endpoint) => this._endpoint = endpoint, (error) => this.#setClosed(error));
      }
    }
    async getVersion() {
      if (this._endpoint !== undefined) {
        return this._endpoint.version;
      }
      return (await this._endpointPromise).version;
    }
    _ensureVersion(minVersion, feature) {
      if (minVersion <= fallbackEndpoint.version) {
        return;
      } else if (this._endpoint === undefined) {
        throw new ProtocolVersionError(`${feature} is supported only on protocol version ${minVersion} and higher, ` + "but the version supported by the HTTP server is not yet known. " + "Use Client.getVersion() to wait until the version is available.");
      } else if (this._endpoint.version < minVersion) {
        throw new ProtocolVersionError(`${feature} is supported only on protocol version ${minVersion} and higher, ` + `but the HTTP server only supports version ${this._endpoint.version}.`);
      }
    }
    openStream() {
      if (this.#closed !== undefined) {
        throw new ClosedError("Client is closed", this.#closed);
      }
      const stream = new HttpStream(this, this.#url, this.#jwt, this.#fetch);
      this.#streams.add(stream);
      return stream;
    }
    _streamClosed(stream) {
      this.#streams.delete(stream);
    }
    close() {
      this.#setClosed(new ClientError("Client was manually closed"));
    }
    get closed() {
      return this.#closed !== undefined;
    }
    #setClosed(error) {
      if (this.#closed !== undefined) {
        return;
      }
      this.#closed = error;
      for (const stream of Array.from(this.#streams)) {
        stream._setClosed(new ClosedError("Client was closed", error));
      }
    }
  };
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/libsql_url.js
var init_libsql_url = __esm(() => {
  init_errors();
});

// node_modules/.bun/@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client/lib-esm/index.js
function openWs(url, jwt, protocolVersion = 2) {
  if (typeof import_websocket.default === "undefined") {
    throw new WebSocketUnsupportedError("WebSockets are not supported in this environment");
  }
  var subprotocols = undefined;
  if (protocolVersion == 3) {
    subprotocols = Array.from(subprotocolsV3.keys());
  } else {
    subprotocols = Array.from(subprotocolsV2.keys());
  }
  const socket = new import_websocket.default(url, subprotocols);
  return new WsClient(socket, jwt);
}
function openHttp(url, jwt, customFetch, protocolVersion = 2) {
  return new HttpClient(url instanceof URL ? url : new URL(url), jwt, customFetch, protocolVersion);
}
var init_lib_esm = __esm(() => {
  init_node();
  init_client();
  init_errors();
  init_client2();
  init_client();
  init_node();
  init_node2();
  init_batch();
  init_libsql_url();
  init_sql();
  init_stmt();
  init_stream();
  init_client2();
  init_stream3();
  init_client();
  init_stream2();
  init_errors();
});

// node_modules/.bun/@libsql+client@0.15.15/node_modules/@libsql/client/lib-esm/hrana.js
class HranaTransaction {
  #mode;
  #version;
  #started;
  constructor(mode, version2) {
    this.#mode = mode;
    this.#version = version2;
    this.#started = undefined;
  }
  execute(stmt) {
    return this.batch([stmt]).then((results) => results[0]);
  }
  async batch(stmts) {
    const stream = this._getStream();
    if (stream.closed) {
      throw new LibsqlError("Cannot execute statements because the transaction is closed", "TRANSACTION_CLOSED");
    }
    try {
      const hranaStmts = stmts.map(stmtToHrana);
      let rowsPromises;
      if (this.#started === undefined) {
        this._getSqlCache().apply(hranaStmts);
        const batch = stream.batch(this.#version >= 3);
        const beginStep = batch.step();
        const beginPromise = beginStep.run(transactionModeToBegin(this.#mode));
        let lastStep = beginStep;
        rowsPromises = hranaStmts.map((hranaStmt) => {
          const stmtStep = batch.step().condition(BatchCond.ok(lastStep));
          if (this.#version >= 3) {
            stmtStep.condition(BatchCond.not(BatchCond.isAutocommit(batch)));
          }
          const rowsPromise = stmtStep.query(hranaStmt);
          rowsPromise.catch(() => {
            return;
          });
          lastStep = stmtStep;
          return rowsPromise;
        });
        this.#started = batch.execute().then(() => beginPromise).then(() => {
          return;
        });
        try {
          await this.#started;
        } catch (e) {
          this.close();
          throw e;
        }
      } else {
        if (this.#version < 3) {
          await this.#started;
        } else {}
        this._getSqlCache().apply(hranaStmts);
        const batch = stream.batch(this.#version >= 3);
        let lastStep = undefined;
        rowsPromises = hranaStmts.map((hranaStmt) => {
          const stmtStep = batch.step();
          if (lastStep !== undefined) {
            stmtStep.condition(BatchCond.ok(lastStep));
          }
          if (this.#version >= 3) {
            stmtStep.condition(BatchCond.not(BatchCond.isAutocommit(batch)));
          }
          const rowsPromise = stmtStep.query(hranaStmt);
          rowsPromise.catch(() => {
            return;
          });
          lastStep = stmtStep;
          return rowsPromise;
        });
        await batch.execute();
      }
      const resultSets = [];
      for (const rowsPromise of rowsPromises) {
        const rows = await rowsPromise;
        if (rows === undefined) {
          throw new LibsqlError("Statement in a transaction was not executed, " + "probably because the transaction has been rolled back", "TRANSACTION_CLOSED");
        }
        resultSets.push(resultSetFromHrana(rows));
      }
      return resultSets;
    } catch (e) {
      throw mapHranaError(e);
    }
  }
  async executeMultiple(sql) {
    const stream = this._getStream();
    if (stream.closed) {
      throw new LibsqlError("Cannot execute statements because the transaction is closed", "TRANSACTION_CLOSED");
    }
    try {
      if (this.#started === undefined) {
        this.#started = stream.run(transactionModeToBegin(this.#mode)).then(() => {
          return;
        });
        try {
          await this.#started;
        } catch (e) {
          this.close();
          throw e;
        }
      } else {
        await this.#started;
      }
      await stream.sequence(sql);
    } catch (e) {
      throw mapHranaError(e);
    }
  }
  async rollback() {
    try {
      const stream = this._getStream();
      if (stream.closed) {
        return;
      }
      if (this.#started !== undefined) {} else {
        return;
      }
      const promise = stream.run("ROLLBACK").catch((e) => {
        throw mapHranaError(e);
      });
      stream.closeGracefully();
      await promise;
    } catch (e) {
      throw mapHranaError(e);
    } finally {
      this.close();
    }
  }
  async commit() {
    try {
      const stream = this._getStream();
      if (stream.closed) {
        throw new LibsqlError("Cannot commit the transaction because it is already closed", "TRANSACTION_CLOSED");
      }
      if (this.#started !== undefined) {
        await this.#started;
      } else {
        return;
      }
      const promise = stream.run("COMMIT").catch((e) => {
        throw mapHranaError(e);
      });
      stream.closeGracefully();
      await promise;
    } catch (e) {
      throw mapHranaError(e);
    } finally {
      this.close();
    }
  }
}
async function executeHranaBatch(mode, version2, batch, hranaStmts, disableForeignKeys = false) {
  if (disableForeignKeys) {
    batch.step().run("PRAGMA foreign_keys=off");
  }
  const beginStep = batch.step();
  const beginPromise = beginStep.run(transactionModeToBegin(mode));
  let lastStep = beginStep;
  const stmtPromises = hranaStmts.map((hranaStmt) => {
    const stmtStep = batch.step().condition(BatchCond.ok(lastStep));
    if (version2 >= 3) {
      stmtStep.condition(BatchCond.not(BatchCond.isAutocommit(batch)));
    }
    const stmtPromise = stmtStep.query(hranaStmt);
    lastStep = stmtStep;
    return stmtPromise;
  });
  const commitStep = batch.step().condition(BatchCond.ok(lastStep));
  if (version2 >= 3) {
    commitStep.condition(BatchCond.not(BatchCond.isAutocommit(batch)));
  }
  const commitPromise = commitStep.run("COMMIT");
  const rollbackStep = batch.step().condition(BatchCond.not(BatchCond.ok(commitStep)));
  rollbackStep.run("ROLLBACK").catch((_) => {
    return;
  });
  if (disableForeignKeys) {
    batch.step().run("PRAGMA foreign_keys=on");
  }
  await batch.execute();
  const resultSets = [];
  await beginPromise;
  for (const stmtPromise of stmtPromises) {
    const hranaRows = await stmtPromise;
    if (hranaRows === undefined) {
      throw new LibsqlError("Statement in a batch was not executed, probably because the transaction has been rolled back", "TRANSACTION_CLOSED");
    }
    resultSets.push(resultSetFromHrana(hranaRows));
  }
  await commitPromise;
  return resultSets;
}
function stmtToHrana(stmt) {
  let sql;
  let args;
  if (Array.isArray(stmt)) {
    [sql, args] = stmt;
  } else if (typeof stmt === "string") {
    sql = stmt;
  } else {
    sql = stmt.sql;
    args = stmt.args;
  }
  const hranaStmt = new Stmt(sql);
  if (args) {
    if (Array.isArray(args)) {
      hranaStmt.bindIndexes(args);
    } else {
      for (const [key, value] of Object.entries(args)) {
        hranaStmt.bindName(key, value);
      }
    }
  }
  return hranaStmt;
}
function resultSetFromHrana(hranaRows) {
  const columns = hranaRows.columnNames.map((c) => c ?? "");
  const columnTypes = hranaRows.columnDecltypes.map((c) => c ?? "");
  const rows = hranaRows.rows;
  const rowsAffected = hranaRows.affectedRowCount;
  const lastInsertRowid = hranaRows.lastInsertRowid !== undefined ? hranaRows.lastInsertRowid : undefined;
  return new ResultSetImpl(columns, columnTypes, rows, rowsAffected, lastInsertRowid);
}
function mapHranaError(e) {
  if (e instanceof ClientError) {
    const code = mapHranaErrorCode(e);
    return new LibsqlError(e.message, code, undefined, e);
  }
  return e;
}
function mapHranaErrorCode(e) {
  if (e instanceof ResponseError && e.code !== undefined) {
    return e.code;
  } else if (e instanceof ProtoError) {
    return "HRANA_PROTO_ERROR";
  } else if (e instanceof ClosedError) {
    return e.cause instanceof ClientError ? mapHranaErrorCode(e.cause) : "HRANA_CLOSED_ERROR";
  } else if (e instanceof WebSocketError) {
    return "HRANA_WEBSOCKET_ERROR";
  } else if (e instanceof HttpServerError) {
    return "SERVER_ERROR";
  } else if (e instanceof ProtocolVersionError) {
    return "PROTOCOL_VERSION_ERROR";
  } else if (e instanceof InternalError) {
    return "INTERNAL_ERROR";
  } else {
    return "UNKNOWN";
  }
}
var init_hrana = __esm(() => {
  init_lib_esm();
  init_api();
  init_util();
});

// node_modules/.bun/@libsql+client@0.15.15/node_modules/@libsql/client/lib-esm/sql_cache.js
class SqlCache {
  #owner;
  #sqls;
  capacity;
  constructor(owner, capacity) {
    this.#owner = owner;
    this.#sqls = new Lru;
    this.capacity = capacity;
  }
  apply(hranaStmts) {
    if (this.capacity <= 0) {
      return;
    }
    const usedSqlObjs = new Set;
    for (const hranaStmt of hranaStmts) {
      if (typeof hranaStmt.sql !== "string") {
        continue;
      }
      const sqlText = hranaStmt.sql;
      if (sqlText.length >= 5000) {
        continue;
      }
      let sqlObj = this.#sqls.get(sqlText);
      if (sqlObj === undefined) {
        while (this.#sqls.size + 1 > this.capacity) {
          const [evictSqlText, evictSqlObj] = this.#sqls.peekLru();
          if (usedSqlObjs.has(evictSqlObj)) {
            break;
          }
          evictSqlObj.close();
          this.#sqls.delete(evictSqlText);
        }
        if (this.#sqls.size + 1 <= this.capacity) {
          sqlObj = this.#owner.storeSql(sqlText);
          this.#sqls.set(sqlText, sqlObj);
        }
      }
      if (sqlObj !== undefined) {
        hranaStmt.sql = sqlObj;
        usedSqlObjs.add(sqlObj);
      }
    }
  }
}

class Lru {
  #cache;
  constructor() {
    this.#cache = new Map;
  }
  get(key) {
    const value = this.#cache.get(key);
    if (value !== undefined) {
      this.#cache.delete(key);
      this.#cache.set(key, value);
    }
    return value;
  }
  set(key, value) {
    this.#cache.set(key, value);
  }
  peekLru() {
    for (const entry of this.#cache.entries()) {
      return entry;
    }
    return;
  }
  delete(key) {
    this.#cache.delete(key);
  }
  get size() {
    return this.#cache.size;
  }
}

// node_modules/.bun/promise-limit@2.7.0/node_modules/promise-limit/index.js
var require_promise_limit = __commonJS((exports, module) => {
  function limiter(count) {
    var outstanding = 0;
    var jobs = [];
    function remove() {
      outstanding--;
      if (outstanding < count) {
        dequeue();
      }
    }
    function dequeue() {
      var job = jobs.shift();
      semaphore.queue = jobs.length;
      if (job) {
        run(job.fn).then(job.resolve).catch(job.reject);
      }
    }
    function queue(fn) {
      return new Promise(function(resolve, reject) {
        jobs.push({ fn, resolve, reject });
        semaphore.queue = jobs.length;
      });
    }
    function run(fn) {
      outstanding++;
      try {
        return Promise.resolve(fn()).then(function(result) {
          remove();
          return result;
        }, function(error) {
          remove();
          throw error;
        });
      } catch (err) {
        remove();
        return Promise.reject(err);
      }
    }
    var semaphore = function(fn) {
      if (outstanding >= count) {
        return queue(fn);
      } else {
        return run(fn);
      }
    };
    return semaphore;
  }
  function map(items, mapper) {
    var failed = false;
    var limit = this;
    return Promise.all(items.map(function() {
      var args = arguments;
      return limit(function() {
        if (!failed) {
          return mapper.apply(undefined, args).catch(function(e) {
            failed = true;
            throw e;
          });
        }
      });
    }));
  }
  function addExtras(fn) {
    fn.queue = 0;
    fn.map = map;
    return fn;
  }
  module.exports = function(count) {
    if (count) {
      return addExtras(limiter(count));
    } else {
      return addExtras(function(fn) {
        return fn();
      });
    }
  };
});

// node_modules/.bun/@libsql+client@0.15.15/node_modules/@libsql/client/lib-esm/ws.js
function _createClient2(config) {
  if (config.scheme !== "wss" && config.scheme !== "ws") {
    throw new LibsqlError('The WebSocket client supports only "libsql:", "wss:" and "ws:" URLs, ' + `got ${JSON.stringify(config.scheme + ":")}. For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
  }
  if (config.encryptionKey !== undefined) {
    throw new LibsqlError("Encryption key is not supported by the remote client.", "ENCRYPTION_KEY_NOT_SUPPORTED");
  }
  if (config.scheme === "ws" && config.tls) {
    throw new LibsqlError(`A "ws:" URL cannot opt into TLS by using ?tls=1`, "URL_INVALID");
  } else if (config.scheme === "wss" && !config.tls) {
    throw new LibsqlError(`A "wss:" URL cannot opt out of TLS by using ?tls=0`, "URL_INVALID");
  }
  const url = encodeBaseUrl(config.scheme, config.authority, config.path);
  let client;
  try {
    client = openWs(url, config.authToken);
  } catch (e) {
    if (e instanceof WebSocketUnsupportedError) {
      const suggestedScheme = config.scheme === "wss" ? "https" : "http";
      const suggestedUrl = encodeBaseUrl(suggestedScheme, config.authority, config.path);
      throw new LibsqlError("This environment does not support WebSockets, please switch to the HTTP client by using " + `a "${suggestedScheme}:" URL (${JSON.stringify(suggestedUrl)}). ` + `For more information, please read ${supportedUrlLink}`, "WEBSOCKETS_NOT_SUPPORTED");
    }
    throw mapHranaError(e);
  }
  return new WsClient2(client, url, config.authToken, config.intMode, config.concurrency);
}

class WsClient2 {
  #url;
  #authToken;
  #intMode;
  #connState;
  #futureConnState;
  closed;
  protocol;
  #isSchemaDatabase;
  #promiseLimitFunction;
  constructor(client, url, authToken, intMode, concurrency) {
    this.#url = url;
    this.#authToken = authToken;
    this.#intMode = intMode;
    this.#connState = this.#openConn(client);
    this.#futureConnState = undefined;
    this.closed = false;
    this.protocol = "ws";
    this.#promiseLimitFunction = import_promise_limit.default(concurrency);
  }
  async limit(fn) {
    return this.#promiseLimitFunction(fn);
  }
  async execute(stmtOrSql, args) {
    let stmt;
    if (typeof stmtOrSql === "string") {
      stmt = {
        sql: stmtOrSql,
        args: args || []
      };
    } else {
      stmt = stmtOrSql;
    }
    return this.limit(async () => {
      const streamState = await this.#openStream();
      try {
        const hranaStmt = stmtToHrana(stmt);
        streamState.conn.sqlCache.apply([hranaStmt]);
        const hranaRowsPromise = streamState.stream.query(hranaStmt);
        streamState.stream.closeGracefully();
        const hranaRowsResult = await hranaRowsPromise;
        return resultSetFromHrana(hranaRowsResult);
      } catch (e) {
        throw mapHranaError(e);
      } finally {
        this._closeStream(streamState);
      }
    });
  }
  async batch(stmts, mode = "deferred") {
    return this.limit(async () => {
      const streamState = await this.#openStream();
      try {
        const normalizedStmts = stmts.map((stmt) => {
          if (Array.isArray(stmt)) {
            return {
              sql: stmt[0],
              args: stmt[1] || []
            };
          }
          return stmt;
        });
        const hranaStmts = normalizedStmts.map(stmtToHrana);
        const version2 = await streamState.conn.client.getVersion();
        streamState.conn.sqlCache.apply(hranaStmts);
        const batch = streamState.stream.batch(version2 >= 3);
        const resultsPromise = executeHranaBatch(mode, version2, batch, hranaStmts);
        const results = await resultsPromise;
        return results;
      } catch (e) {
        throw mapHranaError(e);
      } finally {
        this._closeStream(streamState);
      }
    });
  }
  async migrate(stmts) {
    return this.limit(async () => {
      const streamState = await this.#openStream();
      try {
        const hranaStmts = stmts.map(stmtToHrana);
        const version2 = await streamState.conn.client.getVersion();
        const batch = streamState.stream.batch(version2 >= 3);
        const resultsPromise = executeHranaBatch("deferred", version2, batch, hranaStmts, true);
        const results = await resultsPromise;
        return results;
      } catch (e) {
        throw mapHranaError(e);
      } finally {
        this._closeStream(streamState);
      }
    });
  }
  async transaction(mode = "write") {
    return this.limit(async () => {
      const streamState = await this.#openStream();
      try {
        const version2 = await streamState.conn.client.getVersion();
        return new WsTransaction(this, streamState, mode, version2);
      } catch (e) {
        this._closeStream(streamState);
        throw mapHranaError(e);
      }
    });
  }
  async executeMultiple(sql) {
    return this.limit(async () => {
      const streamState = await this.#openStream();
      try {
        const promise = streamState.stream.sequence(sql);
        streamState.stream.closeGracefully();
        await promise;
      } catch (e) {
        throw mapHranaError(e);
      } finally {
        this._closeStream(streamState);
      }
    });
  }
  sync() {
    throw new LibsqlError("sync not supported in ws mode", "SYNC_NOT_SUPPORTED");
  }
  async#openStream() {
    if (this.closed) {
      throw new LibsqlError("The client is closed", "CLIENT_CLOSED");
    }
    const now = new Date;
    const ageMillis = now.valueOf() - this.#connState.openTime.valueOf();
    if (ageMillis > maxConnAgeMillis && this.#futureConnState === undefined) {
      const futureConnState = this.#openConn();
      this.#futureConnState = futureConnState;
      futureConnState.client.getVersion().then((_version) => {
        if (this.#connState !== futureConnState) {
          if (this.#connState.streamStates.size === 0) {
            this.#connState.client.close();
          } else {}
        }
        this.#connState = futureConnState;
        this.#futureConnState = undefined;
      }, (_e) => {
        this.#futureConnState = undefined;
      });
    }
    if (this.#connState.client.closed) {
      try {
        if (this.#futureConnState !== undefined) {
          this.#connState = this.#futureConnState;
        } else {
          this.#connState = this.#openConn();
        }
      } catch (e) {
        throw mapHranaError(e);
      }
    }
    const connState = this.#connState;
    try {
      if (connState.useSqlCache === undefined) {
        connState.useSqlCache = await connState.client.getVersion() >= 2;
        if (connState.useSqlCache) {
          connState.sqlCache.capacity = sqlCacheCapacity;
        }
      }
      const stream = connState.client.openStream();
      stream.intMode = this.#intMode;
      const streamState = { conn: connState, stream };
      connState.streamStates.add(streamState);
      return streamState;
    } catch (e) {
      throw mapHranaError(e);
    }
  }
  #openConn(client) {
    try {
      client ??= openWs(this.#url, this.#authToken);
      return {
        client,
        useSqlCache: undefined,
        sqlCache: new SqlCache(client, 0),
        openTime: new Date,
        streamStates: new Set
      };
    } catch (e) {
      throw mapHranaError(e);
    }
  }
  async reconnect() {
    try {
      for (const st of Array.from(this.#connState.streamStates)) {
        try {
          st.stream.close();
        } catch {}
      }
      this.#connState.client.close();
    } catch {}
    if (this.#futureConnState) {
      try {
        this.#futureConnState.client.close();
      } catch {}
      this.#futureConnState = undefined;
    }
    const next = this.#openConn();
    const version2 = await next.client.getVersion();
    next.useSqlCache = version2 >= 2;
    if (next.useSqlCache) {
      next.sqlCache.capacity = sqlCacheCapacity;
    }
    this.#connState = next;
    this.closed = false;
  }
  _closeStream(streamState) {
    streamState.stream.close();
    const connState = streamState.conn;
    connState.streamStates.delete(streamState);
    if (connState.streamStates.size === 0 && connState !== this.#connState) {
      connState.client.close();
    }
  }
  close() {
    this.#connState.client.close();
    this.closed = true;
    if (this.#futureConnState) {
      try {
        this.#futureConnState.client.close();
      } catch {}
      this.#futureConnState = undefined;
    }
    this.closed = true;
  }
}
var import_promise_limit, maxConnAgeMillis, sqlCacheCapacity = 100, WsTransaction;
var init_ws = __esm(() => {
  init_lib_esm();
  init_api();
  init_config();
  init_hrana();
  init_uri();
  init_util();
  import_promise_limit = __toESM(require_promise_limit(), 1);
  init_api();
  maxConnAgeMillis = 60 * 1000;
  WsTransaction = class WsTransaction extends HranaTransaction {
    #client;
    #streamState;
    constructor(client, state, mode, version2) {
      super(mode, version2);
      this.#client = client;
      this.#streamState = state;
    }
    _getStream() {
      return this.#streamState.stream;
    }
    _getSqlCache() {
      return this.#streamState.conn.sqlCache;
    }
    close() {
      this.#client._closeStream(this.#streamState);
    }
    get closed() {
      return this.#streamState.stream.closed;
    }
  };
});

// node_modules/.bun/@libsql+client@0.15.15/node_modules/@libsql/client/lib-esm/http.js
function _createClient3(config) {
  if (config.scheme !== "https" && config.scheme !== "http") {
    throw new LibsqlError('The HTTP client supports only "libsql:", "https:" and "http:" URLs, ' + `got ${JSON.stringify(config.scheme + ":")}. For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
  }
  if (config.encryptionKey !== undefined) {
    throw new LibsqlError("Encryption key is not supported by the remote client.", "ENCRYPTION_KEY_NOT_SUPPORTED");
  }
  if (config.scheme === "http" && config.tls) {
    throw new LibsqlError(`A "http:" URL cannot opt into TLS by using ?tls=1`, "URL_INVALID");
  } else if (config.scheme === "https" && !config.tls) {
    throw new LibsqlError(`A "https:" URL cannot opt out of TLS by using ?tls=0`, "URL_INVALID");
  }
  const url = encodeBaseUrl(config.scheme, config.authority, config.path);
  return new HttpClient2(url, config.authToken, config.intMode, config.fetch, config.concurrency);
}

class HttpClient2 {
  #client;
  protocol;
  #url;
  #intMode;
  #customFetch;
  #concurrency;
  #authToken;
  #promiseLimitFunction;
  constructor(url, authToken, intMode, customFetch, concurrency) {
    this.#url = url;
    this.#authToken = authToken;
    this.#intMode = intMode;
    this.#customFetch = customFetch;
    this.#concurrency = concurrency;
    this.#client = openHttp(this.#url, this.#authToken, this.#customFetch);
    this.#client.intMode = this.#intMode;
    this.protocol = "http";
    this.#promiseLimitFunction = import_promise_limit2.default(this.#concurrency);
  }
  async limit(fn) {
    return this.#promiseLimitFunction(fn);
  }
  async execute(stmtOrSql, args) {
    let stmt;
    if (typeof stmtOrSql === "string") {
      stmt = {
        sql: stmtOrSql,
        args: args || []
      };
    } else {
      stmt = stmtOrSql;
    }
    return this.limit(async () => {
      try {
        const hranaStmt = stmtToHrana(stmt);
        let rowsPromise;
        const stream = this.#client.openStream();
        try {
          rowsPromise = stream.query(hranaStmt);
        } finally {
          stream.closeGracefully();
        }
        const rowsResult = await rowsPromise;
        return resultSetFromHrana(rowsResult);
      } catch (e) {
        throw mapHranaError(e);
      }
    });
  }
  async batch(stmts, mode = "deferred") {
    return this.limit(async () => {
      try {
        const normalizedStmts = stmts.map((stmt) => {
          if (Array.isArray(stmt)) {
            return {
              sql: stmt[0],
              args: stmt[1] || []
            };
          }
          return stmt;
        });
        const hranaStmts = normalizedStmts.map(stmtToHrana);
        const version2 = await this.#client.getVersion();
        let resultsPromise;
        const stream = this.#client.openStream();
        try {
          const sqlCache = new SqlCache(stream, sqlCacheCapacity2);
          sqlCache.apply(hranaStmts);
          const batch = stream.batch(false);
          resultsPromise = executeHranaBatch(mode, version2, batch, hranaStmts);
        } finally {
          stream.closeGracefully();
        }
        const results = await resultsPromise;
        return results;
      } catch (e) {
        throw mapHranaError(e);
      }
    });
  }
  async migrate(stmts) {
    return this.limit(async () => {
      try {
        const hranaStmts = stmts.map(stmtToHrana);
        const version2 = await this.#client.getVersion();
        let resultsPromise;
        const stream = this.#client.openStream();
        try {
          const batch = stream.batch(false);
          resultsPromise = executeHranaBatch("deferred", version2, batch, hranaStmts, true);
        } finally {
          stream.closeGracefully();
        }
        const results = await resultsPromise;
        return results;
      } catch (e) {
        throw mapHranaError(e);
      }
    });
  }
  async transaction(mode = "write") {
    return this.limit(async () => {
      try {
        const version2 = await this.#client.getVersion();
        return new HttpTransaction(this.#client.openStream(), mode, version2);
      } catch (e) {
        throw mapHranaError(e);
      }
    });
  }
  async executeMultiple(sql) {
    return this.limit(async () => {
      try {
        let promise;
        const stream = this.#client.openStream();
        try {
          promise = stream.sequence(sql);
        } finally {
          stream.closeGracefully();
        }
        await promise;
      } catch (e) {
        throw mapHranaError(e);
      }
    });
  }
  sync() {
    throw new LibsqlError("sync not supported in http mode", "SYNC_NOT_SUPPORTED");
  }
  close() {
    this.#client.close();
  }
  async reconnect() {
    try {
      if (!this.closed) {
        this.#client.close();
      }
    } finally {
      this.#client = openHttp(this.#url, this.#authToken, this.#customFetch);
      this.#client.intMode = this.#intMode;
    }
  }
  get closed() {
    return this.#client.closed;
  }
}
var import_promise_limit2, sqlCacheCapacity2 = 30, HttpTransaction;
var init_http = __esm(() => {
  init_lib_esm();
  init_api();
  init_config();
  init_hrana();
  init_uri();
  init_util();
  import_promise_limit2 = __toESM(require_promise_limit(), 1);
  init_api();
  HttpTransaction = class HttpTransaction extends HranaTransaction {
    #stream;
    #sqlCache;
    constructor(stream, mode, version2) {
      super(mode, version2);
      this.#stream = stream;
      this.#sqlCache = new SqlCache(stream, sqlCacheCapacity2);
    }
    _getStream() {
      return this.#stream;
    }
    _getSqlCache() {
      return this.#sqlCache;
    }
    close() {
      this.#stream.close();
    }
    get closed() {
      return this.#stream.closed;
    }
  };
});

// node_modules/.bun/@libsql+client@0.15.15/node_modules/@libsql/client/lib-esm/node.js
function createClient(config) {
  return _createClient4(expandConfig(config, true));
}
function _createClient4(config) {
  if (config.scheme === "wss" || config.scheme === "ws") {
    return _createClient2(config);
  } else if (config.scheme === "https" || config.scheme === "http") {
    return _createClient3(config);
  } else {
    return _createClient(config);
  }
}
var init_node3 = __esm(() => {
  init_config();
  init_sqlite3();
  init_ws();
  init_http();
  init_api();
});

// packages/agent-core/dist/lib/turso-schema.js
var SCHEMA_VERSION = 1, SCHEMA_STATEMENTS;
var init_turso_schema = __esm(() => {
  SCHEMA_STATEMENTS = [
    `CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
    `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    agent_type TEXT NOT NULL,
    model TEXT NOT NULL,
    provider TEXT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    status TEXT NOT NULL DEFAULT 'running',
    error_message TEXT,
    metadata TEXT
  )`,
    `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT,
    tool_name TEXT,
    tool_input TEXT,
    tool_output TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    token_count INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  )`,
    `CREATE TABLE IF NOT EXISTS tool_executions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    message_id TEXT,
    tool_name TEXT NOT NULL,
    status TEXT NOT NULL,
    input TEXT,
    output TEXT,
    error TEXT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    duration_ms INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (message_id) REFERENCES messages(id)
  )`,
    "CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_tool_executions_session ON tool_executions(session_id)",
    "CREATE INDEX IF NOT EXISTS idx_tool_executions_started ON tool_executions(started_at)",
    "CREATE INDEX IF NOT EXISTS idx_sessions_agent_type ON sessions(agent_type)",
    "CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)",
    "CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at)"
  ];
});

// packages/agent-core/dist/lib/turso.js
var exports_turso = {};
__export(exports_turso, {
  syncToCloud: () => syncToCloud,
  resetSchemaState: () => resetSchemaState,
  initializeSchema: () => initializeSchema,
  getTursoConfig: () => getTursoConfig,
  getTursoClient: () => getTursoClient,
  createTursoClient: () => createTursoClient,
  closeTursoClient: () => closeTursoClient
});
import { tmpdir } from "node:os";
import { join } from "node:path";
function getTursoConfig() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    return null;
  }
  return { url, authToken };
}
function createTursoClient(config) {
  const sessionId = crypto.randomUUID();
  const localDbPath = join(tmpdir(), `turso-session-${sessionId}.db`);
  return createClient({
    url: `file:${localDbPath}`,
    syncUrl: config.url,
    authToken: config.authToken,
    syncInterval: 0
  });
}
async function getTursoClient() {
  const config = getTursoConfig();
  if (!config) {
    return null;
  }
  if (!_client) {
    _client = createTursoClient(config);
  }
  return _client;
}
async function syncToCloud() {
  if (!_client) {
    return false;
  }
  try {
    await _client.sync();
    console.error("[Turso] Successfully synced local data to cloud");
    return true;
  } catch (error) {
    console.error("[Turso] Failed to sync to cloud:", error);
    return false;
  }
}
function closeTursoClient() {
  if (_client) {
    _client.close();
    _client = null;
  }
}
async function initializeSchema() {
  if (_schemaInitialized) {
    return true;
  }
  const client = await getTursoClient();
  if (!client) {
    return false;
  }
  try {
    const versionResult = await client.execute("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1").catch(() => ({ rows: [] }));
    const currentVersion = versionResult.rows.length > 0 && versionResult.rows[0]?.version ? Number(versionResult.rows[0].version) : 0;
    if (currentVersion >= SCHEMA_VERSION) {
      _schemaInitialized = true;
      return true;
    }
    for (const statement of SCHEMA_STATEMENTS) {
      await client.execute(statement);
    }
    if (currentVersion < SCHEMA_VERSION) {
      await client.execute({
        sql: "INSERT OR REPLACE INTO schema_version (version) VALUES (?)",
        args: [SCHEMA_VERSION]
      });
    }
    _schemaInitialized = true;
    console.error(`[Turso] Schema initialized to version ${SCHEMA_VERSION}`);
    return true;
  } catch (error) {
    console.error("[Turso] Failed to initialize schema:", error);
    return false;
  }
}
function resetSchemaState() {
  _schemaInitialized = false;
}
var _client = null, _schemaInitialized = false;
var init_turso = __esm(() => {
  init_node3();
  init_turso_schema();
});

// packages/agent-core/dist/lib/agent-runner.js
import { access, readFile } from "node:fs/promises";
import { join as join2 } from "node:path";

// packages/agent-core/dist/lib/conversation-logger.js
class ConversationLogger {
  client;
  sessionId = null;
  messageSequence = 0;
  constructor(client) {
    this.client = client;
  }
  async startSession(info) {
    this.sessionId = info.id;
    this.messageSequence = 0;
    try {
      await this.client.execute({
        sql: `INSERT INTO sessions (id, agent_type, model, provider, metadata)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          info.id,
          info.agentType,
          info.model,
          info.provider || null,
          info.metadata ? JSON.stringify(info.metadata) : null
        ]
      });
    } catch (error) {
      console.error("[ConversationLogger] Failed to start session:", error);
    }
  }
  async logMessage(role, content, options) {
    if (!this.sessionId) {
      console.error("[ConversationLogger] No active session");
      return null;
    }
    const id = crypto.randomUUID();
    try {
      await this.client.execute({
        sql: `INSERT INTO messages (id, session_id, sequence, role, content, tool_name, tool_input, tool_output, token_count)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          this.sessionId,
          ++this.messageSequence,
          role,
          content,
          options?.toolName || null,
          options?.toolInput ? JSON.stringify(options.toolInput) : null,
          options?.toolOutput ? JSON.stringify(options.toolOutput) : null,
          options?.tokenCount || null
        ]
      });
      return id;
    } catch (error) {
      console.error("[ConversationLogger] Failed to log message:", error);
      return null;
    }
  }
  async logToolExecution(info) {
    if (!this.sessionId) {
      console.error("[ConversationLogger] No active session");
      return null;
    }
    const id = crypto.randomUUID();
    const durationMs = info.startedAt && info.endedAt ? info.endedAt.getTime() - info.startedAt.getTime() : null;
    try {
      await this.client.execute({
        sql: `INSERT INTO tool_executions (id, session_id, tool_name, status, input, output, error, started_at, ended_at, duration_ms)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          this.sessionId,
          info.toolName,
          info.status,
          info.input ? JSON.stringify(info.input) : null,
          info.output ? JSON.stringify(info.output) : null,
          info.error || null,
          info.startedAt?.toISOString() || new Date().toISOString(),
          info.endedAt?.toISOString() || null,
          durationMs
        ]
      });
      return id;
    } catch (error) {
      console.error("[ConversationLogger] Failed to log tool execution:", error);
      return null;
    }
  }
  async endSession(status, errorMessage) {
    if (!this.sessionId) {
      return;
    }
    try {
      await this.client.execute({
        sql: `UPDATE sessions SET status = ?, error_message = ?, ended_at = datetime('now')
              WHERE id = ?`,
        args: [status, errorMessage || null, this.sessionId]
      });
    } catch (error) {
      console.error("[ConversationLogger] Failed to end session:", error);
    }
  }
  async syncToCloud() {
    try {
      await this.client.sync();
      console.error("[ConversationLogger] Synced session data to cloud");
      return true;
    } catch (error) {
      console.error("[ConversationLogger] Failed to sync to cloud:", error);
      return false;
    }
  }
  getSessionId() {
    return this.sessionId;
  }
}
async function createConversationLogger() {
  const { getTursoClient: getTursoClient2, initializeSchema: initializeSchema2 } = await Promise.resolve().then(() => (init_turso(), exports_turso));
  const client = await getTursoClient2();
  if (!client) {
    return null;
  }
  await initializeSchema2();
  return new ConversationLogger(client);
}
// node_modules/.bun/@opencode-ai+sdk@1.0.163/node_modules/@opencode-ai/sdk/dist/gen/core/serverSentEvents.gen.js
var createSseClient = ({ onSseError, onSseEvent, responseTransformer, responseValidator, sseDefaultRetryDelay, sseMaxRetryAttempts, sseMaxRetryDelay, sseSleepFn, url, ...options }) => {
  let lastEventId;
  const sleep = sseSleepFn ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const createStream = async function* () {
    let retryDelay = sseDefaultRetryDelay ?? 3000;
    let attempt = 0;
    const signal = options.signal ?? new AbortController().signal;
    while (true) {
      if (signal.aborted)
        break;
      attempt++;
      const headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
      if (lastEventId !== undefined) {
        headers.set("Last-Event-ID", lastEventId);
      }
      try {
        const response = await fetch(url, { ...options, headers, signal });
        if (!response.ok)
          throw new Error(`SSE failed: ${response.status} ${response.statusText}`);
        if (!response.body)
          throw new Error("No body in SSE response");
        const reader = response.body.pipeThrough(new TextDecoderStream).getReader();
        let buffer = "";
        const abortHandler = () => {
          try {
            reader.cancel();
          } catch {}
        };
        signal.addEventListener("abort", abortHandler);
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done)
              break;
            buffer += value;
            const chunks = buffer.split(`

`);
            buffer = chunks.pop() ?? "";
            for (const chunk of chunks) {
              const lines = chunk.split(`
`);
              const dataLines = [];
              let eventName;
              for (const line of lines) {
                if (line.startsWith("data:")) {
                  dataLines.push(line.replace(/^data:\s*/, ""));
                } else if (line.startsWith("event:")) {
                  eventName = line.replace(/^event:\s*/, "");
                } else if (line.startsWith("id:")) {
                  lastEventId = line.replace(/^id:\s*/, "");
                } else if (line.startsWith("retry:")) {
                  const parsed = Number.parseInt(line.replace(/^retry:\s*/, ""), 10);
                  if (!Number.isNaN(parsed)) {
                    retryDelay = parsed;
                  }
                }
              }
              let data;
              let parsedJson = false;
              if (dataLines.length) {
                const rawData = dataLines.join(`
`);
                try {
                  data = JSON.parse(rawData);
                  parsedJson = true;
                } catch {
                  data = rawData;
                }
              }
              if (parsedJson) {
                if (responseValidator) {
                  await responseValidator(data);
                }
                if (responseTransformer) {
                  data = await responseTransformer(data);
                }
              }
              onSseEvent?.({
                data,
                event: eventName,
                id: lastEventId,
                retry: retryDelay
              });
              if (dataLines.length) {
                yield data;
              }
            }
          }
        } finally {
          signal.removeEventListener("abort", abortHandler);
          reader.releaseLock();
        }
        break;
      } catch (error) {
        onSseError?.(error);
        if (sseMaxRetryAttempts !== undefined && attempt >= sseMaxRetryAttempts) {
          break;
        }
        const backoff = Math.min(retryDelay * 2 ** (attempt - 1), sseMaxRetryDelay ?? 30000);
        await sleep(backoff);
      }
    }
  };
  const stream = createStream();
  return { stream };
};

// node_modules/.bun/@opencode-ai+sdk@1.0.163/node_modules/@opencode-ai/sdk/dist/gen/core/auth.gen.js
var getAuthToken = async (auth, callback) => {
  const token = typeof callback === "function" ? await callback(auth) : callback;
  if (!token) {
    return;
  }
  if (auth.scheme === "bearer") {
    return `Bearer ${token}`;
  }
  if (auth.scheme === "basic") {
    return `Basic ${btoa(token)}`;
  }
  return token;
};

// node_modules/.bun/@opencode-ai+sdk@1.0.163/node_modules/@opencode-ai/sdk/dist/gen/core/bodySerializer.gen.js
var jsonBodySerializer = {
  bodySerializer: (body) => JSON.stringify(body, (_key, value) => typeof value === "bigint" ? value.toString() : value)
};

// node_modules/.bun/@opencode-ai+sdk@1.0.163/node_modules/@opencode-ai/sdk/dist/gen/core/pathSerializer.gen.js
var separatorArrayExplode = (style) => {
  switch (style) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
};
var separatorArrayNoExplode = (style) => {
  switch (style) {
    case "form":
      return ",";
    case "pipeDelimited":
      return "|";
    case "spaceDelimited":
      return "%20";
    default:
      return ",";
  }
};
var separatorObjectExplode = (style) => {
  switch (style) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
};
var serializeArrayParam = ({ allowReserved, explode, name, style, value }) => {
  if (!explode) {
    const joinedValues2 = (allowReserved ? value : value.map((v) => encodeURIComponent(v))).join(separatorArrayNoExplode(style));
    switch (style) {
      case "label":
        return `.${joinedValues2}`;
      case "matrix":
        return `;${name}=${joinedValues2}`;
      case "simple":
        return joinedValues2;
      default:
        return `${name}=${joinedValues2}`;
    }
  }
  const separator = separatorArrayExplode(style);
  const joinedValues = value.map((v) => {
    if (style === "label" || style === "simple") {
      return allowReserved ? v : encodeURIComponent(v);
    }
    return serializePrimitiveParam({
      allowReserved,
      name,
      value: v
    });
  }).join(separator);
  return style === "label" || style === "matrix" ? separator + joinedValues : joinedValues;
};
var serializePrimitiveParam = ({ allowReserved, name, value }) => {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "object") {
    throw new Error("Deeply-nested arrays/objects aren’t supported. Provide your own `querySerializer()` to handle these.");
  }
  return `${name}=${allowReserved ? value : encodeURIComponent(value)}`;
};
var serializeObjectParam = ({ allowReserved, explode, name, style, value, valueOnly }) => {
  if (value instanceof Date) {
    return valueOnly ? value.toISOString() : `${name}=${value.toISOString()}`;
  }
  if (style !== "deepObject" && !explode) {
    let values = [];
    Object.entries(value).forEach(([key, v]) => {
      values = [...values, key, allowReserved ? v : encodeURIComponent(v)];
    });
    const joinedValues2 = values.join(",");
    switch (style) {
      case "form":
        return `${name}=${joinedValues2}`;
      case "label":
        return `.${joinedValues2}`;
      case "matrix":
        return `;${name}=${joinedValues2}`;
      default:
        return joinedValues2;
    }
  }
  const separator = separatorObjectExplode(style);
  const joinedValues = Object.entries(value).map(([key, v]) => serializePrimitiveParam({
    allowReserved,
    name: style === "deepObject" ? `${name}[${key}]` : key,
    value: v
  })).join(separator);
  return style === "label" || style === "matrix" ? separator + joinedValues : joinedValues;
};

// node_modules/.bun/@opencode-ai+sdk@1.0.163/node_modules/@opencode-ai/sdk/dist/gen/core/utils.gen.js
var PATH_PARAM_RE = /\{[^{}]+\}/g;
var defaultPathSerializer = ({ path, url: _url }) => {
  let url = _url;
  const matches = _url.match(PATH_PARAM_RE);
  if (matches) {
    for (const match of matches) {
      let explode = false;
      let name = match.substring(1, match.length - 1);
      let style = "simple";
      if (name.endsWith("*")) {
        explode = true;
        name = name.substring(0, name.length - 1);
      }
      if (name.startsWith(".")) {
        name = name.substring(1);
        style = "label";
      } else if (name.startsWith(";")) {
        name = name.substring(1);
        style = "matrix";
      }
      const value = path[name];
      if (value === undefined || value === null) {
        continue;
      }
      if (Array.isArray(value)) {
        url = url.replace(match, serializeArrayParam({ explode, name, style, value }));
        continue;
      }
      if (typeof value === "object") {
        url = url.replace(match, serializeObjectParam({
          explode,
          name,
          style,
          value,
          valueOnly: true
        }));
        continue;
      }
      if (style === "matrix") {
        url = url.replace(match, `;${serializePrimitiveParam({
          name,
          value
        })}`);
        continue;
      }
      const replaceValue = encodeURIComponent(style === "label" ? `.${value}` : value);
      url = url.replace(match, replaceValue);
    }
  }
  return url;
};
var getUrl = ({ baseUrl, path, query, querySerializer, url: _url }) => {
  const pathUrl = _url.startsWith("/") ? _url : `/${_url}`;
  let url = (baseUrl ?? "") + pathUrl;
  if (path) {
    url = defaultPathSerializer({ path, url });
  }
  let search = query ? querySerializer(query) : "";
  if (search.startsWith("?")) {
    search = search.substring(1);
  }
  if (search) {
    url += `?${search}`;
  }
  return url;
};

// node_modules/.bun/@opencode-ai+sdk@1.0.163/node_modules/@opencode-ai/sdk/dist/gen/client/utils.gen.js
var createQuerySerializer = ({ allowReserved, array: array2, object: object2 } = {}) => {
  const querySerializer = (queryParams) => {
    const search = [];
    if (queryParams && typeof queryParams === "object") {
      for (const name in queryParams) {
        const value = queryParams[name];
        if (value === undefined || value === null) {
          continue;
        }
        if (Array.isArray(value)) {
          const serializedArray = serializeArrayParam({
            allowReserved,
            explode: true,
            name,
            style: "form",
            value,
            ...array2
          });
          if (serializedArray)
            search.push(serializedArray);
        } else if (typeof value === "object") {
          const serializedObject = serializeObjectParam({
            allowReserved,
            explode: true,
            name,
            style: "deepObject",
            value,
            ...object2
          });
          if (serializedObject)
            search.push(serializedObject);
        } else {
          const serializedPrimitive = serializePrimitiveParam({
            allowReserved,
            name,
            value
          });
          if (serializedPrimitive)
            search.push(serializedPrimitive);
        }
      }
    }
    return search.join("&");
  };
  return querySerializer;
};
var getParseAs = (contentType) => {
  if (!contentType) {
    return "stream";
  }
  const cleanContent = contentType.split(";")[0]?.trim();
  if (!cleanContent) {
    return;
  }
  if (cleanContent.startsWith("application/json") || cleanContent.endsWith("+json")) {
    return "json";
  }
  if (cleanContent === "multipart/form-data") {
    return "formData";
  }
  if (["application/", "audio/", "image/", "video/"].some((type) => cleanContent.startsWith(type))) {
    return "blob";
  }
  if (cleanContent.startsWith("text/")) {
    return "text";
  }
  return;
};
var checkForExistence = (options, name) => {
  if (!name) {
    return false;
  }
  if (options.headers.has(name) || options.query?.[name] || options.headers.get("Cookie")?.includes(`${name}=`)) {
    return true;
  }
  return false;
};
var setAuthParams = async ({ security, ...options }) => {
  for (const auth of security) {
    if (checkForExistence(options, auth.name)) {
      continue;
    }
    const token = await getAuthToken(auth, options.auth);
    if (!token) {
      continue;
    }
    const name = auth.name ?? "Authorization";
    switch (auth.in) {
      case "query":
        if (!options.query) {
          options.query = {};
        }
        options.query[name] = token;
        break;
      case "cookie":
        options.headers.append("Cookie", `${name}=${token}`);
        break;
      case "header":
      default:
        options.headers.set(name, token);
        break;
    }
  }
};
var buildUrl = (options) => getUrl({
  baseUrl: options.baseUrl,
  path: options.path,
  query: options.query,
  querySerializer: typeof options.querySerializer === "function" ? options.querySerializer : createQuerySerializer(options.querySerializer),
  url: options.url
});
var mergeConfigs = (a, b) => {
  const config = { ...a, ...b };
  if (config.baseUrl?.endsWith("/")) {
    config.baseUrl = config.baseUrl.substring(0, config.baseUrl.length - 1);
  }
  config.headers = mergeHeaders(a.headers, b.headers);
  return config;
};
var mergeHeaders = (...headers) => {
  const mergedHeaders = new Headers;
  for (const header of headers) {
    if (!header || typeof header !== "object") {
      continue;
    }
    const iterator = header instanceof Headers ? header.entries() : Object.entries(header);
    for (const [key, value] of iterator) {
      if (value === null) {
        mergedHeaders.delete(key);
      } else if (Array.isArray(value)) {
        for (const v of value) {
          mergedHeaders.append(key, v);
        }
      } else if (value !== undefined) {
        mergedHeaders.set(key, typeof value === "object" ? JSON.stringify(value) : value);
      }
    }
  }
  return mergedHeaders;
};

class Interceptors {
  _fns;
  constructor() {
    this._fns = [];
  }
  clear() {
    this._fns = [];
  }
  getInterceptorIndex(id) {
    if (typeof id === "number") {
      return this._fns[id] ? id : -1;
    } else {
      return this._fns.indexOf(id);
    }
  }
  exists(id) {
    const index = this.getInterceptorIndex(id);
    return !!this._fns[index];
  }
  eject(id) {
    const index = this.getInterceptorIndex(id);
    if (this._fns[index]) {
      this._fns[index] = null;
    }
  }
  update(id, fn) {
    const index = this.getInterceptorIndex(id);
    if (this._fns[index]) {
      this._fns[index] = fn;
      return id;
    } else {
      return false;
    }
  }
  use(fn) {
    this._fns = [...this._fns, fn];
    return this._fns.length - 1;
  }
}
var createInterceptors = () => ({
  error: new Interceptors,
  request: new Interceptors,
  response: new Interceptors
});
var defaultQuerySerializer = createQuerySerializer({
  allowReserved: false,
  array: {
    explode: true,
    style: "form"
  },
  object: {
    explode: true,
    style: "deepObject"
  }
});
var defaultHeaders = {
  "Content-Type": "application/json"
};
var createConfig = (override = {}) => ({
  ...jsonBodySerializer,
  headers: defaultHeaders,
  parseAs: "auto",
  querySerializer: defaultQuerySerializer,
  ...override
});

// node_modules/.bun/@opencode-ai+sdk@1.0.163/node_modules/@opencode-ai/sdk/dist/gen/client/client.gen.js
var createClient2 = (config = {}) => {
  let _config = mergeConfigs(createConfig(), config);
  const getConfig = () => ({ ..._config });
  const setConfig = (config2) => {
    _config = mergeConfigs(_config, config2);
    return getConfig();
  };
  const interceptors = createInterceptors();
  const beforeRequest = async (options) => {
    const opts = {
      ..._config,
      ...options,
      fetch: options.fetch ?? _config.fetch ?? globalThis.fetch,
      headers: mergeHeaders(_config.headers, options.headers),
      serializedBody: undefined
    };
    if (opts.security) {
      await setAuthParams({
        ...opts,
        security: opts.security
      });
    }
    if (opts.requestValidator) {
      await opts.requestValidator(opts);
    }
    if (opts.body && opts.bodySerializer) {
      opts.serializedBody = opts.bodySerializer(opts.body);
    }
    if (opts.serializedBody === undefined || opts.serializedBody === "") {
      opts.headers.delete("Content-Type");
    }
    const url = buildUrl(opts);
    return { opts, url };
  };
  const request = async (options) => {
    const { opts, url } = await beforeRequest(options);
    const requestInit = {
      redirect: "follow",
      ...opts,
      body: opts.serializedBody
    };
    let request2 = new Request(url, requestInit);
    for (const fn of interceptors.request._fns) {
      if (fn) {
        request2 = await fn(request2, opts);
      }
    }
    const _fetch2 = opts.fetch;
    let response = await _fetch2(request2);
    for (const fn of interceptors.response._fns) {
      if (fn) {
        response = await fn(response, request2, opts);
      }
    }
    const result = {
      request: request2,
      response
    };
    if (response.ok) {
      if (response.status === 204 || response.headers.get("Content-Length") === "0") {
        return opts.responseStyle === "data" ? {} : {
          data: {},
          ...result
        };
      }
      const parseAs = (opts.parseAs === "auto" ? getParseAs(response.headers.get("Content-Type")) : opts.parseAs) ?? "json";
      let data;
      switch (parseAs) {
        case "arrayBuffer":
        case "blob":
        case "formData":
        case "json":
        case "text":
          data = await response[parseAs]();
          break;
        case "stream":
          return opts.responseStyle === "data" ? response.body : {
            data: response.body,
            ...result
          };
      }
      if (parseAs === "json") {
        if (opts.responseValidator) {
          await opts.responseValidator(data);
        }
        if (opts.responseTransformer) {
          data = await opts.responseTransformer(data);
        }
      }
      return opts.responseStyle === "data" ? data : {
        data,
        ...result
      };
    }
    const textError = await response.text();
    let jsonError;
    try {
      jsonError = JSON.parse(textError);
    } catch {}
    const error = jsonError ?? textError;
    let finalError = error;
    for (const fn of interceptors.error._fns) {
      if (fn) {
        finalError = await fn(error, response, request2, opts);
      }
    }
    finalError = finalError || {};
    if (opts.throwOnError) {
      throw finalError;
    }
    return opts.responseStyle === "data" ? undefined : {
      error: finalError,
      ...result
    };
  };
  const makeMethod = (method) => {
    const fn = (options) => request({ ...options, method });
    fn.sse = async (options) => {
      const { opts, url } = await beforeRequest(options);
      return createSseClient({
        ...opts,
        body: opts.body,
        headers: opts.headers,
        method,
        url
      });
    };
    return fn;
  };
  return {
    buildUrl,
    connect: makeMethod("CONNECT"),
    delete: makeMethod("DELETE"),
    get: makeMethod("GET"),
    getConfig,
    head: makeMethod("HEAD"),
    interceptors,
    options: makeMethod("OPTIONS"),
    patch: makeMethod("PATCH"),
    post: makeMethod("POST"),
    put: makeMethod("PUT"),
    request,
    setConfig,
    trace: makeMethod("TRACE")
  };
};
// node_modules/.bun/@opencode-ai+sdk@1.0.163/node_modules/@opencode-ai/sdk/dist/gen/core/params.gen.js
var extraPrefixesMap = {
  $body_: "body",
  $headers_: "headers",
  $path_: "path",
  $query_: "query"
};
var extraPrefixes = Object.entries(extraPrefixesMap);
// node_modules/.bun/@opencode-ai+sdk@1.0.163/node_modules/@opencode-ai/sdk/dist/gen/client.gen.js
var client = createClient2(createConfig({
  baseUrl: "http://localhost:4096"
}));

// node_modules/.bun/@opencode-ai+sdk@1.0.163/node_modules/@opencode-ai/sdk/dist/gen/sdk.gen.js
class _HeyApiClient {
  _client = client;
  constructor(args) {
    if (args?.client) {
      this._client = args.client;
    }
  }
}

class Global extends _HeyApiClient {
  event(options) {
    return (options?.client ?? this._client).get.sse({
      url: "/global/event",
      ...options
    });
  }
}

class Project extends _HeyApiClient {
  list(options) {
    return (options?.client ?? this._client).get({
      url: "/project",
      ...options
    });
  }
  current(options) {
    return (options?.client ?? this._client).get({
      url: "/project/current",
      ...options
    });
  }
}

class Pty extends _HeyApiClient {
  list(options) {
    return (options?.client ?? this._client).get({
      url: "/pty",
      ...options
    });
  }
  create(options) {
    return (options?.client ?? this._client).post({
      url: "/pty",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  remove(options) {
    return (options.client ?? this._client).delete({
      url: "/pty/{id}",
      ...options
    });
  }
  get(options) {
    return (options.client ?? this._client).get({
      url: "/pty/{id}",
      ...options
    });
  }
  update(options) {
    return (options.client ?? this._client).put({
      url: "/pty/{id}",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  connect(options) {
    return (options.client ?? this._client).get({
      url: "/pty/{id}/connect",
      ...options
    });
  }
}

class Config extends _HeyApiClient {
  get(options) {
    return (options?.client ?? this._client).get({
      url: "/config",
      ...options
    });
  }
  update(options) {
    return (options?.client ?? this._client).patch({
      url: "/config",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  providers(options) {
    return (options?.client ?? this._client).get({
      url: "/config/providers",
      ...options
    });
  }
}

class Tool extends _HeyApiClient {
  ids(options) {
    return (options?.client ?? this._client).get({
      url: "/experimental/tool/ids",
      ...options
    });
  }
  list(options) {
    return (options.client ?? this._client).get({
      url: "/experimental/tool",
      ...options
    });
  }
}

class Instance extends _HeyApiClient {
  dispose(options) {
    return (options?.client ?? this._client).post({
      url: "/instance/dispose",
      ...options
    });
  }
}

class Path extends _HeyApiClient {
  get(options) {
    return (options?.client ?? this._client).get({
      url: "/path",
      ...options
    });
  }
}

class Vcs extends _HeyApiClient {
  get(options) {
    return (options?.client ?? this._client).get({
      url: "/vcs",
      ...options
    });
  }
}

class Session extends _HeyApiClient {
  list(options) {
    return (options?.client ?? this._client).get({
      url: "/session",
      ...options
    });
  }
  create(options) {
    return (options?.client ?? this._client).post({
      url: "/session",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  status(options) {
    return (options?.client ?? this._client).get({
      url: "/session/status",
      ...options
    });
  }
  delete(options) {
    return (options.client ?? this._client).delete({
      url: "/session/{id}",
      ...options
    });
  }
  get(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}",
      ...options
    });
  }
  update(options) {
    return (options.client ?? this._client).patch({
      url: "/session/{id}",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  children(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/children",
      ...options
    });
  }
  todo(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/todo",
      ...options
    });
  }
  init(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/init",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  fork(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/fork",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  abort(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/abort",
      ...options
    });
  }
  unshare(options) {
    return (options.client ?? this._client).delete({
      url: "/session/{id}/share",
      ...options
    });
  }
  share(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/share",
      ...options
    });
  }
  diff(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/diff",
      ...options
    });
  }
  summarize(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/summarize",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  messages(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/message",
      ...options
    });
  }
  prompt(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/message",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  message(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/message/{messageID}",
      ...options
    });
  }
  promptAsync(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/prompt_async",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  command(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/command",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  shell(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/shell",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  revert(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/revert",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  unrevert(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/unrevert",
      ...options
    });
  }
}

class Command extends _HeyApiClient {
  list(options) {
    return (options?.client ?? this._client).get({
      url: "/command",
      ...options
    });
  }
}

class Oauth extends _HeyApiClient {
  authorize(options) {
    return (options.client ?? this._client).post({
      url: "/provider/{id}/oauth/authorize",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  callback(options) {
    return (options.client ?? this._client).post({
      url: "/provider/{id}/oauth/callback",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
}

class Provider extends _HeyApiClient {
  list(options) {
    return (options?.client ?? this._client).get({
      url: "/provider",
      ...options
    });
  }
  auth(options) {
    return (options?.client ?? this._client).get({
      url: "/provider/auth",
      ...options
    });
  }
  oauth = new Oauth({ client: this._client });
}

class Find extends _HeyApiClient {
  text(options) {
    return (options.client ?? this._client).get({
      url: "/find",
      ...options
    });
  }
  files(options) {
    return (options.client ?? this._client).get({
      url: "/find/file",
      ...options
    });
  }
  symbols(options) {
    return (options.client ?? this._client).get({
      url: "/find/symbol",
      ...options
    });
  }
}

class File extends _HeyApiClient {
  list(options) {
    return (options.client ?? this._client).get({
      url: "/file",
      ...options
    });
  }
  read(options) {
    return (options.client ?? this._client).get({
      url: "/file/content",
      ...options
    });
  }
  status(options) {
    return (options?.client ?? this._client).get({
      url: "/file/status",
      ...options
    });
  }
}

class App extends _HeyApiClient {
  log(options) {
    return (options?.client ?? this._client).post({
      url: "/log",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  agents(options) {
    return (options?.client ?? this._client).get({
      url: "/agent",
      ...options
    });
  }
}

class Auth extends _HeyApiClient {
  remove(options) {
    return (options.client ?? this._client).delete({
      url: "/mcp/{name}/auth",
      ...options
    });
  }
  start(options) {
    return (options.client ?? this._client).post({
      url: "/mcp/{name}/auth",
      ...options
    });
  }
  callback(options) {
    return (options.client ?? this._client).post({
      url: "/mcp/{name}/auth/callback",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  authenticate(options) {
    return (options.client ?? this._client).post({
      url: "/mcp/{name}/auth/authenticate",
      ...options
    });
  }
  set(options) {
    return (options.client ?? this._client).put({
      url: "/auth/{id}",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
}

class Mcp extends _HeyApiClient {
  status(options) {
    return (options?.client ?? this._client).get({
      url: "/mcp",
      ...options
    });
  }
  add(options) {
    return (options?.client ?? this._client).post({
      url: "/mcp",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  connect(options) {
    return (options.client ?? this._client).post({
      url: "/mcp/{name}/connect",
      ...options
    });
  }
  disconnect(options) {
    return (options.client ?? this._client).post({
      url: "/mcp/{name}/disconnect",
      ...options
    });
  }
  auth = new Auth({ client: this._client });
}

class Lsp extends _HeyApiClient {
  status(options) {
    return (options?.client ?? this._client).get({
      url: "/lsp",
      ...options
    });
  }
}

class Formatter extends _HeyApiClient {
  status(options) {
    return (options?.client ?? this._client).get({
      url: "/formatter",
      ...options
    });
  }
}

class Control extends _HeyApiClient {
  next(options) {
    return (options?.client ?? this._client).get({
      url: "/tui/control/next",
      ...options
    });
  }
  response(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/control/response",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
}

class Tui extends _HeyApiClient {
  appendPrompt(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/append-prompt",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  openHelp(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/open-help",
      ...options
    });
  }
  openSessions(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/open-sessions",
      ...options
    });
  }
  openThemes(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/open-themes",
      ...options
    });
  }
  openModels(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/open-models",
      ...options
    });
  }
  submitPrompt(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/submit-prompt",
      ...options
    });
  }
  clearPrompt(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/clear-prompt",
      ...options
    });
  }
  executeCommand(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/execute-command",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  showToast(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/show-toast",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  publish(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/publish",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  control = new Control({ client: this._client });
}

class Event extends _HeyApiClient {
  subscribe(options) {
    return (options?.client ?? this._client).get.sse({
      url: "/event",
      ...options
    });
  }
}

class OpencodeClient extends _HeyApiClient {
  postSessionIdPermissionsPermissionId(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/permissions/{permissionID}",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  global = new Global({ client: this._client });
  project = new Project({ client: this._client });
  pty = new Pty({ client: this._client });
  config = new Config({ client: this._client });
  tool = new Tool({ client: this._client });
  instance = new Instance({ client: this._client });
  path = new Path({ client: this._client });
  vcs = new Vcs({ client: this._client });
  session = new Session({ client: this._client });
  command = new Command({ client: this._client });
  provider = new Provider({ client: this._client });
  find = new Find({ client: this._client });
  file = new File({ client: this._client });
  app = new App({ client: this._client });
  mcp = new Mcp({ client: this._client });
  lsp = new Lsp({ client: this._client });
  formatter = new Formatter({ client: this._client });
  tui = new Tui({ client: this._client });
  auth = new Auth({ client: this._client });
  event = new Event({ client: this._client });
}

// node_modules/.bun/@opencode-ai+sdk@1.0.163/node_modules/@opencode-ai/sdk/dist/client.js
function createOpencodeClient(config) {
  if (!config?.fetch) {
    const customFetch = (req) => {
      req.timeout = false;
      return fetch(req);
    };
    config = {
      ...config,
      fetch: customFetch
    };
  }
  if (config?.directory) {
    config.headers = {
      ...config.headers,
      "x-opencode-directory": config.directory
    };
  }
  const client2 = createClient2(config);
  return new OpencodeClient({ client: client2 });
}
// node_modules/.bun/@opencode-ai+sdk@1.0.163/node_modules/@opencode-ai/sdk/dist/server.js
import { spawn } from "node:child_process";
async function createOpencodeServer(options) {
  options = Object.assign({
    hostname: "127.0.0.1",
    port: 4096,
    timeout: 5000
  }, options ?? {});
  const proc = spawn(`opencode`, [`serve`, `--hostname=${options.hostname}`, `--port=${options.port}`], {
    signal: options.signal,
    env: {
      ...process.env,
      OPENCODE_CONFIG_CONTENT: JSON.stringify(options.config ?? {})
    }
  });
  const url = await new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new Error(`Timeout waiting for server to start after ${options.timeout}ms`));
    }, options.timeout);
    let output = "";
    proc.stdout?.on("data", (chunk) => {
      output += chunk.toString();
      const lines = output.split(`
`);
      for (const line of lines) {
        if (line.startsWith("opencode server listening")) {
          const match = line.match(/on\s+(https?:\/\/[^\s]+)/);
          if (!match) {
            throw new Error(`Failed to parse server url from output: ${line}`);
          }
          clearTimeout(id);
          resolve(match[1]);
          return;
        }
      }
    });
    proc.stderr?.on("data", (chunk) => {
      output += chunk.toString();
    });
    proc.on("exit", (code) => {
      clearTimeout(id);
      let msg = `Server exited with code ${code}`;
      if (output.trim()) {
        msg += `
Server output: ${output}`;
      }
      reject(new Error(msg));
    });
    proc.on("error", (error) => {
      clearTimeout(id);
      reject(error);
    });
    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        clearTimeout(id);
        reject(new Error("Aborted"));
      });
    }
  });
  return {
    url,
    close() {
      proc.kill();
    }
  };
}
// node_modules/.bun/@opencode-ai+sdk@1.0.163/node_modules/@opencode-ai/sdk/dist/index.js
async function createOpencode(options) {
  const server2 = await createOpencodeServer({
    ...options
  });
  const client3 = createOpencodeClient({
    baseUrl: server2.url
  });
  return {
    client: client3,
    server: server2
  };
}

// packages/agent-core/dist/lib/types.js
var API_KEY_ENV_VARS = {
  anthropic: ["ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN"],
  openai: ["OPENAI_API_KEY"],
  google: ["GOOGLE_GENERATIVE_AI_API_KEY"]
};
var OAUTH_ENV_VARS = {
  anthropic: ["ANTHROPIC_OAUTH_ACCESS", "ANTHROPIC_OAUTH_REFRESH", "ANTHROPIC_OAUTH_EXPIRES"]
};

// packages/agent-core/dist/lib/utils.js
function extractTextFromParts(parts) {
  if (!Array.isArray(parts))
    return "";
  return parts.filter((part) => part.type === "text").map((part) => part.text || "").join(`
`);
}
function validateEnvVars(requiredVars) {
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    const errorMsg = [
      "Error: Missing required environment variables:",
      ...missingVars.map((varName) => `  - ${varName}`),
      "",
      "Please set all required environment variables and try again."
    ].join(`
`);
    throw new Error(errorMsg);
  }
}
function getAuthCredentials(provider) {
  const oauthVars = OAUTH_ENV_VARS[provider];
  if (oauthVars && oauthVars.length === 3) {
    const accessVar = oauthVars[0];
    const refreshVar = oauthVars[1];
    const expiresVar = oauthVars[2];
    if (accessVar && refreshVar && expiresVar) {
      const access = process.env[accessVar];
      const refresh = process.env[refreshVar];
      const expiresStr = process.env[expiresVar];
      if (access && refresh && expiresStr) {
        const expires = Number.parseInt(expiresStr, 10);
        if (!Number.isNaN(expires)) {
          return {
            type: "oauth",
            oauth: { access, refresh, expires }
          };
        }
      }
    }
  }
  const envVars = API_KEY_ENV_VARS[provider];
  for (const envVar of envVars) {
    const apiKey = process.env[envVar];
    if (apiKey) {
      return {
        type: "api",
        apiKey
      };
    }
  }
  return null;
}

// packages/agent-core/dist/lib/opencode.js
async function setProviderAuth(client3, provider) {
  const credentials = getAuthCredentials(provider);
  if (!credentials) {
    const errorMsg = [
      `Error: No authentication credentials found for provider "${provider}"`,
      `Please set one of the following environment variables:`,
      provider === "anthropic" ? "  OAuth (preferred): ANTHROPIC_OAUTH_ACCESS, ANTHROPIC_OAUTH_REFRESH, ANTHROPIC_OAUTH_EXPIRES" : "",
      provider === "anthropic" ? "  OR API Key: ANTHROPIC_API_KEY, CLAUDE_CODE_OAUTH_TOKEN" : "",
      provider === "openai" ? "  API Key: OPENAI_API_KEY" : "",
      provider === "google" ? "  API Key: GOOGLE_GENERATIVE_AI_API_KEY" : ""
    ].filter((line) => line !== "").join(`
`);
    throw new Error(errorMsg);
  }
  if (credentials.type === "oauth") {
    await client3.auth.set({
      path: { id: provider },
      body: {
        type: "oauth",
        access: credentials.oauth.access,
        refresh: credentials.oauth.refresh,
        expires: credentials.oauth.expires
      }
    });
  } else {
    await client3.auth.set({
      path: { id: provider },
      body: {
        type: "api",
        key: credentials.apiKey
      }
    });
  }
}
async function createOpencodeServer2(options) {
  const { provider, model, agentName, agentDescription, agentPrompt, agentTools = {}, agentPermissions = {}, maxSteps = 30, linearApiKey } = options;
  const opcodeConfig = {
    provider: {
      [provider]: {
        options: {
          timeout: false
        }
      }
    },
    ...linearApiKey && {
      mcp: {
        linear: {
          type: "remote",
          url: "https://mcp.linear.app/mcp",
          headers: {
            Authorization: `Bearer ${linearApiKey}`
          }
        }
      }
    },
    agent: {
      [agentName]: {
        description: agentDescription,
        mode: "subagent",
        model,
        prompt: agentPrompt,
        tools: agentTools,
        maxSteps,
        permission: agentPermissions
      }
    }
  };
  console.error("Starting OpenCode server...");
  const { client: client3, server: server2 } = await createOpencode({
    hostname: "127.0.0.1",
    port: 0,
    config: opcodeConfig
  });
  console.error(`✓ OpenCode server started at ${server2.url}`);
  await setProviderAuth(client3, provider);
  return { client: client3, server: server2 };
}
function setupEventMonitoring(client3, logger) {
  console.error("Setting up event monitoring...");
  (async () => {
    try {
      const events = await client3.event.subscribe();
      for await (const event of events.stream) {
        if (event.type === "message.part.updated") {
          const part = event.properties.part;
          if (part && part.type === "tool" && part.state && part.tool) {
            const status = part.state.status;
            const toolName = part.tool;
            if (status === "running") {
              const input = JSON.stringify(part.state.input || {}, null, 2);
              console.error(`
[TOOL] ${toolName} - RUNNING`);
              console.error(`  Input: ${input}`);
              if (logger) {
                logger.logToolExecution({
                  toolName,
                  status: "running",
                  input: part.state.input,
                  startedAt: new Date
                });
              }
            } else if (status === "completed") {
              const output = part.state.output?.slice(0, 200) || "(no output)";
              const duration = part.state.time?.end && part.state.time?.start ? `${((part.state.time.end - part.state.time.start) / 1000).toFixed(2)}s` : "unknown";
              console.error(`
[TOOL] ${toolName} - COMPLETED (${duration})`);
              console.error(`  Output preview: ${output}${part.state.output && part.state.output.length > 200 ? "..." : ""}`);
              if (logger) {
                logger.logToolExecution({
                  toolName,
                  status: "completed",
                  input: part.state.input,
                  output: part.state.output,
                  startedAt: part.state.time?.start ? new Date(part.state.time.start) : undefined,
                  endedAt: part.state.time?.end ? new Date(part.state.time.end) : undefined
                });
              }
            } else if (status === "error") {
              console.error(`
[TOOL] ${toolName} - ERROR`);
              console.error(`  Error: ${part.state.error}`);
              if (logger) {
                logger.logToolExecution({
                  toolName,
                  status: "error",
                  input: part.state.input,
                  error: part.state.error
                });
              }
            }
          }
        }
        if (event.type === "session.status") {
          const status = event.properties.status;
          if (status) {
            if (String(status) === "idle") {
              console.error(`
[STATUS] Session idle`);
            } else if (String(status) === "busy") {
              console.error(`
[STATUS] Session busy (processing)`);
            } else if (typeof status === "object" && status !== null && "attempt" in status) {
              console.error(`
[STATUS] Session retrying (attempt ${status.attempt})`);
              if ("message" in status)
                console.error(`  Reason: ${status.message}`);
              if ("next" in status)
                console.error(`  Next retry in: ${status.next}ms`);
            }
          }
        }
        if (event.type === "session.error") {
          const error = event.properties.error;
          console.error(`
[ERROR] Session error:`, error);
        }
      }
    } catch (err) {
      console.error("Event monitoring subscription error:", err);
    }
  })();
}

// packages/agent-core/dist/lib/agent-runner.js
async function findPromptFile(fileName) {
  const possiblePaths = [
    join2(process.cwd(), ".github", "claude-parallel", "prompts", fileName),
    join2(process.cwd(), "prompts", fileName)
  ];
  for (const path of possiblePaths) {
    try {
      await access(path);
      return path;
    } catch {}
  }
  throw new Error(`Could not find ${fileName} in any of these locations:
${possiblePaths.map((p) => `  - ${p}`).join(`
`)}`);
}
async function runAgent(config) {
  try {
    validateEnvVars(config.requiredEnvVars);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
  const provider = process.env.PROVIDER || "anthropic";
  const model = process.env.MODEL || (provider === "anthropic" ? "claude-opus-4-5" : "");
  const linearApiKey = process.env.LINEAR_API_KEY;
  console.error(`
${"=".repeat(60)}`);
  console.error(`${config.name}`);
  console.error(`${"=".repeat(60)}`);
  console.error(`Provider: ${provider}`);
  console.error(`Model: ${model}`);
  console.error("");
  const logger = await createConversationLogger();
  if (logger) {
    console.error(`✓ Conversation logging enabled`);
  }
  let prompt;
  try {
    const promptFile = await findPromptFile(config.promptFileName);
    const template = await readFile(promptFile, "utf-8");
    prompt = config.processPrompt ? config.processPrompt(template, process.env) : template;
    console.error(`✓ Loaded and processed prompt from ${promptFile}`);
  } catch (error) {
    console.error(`✗ Failed to load prompt: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
  const { client: client3, server: server2 } = await createOpencodeServer2({
    provider,
    model,
    agentName: config.name,
    agentDescription: config.description,
    agentPrompt: prompt,
    agentTools: config.getAgentTools ? config.getAgentTools(linearApiKey) : {
      read: true,
      list: true,
      glob: true,
      grep: true,
      webfetch: true
    },
    agentPermissions: config.getAgentPermissions ? config.getAgentPermissions(linearApiKey) : {
      bash: "allow",
      webfetch: "allow"
    },
    maxSteps: config.maxSteps || 30,
    linearApiKey
  });
  setupEventMonitoring(client3, logger);
  try {
    if (logger) {
      await logger.startSession({
        id: crypto.randomUUID(),
        agentType: config.name,
        model,
        provider
      });
    }
    const sessionResponse = await client3.session.create({
      body: { title: `${config.name}: ${new Date().toISOString()}` }
    });
    if (!sessionResponse.data) {
      throw new Error("Failed to create session");
    }
    const session = sessionResponse.data;
    console.error(`✓ Session created: ${session.id}`);
    const promptResponse = await client3.session.prompt({
      path: { id: session.id },
      body: {
        model: { providerID: provider, modelID: model },
        agent: config.name,
        parts: [{ type: "text", text: prompt }]
      }
    });
    if (!promptResponse.data) {
      throw new Error("Failed to get response");
    }
    const responseInfo = promptResponse.data.info;
    if (responseInfo?.error) {
      const err = responseInfo.error;
      throw new Error(`Provider error: ${err.name}`);
    }
    const resultText = extractTextFromParts(promptResponse.data.parts);
    if (resultText.length === 0) {
      throw new Error("Empty response from agent");
    }
    console.log(resultText);
    if (logger) {
      await logger.endSession("completed");
      await logger.syncToCloud();
    }
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`
ERROR: ${errorMessage}`);
    if (logger) {
      await logger.endSession("error", errorMessage);
      await logger.syncToCloud();
    }
    process.exit(1);
  } finally {
    server2.close();
  }
}
// src/agents/planning-agent.ts
async function main() {
  await runAgent({
    name: "planning-agent",
    description: "Generate a comprehensive implementation plan for a given feature",
    requiredEnvVars: [],
    promptFileName: "plan-generation.md",
    getAgentTools: () => ({
      write: false,
      edit: false,
      bash: false,
      read: true,
      list: true,
      glob: true,
      grep: true,
      webfetch: true
    }),
    getAgentPermissions: () => ({
      edit: "deny",
      bash: "deny",
      webfetch: "allow"
    }),
    processPrompt: (template) => {
      const args = process.argv.slice(2);
      if (args.length < 1) {
        console.error("Usage: planning-agent.ts <feature-description>");
        process.exit(1);
      }
      return template;
    }
  });
}
main().catch((error) => {
  console.error("FATAL ERROR:", error);
  process.exit(1);
});
