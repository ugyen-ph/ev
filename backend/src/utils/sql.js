// Builds "UPDATE table SET a = ?, b = ? WHERE id = ?" from an object.
// Column names come from our own code, never from request data.
function buildUpdate(table, id, values) {
  const cols = Object.keys(values).filter((k) => values[k] !== undefined);
  if (cols.length === 0) return null;
  return {
    sql: `UPDATE \`${table}\` SET ${cols.map((c) => `\`${c}\` = ?`).join(', ')} WHERE id = ?`,
    params: [...cols.map((c) => values[c]), id],
  };
}

const parseJson = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value; // MySQL already parsed it
  try { return JSON.parse(value); } catch (_) { return fallback; }
};

const round2 = (n) => Math.round(Number(n) * 100) / 100;

module.exports = { buildUpdate, parseJson, round2 };
