namespace Notification.API.Entities;

public class EmailTemplate
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>PaymentSucceeded, PaymentFailed, OrderShipped, ConfirmEmail, ResetPassword</summary>
    public string Code { get; set; } = default!;

    public string Name { get; set; } = default!;
    public string Subject { get; set; } = default!;
    public string BodyHtml { get; set; } = default!;

    /// <summary>JSON dizi: ["OrderId","OrderNumber","Reason"]</summary>
    public string VariablesJson { get; set; } = "[]";

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
