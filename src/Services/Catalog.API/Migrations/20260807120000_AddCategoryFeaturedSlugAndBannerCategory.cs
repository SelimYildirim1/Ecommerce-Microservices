using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.API.Migrations
{
    [DbContext(typeof(Catalog.API.Data.CatalogDbContext))]
    [Migration("20260807120000_AddCategoryFeaturedSlugAndBannerCategory")]
    public partial class AddCategoryFeaturedSlugAndBannerCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsFeatured",
                table: "Categories",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShowInMenu",
                table: "Categories",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "Slug",
                table: "Categories",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Slug",
                table: "Categories",
                column: "Slug");

            migrationBuilder.AddColumn<Guid>(
                name: "CategoryId",
                table: "Banners",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Banners_CategoryId",
                table: "Banners",
                column: "CategoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_Banners_Categories_CategoryId",
                table: "Banners",
                column: "CategoryId",
                principalTable: "Categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Mevcut kategorilere slug üret (basit SQL)
            migrationBuilder.Sql(@"
UPDATE ""Categories""
                SET ""Slug"" = lower(regexp_replace(
                    translate(""Name"", 'ığüşöçİĞÜŞÖÇ ', 'igusocIGUSOC-'),
                    '[^a-z0-9-]+', '', 'g'))
                WHERE ""Slug"" IS NULL OR ""Slug"" = '';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Banners_Categories_CategoryId",
                table: "Banners");

            migrationBuilder.DropIndex(
                name: "IX_Banners_CategoryId",
                table: "Banners");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                table: "Banners");

            migrationBuilder.DropIndex(
                name: "IX_Categories_Slug",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "Slug",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "ShowInMenu",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "IsFeatured",
                table: "Categories");
        }
    }
}
