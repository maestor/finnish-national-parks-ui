import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import defaultTheme from "tailwindcss/defaultTheme";
import ts from "typescript";

const SHOULD_WRITE = process.argv.includes("--write");
const ROOT_DIR = process.cwd();
const SOURCE_DIR = path.join(ROOT_DIR, "src");
const SCANNED_EXTENSIONS = new Set([".ts", ".tsx"]);
const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  ".next",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "public",
]);
const CLASS_CALL_NAMES = new Set(["cn", "toHaveClass", "twMerge"]);
const SPACING_UTILITY_NAMES = new Set([
  "basis",
  "bottom",
  "end",
  "gap",
  "gap-x",
  "gap-y",
  "h",
  "inset",
  "inset-x",
  "inset-y",
  "left",
  "m",
  "max-h",
  "max-w",
  "mb",
  "me",
  "min-h",
  "min-w",
  "ml",
  "mr",
  "ms",
  "mt",
  "mx",
  "my",
  "p",
  "pb",
  "pe",
  "pl",
  "pr",
  "ps",
  "pt",
  "px",
  "py",
  "right",
  "scroll-m",
  "scroll-mb",
  "scroll-me",
  "scroll-ml",
  "scroll-mr",
  "scroll-ms",
  "scroll-mt",
  "scroll-mx",
  "scroll-my",
  "scroll-p",
  "scroll-pb",
  "scroll-pe",
  "scroll-pl",
  "scroll-pr",
  "scroll-ps",
  "scroll-pt",
  "scroll-px",
  "scroll-py",
  "size",
  "space-x",
  "space-y",
  "start",
  "top",
  "translate-x",
  "translate-y",
  "w",
]);
const RADIUS_UTILITY_NAMES = new Set([
  "rounded",
  "rounded-b",
  "rounded-bl",
  "rounded-br",
  "rounded-e",
  "rounded-ee",
  "rounded-es",
  "rounded-l",
  "rounded-r",
  "rounded-s",
  "rounded-se",
  "rounded-ss",
  "rounded-t",
  "rounded-tl",
  "rounded-tr",
]);

const radiusValueToSuffix = new Map();
for (const [token, value] of Object.entries(defaultTheme.borderRadius)) {
  const normalizedLength = normalizeLength(value);
  if (normalizedLength === null) {
    continue;
  }

  radiusValueToSuffix.set(normalizedLength, token === "DEFAULT" ? "" : `-${token}`);
}

const filePaths = collectSourceFiles(SOURCE_DIR);
const issues = [];

for (const filePath of filePaths) {
  const sourceText = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const fragments = collectClassFragments(sourceFile, sourceText);
  if (fragments.length === 0) {
    continue;
  }

  const fileEdits = [];

  for (const fragment of fragments) {
    const fragmentIssues = findFragmentIssues(fragment, sourceFile, filePath);
    if (fragmentIssues.length === 0) {
      continue;
    }

    issues.push(...fragmentIssues.map((issue) => ({ ...issue, filePath })));

    if (SHOULD_WRITE === true) {
      fileEdits.push({
        end: fragment.end,
        replacement: fragmentIssues[0].nextFragmentText,
        start: fragment.start,
      });
    }
  }

  if (SHOULD_WRITE === true && fileEdits.length > 0) {
    let nextSourceText = sourceText;

    for (const edit of fileEdits.sort((left, right) => right.start - left.start)) {
      nextSourceText =
        nextSourceText.slice(0, edit.start) + edit.replacement + nextSourceText.slice(edit.end);
    }

    if (nextSourceText !== sourceText) {
      fs.writeFileSync(filePath, nextSourceText);
    }
  }
}

if (issues.length === 0) {
  console.log("Tailwind canonical class check passed.");
  process.exit(0);
}

console.log(`Found ${issues.length} non-canonical Tailwind class tokens.`);
for (const issue of issues) {
  console.log(
    `${toRelativePath(issue.filePath)}:${issue.line}:${issue.column} ${issue.token} -> ${issue.suggestion}`,
  );
}

if (SHOULD_WRITE === false) {
  console.log("");
  console.log("Run `node scripts/check-tailwind-canonical.mjs --write` to apply these fixes.");
}

process.exit(1);

