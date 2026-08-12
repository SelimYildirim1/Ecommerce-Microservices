using Catalog.API.Data;
using Catalog.API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

public record SaveSegmentRequest(string Name, string? Description, string? Color);
public record AssignSegmentRequest(string UserId);
public record SaveCustomerNoteRequest(string UserId, string Note, string? CreatedByUserId, string? CreatedByName);

[Route("api/admin/customers")]
[ApiController]
public class AdminCustomerCrmController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public AdminCustomerCrmController(CatalogDbContext context)
    {
        _context = context;
    }

    // --- Segments ---

    [HttpGet("segments")]
    public async Task<IActionResult> GetSegments()
    {
        var segments = await _context.CustomerSegments
            .AsNoTracking()
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.Description,
                s.Color,
                memberCount = s.Members.Count
            })
            .OrderBy(s => s.Name)
            .ToListAsync();

        return Ok(segments);
    }

    [HttpPost("segments")]
    public async Task<IActionResult> CreateSegment([FromBody] SaveSegmentRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Segment adı zorunlu.");

        var segment = new CustomerSegment
        {
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            Color = req.Color?.Trim()
        };

        _context.CustomerSegments.Add(segment);
        await _context.SaveChangesAsync();
        return Ok(new { segment.Id, segment.Name, segment.Description, segment.Color, memberCount = 0 });
    }

    [HttpPut("segments/{id:guid}")]
    public async Task<IActionResult> UpdateSegment(Guid id, [FromBody] SaveSegmentRequest req)
    {
        var segment = await _context.CustomerSegments.FindAsync(id);
        if (segment is null) return NotFound();

        segment.Name = req.Name.Trim();
        segment.Description = req.Description?.Trim();
        segment.Color = req.Color?.Trim();
        segment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { segment.Id, segment.Name, segment.Description, segment.Color });
    }

    [HttpDelete("segments/{id:guid}")]
    public async Task<IActionResult> DeleteSegment(Guid id)
    {
        var segment = await _context.CustomerSegments.FindAsync(id);
        if (segment is null) return NotFound();

        _context.CustomerSegments.Remove(segment);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("segments/{id:guid}/members")]
    public async Task<IActionResult> AssignMember(Guid id, [FromBody] AssignSegmentRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.UserId)) return BadRequest("UserId zorunlu.");

        var exists = await _context.CustomerSegments.AnyAsync(s => s.Id == id);
        if (!exists) return NotFound();

        var already = await _context.CustomerSegmentMembers
            .AnyAsync(m => m.SegmentId == id && m.UserId == req.UserId);
        if (already) return Ok(new { assigned = true });

        _context.CustomerSegmentMembers.Add(new CustomerSegmentMember
        {
            SegmentId = id,
            UserId = req.UserId.Trim()
        });
        await _context.SaveChangesAsync();
        return Ok(new { assigned = true });
    }

    [HttpDelete("segments/{id:guid}/members/{userId}")]
    public async Task<IActionResult> RemoveMember(Guid id, string userId)
    {
        var member = await _context.CustomerSegmentMembers
            .FirstOrDefaultAsync(m => m.SegmentId == id && m.UserId == userId);
        if (member is null) return NotFound();

        _context.CustomerSegmentMembers.Remove(member);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{userId}/segments")]
    public async Task<IActionResult> GetUserSegments(string userId)
    {
        var segments = await _context.CustomerSegmentMembers
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .Select(m => new { m.Segment.Id, m.Segment.Name, m.Segment.Color, m.AssignedAt })
            .ToListAsync();

        return Ok(segments);
    }

    // --- Notes ---

    [HttpGet("{userId}/notes")]
    public async Task<IActionResult> GetNotes(string userId)
    {
        var notes = await _context.CustomerNotes
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new
            {
                n.Id,
                n.UserId,
                n.Note,
                n.CreatedByUserId,
                n.CreatedByName,
                n.CreatedAt
            })
            .ToListAsync();

        return Ok(notes);
    }

    [HttpPost("notes")]
    public async Task<IActionResult> CreateNote([FromBody] SaveCustomerNoteRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.UserId) || string.IsNullOrWhiteSpace(req.Note))
            return BadRequest("UserId ve not zorunlu.");

        var note = new CustomerNote
        {
            UserId = req.UserId.Trim(),
            Note = req.Note.Trim(),
            CreatedByUserId = req.CreatedByUserId,
            CreatedByName = req.CreatedByName
        };

        _context.CustomerNotes.Add(note);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            note.Id,
            note.UserId,
            note.Note,
            note.CreatedByUserId,
            note.CreatedByName,
            note.CreatedAt
        });
    }

    [HttpDelete("notes/{id:guid}")]
    public async Task<IActionResult> DeleteNote(Guid id)
    {
        var note = await _context.CustomerNotes.FindAsync(id);
        if (note is null) return NotFound();

        _context.CustomerNotes.Remove(note);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
