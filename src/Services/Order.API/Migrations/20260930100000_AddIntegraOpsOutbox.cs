using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Order.API.Migrations
{
    [DbContext(typeof(Order.API.Data.OrderDbContext))]
    [Migration("20260930100000_AddIntegraOpsOutbox")]
    public partial class AddIntegraOpsOutbox : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "IntegraOpsOutbox",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    TransactionId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Step = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Error = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Group = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    OccurredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    State = table.Column<int>(type: "integer", nullable: false),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    NextAttemptAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastError = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IntegraOpsOutbox", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IntegraOpsOutbox_TransactionId",
                table: "IntegraOpsOutbox",
                column: "TransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_IntegraOpsOutbox_State_NextAttemptAt",
                table: "IntegraOpsOutbox",
                columns: new[] { "State", "NextAttemptAt" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "IntegraOpsOutbox");
        }
    }
}
