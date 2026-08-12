using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Identity.API.Migrations
{
    [DbContext(typeof(Identity.API.Data.AppIdentityDbContext))]
    [Migration("20260808161000_AddStockAndPriceDropPrefs")]
    public partial class AddStockAndPriceDropPrefs : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "StockAlerts",
                table: "NotificationPreferences",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "PriceDrops",
                table: "NotificationPreferences",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StockAlerts",
                table: "NotificationPreferences");

            migrationBuilder.DropColumn(
                name: "PriceDrops",
                table: "NotificationPreferences");
        }
    }
}
