using Catalog.API.Data;
using Catalog.API.Entities;
using Catalog.API.Models;
using Catalog.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

[Route("api/products/{productId:guid}/questions")]
[ApiController]
public class QuestionsController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public QuestionsController(CatalogDbContext context)
    {
        _context = context;
    }

    /// <summary>Onaylı (ve cevaplanmış) sorular.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<QuestionDto>>> GetForProduct(Guid productId)
    {
        var items = await _context.ProductQuestions
            .AsNoTracking()
            .Where(q => q.ProductId == productId && q.IsApproved)
            .OrderByDescending(q => q.CreatedAt)
            .ToListAsync();

        return Ok(items.Select(QuestionMapper.ToDto).ToList());
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<QuestionDto>> Create(
        Guid productId, [FromBody] CreateQuestionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Question))
            return BadRequest("Soru zorunludur.");

        var productExists = await _context.Products.AnyAsync(p => p.Id == productId);
        if (!productExists) return NotFound("Ürün bulunamadı.");

        var userId = CallerIdentity.GetUserId(User);
        var userName = string.IsNullOrWhiteSpace(request.UserName)
            ? (User.Identity?.Name ?? "Müşteri")
            : request.UserName.Trim();

        var question = new ProductQuestion
        {
            ProductId = productId,
            UserId = userId,
            UserName = userName,
            Email = request.Email?.Trim(),
            Question = request.Question.Trim(),
            IsApproved = false
        };

        _context.ProductQuestions.Add(question);
        await _context.SaveChangesAsync();

        return Ok(QuestionMapper.ToDto(question));
    }
}

[Route("api/admin/questions")]
[ApiController]
public class AdminQuestionsController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public AdminQuestionsController(CatalogDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<object>>> GetAll(
        [FromQuery] bool? approved,
        [FromQuery] bool? unanswered,
        [FromQuery] Guid? productId)
    {
        var query = _context.ProductQuestions
            .AsNoTracking()
            .Include(q => q.Product)
            .AsQueryable();

        if (approved.HasValue)
            query = query.Where(q => q.IsApproved == approved.Value);

        if (unanswered == true)
            query = query.Where(q => q.Answer == null || q.Answer == "");

        if (productId.HasValue)
            query = query.Where(q => q.ProductId == productId.Value);

        var items = await query
            .OrderByDescending(q => q.CreatedAt)
            .ToListAsync();

        return Ok(items.Select(q => new
        {
            q.Id,
            q.ProductId,
            ProductName = q.Product?.Name ?? string.Empty,
            q.UserId,
            q.UserName,
            q.Email,
            q.Question,
            q.Answer,
            q.AnsweredBy,
            q.AnsweredAt,
            q.IsApproved,
            q.CreatedAt
        }).ToList());
    }

    [HttpPut("{id:guid}/answer")]
    public async Task<IActionResult> Answer(Guid id, [FromBody] AnswerQuestionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Answer))
            return BadRequest("Cevap zorunludur.");

        var question = await _context.ProductQuestions.FindAsync(id);
        if (question is null) return NotFound();

        question.Answer = request.Answer.Trim();
        question.AnsweredBy = CallerIdentity.GetUserId(User) ?? "Admin";
        question.AnsweredAt = DateTime.UtcNow;
        question.IsApproved = true;
        question.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(QuestionMapper.ToDto(question));
    }

    [HttpPut("{id:guid}/moderate")]
    public async Task<IActionResult> Moderate(Guid id, [FromBody] ModerateQuestionRequest request)
    {
        var question = await _context.ProductQuestions.FindAsync(id);
        if (question is null) return NotFound();

        question.IsApproved = request.IsApproved;
        question.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(QuestionMapper.ToDto(question));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var question = await _context.ProductQuestions.FindAsync(id);
        if (question is null) return NotFound();

        _context.ProductQuestions.Remove(question);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
