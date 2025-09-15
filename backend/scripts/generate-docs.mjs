// backend/scripts/generate-docs.mjs
// Node 18+
// dev deps: @babel/parser @babel/traverse fast-glob fs-extra

import path from "node:path";
import fs from "node:fs";
import fse from "fs-extra";
import fg from "fast-glob";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
const traverse = traverseModule.default;

/* =========================
 * Config & Helpers
 * ========================= */
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "documentacao");

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
const SRC_DIRS = Array.from(new Set(CANDIDATE_DIRS.filter(d => fs.existsSync(path.join(ROOT, d)))));

function findDockerfile(rootDir) {
    const tryDir = (dir) => {
        if (!fs.existsSync(dir)) return null;
        const f = fs.readdirSync(dir).find(n => /^dockerfile$/i.test(n));
        return f ? path.join(dir, f) : null;
    };
    return tryDir(rootDir) ?? tryDir(path.join(rootDir, "src"));
}
const DOCKERFILE = findDockerfile(ROOT);

const METHODS = new Set(["get", "post", "put", "delete", "patch", "options", "head", "all"]);
const babelOptions = {
    sourceType: "unambiguous",
    plugins: ["jsx", "typescript", "classProperties", "dynamicImport", "objectRestSpread", "decorators-legacy"],
};

const readIf = p => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
const rel = p => path.relative(ROOT, p).replaceAll("\\", "/");
const tryParse = code => { try { return parse(code, babelOptions); } catch { return null; } };

function hasSeg(p, ...names) {
    const norm = p.replaceAll("\\", "/");
    return names.some(n => new RegExp(`/(?:${n})(?:s)?/`).test("/" + norm + "/"));
}
const isServiceFile = f => hasSeg(f, "service");
const isModelFile = f => hasSeg(f, "model");
const isRouteFile = f => hasSeg(f, "route", "api");
const isCtrlFile = f => hasSeg(f, "controller");
const isMwFile = f => hasSeg(f, "middleware");
const isUtilFile = f => hasSeg(f, "util", "lib", "helper");
const isConfigFile = f => hasSeg(f, "config");

const getStr = n => n?.type === "StringLiteral" ? n.value :
    (n?.type === "TemplateLiteral" && n.quasis?.length === 1 ? n.quasis[0].value.cooked : null);

const isReqResNext = (params = []) => {
    if (params.length < 2) return false;
    const id = n => n?.type === "Identifier" ? n.name : null;
    return (id(params[0]) && id(params[1])) || !!id(params[2]);
};

const pgTypeMap = (t) => {
    const T = String(t || "").toLowerCase();
    if (["string"].includes(T)) return "text";
    if (["number", "decimal128"].includes(T)) return "numeric";
    if (["boolean", "bool"].includes(T)) return "boolean";
    if (["date"].includes(T)) return "timestamptz";
    if (["objectid", "objectidmongoose", "id"].includes(T)) return "uuid"; // vamos padronizar uuid
    if (["buffer"].includes(T)) return "bytea";
    return "jsonb"; // Mixed/Subdoc/Unknown → jsonb
};

/* =========================
 * Parsers
 * ========================= */
function extractEnvVars(ast) {
    const vars = new Set();
    traverse(ast, {
        MemberExpression(p) {
            const n = p.node;
            if (
                n.object?.type === "MemberExpression" &&
                n.object.object?.type === "Identifier" && n.object.object.name === "process" &&
                n.object.property?.type === "Identifier" && n.object.property.name === "env"
            ) {
                if (n.property?.type === "Identifier") vars.add(n.property.name);
                if (n.property?.type === "StringLiteral") vars.add(n.property.value);
            }
        }
    });
    return [...vars];
}

function extractImports(ast) {
    const imps = [];
    traverse(ast, {
        ImportDeclaration(p) { imps.push(p.node.source.value); },
        CallExpression(p) {
            const n = p.node;
            if (n.callee.type === "Identifier" && n.callee.name === "require" && n.arguments.length) {
                const a = n.arguments[0];
                if (a.type === "StringLiteral") imps.push(a.value);
            }
        }
    });
    return imps;
}

function findRouterVarNames(ast) {
    const names = new Set(["app", "router"]);
    traverse(ast, {
        VariableDeclarator(p) {
            const { init, id } = p.node;
            if (!init || id?.type !== "Identifier") return;
            if (
                init.type === "CallExpression" &&
                init.callee?.type === "MemberExpression" &&
                init.callee.object?.name === "express" &&
                init.callee.property?.name === "Router"
            ) names.add(id.name);
            if (init.type === "CallExpression" && init.callee?.type === "Identifier" && init.callee.name === "Router")
                names.add(id.name);
        }
    });
    return [...names];
}

function extractRoutes(ast, filePath) {
    const routes = [];
    const routerVars = new Set(findRouterVarNames(ast));
    traverse(ast, {
        CallExpression(p) {
            const n = p.node;
            if (n.callee?.type !== "MemberExpression") return;
            const obj = n.callee.object, prop = n.callee.property;
            if (!obj || prop?.type !== "Identifier") return;
            const method = prop.name.toLowerCase();
            if (!METHODS.has(method)) return;
            const objName = obj.type === "Identifier" ? obj.name : null;
            if (!objName || !routerVars.has(objName)) return;

            const args = n.arguments || [];
            if (!args.length) return;
            const routePath = getStr(args[0]) ?? "(dinâmico/expressão)";
            const mws = [], handlers = [];
            for (let i = 1; i < args.length; i++) {
                const a = args[i];
                if (!a) continue;
                if (a.type === "Identifier") (i === args.length - 1 ? handlers : mws).push(a.name);
                else if (a.type === "CallExpression" && a.callee?.type === "Identifier") mws.push(`${a.callee.name}(...)`);
                else if (a.type === "MemberExpression") {
                    const o = a.object?.name || (a.object?.type === "ThisExpression" ? "this" : "?");
                    const pr = a.property?.name || "?";
                    (i === args.length - 1 ? handlers : mws).push(`${o}.${pr}`);
                } else if (a.type === "ArrowFunctionExpression" || a.type === "FunctionExpression") {
                    (i === args.length - 1 ? handlers : mws).push("(função inline)");
                } else mws.push("(expressão)");
            }
            routes.push({ file: filePath, object: objName, method: method.toUpperCase(), path: routePath, middlewares: mws, handlers });
        }
    });
    return routes;
}

