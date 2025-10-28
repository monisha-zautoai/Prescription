export function extractJsonFromMarkdown(mdContent: string) {
  const jsonRegex = /```json([\s\S]*?)```/g;
  const matches = [...mdContent?.matchAll(jsonRegex)];

  let jsonString: string = matches.length > 0
    ? matches[0][1].trim()
    : mdContent;

  jsonString = sanitizeJsonString(jsonString);
  jsonString = fixUnescapedNewlines(jsonString);

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse JSON:", e.message);
    return { error: "Invalid JSON", raw: mdContent };
  }
}

function sanitizeJsonString(str: string): string {
  return str.replace(/```json/g, "").replace(/```/g, "").trim();
}

function fixUnescapedNewlines(jsonStr: string): string {
  return jsonStr.replace(/"((?:\\.|[^"\\])*)"/g, (match, groupContent) => {
    const fixedContent = groupContent.replace(/\n/g, "\\n");
    return `"${fixedContent}"`;
  });
}
