// backend/scripts/generate-docs.mjs
// Requisitos: Node 18+
// Instale (dev): npm i -D @babel/parser @babel/traverse fast-glob fs-extra

import path from "node:path";
import fs from "node:fs";
import fse from "fs-extra";
import fg from "fast-glob";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
const traverse = traverseModule.default;

/** ==========================
 *  Config & Helpers
 *  ========================== */

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "documentacao");

// Candidatos (singular/plural + com/sem src/)
const CANDIDATE_DIRS = [
  "routes", "route", "api",
  "models", "model",
  "middleware", "middlewares",
  "config",
  "services", "service",
  "controllers", "controller",
  "utils", "lib", "helpers",
  "src/routes", "src/route", "src/api",
  "src/models", "src/model",
  "src/middleware", "src/middlewares",
  "src/config",
  "src/services", "src/service",
  "src/controllers", "src/controller",
  "src/utils", "src/lib", "src/helpers",
];

const SRC_DIRS = Array.from(new Set(
  CANDIDATE_DIRS.filter(d => fs.existsSync(path.join(ROOT, d)))
));

function findDockerfile(rootDir) {
  const tryDir = (dir) => {
    if (!fs.existsSync(dir)) return null;
    const match = fs.readdirSync(dir).find(n => /^dockerfile$/i.test(n));
    return match ? path.join(dir, match) : null;
  };
  return tryDir(rootDir) ?? tryDir(path.join(rootDir, "src"));
}

const DOCKERFILE = findDockerfile(ROOT);

const METHODS = new Set(["get", "post", "put", "delete", "patch", "options", "head", "all"]);

const babelOptions = {
  sourceType: "unambiguous",
  plugins: [
    "jsx",
    "typescript",
    "classProperties",
    "dynamicImport",
    "objectRestSpread",
    "decorators-legacy",
  ],
};

function readIfExists(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return null; }
}
function tryParse(code) {
  try { return parse(code, babelOptions); } catch { return null; }
}
function rel(p) { return path.relative(ROOT, p).replaceAll("\\", "/"); }
function hasSeg(p, ...names) {
  const norm = p.replaceAll("\\", "/");
  return names.some(n => new RegExp(`/(?:${n})(?:s)?/`).test("/" + norm + "/"));
}
function isServiceFile(file)   { return hasSeg(file, "service"); }
function isModelFile(file)     { return hasSeg(file, "model"); }
function isRouteFile(file)     { return hasSeg(file, "route", "api"); }
function isCtrlFile(file)      { return hasSeg(file, "controller"); }
function isMwFile(file)        { return hasSeg(file, "middleware"); }
function isUtilFile(file)      { return hasSeg(file, "util", "lib", "helper"); }
function isConfigFile(file)    { return hasSeg(file, "config"); }

function getStringLiteral(node) {
  if (!node) return null;
  if (node.type === "StringLiteral") return node.value;
  if (node.type === "TemplateLiteral" && node.quasis?.length === 1) {
    return node.quasis[0].value.cooked;
  }
  return null;
}
function normalizeImportSource(src = "") {
  if (!src) return "";
  // Mantém pacotes externos; caminhos relativos ficam como estão
  return src;
}
function isReqResNext(params = []) {
  if (params.length < 2) return false;
  const id = n => (n && n.type === "Identifier") ? n.name : null;
  const [a,b,c] = params;
  return (id(a) && id(b)) || !!id(c);
}

/** ==========================
 *  Extrações
 *  ========================== */

function extractEnvVars(ast) {
  const vars = new Set();
  traverse(ast, {
    MemberExpression(p) {
      const { node } = p;
      if (
        node.object?.type === "MemberExpression" &&
        node.object.object?.type === "Identifier" &&
        node.object.object.name === "process" &&
        node.object.property?.type === "Identifier" &&
        node.object.property.name === "env"
      ) {
        if (node.property?.type === "Identifier") vars.add(node.property.name);
        if (node.property?.type === "StringLiteral") vars.add(node.property.value);
      }
    },
  });
  return [...vars];
}

function extractImports(ast) {
  const imports = [];
  traverse(ast, {
    ImportDeclaration(p) {
      imports.push(normalizeImportSource(p.node.source.value));
    },
    CallExpression(p) {
      const { node } = p;
      if (node.callee.type === "Identifier" && node.callee.name === "require" && node.arguments.length) {
        const arg = node.arguments[0];
        if (arg.type === "StringLiteral") imports.push(normalizeImportSource(arg.value));
      }
    },
  });
  return imports;
}