function extractMiddlewareExports(ast, filePath) {
    const out = [];
    const topLevelFns = new Map();
    const track = (name, params) => { if (name) topLevelFns.set(name, isReqResNext(params)); };

    traverse(ast, {
        FunctionDeclaration(p) {
            const { id, params } = p.node;
            if (id?.name) track(id.name, params);
        },
        VariableDeclarator(p) {
            const { id, init } = p.node;
            if (id?.type === "Identifier" && (init?.type === "ArrowFunctionExpression" || init?.type === "FunctionExpression")) {
                track(id.name, init.params);
            }
        },
    });

    const push = (name, sign, origin) => out.push({ file: filePath, name, isReqResNext: sign, origin });

    traverse(ast, {
        ExportDefaultDeclaration(p) {
            const d = p.node.declaration;
            if (d?.type === "FunctionDeclaration") { push(d.id?.name || "default", isReqResNext(d.params), "export-default-fn"); return; }
            if (d?.type === "ArrowFunctionExpression" || d?.type === "FunctionExpression") { push("default", isReqResNext(d.params), "export-default-inline"); return; }
            if (d?.type === "Identifier") { push(d.name, !!topLevelFns.get(d.name), "export-default-id"); return; }
        },

        ExportNamedDeclaration(p) {
            const d = p.node.declaration; if (!d) return;
            if (d.type === "FunctionDeclaration") { push(d.id?.name || "(anon)", isReqResNext(d.params), "export-named-fn"); return; }
            if (d.type === "VariableDeclaration") {
                for (const decl of d.declarations) {
                    if (decl.id?.type === "Identifier") {
                        const name = decl.id.name;
                        const init = decl.init;
                        if (init?.type === "ArrowFunctionExpression" || init?.type === "FunctionExpression") {
                            push(name, isReqResNext(init.params), "export-named-varfn");
                        } else {
                            push(name, !!topLevelFns.get(name), "export-named-var");
                        }
                    }
                }
            }
        },

        AssignmentExpression(p) {
            const { left, right } = p.node;

            const isMe =
                left.type === "MemberExpression" &&
                left.object?.type === "Identifier" &&
                left.object.name === "module" &&
                left.property?.name === "exports";

            const isEx =
                left.type === "MemberExpression" &&
                left.object?.type === "Identifier" &&
                left.object.name === "exports" &&
                left.property?.type === "Identifier";

            const isMeDot =
                left.type === "MemberExpression" &&
                left.object?.type === "MemberExpression" &&
                left.object.object?.name === "module" &&
                left.object.property?.name === "exports" &&
                left.property?.type === "Identifier";

            if (isMe) {
                if (right.type === "FunctionExpression" || right.type === "ArrowFunctionExpression") { push("module.exports", isReqResNext(right.params), "cjs-assign-fn"); return; }
                if (right.type === "Identifier") { push(right.name, !!topLevelFns.get(right.name), "cjs-assign-id"); return; }
                if (right.type === "ObjectExpression") {
                    for (const prop of right.properties || []) {
                        if (prop.type !== "ObjectProperty") continue;
                        const key = prop.key.type === "Identifier" ? prop.key.name : (prop.key.value ?? "?");
                        const v = prop.value;
                        if (v.type === "FunctionExpression" || v.type === "ArrowFunctionExpression") { push(key, isReqResNext(v.params), "cjs-assign-obj-fn"); }
                        else if (v.type === "Identifier") { push(key, !!topLevelFns.get(v.name), "cjs-assign-obj-id"); }
                    }
                    return;
                }
            }

            if (isEx) {
                const name = left.property.name;
                const v = right;
                if (v.type === "FunctionExpression" || v.type === "ArrowFunctionExpression") { push(name, isReqResNext(v.params), "cjs-exports-dot-fn"); return; }
                if (v.type === "Identifier") { push(name, !!topLevelFns.get(v.name), "cjs-exports-dot-id"); return; }
            }

            if (isMeDot) {
                const name = left.property.name;
                const v = right;
                if (v.type === "FunctionExpression" || v.type === "ArrowFunctionExpression") { push(name, isReqResNext(v.params), "cjs-module-exports-dot-fn"); return; }
                if (v.type === "Identifier") { push(name, !!topLevelFns.get(v.name), "cjs-module-exports-dot-id"); return; }
            }
        },
    });

    return out;
}


/* ===== Mongo Alerts: populate / aggregate / lean / distinct / updates ===== */
function argPreview(node) {
    if (!node) return "";
    if (node.type === "StringLiteral") return node.value;
    if (node.type === "TemplateLiteral" && node.quasis?.length === 1) return node.quasis[0].value.cooked;
    if (node.type === "Identifier") return node.name;
    if (node.type === "ArrayExpression") return "[" + (node.elements || []).map(argPreview).filter(Boolean).join(", ") + "]";
    if (node.type === "ObjectExpression") {
        const pairs = [];
        for (const p of node.properties || []) {
            if (p.type !== "ObjectProperty") continue;
            const k = p.key.type === "Identifier" ? p.key.name : (p.key.value ?? "?");
            if (["path", "populate", "select", "match"].includes(k) || k.startsWith("$")) pairs.push(`${k}:${argPreview(p.value)}`);
        }
        return "{" + pairs.join(", ") + "}";
    }
    return node.type;
}

