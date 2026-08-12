namespace Catalog.API.Entities;

/// <summary>Konum bazlı navigasyon menüsü (header, footer vb.).</summary>
public class NavMenu : BaseEntity
{
    public string Name { get; set; } = default!;

    /// <summary>header | footer | mobile</summary>
    public string Location { get; set; } = "header";

    public bool IsActive { get; set; } = true;

    public ICollection<NavMenuItem> Items { get; set; } = new List<NavMenuItem>();
}

public class NavMenuItem : BaseEntity
{
    public Guid NavMenuId { get; set; }
    public NavMenu NavMenu { get; set; } = default!;

    public Guid? ParentId { get; set; }
    public NavMenuItem? Parent { get; set; }
    public ICollection<NavMenuItem> Children { get; set; } = new List<NavMenuItem>();

    public string Label { get; set; } = default!;
    public string? Url { get; set; }

    /// <summary>custom | category | page | product</summary>
    public string LinkType { get; set; } = "custom";

    public Guid? ReferenceId { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool OpenInNewTab { get; set; }
}
