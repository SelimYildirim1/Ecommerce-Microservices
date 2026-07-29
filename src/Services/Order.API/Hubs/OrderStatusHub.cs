using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Order.API.Hubs;

/// <summary>
/// Sipariş durumundaki değişiklikleri gerçek zamanlı olarak iletmek için kullanılan SignalR Hub'ı.
/// JWT'deki sub claim'i ile "user-{userId}" grubuna eklenir (query userId yok sayılır).
/// </summary>
[Authorize]
public class OrderStatusHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? Context.User?.FindFirstValue("sub");

        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GetUserGroupName(userId));
        }
        else
        {
            Context.Abort();
            return;
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? Context.User?.FindFirstValue("sub");

        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetUserGroupName(userId));
        }

        await base.OnDisconnectedAsync(exception);
    }

    public static string GetUserGroupName(string userId) => $"user-{userId}";
}