function extractMongoAlerts(ast, file) {
    const populates = [], aggregates = [], leans = [], distincts = [], updates = [];
    traverse(ast, {
        CallExpression(p) {
            const n = p.node;

            // member calls
            if (n.callee?.type === "MemberExpression" && n.callee.property?.type === "Identifier") {
                const prop = n.callee.property.name;

                if (prop === "populate") {
                    populates.push({ file, preview: (n.arguments || []).map(argPreview).join(" | ") });
                }
                if (prop === "aggregate") {
                    const first = n.arguments?.[0];
                    let stages = [];
                    if (first?.type === "ArrayExpression") {
                        for (const st of first.elements || []) {
                            if (st?.type === "ObjectExpression") {
                                for (const pr of st.properties || []) {
                                    if (pr.type !== "ObjectProperty") continue;
                                    const k = pr.key.type === "Identifier" ? pr.key.name : (pr.key.value ?? "?");
                                    if (k.startsWith("$")) stages.push(k);
                                }
                            }
                        }
                    }
                    aggregates.push({ file, stages: Array.from(new Set(stages)), pipeline: argPreview(first) });
                }
                if (prop === "lean") leans.push({ file });
                if (prop === "distinct") {
                    const fld = n.arguments?.[0];
                    distincts.push({ file, field: getStr(fld) || argPreview(fld) });
                }
                if (["updateOne", "updateMany", "findOneAndUpdate", "update"].includes(prop)) {
                    const upd = n.arguments?.[1];
                    const ops = [];
                    if (upd?.type === "ObjectExpression") {
                        for (const pr of upd.properties || []) {
                            if (pr.type !== "ObjectProperty") continue;
                            const k = pr.key.type === "Identifier" ? pr.key.name : (pr.key.value ?? "?");
                            if (k.startsWith("$")) ops.push(k);
                        }
                    }
                    updates.push({ file, op: prop, operators: Array.from(new Set(ops)), bodyPreview: argPreview(upd) });
                }
            }

            // direct call aggregate([...])
            if (n.callee?.type === "Identifier" && n.callee.name === "aggregate") {
                const first = n.arguments?.[0];
                aggregates.push({ file, stages: [], pipeline: argPreview(first) });
            }
        }
    });
    return { populates, aggregates, leans, distincts, updates };
}

