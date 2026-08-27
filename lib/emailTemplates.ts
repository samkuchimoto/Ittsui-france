// /lib/emailTemplates.ts
// Shared HTML email shell — real product feedback: transactional emails
// were plain text with bare, unstyled `<a>` links, no branding at all.
// Server-only (imports process.env directly, used only from app/api/**
// route handlers) — inline styles throughout since email clients don't
// reliably support external stylesheets or even <style> blocks.

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Wraps a message body with the app's real design tokens (cream/ink/
// terracotta, matching lib/theme.ts) and a hosted mascot header image —
// character choice is per call site (Pika for anything about an
// invitation/request actually being delivered, matching "The Messenger").
export function emailShell({ mascotName, title, bodyHtml }: { mascotName: string; title: string; bodyHtml: string }): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; background: #FFFDF9; padding: 32px 24px; color: #1C1917;">
      <img src="${process.env.NEXT_PUBLIC_APP_URL}/images/mascots/${mascotName}.png" alt="Ittsui" width="72" height="72" style="display: block; margin: 0 auto 16px;" />
      <h1 style="font-size: 20px; font-weight: 600; text-align: center; margin: 0 0 16px;">${title}</h1>
      ${bodyHtml}
    </div>
  `;
}

export function emailButton(href: string, label: string): string {
  return `
    <p style="text-align: center; margin: 28px 0;">
      <a href="${href}" style="display: inline-block; background: #B84E2A; color: #ffffff; padding: 14px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px;">
        ${label}
      </a>
    </p>
  `;
}
