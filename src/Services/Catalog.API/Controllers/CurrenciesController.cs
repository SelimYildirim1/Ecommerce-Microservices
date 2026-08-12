using Catalog.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

[Route("api/currencies")]
[ApiController]
public class CurrenciesController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public CurrenciesController(CatalogDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetActive()
    {
        var currencies = await _context.Currencies
            .AsNoTracking()
            .Where(c => c.IsActive)
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
                c.IsActive
            })
            .ToListAsync();

        return Ok(currencies);
    }
}