/* ========== Models (Mongoose) ========== */
function extractModelSchemas(ast, filePath) {
    const models = [];
    const schemas = [];
    const indexes = [];

    // Mapa de variáveis para seus valores literais quando forem ObjectExpression
    // ex: const def = { ... }
    const objectLiteralsByVar = new Map(); // varName -> ObjectExpression
    // Mapa de var de schema => entrada em `schemas`
    const schemaByVar = new Map();         // varName -> {file, varName, fields, options, indexes}

    // Utilitários
    const readSchemaOptions = (opt) => {
        const out = {};
        if (opt?.type !== "ObjectExpression") return out;
        for (const p of opt.properties || []) {
            if (p.type !== "ObjectProperty") continue;
            const k = p.key.type === "Identifier" ? p.key.name : (p.key.value ?? "?");
            // valores literais/identificador simples
            if (p.value.type === "BooleanLiteral") out[k] = p.value.value;
            else if (p.value.type === "NumericLiteral") out[k] = p.value.value;
            else if (p.value.type === "StringLiteral") out[k] = p.value.value;
            else if (p.value.type === "Identifier") out[k] = p.value.name;
            else out[k] = true;
        }
        return out;
    };

    const readField = (node) => {
        const f = { type: "Mixed" };
        if (!node) return f;

        if (node.type === "Identifier") {
            f.type = node.name;
            return f;
        }
        if (node.type === "ArrayExpression") {
            f.array = true;
            const el = node.elements?.[0];
            if (!el) { f.type = "jsonb"; return f; }
            if (el.type === "Identifier") { f.type = `Array<${el.name}>`; return f; }
            if (el.type === "ObjectExpression") {
                const sub = readField(el);
                f.type = `Array<${sub.type || "Subdoc"}>`;
                if (sub.ref) f.ref = sub.ref;
                if (sub.subfields) f.subfields = sub.subfields;
                return f;
            }
            f.type = "jsonb"; return f;
        }
        if (node.type === "ObjectExpression") {
            let hasType = false;
            const subfields = [];
            for (const pp of node.properties || []) {
                if (pp.type !== "ObjectProperty") continue;
                const k = pp.key.type === "Identifier" ? pp.key.name : (pp.key.value ?? "?");
                const v = pp.value;

                if (k === "type") {
                    hasType = true;

                    // 1) Simples: type: String / Number / Boolean ...
                    if (v.type === "Identifier") {
                        f.type = v.name;
                    }
                    // 2) Literal: type: "String"
                    else if (v.type === "StringLiteral") {
                        f.type = v.value;
                    }
                    // 3) Arrays: type: [String] | type: Array<...> (como objeto)
                    else if (v.type === "ArrayExpression") {
                        f.array = true;
                        const el = v.elements?.[0];
                        if (el?.type === "Identifier") f.type = `Array<${el.name}>`;
                        else f.type = "jsonb";
                    }
                    // 4) Mongoose: mongoose.Schema.Types.ObjectId / Schema.Types.ObjectId / Types.ObjectId / ObjectId (importado)
                    else if (v.type === "MemberExpression") {
                        // pega o último identificador do encadeamento
                        let tail = v.property;
                        while (tail?.type === "MemberExpression") tail = tail.property;
                        const tailName = tail?.type === "Identifier" ? tail.name : null;
                        if (tailName && /objectid/i.test(tailName)) {
                            f.type = "ObjectId";
                        } else {
                            // fallback: não reconhecido → Mixed (manter comportamento)
                            f.type = "Mixed";
                        }
                    }
                    // 5) Fallback: mantém Mixed
                    else {
                        f.type = "Mixed";
                    }
                }
                else if (k === "ref" && v.type === "StringLiteral") f.ref = v.value;
                else if (k === "required") f.required = v.type === "BooleanLiteral" ? v.value : true;
                else if (k === "unique") f.unique = v.type === "BooleanLiteral" ? v.value : true;
                else if (k === "index") f.index = v.type === "BooleanLiteral" ? v.value : true;
                else if (k === "default") f.default = (v.type === "StringLiteral" || v.type === "NumericLiteral" || v.type === "BooleanLiteral") ? v.value : "func";
                else if (k === "enum" && v.type === "ArrayExpression") f.enum = (v.elements || []).map(e => e?.value).filter(x => x !== undefined);
                else {
                    if (v.type === "ObjectExpression") {
                        const sub = readField(v);
                        subfields.push({ key: k, ...sub });
                    }
                }
            }
            if (!hasType && subfields.length) {
                f.type = "Subdoc";
                f.subfields = subfields;
            }
            return f;
        }

        return f;
    };

    const objectToFields = (objExpr) => {
        const fields = [];
        if (!objExpr || objExpr.type !== "ObjectExpression") return fields;
        for (const prop of objExpr.properties || []) {
            if (prop.type !== "ObjectProperty") continue;
            const key = prop.key.type === "Identifier" ? prop.key.name : (prop.key.value ?? "?");
            const info = readField(prop.value);
            info.name = key;
            fields.push(info);
        }
        return fields;
    };

    const getObjectExprFromId = (idNode) => {
        if (!idNode || idNode.type !== "Identifier") return null;
        return objectLiteralsByVar.get(idNode.name) || null;
    };

    // 1) Coletar objetos literais top-level: const def = { ... }
    traverse(ast, {
        VariableDeclarator(p) {
            const { id, init } = p.node;
            if (id?.type === "Identifier" && init?.type === "ObjectExpression") {
                objectLiteralsByVar.set(id.name, init);
            }
        },
    });

    // 2) Capturar declarações de Schema:
    //    - new mongoose.Schema({...}, options)
    //    - mongoose.Schema({...}, options)   (sem new)
    //    - com identificador: new Schema(def)  ou  Schema(def)
    traverse(ast, {
        VariableDeclarator(p) {
            const { id, init } = p.node;
            if (!id?.name || !init) return;

            // new mongoose.Schema(...)  /  new Schema(...)
            const isNewSchema =
                init.type === "NewExpression" &&
                (
                    (init.callee?.type === "MemberExpression" && init.callee.object?.name === "mongoose" && String(init.callee.property?.name).toLowerCase() === "schema") ||
                    (init.callee?.type === "Identifier" && init.callee.name === "Schema")
                );

            // mongoose.Schema(...)  /  Schema(...)
            const isCallSchema =
                init.type === "CallExpression" &&
                (
                    (init.callee?.type === "MemberExpression" && init.callee.object?.name === "mongoose" && String(init.callee.property?.name).toLowerCase() === "schema") ||
                    (init.callee?.type === "Identifier" && init.callee.name === "Schema")
                );

            if (!(isNewSchema || isCallSchema)) return;

            const arg0 = init.arguments?.[0];
            const arg1 = init.arguments?.[1];

            // tenta pegar um ObjectExpression literal, ou resolver identificador que aponte pra { ... }
            let objExpr = null;
            if (arg0?.type === "ObjectExpression") objExpr = arg0;
            else if (arg0?.type === "Identifier") objExpr = getObjectExprFromId(arg0);

            const fields = objectToFields(objExpr);
            const options = readSchemaOptions(arg1);

            const entry = { file: filePath, varName: id.name, fields, options };
            schemas.push(entry);
            schemaByVar.set(id.name, entry);
        },
    });

    // 3) schema.add({ ... })  e  schema.index(...)
    traverse(ast, {
        CallExpression(p) {
            const n = p.node;
            if (n.callee?.type !== "MemberExpression" || n.callee.property?.type !== "Identifier") return;

            const calleeName = n.callee.property.name;
            const obj = n.callee.object;

            // Quem é o schema alvo? (precisa ser Identifier)
            const schemaVar = obj?.type === "Identifier" ? obj.name : null;
            if (!schemaVar) return;

            const schemaEntry = schemaByVar.get(schemaVar);
            if (!schemaEntry) return;

            if (calleeName === "add") {
                // schema.add({ ... })
                const arg = n.arguments?.[0];
                const objExpr = arg?.type === "ObjectExpression" ? arg : getObjectExprFromId(arg);
                const newFields = objectToFields(objExpr);
                if (newFields.length) {
                    schemaEntry.fields.push(...newFields);
                }
            }

            if (calleeName === "index") {
                const keysArg = n.arguments?.[0];
                const optArg = n.arguments?.[1];
                const idx = { file: filePath, forVar: schemaVar, keys: [], options: {} };

                if (keysArg?.type === "ObjectExpression") {
                    for (const pr of keysArg.properties || []) {
                        if (pr.type !== "ObjectProperty") continue;
                        const k = pr.key.type === "Identifier" ? pr.key.name : (pr.key.value ?? "?");
                        const v = pr.value;
                        let order = 1;
                        if (v?.type === "UnaryExpression" && v.operator === "-") order = -1;
                        else if (v?.type === "NumericLiteral") order = v.value;
                        idx.keys.push({ field: k, order });
                    }
                }
                if (optArg?.type === "ObjectExpression") {
                    for (const pr of optArg.properties || []) {
                        if (pr.type !== "ObjectProperty") continue;
                        const k = pr.key.type === "Identifier" ? pr.key.name : (pr.key.value ?? "?");
                        if (pr.value.type === "BooleanLiteral") idx.options[k] = pr.value.value;
                        else if (pr.value.type === "NumericLiteral") idx.options[k] = pr.value.value;
                        else if (pr.value.type === "StringLiteral") idx.options[k] = pr.value.value;
                        else idx.options[k] = true;
                    }
                }
                schemaEntry.indexes = schemaEntry.indexes || [];
                schemaEntry.indexes.push(idx);
                indexes.push(idx);
            }
        },
    });

    // 4) mongoose.model('Name', <schemaVar|new Schema(...)|Schema(...)>)
    traverse(ast, {
        CallExpression(p) {
            const n = p.node;
            const isModelCall =
                (n.callee?.type === "MemberExpression" && n.callee.object?.name === "mongoose" && n.callee.property?.name === "model") ||
                (n.callee?.type === "Identifier" && n.callee.name === "model");
            if (!isModelCall) return;

            const nameArg = n.arguments?.[0];
            const schemaArg = n.arguments?.[1];
            const modelName = nameArg?.type === "StringLiteral" ? nameArg.value : "(dinâmico)";
            let schemaVar = null;

            // model('X', SomeSchemaVar)
            if (schemaArg?.type === "Identifier") {
                schemaVar = schemaArg.name;
            }

            // model('X', new Schema({...}))  ou  model('X', Schema({...}))
            if (!schemaVar && (schemaArg?.type === "NewExpression" || schemaArg?.type === "CallExpression")) {
                const arg0 = schemaArg.arguments?.[0];
                let objExpr = null;
                if (arg0?.type === "ObjectExpression") objExpr = arg0;
                else if (arg0?.type === "Identifier") objExpr = objectLiteralsByVar.get(arg0.name);
                const fields = objectToFields(objExpr);
                const options = readSchemaOptions(schemaArg.arguments?.[1]);
                const tempEntry = { file: filePath, varName: null, fields, options };
                schemas.push(tempEntry);
            }

            models.push({ file: filePath, model: modelName, schemaVar });
        },
    });

    return { models, schemas };
}


