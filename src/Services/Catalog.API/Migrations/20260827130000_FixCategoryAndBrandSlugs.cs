using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.API.Migrations
{
    /// <summary>
    /// Kategori ve marka slug'larini yeniden uretir.
    ///
    /// Onceki iki migration slug'i "lower(regexp_replace(...))" seklinde yaziyordu:
    /// regexp once calistigi icin buyuk harfler henuz kucultulmemisti ve
    /// [^a-z0-9] filtresine takilip siliniyordu. Sonuc olarak her kelimenin ilk
    /// harfi kayboluyordu ("Kahve Makineleri" -> "ahve-akineleri") ve tamami
    /// buyuk harfli markalar ayni slug'a dusuyordu ("DJI" ve "IKEA" -> "-").
    ///
    /// Burada sira duzeltiliyor: once translate + lower, sonra regexp. Eski
    /// deger LegacySlug'a tasiniyor; by-slug ucu oradan da arama yaptigi icin
    /// arama motorlarinda kalmis eski adresler kalici yonlendirme aliyor.
    /// </summary>
    [DbContext(typeof(Catalog.API.Data.CatalogDbContext))]
    [Migration("20260827130000_FixCategoryAndBrandSlugs")]
    public partial class FixCategoryAndBrandSlugs : Migration
    {
        /// <summary>
        /// Slug'i Name'den yeniden uretir, cakismalari "-2" ekiyle ayirir ve
        /// degisen kayitlarin eski slug'ini LegacySlug'a yazar. Ayni eski slug
        /// birden fazla kayitta geciyorsa yonlendirme belirsiz olacagi icin
        /// saklanmaz.
        /// </summary>
        private static string RebuildSlugSql(string table) => $@"
WITH computed AS (
    SELECT ""Id"",
           ""Slug"" AS old_slug,
           trim(both '-' from regexp_replace(
               lower(translate(""Name"", 'ığüşöçİĞÜŞÖÇ', 'igusocigusoc')),
               '[^a-z0-9]+', '-', 'g')) AS base
    FROM ""{table}""
),
numbered AS (
    SELECT ""Id"", old_slug, base,
           ROW_NUMBER() OVER (PARTITION BY base ORDER BY ""Id"") AS rn
    FROM computed
    WHERE base <> ''
),
final AS (
    SELECT ""Id"", old_slug,
           CASE WHEN rn = 1 THEN base ELSE base || '-' || rn END AS new_slug
    FROM numbered
),
reusable_old AS (
    SELECT old_slug
    FROM final
    WHERE old_slug IS NOT NULL AND old_slug <> ''
    GROUP BY old_slug
    HAVING COUNT(*) = 1
)
UPDATE ""{table}"" t
SET ""Slug"" = f.new_slug,
    ""LegacySlug"" = CASE
        WHEN f.old_slug IS NOT NULL
             AND f.old_slug <> ''
             AND f.old_slug <> f.new_slug
             AND f.old_slug IN (SELECT old_slug FROM reusable_old)
        THEN f.old_slug
        ELSE t.""LegacySlug""
    END
FROM final f
WHERE t.""Id"" = f.""Id""
  AND t.""Slug"" IS DISTINCT FROM f.new_slug;
";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var table in new[] { "Categories", "Brands" })
            {
                migrationBuilder.AddColumn<string>(
                    name: "LegacySlug",
                    table: table,
                    type: "character varying(200)",
                    maxLength: 200,
                    nullable: true);

                migrationBuilder.CreateIndex(
                    name: $"IX_{table}_LegacySlug",
                    table: table,
                    column: "LegacySlug");

                migrationBuilder.Sql(RebuildSlugSql(table));
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var table in new[] { "Categories", "Brands" })
            {
                // Eski adresleri geri yaz, sonra kolonu kaldir.
                migrationBuilder.Sql($@"
UPDATE ""{table}""
SET ""Slug"" = ""LegacySlug""
WHERE ""LegacySlug"" IS NOT NULL AND ""LegacySlug"" <> '';
");

                migrationBuilder.DropIndex(name: $"IX_{table}_LegacySlug", table: table);
                migrationBuilder.DropColumn(name: "LegacySlug", table: table);
            }
        }
    }
}