function findRouterVarNames(ast) {
  // Detecta variáveis que são express.Router() ou Router()
  const names = new Set(["app", "router"]);
  traverse(ast, {
    VariableDeclarator(p) {
      const { init, id } = p.node;
      if (!init || !id || id.type !== "Identifier") return;

      // express.Router()
      if (
        init.type === "CallExpression" &&
        init.callee?.type === "MemberExpression" &&
        init.callee.object?.type === "Identifier" &&
        init.callee.object.name === "express" &&
        init.callee.property?.name === "Router"
      ) {
        names.add(id.name);
        return;
      }

      // Router() importado
      if (init.type === "CallExpression" && init.callee?.type === "Identifier" && init.callee.name === "Router") {
        names.add(id.name);
      }
    },
  });
  return [...names];
}

function extractRoutes(ast, filePath) {
  const routes = [];
  const routerVars = new Set(findRouterVarNames(ast));

  traverse(ast, {
    CallExpression(p) {
      const { node } = p;
      if (node.callee?.type !== "MemberExpression") return;

      const obj = node.callee.object;
      const prop = node.callee.property;
      if (!obj || !prop || prop.type !== "Identifier") return;

      const method = prop.name.toLowerCase();
      if (!METHODS.has(method)) return;

      let objectName = null;
      if (obj.type === "Identifier") objectName = obj.name;
      if (!objectName || !routerVars.has(objectName)) return;

      const args = node.arguments || [];
      if (!args.length) return;

      const pathArg = args[0];
      const routePath = getStringLiteral(pathArg) ?? "(dinâmico/expressão)";

      const middlewareNames = [];
      const handlerNames = [];

      for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (!a) continue;

        if (a.type === "Identifier") {
          (i === args.length - 1 ? handlerNames : middlewareNames).push(a.name);
        } else if (a.type === "CallExpression" && a.callee?.type === "Identifier") {
          middlewareNames.push(`${a.callee.name}(...)`);
        } else if (a.type === "MemberExpression") {
          const objName = a.object?.name || (a.object?.type === "ThisExpression" ? "this" : "?");
          const propName = a.property?.name || "?";
          (i === args.length - 1 ? handlerNames : middlewareNames).push(`${objName}.${propName}`);
        } else if (a.type === "ArrowFunctionExpression" || a.type === "FunctionExpression") {
          (i === args.length - 1 ? handlerNames : middlewareNames).push("(função inline)");
        } else {
          middlewareNames.push("(expressão)");
        }
      }

      routes.push({
        file: filePath,
        object: objectName,
        method: method.toUpperCase(),
        path: routePath,
        middlewares: middlewareNames,
        handlers: handlerNames,
      });
    },
  });

  return routes;
}

