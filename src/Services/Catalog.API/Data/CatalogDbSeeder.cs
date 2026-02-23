using Catalog.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Catalog.API.Data;

/// <summary>
/// Laravel Seeder benzeri: Catalog veritabanına başlangıç ürün verilerini ekler.
/// Görseller Lorem Flickr üzerinden ürünle alakalı etiketlere göre çekilir.
/// </summary>
public static class CatalogDbSeeder
{
    /// <summary>
    /// Products tablosuna 50 adet örnek ürün ekler.
    /// <param name="force">true: Önce tüm ürünleri siler, sonra 50 seed ekler. false: Tablo doluysa atlar.</param>
    /// Görseller harici linkten (Lorem Flickr - ürünle alakalı etiketler) yüklenir.
    /// </summary>
    public static async Task SeedAsync(CatalogDbContext context, ILogger logger, bool force = false, CancellationToken ct = default)
    {
        if (force)
        {
            var existing = await context.Products.ToListAsync(ct);
            context.Products.RemoveRange(existing);
            await context.SaveChangesAsync(ct);
            logger.LogInformation("CatalogDbSeeder: {Count} mevcut ürün silindi, seed ekleniyor.", existing.Count);
        }
        else if (await context.Products.AnyAsync(ct))
        {
            logger.LogInformation("Products tablosu zaten dolu, seed atlanıyor. Zorla eklemek için POST /api/seed (Development) veya Seed:ForceOnStartup=true kullanın.");
            return;
        }

        var products = GetSeedProducts();
        await context.Products.AddRangeAsync(products, ct);
        await context.SaveChangesAsync(ct);
        logger.LogInformation("CatalogDbSeeder: {Count} ürün Products tablosuna eklendi.", products.Count);
    }

