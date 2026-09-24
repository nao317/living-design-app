const defaultAdminEmail = "nao.yellowtail.1729@gmail.com";

type ContactEmail = {
  to: string;
  companyName: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  caseId?: string;
};

export async function sendContactEmail(contact: ContactEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const bcc = process.env.SYSTEM_ADMIN_EMAIL || defaultAdminEmail;
  if (!apiKey || !from) {
    return "メール送信設定が未完了です。RESEND_API_KEYとRESEND_FROM_EMAILを設定してください。";
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [contact.to],
      bcc: [bcc],
      reply_to: contact.senderEmail,
      subject: `[飯塚のリノベ] ${contact.subject}`,
      text: [
        `宛先企業: ${contact.companyName}`,
        `お名前: ${contact.senderName}`,
        `メールアドレス: ${contact.senderEmail}`,
        contact.caseId ? `施工事例ID: ${contact.caseId}` : "",
        "",
        contact.message,
      ].filter(Boolean).join("\n"),
    }),
  });

  if (response.ok) return null;
  return "メールを送信できませんでした。時間をおいて再度お試しください。";
}
