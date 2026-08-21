import dns from "dns";
import nodemailer, { Transporter } from "nodemailer";
import type { Sender } from "@prisma/client";

// Some container hosts (Railway included) resolve SMTP hostnames to an
// IPv6 address that isn't actually routable from the container's network,
// which makes the TCP handshake hang until nodemailer's timeout fires
// instead of failing fast. Preferring IPv4 resolution avoids that dead end.
dns.setDefaultResultOrder("ipv4first");

// One nodemailer transporter per Ethereal sender, cached so we don't
// re-negotiate SMTP connections on every send.
const transporterCache = new Map<string, Transporter>();

function getTransporter(sender: Sender): Transporter {
  let transporter = transporterCache.get(sender.id);
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: false,
      auth: { user: sender.smtpUser, pass: sender.smtpPass },
      // Cloud hosts (Railway, etc.) can be slower/flakier reaching outbound
      // SMTP than a local machine; give the handshake generous headroom
      // instead of nodemailer's short default before giving up.
      connectionTimeout: 30_000,
      greetingTimeout: 30_000,
      socketTimeout: 30_000,
    });
    transporterCache.set(sender.id, transporter);
  }
  return transporter;
}

export async function sendEmail(params: {
  sender: Sender;
  to: string;
  subject: string;
  body: string;
}): Promise<{ messageId: string; previewUrl: string | false }> {
  const transporter = getTransporter(params.sender);
  const info = await transporter.sendMail({
    from: `"${params.sender.name}" <${params.sender.email}>`,
    to: params.to,
    subject: params.subject,
    html: params.body,
  });
  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  };
}