    private static List<Product> GetSeedProducts()
    {
        var items = new (string Name, string Description, decimal Price, string ImageTag, int Stock)[]
        {
            // Elektronik
            ("Kablosuz Kulaklık", "Gürültü önleyici, 30 saat pil ömrü, Bluetooth 5.2", 899.99m, "headphone,audio", 45),
            ("Akıllı Saat", "Kalp atışı, uyku ve adım takibi, suya dayanıklı", 2499.00m, "smartwatch,watch", 30),
            ("Mekanik Klavye", "RGB aydınlatma, Cherry MX anahtarlar, Türkçe Q", 1299.00m, "keyboard,mechanical", 25),
            ("Bluetooth Hoparlör", "Taşınabilir, 20W bass, su geçirmez", 599.00m, "speaker,bluetooth", 60),
            ("Webcam Full HD", "1080p 60fps, otomatik odak, mikrofon dahil", 749.00m, "webcam,camera", 40),
            ("USB-C Hub", "7’li 1, HDMI 4K, SD kart okuyucu, 100W PD", 449.00m, "usb,hub,adapter", 80),
            ("Tablet Kılıfı", "Magnetik açılma, kalem tutucu, 10.9 inç", 299.00m, "tablet,case", 70),
            ("Mause Pad", "Büyük boy, kauçuk taban, RGB kenar", 149.00m, "mousepad,gaming", 120),
            ("Powerbank 20000mAh", "22.5W hızlı şarj, çift USB, LED göstergeli", 499.00m, "powerbank,battery", 55),
            ("Kablosuz Mouse", "Ergonomik, 16000 DPI, sessiz tıklama", 349.00m, "mouse,wireless", 90),

            // Giyim & Aksesuar
            ("Pamuklu Tişört", "Organik pamuk, unisex, 12 renk seçeneği", 189.00m, "tshirt,cotton", 200),
            ("Spor Ayakkabı", "Koşu ve günlük kullanım, nefes alan mesh", 899.00m, "sneakers,running", 75),
            ("Deri Cüzdan", "Gerçek deri, RFID blokaj, kart cebi", 399.00m, "wallet,leather", 50),
            ("Güneş Gözlüğü", "UV400 koruma, polarize cam, metal çerçeve", 429.00m, "sunglasses,style", 65),
            ("Çanta Sırt", "15.6 inç laptop bölmeli, su geçirmez", 649.00m, "backpack,laptop", 45),
            ("Polar Yelek", "Hafif, cepli, yürüyüş ve günlük", 549.00m, "vest,jacket", 40),
            ("Şapka Beyzbol", "Bordürlü, tek renk, pamuk", 149.00m, "cap,hat", 150),
            ("Atkı Kaşmir", "Yumuşak kaşmir karışımı, kışlık", 279.00m, "scarf,winter", 60),
            ("Eldiven Deri", "Kışlık, dokunmatik uyumlu parmak", 199.00m, "gloves,leather", 85),
            ("Kemer Deri", "Sığır derisi, paslanmaz toka", 329.00m, "belt,leather", 70),

            // Ev & Yaşam
            ("Kahve Makinesi", "Filtre kahve, 1.25L, anti-damlama", 799.00m, "coffeemaker,coffee", 35),
            ("Masa Lambası", "LED, 3 parlaklık, dokunmatik, USB şarj", 449.00m, "lamp,desk", 55),
            ("Yastık Ortopedik", "Bellek köpük, yıkanabilir kılıf", 349.00m, "pillow,bed", 100),
            ("Battaniye Yün", "Extra büyük, yıkanabilir, sof bej", 429.00m, "blanket,wool", 45),
            ("Suluk Termos", "500ml, paslanmaz, 12 saat sıcak/soğuk", 249.00m, "bottle,thermos", 90),
            ("Masa Organizer", "Kalemlik, dosya, telefon yuvası", 179.00m, "organizer,desk", 80),
            ("Çaydanlık Elektrik", "1.7L, otomatik kapanma, ısıya dayanıklı", 399.00m, "kettle,electric", 40),
            ("Duvar Saati", "Minimal tasarım, sessiz quartz, 30cm", 299.00m, "clock,wall", 65),
            ("Saksı Seramik", "Drenaj delikli, 15cm, 3 renk", 89.00m, "pot,plant", 120),
            ("Mum Kokulu", "Lavanta, 40 saat yanma, doğal balmumu", 129.00m, "candle,scented", 95),

            // Spor & Outdoor
            ("Yoga Matı", "6mm kalınlık, kaymaz, taşıma askısı", 279.00m, "yoga,mat", 60),
            ("Dambıl Seti", "2x5 kg, kauçuk kaplama, ev sporları", 499.00m, "dumbbell,gym", 30),
            ("Koşu Bandı", "Katlanabilir, 12 program, LCD ekran", 5999.00m, "treadmill,running", 10),
            ("Bisiklet Kaskı", "Hafif, havalandırmalı, ayarlanabilir", 399.00m, "helmet,bicycle", 45),
            ("Spor Çantası", "Ayakkabı bölmeli, 35L, omuz askılı", 349.00m, "sports,bag", 55),
            ("Atlama İpi", "Ayarlanabilir uzunluk, sayaçlı, antrenman", 79.00m, "jumprope,fitness", 100),
            ("Fitness Bandı", "3 direnç seviyesi, antrenman seti", 149.00m, "resistance,band", 120),
            ("Su Matarası", "750ml, BPA-free, spor ağız", 99.00m, "bottle,sport", 150),
            ("Pilates Topu", "65cm, anti-patlatma, pompa dahil", 189.00m, "exercise,ball", 70),
            ("Kamp Feneri", "LED, 3 mod, şarj edilebilir, su geçirmez", 279.00m, "flashlight,camping", 50),

            // Kitap & Kırtasiye
            ("Ajanda 2025", "Günlük, haftalık, ciltli, 192 sayfa", 159.00m, "planner,notebook", 80),
            ("Kurşun Kalem Seti", "12’li, 2B, silgi ve açacak dahil", 49.00m, "pencil,writing", 200),
            ("Moleskine Defter", "Kareli, 240 sayfa, sert kapak", 249.00m, "notebook,diary", 65),
            ("Dosya Klasörü", "A4, 5 bölmeli, askılı", 79.00m, "folder,files", 150),
            ("Yapışkanlı Not", "6 paket, 5 renk, 76x76mm", 35.00m, "sticky,notes", 250),
            ("Mürekkepli Kalem", "0.5mm uç, siyah, 3’lü paket", 89.00m, "pen,ink", 180),
            ("Makas Ofis", "Paslanmaz, ergonomik, 21cm", 45.00m, "scissors,office", 90),
            ("Zımba Makinesi", "Masaüstü, 20 sayfa kapasite", 119.00m, "stapler,office", 75),
            ("Tahta Kalemi", "Sörf tahtası, silinebilir, 4 renk", 69.00m, "marker,whiteboard", 110),
            ("Kitap Ayracı Metal", "Bakır, el yapımı, 5’li set", 79.00m, "bookmark,metal", 95),
        };

        // Lorem Flickr: ürünle alakalı etiketlere göre görsel; 400x400, kaliteli placeholder
        // Format: https://loremflickr.com/400/400/tag1,tag2
        var products = new List<Product>();
        for (int i = 0; i < items.Length; i++)
        {
            var (name, desc, price, imageTag, stock) = items[i];
            // Ürünle alakalı görsel: Lorem Flickr etiketlerine göre (headphone, speaker, sneakers vb.)
            var pictureUrl = $"https://loremflickr.com/400/400/{imageTag}";

            products.Add(new Product
            {
                Id = Guid.NewGuid(),
                Name = name,
                Description = desc,
                Price = price,
                PictureUrl = pictureUrl,
                StockQuantity = stock,
                CreatedAt = DateTime.UtcNow
            });
        }

        return products;
    }
}