function extractMiddlewareExports(ast, filePath) {
  const out = [];

  // 1) Coletar nomes de funções/top-level que são middlewares (assinam req,res[,next])
  const topLevelFns = new Map(); // name -> true/false (se parece (req,res,next))
  const trackTopLevel = (idName, params) => {
    if (!idName) return;
    topLevelFns.set(idName, isReqResNext(params));
  };

  traverse(ast, {
    FunctionDeclaration(p) {
      const { id, params } = p.node;
      if (id?.name) trackTopLevel(id.name, params);
    },
    VariableDeclarator(p) {
      const { id, init } = p.node;
      if (id?.type === "Identifier" && (init?.type === "ArrowFunctionExpression" || init?.type === "FunctionExpression")) {
        trackTopLevel(id.name, init.params);
      }
    },
  });

  const pushExport = (name, paramsIsReqResNext, origin = "export") => {
    out.push({
      file: filePath,
      name,
      isReqResNext: paramsIsReqResNext,
      origin
    });
  };

  traverse(ast, {
    // export default function(req,res,next) {}
    ExportDefaultDeclaration(p) {
      const d = p.node.declaration;
      if (d?.type === "FunctionDeclaration") {
        pushExport(d.id?.name || "default", isReqResNext(d.params), "export-default-fn");
      } else if (d?.type === "ArrowFunctionExpression" || d?.type === "FunctionExpression") {
        pushExport("default", isReqResNext(d.params), "export-default-inline");
      } else if (d?.type === "Identifier") {
        const name = d.name;
        pushExport(name, !!topLevelFns.get(name), "export-default-id");
      }
    },

    // export const foo = (req,res,next)=>{}
    ExportNamedDeclaration(p) {
      const d = p.node.declaration;
      if (!d) return;

      if (d.type === "FunctionDeclaration") {
        pushExport(d.id?.name || "(anon)", isReqResNext(d.params), "export-named-fn");
      }
      if (d.type === "VariableDeclaration") {
        for (const decl of d.declarations) {
          if (decl.id?.type === "Identifier") {
            const name = decl.id.name;
            const init = decl.init;
            if (init?.type === "ArrowFunctionExpression" || init?.type === "FunctionExpression") {
              pushExport(name, isReqResNext(init.params), "export-named-varfn");
            } else {
              // export const foo = algo; (pode ser referência a função já declarada)
              pushExport(name, !!topLevelFns.get(name), "export-named-var");
            }
          }
        }
      }
    },

    // CommonJS: module.exports = <algo>
    AssignmentExpression(p) {
      const { left, right } = p.node;

      // module.exports = ...
      const isModuleExports =
        left.type === "MemberExpression" &&
        left.object?.type === "Identifier" &&
        left.object.name === "module" &&
        left.property?.type === "Identifier" &&
        left.property.name === "exports";

      // exports.algo = ...
      const isExportsDot =
        left.type === "MemberExpression" &&
        left.object?.type === "Identifier" &&
        left.object.name === "exports" &&
        left.property?.type === "Identifier";

      // module.exports.algo = ...
      const isModuleExportsDot =
        left.type === "MemberExpression" &&
        left.object?.type === "MemberExpression" &&
        left.object.object?.type === "Identifier" &&
        left.object.object.name === "module" &&
        left.object.property?.type === "Identifier" &&
        left.object.property.name === "exports" &&
        left.property?.type === "Identifier";

      if (isModuleExports) {
        // 1) module.exports = function/arrow
        if (right.type === "FunctionExpression" || right.type === "ArrowFunctionExpression") {
          pushExport("module.exports", isReqResNext(right.params), "cjs-assign-fn");
          return;
        }
        // 2) module.exports = identificador
        if (right.type === "Identifier") {
          const name = right.name;
          pushExport(name, !!topLevelFns.get(name), "cjs-assign-id");
          return;
        }
        // 3) module.exports = { foo, bar, baz: fn }
        if (right.type === "ObjectExpression") {
          for (const prop of right.properties || []) {
            if (prop.type !== "ObjectProperty") continue;
            const key = prop.key.type === "Identifier" ? prop.key.name : (prop.key.value ?? "?");
            const v = prop.value;
            if (v.type === "FunctionExpression" || v.type === "ArrowFunctionExpression") {
              pushExport(key, isReqResNext(v.params), "cjs-assign-obj-fn");
            } else if (v.type === "Identifier") {
              const ref = v.name;
              pushExport(key, !!topLevelFns.get(ref), "cjs-assign-obj-id");
            }
          }
          return;
        }
      }

      if (isExportsDot) {
        const name = left.property.name;
        const v = right;
        if (v.type === "FunctionExpression" || v.type === "ArrowFunctionExpression") {
          pushExport(name, isReqResNext(v.params), "cjs-exports-dot-fn");
        } else if (v.type === "Identifier") {
          pushExport(name, !!topLevelFns.get(v.name), "cjs-exports-dot-id");
        }
      }

      if (isModuleExportsDot) {
        const name = left.property.name;
        const v = right;
        if (v.type === "FunctionExpression" || v.type === "ArrowFunctionExpression") {
          pushExport(name, isReqResNext(v.params), "cjs-module-exports-dot-fn");
        } else if (v.type === "Identifier") {
          pushExport(name, !!topLevelFns.get(v.name), "cjs-module-exports-dot-id");
        }
      }
    },
  });

  return out;
}


