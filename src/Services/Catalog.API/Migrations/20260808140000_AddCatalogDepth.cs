using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.API.Migrations
{
    [DbContext(typeof(Catalog.API.Data.CatalogDbContext))]
    [Migration("20260808140000_AddCatalogDepth")]
    public partial class AddCatalogDepth : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Slug",
                table: "Brands",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Brands",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MetaTitle",
                table: "Brands",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MetaDescription",
                table: "Brands",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Brands_Slug",
                table: "Brands",
                column: "Slug");

            migrationBuilder.AddColumn<string>(
                name: "MediaType",
                table: "ProductImages",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "image");

            migrationBuilder.AddColumn<bool>(
                name: "IsVerifiedPurchase",
                table: "ProductReviews",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "HelpfulCount",
                table: "ProductReviews",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "NotHelpfulCount",
                table: "ProductReviews",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrls",
                table: "ProductReviews",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CompareAtPrice",
                table: "ProductVariants",
                type: "numeric",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ReviewVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReviewId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IsHelpful = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReviewVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReviewVotes_ProductReviews_ReviewId",
                        column: x => x.ReviewId,
                        principalTable: "ProductReviews",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReviewVotes_ReviewId_UserId",
                table: "ReviewVotes",
                columns: new[] { "ReviewId", "UserId" },
                unique: true);

            migrationBuilder.CreateTable(
                name: "ProductQuestions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    UserName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Question = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Answer = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    AnsweredBy = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    AnsweredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsApproved = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductQuestions_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductQuestions_ProductId",
                table: "ProductQuestions",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductQuestions_IsApproved",
                table: "ProductQuestions",
                column: "IsApproved");

            migrationBuilder.CreateTable(
                name: "SearchQueryLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Query = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    HitCount = table.Column<int>(type: "integer", nullable: false),
                    LastSearchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SearchQueryLogs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SearchQueryLogs_Query",
                table: "SearchQueryLogs",
                column: "Query",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SearchQueryLogs_HitCount",
                table: "SearchQueryLogs",
                column: "HitCount");

            // Mevcut markalara slug üret
            migrationBuilder.Sql(@"
UPDATE ""Brands""
                SET ""Slug"" = lower(regexp_replace(
                    translate(""Name"", 'ığüşöçİĞÜŞÖÇ', 'igusocigusoc'),
                    '[^a-z0-9]+', '-', 'g'
                ))
                WHERE ""Slug"" IS NULL OR ""Slug"" = '';
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "ReviewVotes");
            migrationBuilder.DropTable(name: "ProductQuestions");
            migrationBuilder.DropTable(name: "SearchQueryLogs");

            migrationBuilder.DropIndex(name: "IX_Brands_Slug", table: "Brands");

            migrationBuilder.DropColumn(name: "Slug", table: "Brands");
            migrationBuilder.DropColumn(name: "Description", table: "Brands");
            migrationBuilder.DropColumn(name: "MetaTitle", table: "Brands");
            migrationBuilder.DropColumn(name: "MetaDescription", table: "Brands");
            migrationBuilder.DropColumn(name: "MediaType", table: "ProductImages");
            migrationBuilder.DropColumn(name: "IsVerifiedPurchase", table: "ProductReviews");
            migrationBuilder.DropColumn(name: "HelpfulCount", table: "ProductReviews");
            migrationBuilder.DropColumn(name: "NotHelpfulCount", table: "ProductReviews");
            migrationBuilder.DropColumn(name: "ImageUrls", table: "ProductReviews");
            migrationBuilder.DropColumn(name: "CompareAtPrice", table: "ProductVariants");
        }
    }
}
