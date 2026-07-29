using Core.Shared.Events;
using Xunit;

namespace Ecommerce.UnitTests;

public class CheckoutEventTests
{
    [Fact]
    public void BasketCheckoutEvent_CardFields_AreOptionalNullByDefault()
    {
        var evt = new BasketCheckoutEvent
        {
            UserName = "user-1",
            TotalPrice = 100,
            FirstName = "A",
            LastName = "B",
            EmailAddress = "a@b.com",
            AddressLine = "Line"
        };

        Assert.Null(evt.CardNumber);
        Assert.Null(evt.CVV);
        Assert.Null(evt.CardName);
        Assert.Null(evt.Expiration);
    }

    [Fact]
    public void OrderStockReleaseEvent_DefaultsReleaseTypeCancel()
    {
        var evt = new OrderStockReleaseEvent { OrderId = Guid.NewGuid(), Reason = "test" };
        Assert.Equal("Cancel", evt.ReleaseType);
    }
}
