using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Notification.API.Services;

public class SmtpOptions
{
    public const string SectionName = "Smtp";

    /// <summary>Kapaliyken e-posta yalnizca loglanir; gelistirme akisi bozulmaz.</summary>
    public bool Enabled { get; set; } = true;

    public string Host { get; set; } = "mailhog";
    public int Port { get; set; } = 1025;
    public bool UseSsl { get; set; }
    public string? UserName { get; set; }
    public string? Password { get; set; }

    public string SenderName { get; set; } = "Yıldırım Store";
    public string SenderAddress { get; set; } = "no-reply@yildirimstore.com";
}

public interface IEmailSender
{
    Task SendAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default);
}

/// <summary>
/// MailKit tabanli gonderici. Gelistirmede MailHog'a, uretimde gercek SMTP
/// sunucusuna baglanir. Gonderim hatasi mesaji tuketmez; yalnizca loglanir.
/// </summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly SmtpOptions _options;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(SmtpOptions options, ILogger<SmtpEmailSender> logger)
    {
        _options = options;
        _logger = logger;
    }

    public async Task SendAsync(
        string to, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(to))
        {
            _logger.LogWarning("Alıcı adresi boş, e-posta gönderilmedi. Konu: {Subject}", subject);
            return;
        }

        if (!_options.Enabled)
        {
            _logger.LogInformation(
                "SMTP kapalı. Gönderilecekti -> {To} | {Subject}", to, subject);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.SenderName, _options.SenderAddress));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = new BodyBuilder { HtmlBody = htmlBody }.ToMessageBody();

        try
        {
            using var client = new SmtpClient();

            var security = _options.UseSsl
                ? SecureSocketOptions.StartTlsWhenAvailable
                : SecureSocketOptions.None;

            await client.ConnectAsync(_options.Host, _options.Port, security, cancellationToken);

            if (!string.IsNullOrWhiteSpace(_options.UserName))
                await client.AuthenticateAsync(_options.UserName, _options.Password, cancellationToken);

            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);

            _logger.LogInformation("E-posta gönderildi -> {To} | {Subject}", to, subject);
        }
        catch (Exception ex)
        {
            // Bildirim gonderilemedi diye siparis akisi bozulmamali
            _logger.LogError(ex, "E-posta gönderilemedi -> {To} | {Subject}", to, subject);
        }
    }
}