function extractModelSchemas(ast, filePath) {
  const models = [];
  const schemas = [];

  traverse(ast, {
    NewExpression(p) {
      // new mongoose.Schema({...}) ou new Schema({...})
      const { node } = p;
      const callee = node.callee;
      const isSchema =
        (callee?.type === "MemberExpression" &&
          callee.object?.name === "mongoose" &&
          callee.property?.name?.toLowerCase() === "schema") ||
        (callee?.type === "Identifier" && callee.name === "Schema");

      if (!isSchema) return;
      const arg = node.arguments?.[0];
      if (!arg || arg.type !== "ObjectExpression") return;

      const fields = [];
      for (const prop of arg.properties || []) {
        if (prop.type !== "ObjectProperty") continue;
        const key = prop.key.type === "Identifier" ? prop.key.name : (prop.key.value ?? "?");
        let typeStr = "Unknown";

        if (prop.value.type === "Identifier") {
          typeStr = prop.value.name;
        } else if (prop.value.type === "ObjectExpression") {
          let t = null, ref = null;
          for (const pp of prop.value.properties || []) {
            if (pp.type !== "ObjectProperty") continue;
            const k = pp.key.type === "Identifier" ? pp.key.name : (pp.key.value ?? "?");
            if (k === "type") {
              if (pp.value.type === "Identifier") t = pp.value.name;
              if (pp.value.type === "StringLiteral") t = pp.value.value;
            }
            if (k === "ref" && pp.value.type === "StringLiteral") ref = pp.value.value;
          }
          typeStr = ref ? `${t || "Mixed"} (ref ${ref})` : (t || "Subdoc");
        } else if (prop.value.type === "ArrayExpression") {
          let arrStr = "Array";
          const el = prop.value.elements?.[0];
          if (el?.type === "Identifier") arrStr = `Array<${el.name}>`;
          if (el?.type === "ObjectExpression") {
            let t = null, ref = null;
            for (const pp of el.properties || []) {
              if (pp.type !== "ObjectProperty") continue;
              const k = pp.key.type === "Identifier" ? pp.key.name : (pp.key.value ?? "?");
              if (k === "type") {
                if (pp.value.type === "Identifier") t = pp.value.name;
                if (pp.value.type === "StringLiteral") t = pp.value.value;
              }
              if (k === "ref" && pp.value.type === "StringLiteral") ref = pp.value.value;
            }
            arrStr = ref ? `Array<${t || "Mixed"} (ref ${ref})>` : `Array<${t || "Subdoc"}>`;
          }
          typeStr = arrStr;
        }
        fields.push({ name: key, type: typeStr });
      }

      schemas.push({ file: filePath, fields });
    },

    CallExpression(p) {
      const { node } = p;

      // Caso 1: mongoose.model('Name', schema)
      if (node.callee.type === "MemberExpression" &&
          node.callee.object?.name === "mongoose" &&
          node.callee.property?.name === "model" &&
          node.arguments?.length >= 1) {
        const nameArg = node.arguments[0];
        const modelName = nameArg.type === "StringLiteral" ? nameArg.value : "(dinâmico)";
        models.push({ file: filePath, model: modelName });
        return;
      }

      // Caso 2: model('Name', schema) — import { model } from 'mongoose'
      if (node.callee.type === "Identifier" &&
          node.callee.name === "model" &&
          node.arguments?.length >= 1) {
        const nameArg = node.arguments[0];
        const modelName = nameArg.type === "StringLiteral" ? nameArg.value : "(dinâmico)";
        models.push({ file: filePath, model: modelName });
      }
    }
  });

  return { models, schemas };
}

function extractExports(ast) {
  const out = [];
  traverse(ast, {
    ExportNamedDeclaration(p) {
      const d = p.node.declaration;
      if (!d) return;
      if (d.type === "FunctionDeclaration") out.push(d.id?.name || "(anon)");
      if (d.type === "VariableDeclaration") {
        for (const decl of d.declarations) {
          if (decl.id?.type === "Identifier") out.push(decl.id.name);
        }
      }
    },
    AssignmentExpression(p) {
      const { left } = p.node;
      if (left.type === "MemberExpression" && left.object?.name === "module" && left.property?.name === "exports") {
        out.push("module.exports");
      }
    }
  });
  return out;
}

/** ==========================
 *  Main
 *  ========================== */

