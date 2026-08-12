using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Notification.API.Data;
using Notification.API.Entities;
using Notification.API.Services;

namespace Notification.API.Controllers;

public record SaveEmailTemplateRequest(
    string Name,
    string Subject,
    string BodyHtml,
    string[]? Variables,
    bool IsActive = true);

public record PreviewEmailTemplateRequest(Dictionary<string, string?>? Variables);

[Route("api/admin/email-templates")]
[ApiController]
public class AdminEmailTemplatesController : ControllerBase
{
    private readonly NotificationDbContext _context;

    public AdminEmailTemplatesController(NotificationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var templates = await _context.EmailTemplates
            .AsNoTracking()
            .OrderBy(t => t.Name)
            .ToListAsync();

        return Ok(templates.Select(Map));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var template = await _context.EmailTemplates.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
        return template is null ? NotFound() : Ok(Map(template));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveEmailTemplateRequest req)
    {
        var template = await _context.EmailTemplates.FindAsync(id);
        if (template is null) return NotFound();

        template.Name = req.Name.Trim();
        template.Subject = req.Subject.Trim();
        template.BodyHtml = req.BodyHtml;
        template.VariablesJson = JsonSerializer.Serialize(req.Variables ?? []);
        template.IsActive = req.IsActive;
        template.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(Map(template));
    }

    [HttpPost("{id:guid}/preview")]
    public async Task<IActionResult> Preview(Guid id, [FromBody] PreviewEmailTemplateRequest req)
    {
        var template = await _context.EmailTemplates.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
        if (template is null) return NotFound();

        var vars = req.Variables ?? new Dictionary<string, string?>();
        var subject = template.Subject;
        var body = template.BodyHtml;

        foreach (var (key, value) in vars)
        {
            subject = subject.Replace("{{" + key + "}}", value ?? "", StringComparison.OrdinalIgnoreCase);
            body = body.Replace("{{" + key + "}}", value ?? "", StringComparison.OrdinalIgnoreCase);
        }

        return Ok(new { subject, bodyHtml = body });
    }

    private static object Map(EmailTemplate t) => new
    {
        t.Id,
        t.Code,
        t.Name,
        t.Subject,
        t.BodyHtml,
        variables = EmailTemplates.ParseVariables(t.VariablesJson),
        t.IsActive,
        t.CreatedAt,
        t.UpdatedAt
    };
}
