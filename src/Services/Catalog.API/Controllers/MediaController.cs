using Microsoft.AspNetCore.Mvc;

namespace Catalog.API.Controllers;

/// <summary>
/// Urun gorseli yukleme. Dosyalar wwwroot/uploads altina yazilir ve
/// statik dosya sunumu uzerinden /uploads/... adresiyle servis edilir.
/// </summary>
[Route("api/media")]
[ApiController]
public class MediaController : ControllerBase
{
    private const long MaxFileSizeBytes = 5 * 1024 * 1024;

    private static readonly string[] AllowedExtensions =
        { ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif" };

    private static readonly string[] AllowedContentTypes =
        { "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif" };

    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<MediaController> _logger;

    public MediaController(IWebHostEnvironment environment, ILogger<MediaController> logger)
    {
        _environment = environment;
        _logger = logger;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(MaxFileSizeBytes)]
    public async Task<IActionResult> Upload([FromForm] IFormFile? file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest("Dosya seçilmedi.");

        if (file.Length > MaxFileSizeBytes)
            return BadRequest("Dosya boyutu 5 MB'ı aşamaz.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (!AllowedExtensions.Contains(extension))
            return BadRequest($"Desteklenmeyen dosya türü: {extension}");

        if (!AllowedContentTypes.Contains(file.ContentType.ToLowerInvariant()))
            return BadRequest($"Desteklenmeyen içerik türü: {file.ContentType}");

        var uploadsRoot = GetUploadsRoot();
        // Tarih klasoru: tek dizinde binlerce dosya birikmesin
        var subFolder = DateTime.UtcNow.ToString("yyyy/MM");
        var targetDirectory = Path.Combine(uploadsRoot, subFolder);
        Directory.CreateDirectory(targetDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(targetDirectory, fileName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream, ct);
        }

        var url = $"/uploads/{subFolder}/{fileName}";
        _logger.LogInformation("Görsel yüklendi: {Url}", url);

        return Ok(new UploadResult(url, file.FileName, file.Length));
    }

    [HttpDelete("upload")]
    public IActionResult Delete([FromQuery] string url)
    {
        if (string.IsNullOrWhiteSpace(url) || !url.StartsWith("/uploads/"))
            return BadRequest("Yalnızca yüklenen görseller silinebilir.");

        var uploadsRoot = GetUploadsRoot();
        var relative = url["/uploads/".Length..].Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.GetFullPath(Path.Combine(uploadsRoot, relative));

        // Path traversal korumasi
        if (!fullPath.StartsWith(Path.GetFullPath(uploadsRoot), StringComparison.Ordinal))
            return BadRequest("Geçersiz yol.");

        if (!System.IO.File.Exists(fullPath)) return NotFound();

        System.IO.File.Delete(fullPath);
        return NoContent();
    }

    private string GetUploadsRoot()
    {
        var webRoot = _environment.WebRootPath;

        if (string.IsNullOrWhiteSpace(webRoot))
        {
            webRoot = Path.Combine(_environment.ContentRootPath, "wwwroot");
            Directory.CreateDirectory(webRoot);
        }

        return Path.Combine(webRoot, "uploads");
    }
}

public record UploadResult(string Url, string OriginalName, long Size);
