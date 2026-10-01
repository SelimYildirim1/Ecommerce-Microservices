using MassTransit;
using Core.Shared.Events;
using Microsoft.EntityFrameworkCore;
using Order.API.Data;
using Order.API.Services.IntegraOps;

namespace Order.API.Consumers;

/// <summary>
/// Catalog.API stok ayirdiginda adimi IntegraOps'a bildirir. Siparis durumunu degistirmez;
/// odemeyi Payment.API kendi kuyruguyla ayrica dinler.
/// </summary>
public class StockReservedConsumer : IConsumer<StockReservedEvent>
{
    private readonly OrderDbContext _context;
    private readonly IntegraOpsNotifier _integraOps;

    public StockReservedConsumer(OrderDbContext context, IntegraOpsNotifier integraOps)
    {
        _context = context;
        _integraOps = integraOps;
    }

    public async Task Consume(ConsumeContext<StockReservedEvent> context)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(
            o => o.Id == context.Message.OrderId, context.CancellationToken);
        if (order == null) return;

        await _integraOps.TrackAsync(order, IntegraOpsNotifier.StockReserved, ct: context.CancellationToken);
        await _context.SaveChangesAsync(context.CancellationToken);
    }
}