async function main() {
  await fse.ensureDir(OUT_DIR);

  const patterns = SRC_DIRS.length
    ? SRC_DIRS.map(d => `${d.replaceAll("\\","/")}/**/*.{js,jsx,ts,tsx,mjs,cjs}`)
    : ["**/*.{js,jsx,ts,tsx,mjs,cjs}"]; // fallback: escaneia tudo

  const files = await fg(patterns, {
    cwd: ROOT,
    absolute: true,
    dot: false,
    ignore: ["node_modules/**", "documentacao/**"]
  });

  console.log(`🔎 Arquivos analisados: ${files.length}`);
  console.log(`📁 Pastas consideradas: ${SRC_DIRS.length ? SRC_DIRS.join(", ") : "(todas, fallback)"}`);

  const allImports = new Map();      // file -> [imports]
  const allEnv = new Set();          // process.env.*
  const allRoutes = [];              // {file, object, method, path, middlewares, handlers}
  const middlewares = [];            // {file, name, isReqResNext}
  const models = [];                 // {file, model}
  const schemas = [];                // {file, fields[]}
  const exportsMap = new Map();      // file -> [exports]

  for (const file of files) {
    const code = readIfExists(file);
    if (!code) continue;

    const ast = tryParse(code);
    if (!ast) continue;

    // Imports
    const imps = extractImports(ast);
    allImports.set(file, imps);

    // Env vars
    extractEnvVars(ast).forEach(v => allEnv.add(v));

    // Rotas (qualquer arquivo dentro de routes/route/api + app/server/index)
    const baseName = path.basename(file).toLowerCase();
    if (
      isRouteFile(file) ||
      baseName === "app.js" ||
      baseName === "server.js" ||
      baseName === "index.js"
    ) {
      allRoutes.push(...extractRoutes(ast, rel(file)));
    }

    // Middleware
    if (isMwFile(file)) {
      middlewares.push(...extractMiddlewareExports(ast, rel(file)));
    }

    // Models
    if (isModelFile(file)) {
      const { models: ms, schemas: scs } = extractModelSchemas(ast, rel(file));
      models.push(...ms);
      schemas.push(...scs);
    }

    // Exports
    const exps = extractExports(ast);
    exportsMap.set(rel(file), exps);
  }

  // Services que importam models
  const serviceTouches = [];
  for (const [file, imps] of allImports) {
    if (!isServiceFile(file)) continue;
    const relFile = rel(file);
    const touches = imps.filter(s =>
      /(^\.{1,2}\/|\/)models?\/|(^\.{1,2}\/|\/)model\//.test(s.replaceAll("\\","/"))
    );
    if (touches.length) {
      serviceTouches.push({ file: relFile, models: Array.from(new Set(touches)) });
    }
  }

  // Controllers que importam services
  const controllerTouches = [];
  for (const [file, imps] of allImports) {
    if (!isCtrlFile(file)) continue;
    const relFile = rel(file);
    const touches = imps.filter(s =>
      /(^\.{1,2}\/|\/)services?\/|(^\.{1,2}\/|\/)service\//.test(s.replaceAll("\\","/"))
    );
    if (touches.length) {
      controllerTouches.push({ file: relFile, services: Array.from(new Set(touches)) });
    }
  }

  // Utils exportados
  const utilsExports = [];
  for (const [file, exps] of exportsMap) {
    if (isUtilFile(path.join(ROOT, file))) {
      utilsExports.push({ file, exports: exps });
    }
  }

  // Arquivos config
  const configFiles = files.filter(f => isConfigFile(f)).map(rel);

  // Dockerfile resumo
  const dockerSummary = (() => {
    if (!DOCKERFILE) return null;
    const txt = readIfExists(DOCKERFILE);
    if (!txt) return null;
    const lines = txt.split(/\r?\n/);
    const pick = (prefix) => lines.find(l => l.trim().toUpperCase().startsWith(prefix)) || "";
    return {
      base: pick("FROM "),
      workdir: pick("WORKDIR "),
      expose: pick("EXPOSE "),
      cmd: pick("CMD ")
    };
  })();

  // Grafo de dependências (imports)
  const edges = [];
  for (const [file, imps] of allImports) {
    const from = rel(file);
    for (const s of imps) {
      edges.push({ from, to: s });
    }
  }
  const mermaid = [
    "```mermaid",
    "graph LR",
    ...edges.map(({ from, to }) => {
      const safe = str => String(str).replaceAll("\"","").replaceAll("`","").replaceAll(" ", "_");
      return `  "${safe(from)}" --> "${safe(to)}"`;
    }),
    "```",
  ].join("\n");

  // Logs de diagnóstico
  console.log(`➡️ Rotas: ${allRoutes.length}`);
  console.log(`➡️ Middlewares: ${middlewares.length}`);
  console.log(`➡️ Models: ${models.length} | Schemas (campos): ${schemas.length}`);

  /** ==========================
   *  Escrita dos arquivos .md
   *  ========================== */

  await fse.ensureDir(OUT_DIR);

  // index.md
  const indexMd = `# Documentação do Backend

Gerado automaticamente por \`scripts/generate-docs.mjs\`.

## Conteúdo

- [Rotas](./rotas.md)
- [Modelos (Mongoose)](./modelos.md)
- [Serviços](./servicos.md)
- [Middlewares](./middlewares.md)
- [Utils](./utils.md)
- [Config & Env](./config.md)
- [Docker](./docker.md)
- [Grafo de dependências](./grafo-dependencias.md)

> Objetivo: apoiar a migração para PostgreSQL identificando o encadeamento (rotas → controllers → services → models) e dependências específicas de Mongo/Mongoose.
`;
  await fse.writeFile(path.join(OUT_DIR, "index.md"), indexMd);

  // rotas.md
  const rotasMd = `# Rotas Express

Total: **${allRoutes.length}**

${allRoutes.map(r => `- **${r.method}** \`${r.path}\` — _${r.object}_  
  • Middlewares: ${r.middlewares.length ? r.middlewares.join(", ") : "—"}  
  • Handlers: ${r.handlers.length ? r.handlers.join(", ") : "—"}  
  • Arquivo: \`${r.file}\`
`).join("\n")}
`;
  await fse.writeFile(path.join(OUT_DIR, "rotas.md"), rotasMd);

  // modelos.md
  const modelosMd = `# Modelos (Mongoose)