function readSchemaOptions(opt) {
    const out = {};
    if (opt?.type !== "ObjectExpression") return out;
    for (const p of opt.properties || []) {
        if (p.type !== "ObjectProperty") continue;
        const k = p.key.type === "Identifier" ? p.key.name : (p.key.value ?? "?");
        out[k] = literalOrId(p.value);
    }
    return out;
}
function literalOrId(v) {
    if (!v) return true;
    if (v.type === "BooleanLiteral") return v.value;
    if (v.type === "NumericLiteral") return v.value;
    if (v.type === "StringLiteral") return v.value;
    if (v.type === "Identifier") return v.name;
    return true;
}
function readField(node) {
    // retorna { name?, type, ref?, required?, unique?, index?, default?, enum?, array?, subfields? }
    const f = { type: "Mixed" };
    if (!node) return f;

    if (node.type === "Identifier") {
        f.type = node.name;
        return f;
    }
    if (node.type === "ArrayExpression") {
        f.array = true;
        const el = node.elements?.[0];
        if (!el) { f.type = "jsonb"; return f; }
        if (el.type === "Identifier") { f.type = `Array<${el.name}>`; return f; }
        if (el.type === "ObjectExpression") {
            // Array de subdocs ou de ref
            let sub = readField(el);
            f.type = `Array<${sub.type || "Subdoc"}>`;
            if (sub.ref) f.ref = sub.ref;
            if (sub.subfields) f.subfields = sub.subfields;
            return f;
        }
        f.type = "jsonb"; return f;
    }
    if (node.type === "ObjectExpression") {
        // { type: String, ref: 'User', required:true, unique:true, enum:[...], default:... }
        let hasType = false;
        const subfields = [];
        for (const pp of node.properties || []) {
            if (pp.type !== "ObjectProperty") continue;
            const k = pp.key.type === "Identifier" ? pp.key.name : (pp.key.value ?? "?");
            const v = pp.value;

            if (k === "type") {
                hasType = true;
                if (v.type === "Identifier") f.type = v.name;
                else if (v.type === "StringLiteral") f.type = v.value;
                else if (v.type === "ArrayExpression") {
                    f.array = true;
                    const el = v.elements?.[0];
                    if (el?.type === "Identifier") f.type = `Array<${el.name}>`;
                    else f.type = "jsonb";
                }
            } else if (k === "ref" && v.type === "StringLiteral") f.ref = v.value;
            else if (k === "required") f.required = literalOrId(v);
            else if (k === "unique") f.unique = literalOrId(v);
            else if (k === "index") f.index = literalOrId(v);
            else if (k === "default") f.default = (v.type === "StringLiteral" || v.type === "NumericLiteral" || v.type === "BooleanLiteral") ? v.value : "func";
            else if (k === "enum" && v.type === "ArrayExpression") f.enum = (v.elements || []).map(e => e?.value).filter(x => x !== undefined);
            else {
                // pode ser subdocumento
                if (v.type === "ObjectExpression") {
                    const sub = readField(v);
                    subfields.push({ key: k, ...sub });
                }
            }
        }
        if (!hasType && subfields.length) {
            f.type = "Subdoc";
            f.subfields = subfields;
        }
        return f;
    }

    return f;
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
            if (left.type === "MemberExpression" && left.object?.name === "module" && left.property?.name === "exports") out.push("module.exports");
        }
    });
    return out;
}

/* =========================
 * MAIN
 * ========================= */
