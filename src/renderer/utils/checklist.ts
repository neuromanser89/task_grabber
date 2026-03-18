/** Toggle a checkbox at a specific line index in markdown text */
export function toggleChecklistItem(text: string, lineIndex: number): string {
  const lines = text.split('\n');
  const match = lines[lineIndex]?.match(/^(\s*[-*]\s+)\[([ xX])\](.*)$/);
  if (match) {
    const newState = match[2].trim() === '' ? 'x' : ' ';
    lines[lineIndex] = `${match[1]}[${newState}]${match[3]}`;
  }
  return lines.join('\n');
}

/** Count checked/total checkboxes in markdown text */
export function countChecklist(text: string): [number, number] {
  const matches = text.match(/^[-*]\s+\[([ xX])\]/gm) ?? [];
  const done = matches.filter((m) => /\[([xX])\]/.test(m)).length;
  return [done, matches.length];
}
