using Catalog.API.Data;
using Catalog.API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

[Route("api/admin/currencies")]
[ApiController]
public class AdminCurrenciesController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public AdminCurrenciesController(CatalogDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var currencies = await _context.Currencies
            .AsNoTracking()
            .OrderByDescending(c => c.IsDefault)
            .ThenBy(c => c.Code)
            .Select(c => new
            {
                c.Id,
                c.Code,
                c.Symbol,
                c.Name,
                c.RateToBase,
                c.IsDefault,
                c.IsActive,
                c.CreatedAt,
                c.UpdatedAt
            })
            .ToListAsync();

        return Ok(currencies);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var currency = await _context.Currencies.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
        if (currency is null) return NotFound();
        return Ok(currency);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CurrencyRequest req)
    {
        var code = NormalizeCode(req.Code);
        if (string.IsNullOrWhiteSpace(code))
            return BadRequest("Para birimi kodu zorunludur.");

        if (await _context.Currencies.AnyAsync(c => c.Code == code))
            return BadRequest("Bu para birimi kodu zaten kayıtlı.");

        if (req.RateToBase <= 0)
            return BadRequest("RateToBase 0'dan büyük olmalıdır.");

        if (req.IsDefault)
            await ClearDefaultAsync();

        var currency = new Currency
        {
            Code = code,
            Symbol = string.IsNullOrWhiteSpace(req.Symbol) ? code : req.Symbol.Trim(),
            Name = string.IsNullOrWhiteSpace(req.Name) ? code : req.Name.Trim(),
            RateToBase = req.RateToBase,
            IsDefault = req.IsDefault,
            IsActive = req.IsActive
        };

        _context.Currencies.Add(currency);
        await _context.SaveChangesAsync();
        return Ok(currency);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CurrencyRequest req)
    {
        var currency = await _context.Currencies.FindAsync(id);
        if (currency is null) return NotFound();

        var code = NormalizeCode(req.Code);
        if (string.IsNullOrWhiteSpace(code))
            return BadRequest("Para birimi kodu zorunludur.");

        if (await _context.Currencies.AnyAsync(c => c.Code == code && c.Id != id))
            return BadRequest("Bu para birimi kodu zaten kayıtlı.");

        if (req.RateToBase <= 0)
            return BadRequest("RateToBase 0'dan büyük olmalıdır.");

        if (req.IsDefault && !currency.IsDefault)
            await ClearDefaultAsync();

        if (!req.IsDefault && currency.IsDefault)
            return BadRequest("Varsayılan para birimi kaldırılamaz. Önce başka birini varsayılan yapın.");

        currency.Code = code;
        currency.Symbol = string.IsNullOrWhiteSpace(req.Symbol) ? code : req.Symbol.Trim();
        currency.Name = string.IsNullOrWhiteSpace(req.Name) ? code : req.Name.Trim();
        currency.RateToBase = req.RateToBase;
        currency.IsDefault = req.IsDefault;
        currency.IsActive = req.IsActive;
        currency.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(currency);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var currency = await _context.Currencies.FindAsync(id);
        if (currency is null) return NotFound();
        if (currency.IsDefault)
            return BadRequest("Varsayılan para birimi silinemez.");

        _context.Currencies.Remove(currency);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private async Task ClearDefaultAsync()
    {
        var defaults = await _context.Currencies.Where(c => c.IsDefault).ToListAsync();
        foreach (var item in defaults)
        {
            item.IsDefault = false;
            item.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static string NormalizeCode(string? code) =>
        (code ?? string.Empty).Trim().ToUpperInvariant();
}

public record CurrencyRequest(
    string Code,
    string Symbol,
    string Name,
    decimal RateToBase,
    bool IsDefault = false,
    bool IsActive = true);
