using Microsoft.AspNetCore.SignalR;

namespace Order.API.Hubs;

/// <summary>
/// Sipariş durumundaki değişiklikleri gerçek zamanlı olarak iletmek için kullanılan SignalR Hub'ı.
/// 
/// İstemciler bağlanırken query string ile userId gönderir:
///   /hubs/orderStatus?userId={userId}
/// 
/// Hub, bağlantıyı otomatik olarak "user-{userId}" grubuna ekler.
/// </summary>
public class OrderStatusHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var httpContext = Context.GetHttpContext();
        var userId = httpContext?.Request.Query["userId"].ToString();

        if (!string.IsNullOrWhiteSpace(userId))
        {
            // Her kullanıcı için ayrı bir grup oluşturuyoruz
            await Groups.AddToGroupAsync(Context.ConnectionId, GetUserGroupName(userId));
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var httpContext = Context.GetHttpContext();
        var userId = httpContext?.Request.Query["userId"].ToString();

        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetUserGroupName(userId));
        }

        await base.OnDisconnectedAsync(exception);
    }

    public static string GetUserGroupName(string userId) => $"user-{userId}";
}

