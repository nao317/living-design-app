type ContactMessage = {
  companyId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  caseId?: string;
};

export async function createContactMessage(contact: ContactMessage) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return "Supabaseの接続情報が設定されていません。";

  const response = await fetch(`${supabaseUrl}/rest/v1/contact_messages`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      company_id: contact.companyId,
      sender_name: contact.senderName,
      sender_email: contact.senderEmail,
      subject: contact.subject,
      message: contact.message,
      case_id: contact.caseId || null,
    }),
  });

  if (response.ok) return null;
  return "お問い合わせを保存できませんでした。時間をおいて再度お試しください。";
}