Modelos detectados: **${models.length}**

${models.map(m => `- **${m.model}**  \n  • Definição em: \`${m.file}\``).join("\n") || "—"}

## Campos por Schema (heurístico)

${schemas.map((s) => {
  const lines = s.fields.map(f => `  - \`${f.name}\`: ${f.type}`).join("\n");
  return `### Schema em \`${s.file}\`\n${lines || "(sem campos detectados)"}\n`;
}).join("\n") || "—"}
`;
  await fse.writeFile(path.join(OUT_DIR, "modelos.md"), modelosMd);

  // servicos.md
  const servicosMd = `# Services

Services que importam **models** (candidatos a refator para PostgreSQL):

${serviceTouches.length ? serviceTouches.map(s =>
  `- \`${s.file}\`\n  • Models importados: ${s.models.join(", ")}`
).join("\n") : "_Nenhum uso de models em services detectado (ou imports dinâmicos)_."
}

Controllers que importam **services**:

${controllerTouches.length ? controllerTouches.map(c =>
  `- \`${c.file}\`\n  • Services importados: ${c.services.join(", ")}`
).join("\n") : "_Nenhuma ligação controllers→services detectada (ou imports dinâmicos)_."
}
`;
  await fse.writeFile(path.join(OUT_DIR, "servicos.md"), servicosMd);

  // middlewares.md
  const middlewaresMd = `# Middlewares

Total: **${middlewares.length}**

${middlewares.map(m => `- \`${m.name}\` — ${m.isReqResNext ? "assina (req,res,next)" : "função exportada"}  
  • Arquivo: \`${m.file}\``).join("\n") || "—"}
`;
  await fse.writeFile(path.join(OUT_DIR, "middlewares.md"), middlewaresMd);

  // utils.md
  const utilsMd = `# Utils (exports detectados)

${utilsExports.length ? utilsExports.map(u => `- \`${u.file}\`\n  • Exports: ${u.exports.join(", ") || "—"}`).join("\n") : "_Nenhum util detectado_."
}
`;
  await fse.writeFile(path.join(OUT_DIR, "utils.md"), utilsMd);

  // config.md
  const configMd = `# Config & Variáveis de Ambiente

Arquivos em \`config/\`:

${configFiles.map(f => `- \`${f}\``).join("\n") || "—"}

Variáveis de ambiente usadas (\`process.env\`):

${[...allEnv].sort().map(v => `- \`${v}\``).join("\n") || "—"}
`;
  await fse.writeFile(path.join(OUT_DIR, "config.md"), configMd);

  // docker.md
  const dockerMd = `# Dockerfile

${dockerSummary
  ? `- ${dockerSummary.base || ""}\n- ${dockerSummary.workdir || ""}\n- ${dockerSummary.expose || ""}\n- ${dockerSummary.cmd || ""}`
  : "_Dockerfile não encontrado._"}
`;
  await fse.writeFile(path.join(OUT_DIR, "docker.md"), dockerMd);

  // grafo-dependencias.md
  const graphMd = `# Grafo de dependências (imports)

> Visualize este Mermaid em VSCode (extensão), Obsidian, GitLab etc.

${mermaid}
`;
  await fse.writeFile(path.join(OUT_DIR, "grafo-dependencias.md"), graphMd);

  console.log(`✅ Documentação gerada em: ${rel(OUT_DIR)}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
