using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Order.API.Migrations
{
    [DbContext(typeof(Order.API.Data.OrderDbContext))]
    [Migration("20260827120000_AddReturnStockRestoredAt")]
    public partial class AddReturnStockRestoredAt : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "StockRestoredAt",
                table: "ReturnRequests",
                type: "timestamp with time zone",
                nullable: true);

            // Gecmis kayitlar: stogu zaten "Refunded" adiminda geri eklenmis taleplere
            // isaret koy, boylece deploy sonrasi ikinci kez stok artmasin.
            migrationBuilder.Sql(@"
                UPDATE ""ReturnRequests""
                SET ""StockRestoredAt"" = COALESCE(""RefundedAt"", ""ResolvedAt"", ""RequestedAt"")
                WHERE ""Status"" = 3;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "StockRestoredAt", table: "ReturnRequests");
        }
    }
}