function collectSourceFiles(directoryPath) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const collectedPaths = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
        continue;
      }

      collectedPaths.push(...collectSourceFiles(entryPath));
      continue;
    }

    if (SCANNED_EXTENSIONS.has(path.extname(entry.name))) {
      collectedPaths.push(entryPath);
    }
  }

  return collectedPaths;
}

function collectClassFragments(sourceFile, sourceText) {
  const fragments = [];

  const visit = (node) => {
    if (isClassLikeLiteralNode(node) === true) {
      const fragment = getFragment(node, sourceFile, sourceText);
      if (fragment !== null) {
        fragments.push(fragment);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return fragments;
}

function isClassLikeLiteralNode(node) {
  if (
    ts.isStringLiteral(node) === false &&
    ts.isNoSubstitutionTemplateLiteral(node) === false &&
    ts.isTemplateHead(node) === false &&
    ts.isTemplateMiddle(node) === false &&
    ts.isTemplateTail(node) === false
  ) {
    return false;
  }

  let currentNode = node;
  while (currentNode.parent !== undefined) {
    currentNode = currentNode.parent;

    if (ts.isJsxAttribute(currentNode)) {
      const attributeName = currentNode.name.text;
      return attributeName === "class" || attributeName === "className";
    }

    if (ts.isPropertyAssignment(currentNode)) {
      const propertyName = getPropertyName(currentNode.name);
      if (propertyName !== null) {
        return propertyName === "class" || propertyName === "className";
      }
    }

    if (ts.isVariableDeclaration(currentNode) && ts.isIdentifier(currentNode.name)) {
      return (
        /(?:^|_)(CLASS_NAME|CLASS_NAMES)$/.test(currentNode.name.text) ||
        currentNode.name.text.endsWith("ClassName")
      );
    }

    if (ts.isCallExpression(currentNode)) {
      const calleeName = getCalleeName(currentNode.expression);
      if (calleeName !== null && CLASS_CALL_NAMES.has(calleeName)) {
        return true;
      }
    }
  }

  return false;
}

function getPropertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) {
    return node.text;
  }

  return null;
}

function getCalleeName(expression) {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }

  return null;
}

function getFragment(node, sourceFile, sourceText) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    const start = node.getStart(sourceFile) + 1;
    const end = node.end - 1;
    return {
      end,
      start,
      text: sourceText.slice(start, end),
    };
  }

  if (ts.isTemplateHead(node)) {
    const start = node.getStart(sourceFile) + 1;
    const end = node.end - 2;
    return {
      end,
      start,
      text: sourceText.slice(start, end),
    };
  }

  if (ts.isTemplateMiddle(node)) {
    const start = node.getStart(sourceFile) + 1;
    const end = node.end - 2;
    return {
      end,
      start,
      text: sourceText.slice(start, end),
    };
  }

  if (ts.isTemplateTail(node)) {
    const start = node.getStart(sourceFile) + 1;
    const end = node.end - 1;
    return {
      end,
      start,
      text: sourceText.slice(start, end),
    };
  }

  return null;
}

function findFragmentIssues(fragment, sourceFile, filePath) {
  const tokenMatches = [...fragment.text.matchAll(/\S+/g)];
  if (tokenMatches.length === 0) {
    return [];
  }

  const replacements = [];

  for (const match of tokenMatches) {
    const token = match[0];
    const suggestion = suggestCanonicalToken(token);
    if (suggestion === null || suggestion === token) {
      continue;
    }

    replacements.push({
      endOffset: match.index + token.length,
      startOffset: match.index,
      suggestion,
      token,
    });
  }

  if (replacements.length === 0) {
    return [];
  }

  let nextFragmentText = fragment.text;
  for (const replacement of replacements.toSorted(
    (left, right) => right.startOffset - left.startOffset,
  )) {
    nextFragmentText =
      nextFragmentText.slice(0, replacement.startOffset) +
      replacement.suggestion +
      nextFragmentText.slice(replacement.endOffset);
  }

  return replacements.map((replacement) => {
    const position = sourceFile.getLineAndCharacterOfPosition(
      fragment.start + replacement.startOffset,
    );

    return {
      column: position.character + 1,
      filePath,
      line: position.line + 1,
      nextFragmentText,
      suggestion: replacement.suggestion,
      token: replacement.token,
    };
  });
}

