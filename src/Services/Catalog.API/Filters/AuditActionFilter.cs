using System.Security.Claims;
using System.Text.Json;
using Catalog.API.Data;
using Catalog.API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Catalog.API.Filters;

/// <summary>
/// /api/admin altindaki mutasyon isteklerini (POST/PUT/PATCH/DELETE) AuditLogEntries tablosuna yazar.
/// </summary>
public sealed class AuditActionFilter : IAsyncActionFilter
{
    private static readonly HashSet<string> MutatingMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "POST", "PUT", "PATCH", "DELETE"
    };

    private readonly CatalogDbContext _db;
    private readonly ILogger<AuditActionFilter> _logger;

    public AuditActionFilter(CatalogDbContext db, ILogger<AuditActionFilter> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var http = context.HttpContext;
        var path = http.Request.Path.Value ?? "";
        var method = http.Request.Method;

        if (!path.StartsWith("/api/admin", StringComparison.OrdinalIgnoreCase)
            || !MutatingMethods.Contains(method)
            || path.StartsWith("/api/admin/audit-logs", StringComparison.OrdinalIgnoreCase))
        {
            await next();
            return;
        }

        var newValues = SerializeArgs(context.ActionArguments);
        var entityType = InferEntityType(context);
        var entityId = InferEntityId(context);

        var executed = await next();

        if (executed.Exception is not null && !executed.ExceptionHandled)
            return;

        if (executed.Result is ObjectResult { StatusCode: >= 400 })
            return;

        if (executed.Result is StatusCodeResult { StatusCode: >= 400 })
            return;

        try
        {
            var user = http.User;
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? user.FindFirstValue("sub")
                         ?? "anonymous";
            var userName = user.FindFirstValue(ClaimTypes.Email)
                           ?? user.FindFirstValue(ClaimTypes.Name)
                           ?? user.Identity?.Name;

            var actionName = context.ActionDescriptor.RouteValues.TryGetValue("action", out var act)
                ? act
                : method;
            var controllerName = context.ActionDescriptor.RouteValues.TryGetValue("controller", out var ctrl)
                ? ctrl
                : entityType;

            var entry = new AuditLogEntry
            {
                UserId = userId,
                UserName = userName,
                Action = $"{method} {controllerName}/{actionName}".Trim('/'),
                EntityType = entityType,
                EntityId = entityId,
                OldValues = null,
                NewValues = newValues,
                IpAddress = http.Connection.RemoteIpAddress?.ToString()
                            ?? http.Request.Headers["X-Forwarded-For"].FirstOrDefault()
            };

            _db.AuditLogEntries.Add(entry);
            await _db.SaveChangesAsync(http.RequestAborted);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Audit log yazılamadı: {Path}", path);
        }
    }

    private static string? SerializeArgs(IDictionary<string, object?> args)
    {
        if (args.Count == 0) return null;

        try
        {
            var payload = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            foreach (var (key, value) in args)
            {
                if (value is CancellationToken) continue;
                payload[key] = value;
            }

            if (payload.Count == 0) return null;

            return JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                WriteIndented = false,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
        }
        catch
        {
            return null;
        }
    }

    private static string? InferEntityType(ActionExecutingContext context)
    {
        if (context.ActionDescriptor.RouteValues.TryGetValue("controller", out var ctrl)
            && !string.IsNullOrWhiteSpace(ctrl))
        {
            return ctrl.StartsWith("Admin", StringComparison.OrdinalIgnoreCase)
                ? ctrl["Admin".Length..]
                : ctrl;
        }

        var path = context.HttpContext.Request.Path.Value ?? "";
        var parts = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        // api/admin/{entity}/...
        return parts.Length >= 3 ? parts[2] : null;
    }

    private static string? InferEntityId(ActionExecutingContext context)
    {
        foreach (var key in new[] { "id", "productId", "categoryId", "userId", "variantId" })
        {
            if (context.ActionArguments.TryGetValue(key, out var value) && value is not null)
                return value.ToString();

            if (context.RouteData.Values.TryGetValue(key, out var routeVal) && routeVal is not null)
                return routeVal.ToString();
        }

        return null;
    }
}
