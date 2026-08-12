using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Order.API.Migrations
{
    [DbContext(typeof(Order.API.Data.OrderDbContext))]
    [Migration("20260808170000_AddAdminNoteInvoiceReturnExchange")]
    public partial class AddAdminNoteInvoiceReturnExchange : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdminNote",
                table: "Orders",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RequestType",
                table: "ReturnRequests",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "ExchangeProductId",
                table: "ReturnRequestItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExchangeProductName",
                table: "ReturnRequestItems",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExchangeSelectedAttributes",
                table: "ReturnRequestItems",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "AdminNote", table: "Orders");
            migrationBuilder.DropColumn(name: "RequestType", table: "ReturnRequests");
            migrationBuilder.DropColumn(name: "ExchangeProductId", table: "ReturnRequestItems");
            migrationBuilder.DropColumn(name: "ExchangeProductName", table: "ReturnRequestItems");
            migrationBuilder.DropColumn(name: "ExchangeSelectedAttributes", table: "ReturnRequestItems");
        }
    }
}
