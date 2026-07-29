namespace Notification.API.Services;

/// <summary>
/// Basit HTML e-posta sablonlari. Icerik degisiklikleri tek yerde yapilir.
/// </summary>
public static class EmailTemplates
{
    public static (string Subject, string Body) PaymentSucceeded(Guid orderId) =>
    (
        "Siparişiniz alındı — Yıldırım Store",
        Wrap(
            "Siparişiniz alındı",
            $@"<p>Merhaba,</p>
               <p>Ödemeniz başarıyla alındı. Siparişiniz hazırlanmaya başlandı.</p>
               <table style=""border-collapse:collapse;margin:16px 0"">
                 <tr><td style=""padding:4px 12px 4px 0;color:#666"">Sipariş numarası</td><td style=""font-weight:600"">{orderId}</td></tr>
               </table>
               <p>Sipariş durumunu hesabınızdaki <strong>Siparişlerim</strong> sayfasından takip edebilirsiniz.
               Kargoya verildiğinde e-posta ile bilgilendirileceksiniz.</p>
               <p style=""font-size:13px;color:#666"">Teslimat süresi ve iade koşulları için sitemizdeki yasal sayfaları inceleyebilirsiniz.</p>")
    );

    public static (string Subject, string Body) PaymentFailed(Guid orderId, string? reason) =>
    (
        "Siparişiniz tamamlanamadı",
        Wrap(
            "Ödemeniz alınamadı",
            $@"<p>Merhaba,</p>
               <p>Maalesef ödemeniz alınamadığı için siparişiniz iptal edildi.</p>
               <table style=""border-collapse:collapse;margin:16px 0"">
                 <tr><td style=""padding:4px 12px 4px 0;color:#666"">Sipariş numarası</td><td style=""font-weight:600"">{orderId}</td></tr>
                 <tr><td style=""padding:4px 12px 4px 0;color:#666"">Sebep</td><td style=""font-weight:600"">{reason ?? "Belirtilmedi"}</td></tr>
               </table>
               <p>Kart bilgilerinizi kontrol edip tekrar deneyebilirsiniz.</p>")
    );

    public static (string Subject, string Body) OrderShipped(Guid orderId, string? tracking) =>
    (
        "Siparişiniz kargoya verildi",
        Wrap(
            "Siparişiniz yola çıktı",
            $@"<p>Merhaba,</p>
               <p>Siparişiniz kargoya teslim edildi.</p>
               <table style=""border-collapse:collapse;margin:16px 0"">
                 <tr><td style=""padding:4px 12px 4px 0;color:#666"">Sipariş numarası</td><td style=""font-weight:600"">{orderId}</td></tr>
                 <tr><td style=""padding:4px 12px 4px 0;color:#666"">Takip no</td><td style=""font-weight:600"">{tracking ?? "Yakında güncellenecek"}</td></tr>
               </table>
               <p>İyi günler dileriz.</p>")
    );

    public static (string Subject, string Body) ConfirmEmail(string link) =>
    (
        "E-posta adresinizi doğrulayın",
        Wrap(
            "E-posta doğrulama",
            $@"<p>Merhaba,</p>
               <p>Hesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:</p>
               <p style=""margin:24px 0""><a href=""{link}"" style=""background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none"">E-postamı doğrula</a></p>
               <p style=""font-size:12px;color:#888;word-break:break-all"">{link}</p>")
    );

    public static (string Subject, string Body) ResetPassword(string link) =>
    (
        "Şifre sıfırlama",
        Wrap(
            "Şifrenizi sıfırlayın",
            $@"<p>Merhaba,</p>
               <p>Şifre sıfırlama talebinde bulundunuz. Bağlantı kısa süre geçerlidir:</p>
               <p style=""margin:24px 0""><a href=""{link}"" style=""background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none"">Şifremi sıfırla</a></p>
               <p style=""font-size:12px;color:#888;word-break:break-all"">{link}</p>
               <p>Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>")
    );

    private static string Wrap(string heading, string content) =>
        $@"<!DOCTYPE html>
<html lang=""tr"">
<body style=""margin:0;padding:24px;background:#f6f6f6;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#111"">
  <div style=""max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px"">
    <h1 style=""margin:0 0 16px;font-size:20px"">{heading}</h1>
    {content}
    <hr style=""border:none;border-top:1px solid #eee;margin:24px 0"" />
    <p style=""font-size:12px;color:#888;margin:0"">Yıldırım Store</p>
  </div>
</body>
</html>";
}