function suggestCanonicalToken(token) {
  if (token.includes("[") === false && token.includes("!") === false) {
    return null;
  }

  const segments = splitVariants(token);
  if (segments.length === 0) {
    return null;
  }

  const baseSegment = segments.at(-1);
  const variantPrefix = segments.slice(0, -1);

  let baseToken = baseSegment;
  let hasImportant = false;

  if (baseToken.startsWith("!")) {
    baseToken = baseToken.slice(1);
    hasImportant = true;
  }

  if (baseToken.endsWith("!")) {
    baseToken = baseToken.slice(0, -1);
    hasImportant = true;
  }

  const negativePrefix = baseToken.startsWith("-") ? "-" : "";
  const normalizedBaseToken = negativePrefix === "-" ? baseToken.slice(1) : baseToken;
  const canonicalBaseToken = suggestCanonicalBaseToken(normalizedBaseToken);
  const nextBaseToken =
    negativePrefix + (canonicalBaseToken ?? normalizedBaseToken) + (hasImportant ? "!" : "");
  const suggestion =
    variantPrefix.length > 0 ? `${variantPrefix.join(":")}:${nextBaseToken}` : nextBaseToken;

  return suggestion === token ? null : suggestion;
}

function suggestCanonicalBaseToken(baseToken) {
  if (baseToken.endsWith("]") === false) {
    return null;
  }

  const arbitraryValueStart = baseToken.lastIndexOf("-[");
  if (arbitraryValueStart <= 0) {
    return null;
  }

  const utilityName = baseToken.slice(0, arbitraryValueStart);
  const arbitraryValue = baseToken.slice(arbitraryValueStart + 2, -1);

  if (SPACING_UTILITY_NAMES.has(utilityName)) {
    const spacingToken = getSpacingToken(arbitraryValue);
    if (spacingToken !== null) {
      return `${utilityName}-${spacingToken}`;
    }
  }

  if (RADIUS_UTILITY_NAMES.has(utilityName)) {
    const radiusSuffix = radiusValueToSuffix.get(normalizeLength(arbitraryValue));
    if (radiusSuffix !== undefined) {
      return `${utilityName}${radiusSuffix}`;
    }
  }

  return null;
}

function getSpacingToken(rawValue) {
  const parsedLength = parseLength(rawValue);
  if (parsedLength === null) {
    return null;
  }

  const spacingValue =
    parsedLength.unit === "px" ? parsedLength.value / 4 : parsedLength.value / 0.25;
  if (
    Number.isFinite(spacingValue) === false ||
    isWholeNumberWithinTolerance(spacingValue) === false
  ) {
    return null;
  }

  return formatTokenNumber(spacingValue);
}

function normalizeLength(rawValue) {
  const parsedLength = parseLength(rawValue);
  if (parsedLength === null) {
    return null;
  }

  const valueInPixels = parsedLength.unit === "px" ? parsedLength.value : parsedLength.value * 16;
  return formatTokenNumber(valueInPixels);
}

function parseLength(rawValue) {
  const match = rawValue.match(/^(-?\d*\.?\d+)(px|rem)$/);
  if (match === null) {
    return null;
  }

  return {
    unit: match[2],
    value: Number(match[1]),
  };
}

function splitVariants(token) {
  const segments = [];
  let bracketDepth = 0;
  let currentSegment = "";

  for (const character of token) {
    if (character === "[" || character === "(") {
      bracketDepth += 1;
    } else if (character === "]" || character === ")") {
      bracketDepth = Math.max(0, bracketDepth - 1);
    }

    if (character === ":" && bracketDepth === 0) {
      segments.push(currentSegment);
      currentSegment = "";
      continue;
    }

    currentSegment += character;
  }

  if (currentSegment !== "") {
    segments.push(currentSegment);
  }

  return segments;
}

function isWholeNumberWithinTolerance(value) {
  return Math.abs(value * 4 - Math.round(value * 4)) < 1e-9;
}

function formatTokenNumber(value) {
  const normalizedValue = Number(value.toFixed(6));
  return normalizedValue.toString();
}

function toRelativePath(filePath) {
  return path.relative(ROOT_DIR, filePath);
}