async function main() {
    await fse.ensureDir(OUT_DIR);

    const patterns = SRC_DIRS.length
        ? SRC_DIRS.map(d => `${d.replaceAll("\\", "/")}/**/*.{js,jsx,ts,tsx,mjs,cjs}`)
        : ["**/*.{js,jsx,ts,tsx,mjs,cjs}"];
    const files = await fg(patterns, { cwd: ROOT, absolute: true, dot: false, ignore: ["node_modules/**", "documentacao/**"] });

    console.log(`🔎 Arquivos analisados: ${files.length}`);
    console.log(`📁 Pastas consideradas: ${SRC_DIRS.length ? SRC_DIRS.join(", ") : "(todas, fallback)"}`);

    const allImports = new Map();
    const allEnv = new Set();
    const allRoutes = [];
    const middlewares = [];
    const models = [];         // [{file, model, schemaVar}]
    const schemas = [];        // [{file, varName, fields[], options, indexes[]}]
    const exportsMap = new Map();

    const mongoPopulates = [], mongoAggregates = [], mongoLeans = [], mongoDistincts = [], mongoUpdates = [];

    for (const file of files) {
        const code = readIf(file);
        if (!code) continue;
        const ast = tryParse(code);
        if (!ast) continue;

        const imps = extractImports(ast);
        allImports.set(file, imps);

        extractEnvVars(ast).forEach(v => allEnv.add(v));

        const bn = path.basename(file).toLowerCase();
        if (isRouteFile(file) || ["app.js", "server.js", "index.js"].includes(bn)) {
            allRoutes.push(...extractRoutes(ast, rel(file)));
        }
        if (isMwFile(file)) middlewares.push(...extractMiddlewareExports(ast, rel(file)));

        if (isModelFile(file)) {
            const { models: ms, schemas: scs } = extractModelSchemas(ast, rel(file));
            models.push(...ms);
            schemas.push(...scs);
        }

        const alerts = extractMongoAlerts(ast, rel(file));
        if (alerts.populates.length) mongoPopulates.push(...alerts.populates);
        if (alerts.aggregates.length) mongoAggregates.push(...alerts.aggregates);
        if (alerts.leans.length) mongoLeans.push(...alerts.leans);
        if (alerts.distincts.length) mongoDistincts.push(...alerts.distincts);
        if (alerts.updates.length) mongoUpdates.push(...alerts.updates);

        const exps = extractExports(ast);
        exportsMap.set(rel(file), exps);
    }

    // Services que importam models
    const serviceTouches = [];
    for (const [file, imps] of allImports) {
        if (!isServiceFile(file)) continue;
        const relf = rel(file);
        const touches = imps.filter(s => /(^\.{1,2}\/|\/)models?\/|(^\.{1,2}\/|\/)model\//.test(s.replaceAll("\\", "/")));
        if (touches.length) serviceTouches.push({ file: relf, models: Array.from(new Set(touches)) });
    }
    // Controllers → Services
    const controllerTouches = [];
    for (const [file, imps] of allImports) {
        if (!isCtrlFile(file)) continue;
        const relf = rel(file);
        const touches = imps.filter(s => /(^\.{1,2}\/|\/)services?\/|(^\.{1,2}\/|\/)service\//.test(s.replaceAll("\\", "/")));
        if (touches.length) controllerTouches.push({ file: relf, services: Array.from(new Set(touches)) });
    }
    // Utils
    const utilsExports = [];
    for (const [file, exps] of exportsMap) {
        if (isUtilFile(path.join(ROOT, file))) utilsExports.push({ file, exports: exps });
    }
    // Config files
    const configFiles = files.filter(f => isConfigFile(f)).map(rel);

    // Dockerfile resumo
    const dockerSummary = (() => {
        if (!DOCKERFILE) return null;
        const txt = readIf(DOCKERFILE); if (!txt) return null;
        const lines = txt.split(/\r?\n/);
        const pick = pre => lines.find(l => l.trim().toUpperCase().startsWith(pre)) || "";
        return { base: pick("FROM "), workdir: pick("WORKDIR "), expose: pick("EXPOSE "), cmd: pick("CMD ") };
    })();

    // Dependência (imports) → Mermaid
    const edges = [];
    for (const [file, imps] of allImports) {
        const from = rel(file);
        for (const s of imps) edges.push({ from, to: s });
    }
    const mermaid = [
        "```mermaid", "graph LR",
        ...edges.map(({ from, to }) => {
            const safe = s => String(s).replaceAll("\"", "").replaceAll("`", "").replaceAll(" ", "_");
            return `  "${safe(from)}" --> "${safe(to)}"`;
        }),
        "```"
    ].join("\n");

    console.log(`➡️ Rotas: ${allRoutes.length}`);
    console.log(`➡️ Middlewares: ${middlewares.length}`);
    console.log(`➡️ Models: ${models.length} | Schemas: ${schemas.length}`);
    console.log(`➡️ populate: ${mongoPopulates.length} | aggregate: ${mongoAggregates.length} | lean: ${mongoLeans.length} | distinct: ${mongoDistincts.length} | updates: ${mongoUpdates.length}`);

    /* =========================
     * Escrita de Arquivos
     * ========================= */
    await fse.ensureDir(OUT_DIR);

    // index.md
    const indexMd = `# Documentação do Backend

Gerado por \`scripts/generate-docs.mjs\`.

## Conteúdo
- [Rotas](./rotas.md)
- [Modelos (Mongoose)](./modelos.md)
- [Serviços](./servicos.md)
- [Middlewares](./middlewares.md)
- [Utils](./utils.md)
- [Config & Env](./config.md)
- [Docker](./docker.md)
- [Schema → PostgreSQL (mapa & DDL)](./schema-mapeamento.md)
- [Mongo Alerts (populate/aggregate/lean/distinct/updates)](./mongo-alertas.md)
- [Grafo de dependências](./grafo-dependencias.md)

> Use **schema-mapeamento.md** e **postgres-draft.sql** como base de migração.
`;
    await fse.writeFile(path.join(OUT_DIR, "index.md"), indexMd);

    // rotas.md
    const rotasMd = `# Rotas Express
Total: **${allRoutes.length}**

${allRoutes.map(r => `- **${r.method}** \`${r.path}\` — _${r.object}_  
  • Middlewares: ${r.middlewares.length ? r.middlewares.join(", ") : "—"}  
  • Handlers: ${r.handlers.length ? r.handlers.join(", ") : "—"}  
  • Arquivo: \`${r.file}\``).join("\n")}
`;
    await fse.writeFile(path.join(OUT_DIR, "rotas.md"), rotasMd);

    // modelos.md
    const modelosMd = `# Modelos (Mongoose)
Modelos detectados: **${models.length}**

${models.map(m => `- **${m.model}**  
  • Definição em: \`${m.file}\`${m.schemaVar ? `  • Schema: \`${m.schemaVar}\`` : ""}`).join("\n") || "—"
        }

## Campos por Schema (heurístico)
${schemas.map(s => {
            const lines = (s.fields || []).map(f => {
                const bits = [];
                bits.push(`\`${f.name}\``);
                bits.push(`type: ${f.type}`);
                if (f.ref) bits.push(`ref: ${f.ref}`);
                if (f.required !== undefined) bits.push(`required: ${String(f.required)}`);
                if (f.unique !== undefined) bits.push(`unique: ${String(f.unique)}`);
                if (f.index !== undefined) bits.push(`index: ${String(f.index)}`);
                if (f.default !== undefined) bits.push(`default: ${f.default}`);
                if (f.enum?.length) bits.push(`enum: [${f.enum.join(", ")}]`);
                return "  - " + bits.join(" | ");
            }).join("\n");
            const idxs = (s.indexes || []).map(ix => {
                const keys = ix.keys.map(k => `${k.field}:${k.order}`).join(", ");
                const opts = Object.entries(ix.options || {}).map(([k, v]) => `${k}:${v}`).join(", ");
                return `  - index( ${keys} ) ${opts ? `{ ${opts} }` : ""}`;
            }).join("\n");
            const opts = Object.entries(s.options || {}).map(([k, v]) => `  - ${k}: ${v}`).join("\n");
            return `### Schema ${s.varName ? `\`${s.varName}\`` : "(anônimo)"} em \`${s.file}\`
${lines || "(sem campos detectados)"}${idxs ? `\n\n**Indexes**:\n${idxs}` : ""}${opts ? `\n\n**Opções**:\n${opts}` : ""}\n`;
        }).join("\n") || "—"
        }
