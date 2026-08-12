using Order.API.Entities;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Order.API.Services;

public static class InvoicePdfService
{
    static InvoicePdfService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] Generate(Order.API.Entities.Order order)
    {
        var orderNo = order.OrderNumber ?? order.Id.ToString("N")[..8].ToUpperInvariant();
        var customerName = $"{order.FirstName} {order.LastName}".Trim();
        if (string.IsNullOrWhiteSpace(customerName))
            customerName = order.BuyerId;

        var billingStreet = order.BillingSameAsShipping
            ? order.Address?.Street
            : order.BillingAddressLine;
        var billingCity = order.BillingSameAsShipping
            ? order.Address?.City
            : order.BillingCity;
        var billingZip = order.BillingSameAsShipping
            ? order.Address?.ZipCode
            : order.BillingZipCode;
        var billingCountry = order.BillingSameAsShipping
            ? order.Address?.Country
            : order.BillingCountry;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(40);
                page.Size(PageSizes.A4);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(col =>
                {
                    col.Item().Text("FATURA / İRSALİYE").SemiBold().FontSize(18);
                    col.Item().Text($"Sipariş No: {orderNo}").FontSize(12);
                    col.Item().Text($"Tarih: {order.OrderDate:dd.MM.yyyy HH:mm} UTC");
                });

                page.Content().PaddingVertical(20).Column(col =>
                {
                    col.Spacing(12);

                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Alıcı").SemiBold();
                            c.Item().Text(customerName);
                            if (!string.IsNullOrWhiteSpace(order.EmailAddress))
                                c.Item().Text(order.EmailAddress);
                            if (!string.IsNullOrWhiteSpace(order.CompanyName))
                                c.Item().Text(order.CompanyName);
                            if (!string.IsNullOrWhiteSpace(order.TaxId))
                                c.Item().Text($"VKN/TCKN: {order.TaxId}");
                            if (!string.IsNullOrWhiteSpace(order.TaxOffice))
                                c.Item().Text($"Vergi Dairesi: {order.TaxOffice}");
                        });

                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Fatura Adresi").SemiBold();
                            if (!string.IsNullOrWhiteSpace(billingStreet))
                                c.Item().Text(billingStreet);
                            var cityLine = string.Join(" ", new[] { billingZip, billingCity, billingCountry }
                                .Where(s => !string.IsNullOrWhiteSpace(s)));
                            if (!string.IsNullOrWhiteSpace(cityLine))
                                c.Item().Text(cityLine);
                            c.Item().Text($"Ödeme: {order.PaymentMethod ?? "card"}");
                            c.Item().Text($"Durum: {order.OrderStatus}");
                        });
                    });

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(4);
                            columns.RelativeColumn(2);
                            columns.ConstantColumn(50);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(2);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Element(CellHeader).Text("Ürün");
                            header.Cell().Element(CellHeader).Text("Özellik");
                            header.Cell().Element(CellHeader).AlignRight().Text("Adet");
                            header.Cell().Element(CellHeader).AlignRight().Text("Birim");
                            header.Cell().Element(CellHeader).AlignRight().Text("Tutar");
                        });

                        foreach (var item in order.OrderItems)
                        {
                            var lineTotal = item.UnitPrice * item.Units;
                            table.Cell().Element(CellBody).Text(item.ProductName);
                            table.Cell().Element(CellBody).Text(item.SelectedAttributes ?? "-");
                            table.Cell().Element(CellBody).AlignRight().Text(item.Units.ToString());
                            table.Cell().Element(CellBody).AlignRight().Text($"{item.UnitPrice:N2} ₺");
                            table.Cell().Element(CellBody).AlignRight().Text($"{lineTotal:N2} ₺");
                        }
                    });

                    col.Item().AlignRight().Column(totals =>
                    {
                        var itemsTotal = order.OrderItems.Sum(i => i.UnitPrice * i.Units);
                        totals.Item().Text($"Ara toplam: {itemsTotal:N2} ₺");
                        if (order.DiscountAmount > 0)
                            totals.Item().Text($"İndirim: -{order.DiscountAmount:N2} ₺");
                        if (order.ShippingCost > 0)
                            totals.Item().Text($"Kargo: {order.ShippingCost:N2} ₺");
                        totals.Item().Text($"Genel toplam: {order.TotalAmount:N2} ₺").SemiBold().FontSize(12);
                    });
                });

                page.Footer().AlignCenter().Text(txt =>
                {
                    txt.Span("Sayfa ");
                    txt.CurrentPageNumber();
                    txt.Span(" / ");
                    txt.TotalPages();
                });
            });
        });

        return document.GeneratePdf();
    }

    private static IContainer CellHeader(IContainer container) =>
        container.DefaultTextStyle(x => x.SemiBold()).PaddingVertical(4).BorderBottom(1).BorderColor(Colors.Grey.Lighten2);

    private static IContainer CellBody(IContainer container) =>
        container.PaddingVertical(3).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten3);
}
