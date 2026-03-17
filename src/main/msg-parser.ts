import fs from 'fs';
import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MsgReader = require('msgreader').default;

export interface MsgAttachment {
  filename: string;
  content: Buffer;
}

export interface ParsedMsg {
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  attachments: MsgAttachment[];
}

export function parseMsgFile(filePath: string): ParsedMsg {
  const resolved = path.resolve(filePath);
  const buffer = fs.readFileSync(resolved);
  const reader = new MsgReader(buffer);
  const msg = reader.getFileData();

  const subject = msg.subject ?? '(Без темы)';
  const from = msg.senderEmail ?? msg.senderName ?? '';
  const to = (msg.recipients ?? [])
    .map((r: { email?: string; name?: string }) => r.email ?? r.name ?? '')
    .filter(Boolean)
    .join(', ');
  const date = msg.messageDeliveryTime
    ? new Date(msg.messageDeliveryTime).toISOString()
    : new Date().toISOString();

  // Prefer plain text body, fall back to HTML stripped of tags
  let body = '';
  if (msg.body) {
    body = msg.body;
  } else if (msg.bodyHtml) {
    body = msg.bodyHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  }

  const attachments: MsgAttachment[] = [];
  if (msg.attachments && Array.isArray(msg.attachments)) {
    for (const att of msg.attachments) {
      if (att.fileName && att.content) {
        attachments.push({
          filename: att.fileName,
          content: Buffer.from(att.content),
        });
      }
    }
  }

  return { subject, from, to, date, body, attachments };
}