`;
    await fse.writeFile(path.join(OUT_DIR, "modelos.md"), modelosMd);

    // servicos.md
    const servicosMd = `# Services
Services que importam **models**:
${serviceTouches.length ? serviceTouches.map(s => `- \`${s.file}\`\n  • Models importados: ${s.models.join(", ")}`).join("\n") : "_Nenhum uso de models detectado (ou imports dinâmicos)_."
        }

Controllers que importam **services**:
${controllerTouches.length ? controllerTouches.map(c => `- \`${c.file}\`\n  • Services importados: ${c.services.join(", ")}`).join("\n") : "_Nenhuma ligação controllers→services detectada (ou imports dinâmicos)_."
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
${utilsExports.length ? utilsExports.map(u => `- \`${u.file}\`\n  • Exports: ${u.exports.join(", ") || "—"}`).join("\n") : "_Nenhum util detectado_."}
`;
    await fse.writeFile(path.join(OUT_DIR, "utils.md"), utilsMd);

    // config.md
    const configMd = `# Config & Variáveis de Ambiente

Arquivos em \`config/\`:
${configFiles.map(f => `- \`${f}\``).join("\n") || "—"}

Variáveis de ambiente usadas:
${[...allEnv].sort().map(v => `- \`${v}\``).join("\n") || "—"}
`;
    await fse.writeFile(path.join(OUT_DIR, "config.md"), configMd);

    // docker.md
    const dockerMd = `# Dockerfile
${dockerSummary ? `- ${dockerSummary.base}\n- ${dockerSummary.workdir}\n- ${dockerSummary.expose}\n- ${dockerSummary.cmd}` : "_Dockerfile não encontrado_."}
`;
    await fse.writeFile(path.join(OUT_DIR, "docker.md"), dockerMd);

    // mongo-alertas.md
    const groupByFile = (arr) => { const m = new Map(); for (const it of arr) { if (!m.has(it.file)) m.set(it.file, []); m.get(it.file).push(it); } return [...m.entries()]; };
    const mongoMd = `# Mongo Alerts (populate / aggregate / lean / distinct / updates)

