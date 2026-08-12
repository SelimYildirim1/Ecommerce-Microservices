using Catalog.API.Data;
using Catalog.API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

public record SaveNavMenuRequest(string Name, string Location, bool IsActive = true);

public record SaveNavMenuItemRequest(
    string Label,
    string? Url,
    string? LinkType,
    Guid? ParentId,
    Guid? ReferenceId,
    int SortOrder,
    bool IsActive = true,
    bool OpenInNewTab = false);

public record ReorderMenuItemsRequest(List<ReorderMenuItemDto> Items);

public record ReorderMenuItemDto(Guid Id, int SortOrder, Guid? ParentId = null, bool ClearParent = false);

/// <summary>Admin menü yönetimi.</summary>
[Route("api/admin/cms/menus")]
[ApiController]
public class AdminMenusController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public AdminMenusController(CatalogDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var menus = await _context.NavMenus
            .AsNoTracking()
            .Include(m => m.Items)
            .OrderBy(m => m.Location)
            .ThenBy(m => m.Name)
            .ToListAsync();

        return Ok(menus.Select(MapMenu));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var menu = await _context.NavMenus
            .AsNoTracking()
            .Include(m => m.Items)
            .FirstOrDefaultAsync(m => m.Id == id);

        return menu is null ? NotFound() : Ok(MapMenu(menu));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveNavMenuRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Location))
            return BadRequest("Ad ve konum zorunlu.");

        var menu = new NavMenu
        {
            Name = req.Name.Trim(),
            Location = req.Location.Trim().ToLowerInvariant(),
            IsActive = req.IsActive
        };

        _context.NavMenus.Add(menu);
        await _context.SaveChangesAsync();
        return Ok(MapMenu(menu));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveNavMenuRequest req)
    {
        var menu = await _context.NavMenus.FindAsync(id);
        if (menu is null) return NotFound();

        menu.Name = req.Name.Trim();
        menu.Location = req.Location.Trim().ToLowerInvariant();
        menu.IsActive = req.IsActive;
        menu.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(MapMenu(menu));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var menu = await _context.NavMenus.FindAsync(id);
        if (menu is null) return NotFound();

        _context.NavMenus.Remove(menu);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{menuId:guid}/items")]
    public async Task<IActionResult> CreateItem(Guid menuId, [FromBody] SaveNavMenuItemRequest req)
    {
        var menu = await _context.NavMenus.FindAsync(menuId);
        if (menu is null) return NotFound("Menü bulunamadı.");

        var item = new NavMenuItem
        {
            NavMenuId = menuId,
            Label = req.Label.Trim(),
            Url = string.IsNullOrWhiteSpace(req.Url) ? null : req.Url.Trim(),
            LinkType = string.IsNullOrWhiteSpace(req.LinkType) ? "custom" : req.LinkType.Trim(),
            ParentId = req.ParentId,
            ReferenceId = req.ReferenceId,
            SortOrder = req.SortOrder,
            IsActive = req.IsActive,
            OpenInNewTab = req.OpenInNewTab
        };

        _context.NavMenuItems.Add(item);
        await _context.SaveChangesAsync();
        return Ok(MapItem(item));
    }

    [HttpPut("items/{itemId:guid}")]
    public async Task<IActionResult> UpdateItem(Guid itemId, [FromBody] SaveNavMenuItemRequest req)
    {
        var item = await _context.NavMenuItems.FindAsync(itemId);
        if (item is null) return NotFound();

        item.Label = req.Label.Trim();
        item.Url = string.IsNullOrWhiteSpace(req.Url) ? null : req.Url.Trim();
        item.LinkType = string.IsNullOrWhiteSpace(req.LinkType) ? "custom" : req.LinkType.Trim();
        item.ParentId = req.ParentId;
        item.ReferenceId = req.ReferenceId;
        item.SortOrder = req.SortOrder;
        item.IsActive = req.IsActive;
        item.OpenInNewTab = req.OpenInNewTab;
        item.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(MapItem(item));
    }

    [HttpDelete("items/{itemId:guid}")]
    public async Task<IActionResult> DeleteItem(Guid itemId)
    {
        var item = await _context.NavMenuItems
            .Include(i => i.Children)
            .FirstOrDefaultAsync(i => i.Id == itemId);

        if (item is null) return NotFound();
        if (item.Children.Any())
            return BadRequest("Alt öğeleri olan menü kalemi silinemez.");

        _context.NavMenuItems.Remove(item);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{menuId:guid}/items/reorder")]
    public async Task<IActionResult> ReorderItems(Guid menuId, [FromBody] ReorderMenuItemsRequest req)
    {
        if (req.Items is null || req.Items.Count == 0)
            return BadRequest("Sıralama listesi boş.");

        var ids = req.Items.Select(i => i.Id).ToList();
        var items = await _context.NavMenuItems
            .Where(i => i.NavMenuId == menuId && ids.Contains(i.Id))
            .ToListAsync();

        foreach (var dto in req.Items)
        {
            var item = items.FirstOrDefault(i => i.Id == dto.Id);
            if (item is null) continue;
            item.SortOrder = dto.SortOrder;
            if (dto.ClearParent) item.ParentId = null;
            else if (dto.ParentId.HasValue) item.ParentId = dto.ParentId;
            item.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(new { updated = items.Count });
    }

    private static object MapMenu(NavMenu menu)
    {
        var items = (menu.Items ?? Array.Empty<NavMenuItem>())
            .OrderBy(i => i.SortOrder)
            .ThenBy(i => i.Label)
            .Select(MapItem)
            .ToList();

        return new
        {
            menu.Id,
            menu.Name,
            menu.Location,
            menu.IsActive,
            menu.CreatedAt,
            menu.UpdatedAt,
            items,
            itemTree = BuildTree(menu.Items ?? Array.Empty<NavMenuItem>())
        };
    }

    private static object MapItem(NavMenuItem item) => new
    {
        item.Id,
        item.NavMenuId,
        item.ParentId,
        item.Label,
        item.Url,
        item.LinkType,
        item.ReferenceId,
        item.SortOrder,
        item.IsActive,
        item.OpenInNewTab
    };

    private static List<object> BuildTree(IEnumerable<NavMenuItem> all, Guid? parentId = null)
    {
        return all
            .Where(i => i.ParentId == parentId)
            .OrderBy(i => i.SortOrder)
            .ThenBy(i => i.Label)
            .Select(i => (object)new
            {
                i.Id,
                i.NavMenuId,
                i.ParentId,
                i.Label,
                i.Url,
                i.LinkType,
                i.ReferenceId,
                i.SortOrder,
                i.IsActive,
                i.OpenInNewTab,
                children = BuildTree(all, i.Id)
            })
            .ToList();
    }
}
