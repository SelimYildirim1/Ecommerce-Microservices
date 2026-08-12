using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Order.API.Migrations
{
    [DbContext(typeof(Order.API.Data.OrderDbContext))]
    [Migration("20260808140000_AddGiftWrapGiftMessage")]
    public partial class AddGiftWrapGiftMessage : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "GiftWrap",
                table: "Orders",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "GiftMessage",
                table: "Orders",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "GiftWrap", table: "Orders");
            migrationBuilder.DropColumn(name: "GiftMessage", table: "Orders");
        }
    }
}