## .populate()
Total: **${mongoPopulates.length}**
${groupByFile(mongoPopulates).map(([file, items]) => `### ${file}\n${items.map((it, i) => `  - #${i + 1} • ${it.preview || "(args não literais)"}`).join("\n")}`).join("\n\n") || "—"
        }

---

## .aggregate()
Total: **${mongoAggregates.length}**
${groupByFile(mongoAggregates).map(([file, items]) => `### ${file}\n${items.map((it, i) => `  - #${i + 1} • Stages: ${it.stages.join(", ") || "?"}\n    • Pipeline: ${it.pipeline || "(não literal)"}`).join("\n")}`).join("\n\n") || "—"
        }

---

## .lean()
Total: **${mongoLeans.length}**
${groupByFile(mongoLeans).map(([file, items]) => `### ${file}\n  - ${items.length} ocorrência(s)`).join("\n\n") || "—"}

---

## .distinct()
Total: **${mongoDistincts.length}**
${groupByFile(mongoDistincts).map(([file, items]) => `### ${file}\n${items.map((it, i) => `  - #${i + 1} • field: ${it.field}`).join("\n")}`).join("\n\n") || "—"
        }

---

## updates (updateOne/updateMany/findOneAndUpdate/update)
Total: **${mongoUpdates.length}**
${groupByFile(mongoUpdates).map(([file, items]) => `### ${file}\n${items.map((it, i) => `  - #${i + 1} • ${it.op} • ops: ${it.operators.join(", ") || "—"}\n    • body: ${it.bodyPreview || "(não literal)"}`).join("\n")}`).join("\n\n") || "—"
        }
`;
    await fse.writeFile(path.join(OUT_DIR, "mongo-alertas.md"), mongoMd);

    /* ======= SCHEMA → POSTGRES (mapa + DDL) ======= */
    // Relacionar model -> schemaVar -> schema fields
    const schemaByVar = new Map(schemas.filter(s => s.varName).map(s => [s.varName, s]));
    const modelsWithSchema = models.map(m => {
        const s = m.schemaVar ? schemaByVar.get(m.schemaVar) : null;
        return { ...m, schema: s };
    });

    // Montar mapa por tabela
    const tables = modelsWithSchema.map(m => {
        const table = toSnake(m.model);
        const fields = (m.schema?.fields || []).map(mapFieldToPg);
        const idxs = (m.schema?.indexes || []).map(ix => ({
            keys: ix.keys.map(k => ({ field: toSnake(k.field), order: Number(k.order) || 1 })),
            options: ix.options || {}
        }));
        return { model: m.model, table, file: m.file, fields, indexes: idxs };
    })
        // ⬇️ NOVO: remove entradas sem campos
        .filter(t => t.fields.length > 0);
    // Gerar schema-mapeamento.md
    const mapMd = `# Schema → PostgreSQL (mapa)
> Rascunho gerado automaticamente. Revise tipos/tamanhos/constraints conforme regra de negócio.

${tables.map(t => {
        const cols = t.fields.map(c => {
            const tags = [];
            if (c.required) tags.push("NOT NULL");
            if (c.unique) tags.push("UNIQUE");
            if (c.enum?.length) tags.push(`ENUM(${c.enum.join(",")})`);
            const ref = c.ref ? ` → FK ${toSnake(c.ref)}.${c.refCol}` : "";
            return `- \`${c.name}\` ${c.pgType}${tags.length ? ` • ${tags.join(" | ")}` : ""}${ref}`;
        }).join("\n");
        const idxs = t.indexes.map(ix => {
            const keys = ix.keys.map(k => `${k.field}${k.order === -1 ? " DESC" : ""}`).join(", ");
            const opts = Object.entries(ix.options || {}).map(([k, v]) => `${k}:${v}`).join(", ");
            const todo = ix.options?.partialFilterExpression ? " /* TODO: traduzir partialFilterExpression para WHERE */" : "";
            return `- INDEX ( ${keys} ) ${opts ? `{ ${opts} }` : ""}${todo}`;
        }).join("\n");
        return `## ${t.model} → \`${t.table}\`
Arquivo: \`${t.file}\`

${cols || "(sem campos mapeados)"}

${idxs ? `\n**Índices compostos**:\n${idxs}` : ""}\n`;
    }).join("\n")
        }
`;
    await fse.writeFile(path.join(OUT_DIR, "schema-mapeamento.md"), mapMd);

    // Gerar postgres-draft.sql
    const ddl = genPostgresDDL(tables);
    await fse.writeFile(path.join(OUT_DIR, "postgres-draft.sql"), ddl);

    // grafo
    const graphMd = `# Grafo de dependências (imports)
${mermaid}
`;
    await fse.writeFile(path.join(OUT_DIR, "grafo-dependencias.md"), graphMd);

    console.log(`✅ Documentação gerada em: ${rel(OUT_DIR)}`);
}

/* ===== Helpers de mapeamento → Postgres ===== */
function toSnake(s) { return String(s || "").replaceAll(/([a-z0-9])([A-Z])/g, "$1_$2").replaceAll(/\W+/g, "_").toLowerCase(); }

function mapFieldToPg(f) {
    let name = toSnake(f.name || "");
    const baseType = String(f.type || "Mixed");
    const isArray = /^Array</i.test(baseType) || f.array;
    let inner = baseType.replace(/^Array</i, "").replace(/>$/, "");

    let refCol = "id";
    let pgType = pgTypeMap(inner || baseType);

    // ⬇️ Se tem ref:
    if (f.ref) {
        if (isArray) {
            // array de refs -> uuid[]
            pgType = "uuid[]";
            // (mantemos o nome plural; se preferir, pode ser `${name}_ids`)
        } else {
            // escalar -> uuid e renomeia para *_id
            if (!name.endsWith("_id")) name = `${name}_id`;
            pgType = "uuid";
        }
    } else {
        // array "normal": garante sintaxe tipo[] quando não for jsonb
        if (isArray && !pgType.endsWith("[]")) {
            pgType = (pgType === "jsonb") ? "jsonb" : (pgType + "[]");
        }
    }

    return {
        name,
        pgType,
        required: !!f.required,
        unique: !!f.unique,
        enum: f.enum,
        default: f.default,
        ref: f.ref || null,
        refCol
    };
}


function genPostgresDDL(tables) {
    const lines = [];
    lines.push("-- Draft DDL gerado automaticamente");
    lines.push("-- Extensão recomendada: pgcrypto (gen_random_uuid) ou uuid-ossp");
    lines.push("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
    lines.push("");

    for (const t of tables) {
        lines.push(`-- ${t.model} (${t.file})`);
        lines.push(`CREATE TABLE IF NOT EXISTS "${t.table}" (`);
        const cols = [];

        // id padrão uuid
        cols.push(`  id uuid PRIMARY KEY DEFAULT gen_random_uuid()`);

        for (const c of t.fields) {
            // enum como CHECK
            let colType = c.pgType;
            let constraints = [];
            if (c.required) constraints.push("NOT NULL");
            if (c.unique) constraints.push("UNIQUE");

            if (Array.isArray(c.enum) && c.enum.length) {
                const esc = c.enum.map(v => `'${String(v).replaceAll("'", "''")}'`).join(", ");
                constraints.push(`CHECK ("${c.name}" IN (${esc}))`);
            }

            cols.push(`  "${c.name}" ${colType}${constraints.length ? " " + constraints.join(" ") : ""}`);
        }

        lines.push(cols.join(",\n"));
        lines.push(");");
        lines.push("");

        // FKs
        for (const c of t.fields) {
            if (c.ref) {
                const refTable = toSnake(c.ref);
                lines.push(`ALTER TABLE "${t.table}"`);
                lines.push(`  ADD CONSTRAINT "${t.table}_${c.name}_fkey" FOREIGN KEY ("${c.name}") REFERENCES "${refTable}"("${c.refCol}") ON UPDATE CASCADE ON DELETE SET NULL;`);
                lines.push("");
            }
        }

        // Indexes compostos do schema.index()
        for (let i = 0; i < (t.indexes || []).length; i++) {
            const ix = t.indexes[i];
            const name = `${t.table}_idx_${i + 1}`;
            const cols = ix.keys.map(k => {
                const field = (k.field === "_id") ? "id" : k.field;
                return `"${field}" ${k.order === -1 ? "DESC" : "ASC"}`;
            }).join(", ");
            const unique = ix.options?.unique ? "UNIQUE " : "";
            const hasPartial = !!ix.options?.partialFilterExpression;
            if (hasPartial) {
                lines.push(`-- TODO: traduzir partialFilterExpression para WHERE (...) neste índice`);
            }
            lines.push(`CREATE ${unique}INDEX IF NOT EXISTS "${name}" ON "${t.table}" (${cols});`);
        }

        lines.push("");
    }

    return lines.join("\n");
}

/* run */
main().catch(err => { console.error(err); process.exit(1); });
