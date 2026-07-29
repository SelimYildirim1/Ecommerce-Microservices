using System.Text.Json;
using Catalog.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Data;

/// <summary>
/// Catalog veritabanına başlangıç verilerini ekler.
/// Görseller projeyle birlikte gelir (wwwroot/img), böylece vitrindeki
/// ürün fotoğrafları her yenilemede değişmez.
/// </summary>
public static class CatalogDbSeeder
{
    /// <summary>Görsellerin sunulduğu kök yol; gateway bunu /img altından yayınlar.</summary>
    private const string ProductImg = "/img/products/";
    private const string CategoryImg = "/img/categories/";

    /// <summary>
    /// Örnek katalog sürümü. Buradaki veri değiştiğinde artırılır; kayıtlı sürümden
    /// farklıysa örnek katalog yeniden kurulur.
    /// </summary>
    private const string SeedVersion = "2";
    private const string SeedVersionKey = "catalog.seedVersion";

    public static async Task SeedAsync(CatalogDbContext context, ILogger logger, bool force = false, CancellationToken ct = default)
    {
        // Eski seed rastgele görsel servisi kullanıyordu; o veri bulunursa katalog tazelenir.
        var hasLegacyImages = await context.ProductImages
            .AnyAsync(i => i.Url.Contains("loremflickr"), ct);

        if (hasLegacyImages)
        {
            logger.LogInformation("Eski örnek katalog bulundu, sabit görselli katalog ile değiştiriliyor.");
            force = true;
        }

        var versionSetting = await context.SiteSettings.FirstOrDefaultAsync(s => s.Key == SeedVersionKey, ct);

        if (await context.Products.AnyAsync(ct) && versionSetting?.Value != SeedVersion)
        {
            logger.LogInformation("Örnek katalog sürümü değişti ({Old} -> {New}), yeniden kuruluyor.",
                versionSetting?.Value ?? "yok", SeedVersion);
            force = true;
        }

        // Banner, statik sayfa ve site ayarları ürünlerden bağımsız tamamlanır.
        await SeedContentAsync(context, ct);

        if (force)
        {
            await ClearAsync(context, ct);
            logger.LogInformation("CatalogDbSeeder: Mevcut veriler silindi, seed ekleniyor.");
        }
        else if (await context.Products.AnyAsync(ct))
        {
            logger.LogInformation("Products tablosu zaten dolu, seed atlanıyor.");
            return;
        }

        var brands = SeedBrands();
        await context.Brands.AddRangeAsync(brands, ct);

        var attributes = SeedAttributes();
        await context.ProductAttributes.AddRangeAsync(attributes, ct);

        var categories = SeedCategories();
        await context.Categories.AddRangeAsync(categories, ct);
        await context.SaveChangesAsync(ct);

        var catAttrs = SeedCategoryAttributes(categories, attributes);
        await context.CategoryAttributes.AddRangeAsync(catAttrs, ct);

        var (products, variants, images) = SeedProducts(categories, brands);
        await context.Products.AddRangeAsync(products, ct);
        await context.SaveChangesAsync(ct);

        await context.ProductVariants.AddRangeAsync(variants, ct);
        await context.ProductImages.AddRangeAsync(images, ct);
        await context.SaveChangesAsync(ct);

        var reviews = SeedReviews(products);
        await context.ProductReviews.AddRangeAsync(reviews, ct);

        if (versionSetting is null)
            context.SiteSettings.Add(new SiteSetting { Key = SeedVersionKey, Value = SeedVersion, Group = "system" });
        else
            versionSetting.Value = SeedVersion;

        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "CatalogDbSeeder: {CategoryCount} kategori, {ProductCount} ürün, {VariantCount} varyant, {ReviewCount} yorum eklendi.",
            categories.Count, products.Count, variants.Count, reviews.Count);
    }

    /// <summary>
    /// Vitrinin boş görünmemesi için banner, kurumsal sayfa ve temel site ayarlarını
    /// tamamlar. Panelden düzenlenen kayıtlara dokunmaz, yalnızca eksikleri ekler.
    /// </summary>
    private static async Task SeedContentAsync(CatalogDbContext context, CancellationToken ct)
    {
        var changed = false;

        // Deneme amaçlı eklenmiş, dışarıdan rastgele görsel çeken banner'lar vitrini bozuyor.
        var placeholderBanners = await context.Banners
            .Where(b => b.Placement == "home-slider" &&
                        (b.ImageUrl.Contains("picsum.photos") ||
                         b.ImageUrl.Contains("loremflickr") ||
                         b.ImageUrl.Contains("placehold")))
            .ToListAsync(ct);

        if (placeholderBanners.Count > 0)
        {
            context.Banners.RemoveRange(placeholderBanners);
            await context.SaveChangesAsync(ct);
        }

        if (!await context.Banners.AnyAsync(b => b.Placement == "home-slider", ct))
        {
            context.Banners.AddRange(
                new Banner
                {
                    Title = "Günün Fırsatları",
                    Subtitle = "En yeni ürünler, en uygun fiyatlarla sizi bekliyor.",
                    ImageUrl = "/img/banners/banner-1.jpg",
                    LinkUrl = "/products",
                    Placement = "home-slider",
                    SortOrder = 0
                },
                new Banner
                {
                    Title = "Sezon Sonu İndirimi",
                    Subtitle = "Seçili ürünlerde %50'ye varan indirim fırsatı.",
                    ImageUrl = "/img/banners/banner-2.jpg",
                    LinkUrl = "/products?sort=PriceAsc",
                    Placement = "home-slider",
                    SortOrder = 1
                },
                new Banner
                {
                    Title = "Evini Yenile",
                    Subtitle = "Mobilya ve dekorasyonda yeni sezon ürünleri mağazamızda.",
                    ImageUrl = "/img/banners/banner-3.jpg",
                    LinkUrl = "/products",
                    Placement = "home-slider",
                    SortOrder = 2
                });

            changed = true;
        }

        var pages = new (string Slug, string Title, string Content, int Sort)[]
        {
            ("hakkimizda", "Hakkımızda",
                "<p>Yıldırım Store, 2015 yılından bu yana teknolojiden ev yaşamına kadar geniş bir ürün yelpazesini " +
                "uygun fiyatlarla müşterileriyle buluşturuyor. Amacımız, alışverişi hızlı, güvenli ve keyifli hale getirmek.</p>" +
                "<p>Tüm ürünlerimiz orijinal ve garantilidir. Siparişleriniz aynı gün kargoya verilir.</p>", 1),
            ("iletisim", "İletişim",
                "<p>Müşteri hizmetlerimize hafta içi 09:00 - 18:00 saatleri arasında ulaşabilirsiniz.</p>" +
                "<ul><li>Telefon: 0850 000 00 00</li><li>E-posta: destek@yildirimstore.com</li>" +
                "<li>Adres: Levent Mah. Teknoloji Cad. No:1, İstanbul</li></ul>", 2),
            ("kargo-ve-teslimat", "Kargo ve Teslimat",
                "<p>500 TL ve üzeri siparişlerde kargo ücretsizdir. Saat 16:00'ya kadar verilen siparişler aynı gün kargoya teslim edilir.</p>" +
                "<p>Teslimat süresi, bulunduğunuz şehre göre 1-3 iş günü arasında değişir.</p>", 3),
            ("iade-ve-degisim", "İade ve Değişim",
                "<p>Satın aldığınız ürünleri teslim tarihinden itibaren 14 gün içinde iade edebilirsiniz. " +
                "İade talebinizi hesabınızdaki sipariş detay sayfasından oluşturabilirsiniz.</p>" +
                "<p>Ürünün kullanılmamış ve orijinal ambalajında olması gerekir.</p>", 4),
            ("mesafeli-satis-sozlesmesi", "Mesafeli Satış Sözleşmesi",
                "<p>İşbu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun kapsamında, satıcı ile alıcı arasında " +
                "elektronik ortamda kurulan mesafeli satış ilişkisinin şartlarını düzenler.</p>", 5),
            ("gizlilik-politikasi", "Gizlilik Politikası",
                "<p>Kişisel verileriniz yalnızca sipariş süreçlerinin yürütülmesi amacıyla işlenir ve üçüncü kişilerle paylaşılmaz.</p>", 6),
            ("kvkk", "KVKK Aydınlatma Metni",
                "<p>6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metnimizdir. " +
                "Veri sorumlusu Yıldırım Store'dur. Haklarınız için bizimle iletişime geçebilirsiniz.</p>", 7),
            ("cerez-politikasi", "Çerez Politikası",
                "<p>Sitemizde deneyiminizi iyileştirmek için zorunlu ve analitik çerezler kullanılabilir. " +
                "Tarayıcı ayarlarınızdan çerezleri yönetebilirsiniz.</p>", 8),
        };

        foreach (var (slug, title, content, sort) in pages)
        {
            if (await context.StaticPages.AnyAsync(p => p.Slug == slug, ct)) continue;

            context.StaticPages.Add(new StaticPage
            {
                Slug = slug,
                Title = title,
                Content = content,
                MetaTitle = $"{title} | Yıldırım Store",
                IsPublished = true,
                ShowInFooter = true,
                SortOrder = sort
            });

            changed = true;
        }

        var settings = new (string Key, string Value, string Group)[]
        {
            ("site.name", "Yıldırım Store", "general"),
            ("site.description", "En yeni ürünler, en uygun fiyatlarla sizi bekliyor.", "general"),
            ("site.email", "destek@yildirimstore.com", "general"),
            ("site.phone", "0850 000 00 00", "general"),
            ("site.address", "Levent Mah. Teknoloji Cad. No:1, İstanbul", "general"),
            ("commerce.currency", "TRY", "commerce"),
            ("commerce.freeShippingThreshold", "500", "commerce"),
            ("social.instagram", "https://instagram.com", "social"),
            ("social.twitter", "https://x.com", "social"),
        };

        foreach (var (key, value, group) in settings)
        {
            if (await context.SiteSettings.AnyAsync(s => s.Key == key, ct)) continue;

            context.SiteSettings.Add(new SiteSetting { Key = key, Value = value, Group = group });
            changed = true;
        }

        if (changed) await context.SaveChangesAsync(ct);
    }

    /// <summary>Katalog tablolarını yabancı anahtar sırasına göre boşaltır.</summary>
    private static async Task ClearAsync(CatalogDbContext context, CancellationToken ct)
    {
        context.StockMovements.RemoveRange(await context.StockMovements.ToListAsync(ct));
        context.ProductReviews.RemoveRange(await context.ProductReviews.ToListAsync(ct));
        context.Favorites.RemoveRange(await context.Favorites.ToListAsync(ct));
        context.ProductImages.RemoveRange(await context.ProductImages.ToListAsync(ct));
        context.ProductVariants.RemoveRange(await context.ProductVariants.ToListAsync(ct));
        context.Products.RemoveRange(await context.Products.ToListAsync(ct));
        context.CategoryAttributes.RemoveRange(await context.CategoryAttributes.ToListAsync(ct));
        context.Categories.RemoveRange(await context.Categories.ToListAsync(ct));
        context.ProductAttributes.RemoveRange(await context.ProductAttributes.ToListAsync(ct));
        context.Brands.RemoveRange(await context.Brands.ToListAsync(ct));
        await context.SaveChangesAsync(ct);
    }

    private static List<Brand> SeedBrands() =>
        new[]
        {
            "Apple", "Samsung", "Sony", "Nike", "Adidas", "Puma", "Zara", "IKEA",
            "Bosch", "Lenovo", "Logitech", "Polaroid", "DJI", "Fossil", "Ray-Ban",
            "Chanel", "Decathlon", "Lavazza", "Samsonite", "Vitra", "Can Yayınları"
        }
        .Select(name => new Brand { Name = name })
        .ToList();

    private static List<ProductAttribute> SeedAttributes()
    {
        return new List<ProductAttribute>
        {
            new() { Name = "Renk", Code = "color", DataType = "Color", IsRequired = true, IsVariant = true },
            new() { Name = "Beden", Code = "size", DataType = "Select", Options = "XS,S,M,L,XL,XXL", IsRequired = true, IsVariant = true },
            new() { Name = "Numara", Code = "shoe_size", DataType = "Select", Options = "36,37,38,39,40,41,42,43,44,45", IsRequired = true, IsVariant = true },
            new() { Name = "Kumaş", Code = "fabric", DataType = "Select", Options = "Pamuk,Polyester,Keten,Yün,Denim", IsRequired = false, IsVariant = false },

            new() { Name = "RAM", Code = "ram", DataType = "Select", Options = "4GB,8GB,16GB,32GB,64GB", IsRequired = true, IsVariant = true },
            new() { Name = "Depolama", Code = "storage", DataType = "Select", Options = "128GB,256GB,512GB,1TB,2TB", IsRequired = true, IsVariant = true },
            new() { Name = "İşlemci", Code = "cpu", DataType = "Text", IsRequired = true, IsVariant = false },
            new() { Name = "Ekran Boyutu", Code = "screen_size", DataType = "Text", IsRequired = false, IsVariant = false },
            new() { Name = "Ekran Kartı", Code = "gpu", DataType = "Text", IsRequired = false, IsVariant = false },

            new() { Name = "Malzeme", Code = "material", DataType = "Text", IsRequired = false, IsVariant = false },
            new() { Name = "Boyut", Code = "dimension", DataType = "Text", IsRequired = false, IsVariant = false },
            new() { Name = "Ağırlık", Code = "weight", DataType = "Number", IsRequired = false, IsVariant = false },
            new() { Name = "Hacim", Code = "volume", DataType = "Text", IsRequired = false, IsVariant = false },

            new() { Name = "Garanti Süresi", Code = "warranty", DataType = "Select", Options = "6 Ay,1 Yıl,2 Yıl,3 Yıl", IsRequired = false, IsVariant = false },
        };
    }

    private static List<Category> SeedCategories()
    {
        var list = new List<Category>();

        Category Root(string name, string? image, int sort)
        {
            var category = new Category { Name = name, ImageUrl = image is null ? null : CategoryImg + image, SortOrder = sort };
            list.Add(category);
            return category;
        }

        void Child(Category parent, string name, string? image, int sort)
        {
            list.Add(new Category
            {
                Name = name,
                ParentId = parent.Id,
                ImageUrl = image is null ? null : CategoryImg + image,
                SortOrder = sort
            });
        }

        // SortOrder 1-8 arası olanlar ana sayfadaki kategori şeridinde görünür.
        var elektronik = Root("Elektronik", "elektronik.jpg", 1);
        var giyim = Root("Giyim & Aksesuar", "giyim.jpg", 20);
        var evYasam = Root("Ev & Yaşam", "ev-yasam.jpg", 4);
        var spor = Root("Spor & Outdoor", "spor.jpg", 5);
        var kitapHobi = Root("Kitap & Hobi", "kitap.jpg", 6);
        var kozmetik = Root("Kozmetik", "kozmetik.jpg", 21);

        Child(elektronik, "Bilgisayar", "bilgisayar.jpg", 2);
        Child(elektronik, "Telefon & Tablet", "telefon.jpg", 22);
        Child(elektronik, "Kulaklık & Ses", "ses.jpg", 23);
        Child(elektronik, "TV & Görüntü", "tv.jpg", 24);
        Child(elektronik, "Foto & Kamera", "kamera.jpg", 25);

        Child(giyim, "Erkek Giyim", "giyim.jpg", 26);
        Child(giyim, "Kadın Giyim", "giyim.jpg", 27);
        Child(giyim, "Ayakkabı", "ayakkabi.jpg", 28);
        Child(giyim, "Çanta", "canta.jpg", 7);
        Child(giyim, "Gözlük", "gozluk.jpg", 29);
        Child(giyim, "Saat", "saat.jpg", 8);

        Child(evYasam, "Mutfak", "mutfak.jpg", 30);
        Child(evYasam, "Kahve Makineleri", "kahve.jpg", 3);
        Child(evYasam, "Mobilya", "mobilya.jpg", 31);
        Child(evYasam, "Dekorasyon", "dekorasyon.jpg", 32);

        Child(spor, "Fitness", "spor.jpg", 33);
        Child(spor, "Koşu", "kosu.jpg", 34);
        Child(spor, "Outdoor & Kamp", "outdoor.jpg", 35);

        Child(kitapHobi, "Kitap", "kitap.jpg", 36);

        Child(kozmetik, "Parfüm", "parfum.jpg", 37);
        Child(kozmetik, "Cilt Bakımı", "kozmetik.jpg", 38);

        return list;
    }

    private static List<CategoryAttribute> SeedCategoryAttributes(List<Category> categories, List<ProductAttribute> attributes)
    {
        var attrByCode = attributes.ToDictionary(a => a.Code);
        var catByName = categories.ToDictionary(c => c.Name);

        var result = new List<CategoryAttribute>();

        void Map(string categoryName, string[] codes, string[]? filterableCodes = null)
        {
            var filterSet = new HashSet<string>(filterableCodes ?? Array.Empty<string>());
            var order = 0;

            foreach (var code in codes)
            {
                result.Add(new CategoryAttribute
                {
                    CategoryId = catByName[categoryName].Id,
                    ProductAttributeId = attrByCode[code].Id,
                    SortOrder = order++,
                    IsFilterable = filterSet.Contains(code)
                });
            }
        }

        Map("Bilgisayar", new[] { "ram", "storage", "cpu", "screen_size", "gpu", "warranty" }, new[] { "ram", "storage", "cpu" });
        Map("Telefon & Tablet", new[] { "ram", "storage", "cpu", "screen_size", "color", "warranty" }, new[] { "storage", "color" });
        Map("Kulaklık & Ses", new[] { "color", "warranty" }, new[] { "color" });
        Map("TV & Görüntü", new[] { "screen_size", "warranty" }, new[] { "screen_size" });
        Map("Foto & Kamera", new[] { "color", "warranty" }, new[] { "color" });

        Map("Erkek Giyim", new[] { "color", "size", "fabric" }, new[] { "color", "size" });
        Map("Kadın Giyim", new[] { "color", "size", "fabric" }, new[] { "color", "size" });
        Map("Ayakkabı", new[] { "color", "shoe_size" }, new[] { "color", "shoe_size" });
        Map("Çanta", new[] { "color", "material", "dimension" }, new[] { "color", "material" });
        Map("Gözlük", new[] { "color", "material" }, new[] { "color" });
        Map("Saat", new[] { "color", "material", "warranty" }, new[] { "color" });

        Map("Mutfak", new[] { "material", "dimension", "color", "warranty" }, new[] { "color" });
        Map("Kahve Makineleri", new[] { "color", "material", "warranty" }, new[] { "color" });
        Map("Mobilya", new[] { "color", "material", "dimension" }, new[] { "color", "material" });
        Map("Dekorasyon", new[] { "color", "material", "dimension" }, new[] { "color", "material" });

        Map("Fitness", new[] { "color", "weight", "dimension" }, new[] { "color" });
        Map("Koşu", new[] { "color", "shoe_size" }, new[] { "color", "shoe_size" });
        Map("Outdoor & Kamp", new[] { "color", "material", "dimension" }, new[] { "color" });

        Map("Kitap", new[] { "dimension" });
        Map("Parfüm", new[] { "volume" }, new[] { "volume" });
        Map("Cilt Bakımı", new[] { "volume" }, new[] { "volume" });

        return result;
    }

    /// <summary>Varyant özelliklerini kaçış karakteri derdi olmadan JSON'a çevirir.</summary>
    private static JsonDocument Spec(params (string Key, string Value)[] pairs) =>
        JsonDocument.Parse(JsonSerializer.Serialize(pairs.ToDictionary(p => p.Key, p => p.Value)));

    private static (List<Product>, List<ProductVariant>, List<ProductImage>) SeedProducts(
        List<Category> categories, List<Brand> brands)
    {
        var catByName = categories.ToDictionary(c => c.Name);
        var brandByName = brands.ToDictionary(b => b.Name);

        var products = new List<Product>();
        var variants = new List<ProductVariant>();
        var images = new List<ProductImage>();

        Product Add(string name, string description, string category, string brand, params string[] imageFiles)
        {
            var product = new Product
            {
                Name = name,
                Description = description,
                CategoryId = catByName[category].Id,
                BrandId = brandByName[brand].Id,
                Slug = Slugify(name),
                MetaTitle = $"{name} | Yıldırım Store",
                MetaDescription = description
            };

            products.Add(product);

            for (var i = 0; i < imageFiles.Length; i++)
            {
                images.Add(new ProductImage
                {
                    ProductId = product.Id,
                    Url = ProductImg + imageFiles[i],
                    IsPrimary = i == 0,
                    SortOrder = i
                });
            }

            return product;
        }

        void Variant(Product product, string sku, decimal price, int stock, params (string, string)[] specs) =>
            variants.Add(new ProductVariant
            {
                ProductId = product.Id,
                Sku = sku,
                Price = price,
                StockQuantity = stock,
                Specifics = Spec(specs)
            });

        // ---------------- Bilgisayar ----------------

        var macbookPro = Add("MacBook Pro 16\"", "Apple M3 Pro çipli profesyonel dizüstü bilgisayar. Liquid Retina XDR ekran, 22 saate varan pil ömrü.",
            "Bilgisayar", "Apple", "macbook-pro.jpg", "macbook-pro-2.jpg", "desk-setup.jpg");
        Variant(macbookPro, "MBP-16-M3-16-512", 74999m, 15, ("ram", "16GB"), ("storage", "512GB"), ("cpu", "M3 Pro"), ("screen_size", "16 inç"), ("gpu", "18 çekirdek"), ("warranty", "2 Yıl"));
        Variant(macbookPro, "MBP-16-M3-32-1TB", 94999m, 8, ("ram", "32GB"), ("storage", "1TB"), ("cpu", "M3 Max"), ("screen_size", "16 inç"), ("gpu", "40 çekirdek"), ("warranty", "2 Yıl"));

        var macbookAir = Add("MacBook Air 13\" M3", "İnce, sessiz ve fansız tasarım. Günlük kullanım ve ofis işleri için ideal.",
            "Bilgisayar", "Apple", "macbook-air.jpg");
        Variant(macbookAir, "MBA-13-M3-8-256", 44999m, 30, ("ram", "8GB"), ("storage", "256GB"), ("cpu", "M3"), ("screen_size", "13.6 inç"), ("warranty", "2 Yıl"));
        Variant(macbookAir, "MBA-13-M3-16-512", 54999m, 18, ("ram", "16GB"), ("storage", "512GB"), ("cpu", "M3"), ("screen_size", "13.6 inç"), ("warranty", "2 Yıl"));

        var legion = Add("Legion Pro 7 Oyun Bilgisayarı", "RTX 4080 ekran kartı ve 240 Hz ekran ile üst seviye oyun performansı.",
            "Bilgisayar", "Lenovo", "gaming-laptop.jpg");
        Variant(legion, "LEG-P7-32-1TB", 89999m, 6, ("ram", "32GB"), ("storage", "1TB"), ("cpu", "Ryzen 9 7945HX"), ("screen_size", "16 inç"), ("gpu", "RTX 4080"), ("warranty", "2 Yıl"));
        Variant(legion, "LEG-P7-16-1TB", 74999m, 9, ("ram", "16GB"), ("storage", "1TB"), ("cpu", "Ryzen 7 7840HS"), ("screen_size", "16 inç"), ("gpu", "RTX 4070"), ("warranty", "2 Yıl"));

        var keyboard = Add("Magic Keyboard", "Alçak profilli tuşlar, şarj edilebilir pil ve sessiz yazım deneyimi.",
            "Bilgisayar", "Apple", "keyboard.jpg");
        Variant(keyboard, "APL-MK-WHT", 4299m, 45, ("color", "Beyaz"), ("warranty", "1 Yıl"));

        var mouse = Add("MX Master 3S Kablosuz Mouse", "8000 DPI sensör, sessiz tıklama ve üç cihaza kadar hızlı geçiş.",
            "Bilgisayar", "Logitech", "mouse.jpg");
        Variant(mouse, "LOG-MX3S-GRY", 3299m, 60, ("color", "Gri"), ("warranty", "2 Yıl"));
        Variant(mouse, "LOG-MX3S-BLK", 3299m, 38, ("color", "Siyah"), ("warranty", "2 Yıl"));

        // ---------------- Telefon & Tablet ----------------

        var iphone = Add("iPhone 15 Pro", "Titanyum gövde, A17 Pro çip ve 48 MP ana kamera.",
            "Telefon & Tablet", "Apple", "iphone.jpg", "iphone-2.jpg");
        Variant(iphone, "IP15P-BLK-256", 64999m, 22, ("storage", "256GB"), ("color", "Siyah"), ("cpu", "A17 Pro"), ("screen_size", "6.1 inç"), ("warranty", "2 Yıl"));
        Variant(iphone, "IP15P-NTL-512", 74999m, 11, ("storage", "512GB"), ("color", "Natürel"), ("cpu", "A17 Pro"), ("screen_size", "6.1 inç"), ("warranty", "2 Yıl"));

        var galaxy = Add("Galaxy S24 Ultra", "S Pen dahil amiral gemisi telefon. 200 MP kamera ve 5000 mAh pil.",
            "Telefon & Tablet", "Samsung", "android-phone.jpg", "phone-blue.jpg");
        Variant(galaxy, "S24U-BLK-256", 49999m, 25, ("storage", "256GB"), ("color", "Siyah"), ("ram", "12GB"), ("cpu", "Snapdragon 8 Gen 3"), ("screen_size", "6.8 inç"), ("warranty", "2 Yıl"));
        Variant(galaxy, "S24U-GRY-512", 57999m, 12, ("storage", "512GB"), ("color", "Gri"), ("ram", "12GB"), ("cpu", "Snapdragon 8 Gen 3"), ("screen_size", "6.8 inç"), ("warranty", "2 Yıl"));

        var ipad = Add("iPad Pro 12.9\"", "M2 çipli tablet, ProMotion ekran ve Apple Pencil desteği.",
            "Telefon & Tablet", "Apple", "tablet.jpg", "tablet-2.jpg");
        Variant(ipad, "IPADP-129-256", 52999m, 14, ("storage", "256GB"), ("color", "Uzay Grisi"), ("cpu", "M2"), ("screen_size", "12.9 inç"), ("warranty", "2 Yıl"));
        Variant(ipad, "IPADP-129-512", 61999m, 7, ("storage", "512GB"), ("color", "Gümüş"), ("cpu", "M2"), ("screen_size", "12.9 inç"), ("warranty", "2 Yıl"));

        // ---------------- Kulaklık & Ses ----------------

        var sonyHeadphone = Add("WH-1000XM5 Kablosuz Kulaklık", "Sınıfının en iyi gürültü engelleme teknolojisi, 30 saat pil ömrü.",
            "Kulaklık & Ses", "Sony", "headphones-sony.jpg", "headphones-desk.jpg");
        Variant(sonyHeadphone, "WH1000XM5-BLK", 8999m, 40, ("color", "Siyah"), ("warranty", "2 Yıl"));
        Variant(sonyHeadphone, "WH1000XM5-SLV", 8999m, 26, ("color", "Gümüş"), ("warranty", "2 Yıl"));

        var airpods = Add("AirPods Pro 2", "Aktif gürültü engelleme, uyarlanabilir şeffaflık ve USB-C şarj kutusu.",
            "Kulaklık & Ses", "Apple", "earbuds.jpg");
        Variant(airpods, "APP2-WHT", 9499m, 55, ("color", "Beyaz"), ("warranty", "1 Yıl"));

        var studioHeadphone = Add("Studio Monitör Kulaklık", "Stüdyo kayıtları için düz frekans yanıtı ve konforlu kulak yastıkları.",
            "Kulaklık & Ses", "Sony", "headphones-yellow.jpg");
        Variant(studioHeadphone, "SNY-STD-BLK", 3499m, 33, ("color", "Siyah"), ("warranty", "1 Yıl"));

        var travelHeadphone = Add("Comfort Seyahat Kulaklığı", "Katlanabilir tasarım, 40 saat pil ve hızlı şarj desteği.",
            "Kulaklık & Ses", "Sony", "headphones-grey.jpg", "headphones-retro.jpg");
        Variant(travelHeadphone, "SNY-CMF-GRY", 2799m, 48, ("color", "Gri"), ("warranty", "1 Yıl"));
        Variant(travelHeadphone, "SNY-CMF-BRN", 2799m, 21, ("color", "Kahverengi"), ("warranty", "1 Yıl"));

        // ---------------- TV & Görüntü ----------------

        var bravia = Add("Bravia 55\" 4K Google TV", "Cognitive Processor XR ile gerçekçi görüntü, Dolby Vision ve Atmos desteği.",
            "TV & Görüntü", "Sony", "tv-smart.jpg", "tv-stand.jpg");
        Variant(bravia, "SNY-BRV-55", 34999m, 10, ("screen_size", "55 inç"), ("warranty", "3 Yıl"));
        Variant(bravia, "SNY-BRV-65", 44999m, 5, ("screen_size", "65 inç"), ("warranty", "3 Yıl"));

        var monitor = Add("Odyssey 34\" Oyuncu Monitörü", "165 Hz yenileme hızı ve 1 ms tepki süresiyle kavisli ultra geniş ekran.",
            "TV & Görüntü", "Samsung", "gaming-setup.jpg");
        Variant(monitor, "SMS-ODY-34", 21999m, 12, ("screen_size", "34 inç"), ("warranty", "2 Yıl"));

        // ---------------- Foto & Kamera ----------------

        var polaroid = Add("Polaroid Now Anlık Kamera", "Otomatik odaklama ve çift pozlama modu ile klasik anlık baskı keyfi.",
            "Foto & Kamera", "Polaroid", "camera-polaroid.jpg");
        Variant(polaroid, "PLR-NOW-WHT", 4999m, 24, ("color", "Beyaz"), ("warranty", "1 Yıl"));
        Variant(polaroid, "PLR-NOW-BLK", 4999m, 16, ("color", "Siyah"), ("warranty", "1 Yıl"));

        var drone = Add("Mini 4 Pro Drone", "4K HDR video, 34 dakika uçuş süresi ve her yönde engel algılama.",
            "Foto & Kamera", "DJI", "drone.jpg");
        Variant(drone, "DJI-M4P-STD", 39999m, 7, ("color", "Gri"), ("warranty", "2 Yıl"));

        // ---------------- Saat ----------------

        var appleWatch = Add("Apple Watch Series 9", "Çift dokunma hareketi, kandaki oksijen ölçümü ve parlak Retina ekran.",
            "Saat", "Apple", "watch-apple.jpg");
        Variant(appleWatch, "AW9-41-BLK", 18999m, 28, ("color", "Siyah"), ("material", "Alüminyum"), ("warranty", "2 Yıl"));
        Variant(appleWatch, "AW9-45-SLV", 21999m, 17, ("color", "Gümüş"), ("material", "Alüminyum"), ("warranty", "2 Yıl"));

        var galaxyWatch = Add("Galaxy Watch 6", "Uyku analizi, vücut kompozisyonu ölçümü ve ince tasarım.",
            "Saat", "Samsung", "watch-smart.jpg");
        Variant(galaxyWatch, "GW6-40-WHT", 12999m, 31, ("color", "Beyaz"), ("material", "Alüminyum"), ("warranty", "2 Yıl"));

        var classicWatch = Add("Klasik Deri Kordon Saat", "Sade kadran, hakiki deri kordon ve 5 ATM suya dayanıklılık.",
            "Saat", "Fossil", "watch-analog.jpg");
        Variant(classicWatch, "FSL-CLS-BRN", 6499m, 22, ("color", "Kahverengi"), ("material", "Deri"), ("warranty", "2 Yıl"));
        Variant(classicWatch, "FSL-CLS-BLK", 6499m, 19, ("color", "Siyah"), ("material", "Deri"), ("warranty", "2 Yıl"));

        // ---------------- Erkek Giyim ----------------

        var driFit = Add("Dri-FIT Spor Tişört", "Nemi hızla uzaklaştıran nefes alabilen kumaş, antrenman için ideal.",
            "Erkek Giyim", "Nike", "tshirt-white.jpg");
        foreach (var (color, code) in new[] { ("Siyah", "BLK"), ("Beyaz", "WHT") })
        {
            foreach (var size in new[] { "M", "L", "XL" })
                Variant(driFit, $"NIKE-DRIFIT-{code}-{size}", 899m, 50, ("color", color), ("size", size), ("fabric", "Polyester"));
        }

        var graphicTee = Add("Grafik Baskılı Tişört", "%100 pamuk, geniş kalıp ve solmayan baskı.",
            "Erkek Giyim", "Zara", "tshirt-print.jpg");
        foreach (var size in new[] { "S", "M", "L", "XL" })
            Variant(graphicTee, $"ZR-GTEE-BEJ-{size}", 649m, 35, ("color", "Bej"), ("size", size), ("fabric", "Pamuk"));

        var sweatshirt = Add("Basic Sweatshirt", "Şardonlu iç yüzey, yumuşak dokusuyla günlük kullanıma uygun.",
            "Erkek Giyim", "Zara", "sweatshirt.jpg");
        foreach (var size in new[] { "M", "L", "XL" })
            Variant(sweatshirt, $"ZR-SWT-WHT-{size}", 1199m, 28, ("color", "Beyaz"), ("size", size), ("fabric", "Pamuk"));

        var cap = Add("Snapback Şapka", "Ayarlanabilir arka kapama ve düz siperlik.",
            "Erkek Giyim", "Puma", "cap.jpg");
        Variant(cap, "PUM-CAP-GRY", 799m, 44, ("color", "Gri"), ("size", "L"), ("fabric", "Pamuk"));

        // ---------------- Kadın Giyim ----------------

        var womenSweater = Add("Oversize Örgü Kazak", "Yumuşak örgü dokusu ve düşük omuz kesimi.",
            "Kadın Giyim", "Zara", "sweater-women.jpg");
        foreach (var size in new[] { "S", "M", "L" })
            Variant(womenSweater, $"ZR-KZK-KRM-{size}", 1499m, 26, ("color", "Krem"), ("size", size), ("fabric", "Yün"));

        var jacket = Add("Renkli Kapitone Ceket", "Su itici dış yüzey ve hafif dolgu.",
            "Kadın Giyim", "Zara", "jacket-colorful.jpg");
        foreach (var (color, code) in new[] { ("Mor", "PRP"), ("Turuncu", "ORG") })
            Variant(jacket, $"ZR-CKT-{code}-M", 2799m, 14, ("color", color), ("size", "M"), ("fabric", "Polyester"));

        var shirtSet = Add("Basic Gömlek", "Keten karışımlı kumaş, rahat kesim ve doğal doku.",
            "Kadın Giyim", "Zara", "shirts-rack.jpg");
        foreach (var size in new[] { "S", "M", "L" })
            Variant(shirtSet, $"ZR-GML-YSL-{size}", 1099m, 30, ("color", "Yeşil"), ("size", size), ("fabric", "Keten"));

        // ---------------- Ayakkabı & Koşu ----------------

        var airMax = Add("Air Max 1 Sneaker", "İkonik hava yastığı, günlük kullanım için hafif taban.",
            "Ayakkabı", "Nike", "sneaker-airmax.jpg", "sneaker-tan.jpg");
        foreach (var size in new[] { "40", "41", "42", "43", "44" })
            Variant(airMax, $"NIKE-AM1-WHT-{size}", 5499m, 18, ("color", "Beyaz"), ("shoe_size", size));

        var ultraboost = Add("Ultraboost 23", "Boost ara taban ve Primeknit üst yapı ile yüksek geri dönüş.",
            "Koşu", "Adidas", "sneaker-colorful.jpg");
        foreach (var size in new[] { "40", "41", "42", "43", "44" })
            Variant(ultraboost, $"ADS-UB23-MLT-{size}", 4299m, 20, ("color", "Çok Renkli"), ("shoe_size", size));

        var pegasus = Add("Air Zoom Pegasus 40", "Zoom Air yastıklama ile günlük koşu ayakkabısı.",
            "Koşu", "Nike", "sneaker-red.jpg");
        foreach (var size in new[] { "41", "42", "43" })
            Variant(pegasus, $"NIKE-PEG40-RED-{size}", 4799m, 15, ("color", "Kırmızı"), ("shoe_size", size));

        var pastelSneaker = Add("Air Force 1 Shadow", "Katmanlı üst yapı ve pastel renk geçişleri.",
            "Ayakkabı", "Nike", "sneaker-pastel.jpg");
        foreach (var size in new[] { "37", "38", "39", "40" })
            Variant(pastelSneaker, $"NIKE-AF1S-PST-{size}", 5299m, 12, ("color", "Pastel"), ("shoe_size", size));

        var courtSneaker = Add("Court Beyaz Sneaker", "Sade tasarım, dayanıklı taban ve rahat iç astar.",
            "Ayakkabı", "Puma", "sneaker-white.jpg");
        foreach (var size in new[] { "40", "41", "42", "43" })
            Variant(courtSneaker, $"PUM-CRT-WHT-{size}", 2999m, 25, ("color", "Beyaz"), ("shoe_size", size));

        // ---------------- Çanta & Gözlük ----------------

        var shoulderBag = Add("Kapitone Omuz Çantası", "Zincir askı, hakiki deri gövde ve iç bölmeli tasarım.",
            "Çanta", "Zara", "bag-leather.jpg");
        Variant(shoulderBag, "ZR-BAG-BLK", 4499m, 13, ("color", "Siyah"), ("material", "Deri"), ("dimension", "24x16x7 cm"));

        var handBag = Add("Deri El Çantası", "Sert form, mıknatıslı kapak ve çıkarılabilir askı.",
            "Çanta", "Zara", "bag-teal.jpg");
        Variant(handBag, "ZR-BAG-TRK", 3899m, 9, ("color", "Turkuaz"), ("material", "Deri"), ("dimension", "26x18x9 cm"));

        var backpack = Add("Şehir Sırt Çantası", "15\" dizüstü bölmesi, su itici kumaş ve ergonomik sırtlık.",
            "Çanta", "Samsonite", "backpack.jpg");
        Variant(backpack, "SAM-BP-NVY", 2699m, 34, ("color", "Lacivert"), ("material", "Polyester"), ("dimension", "45x30x15 cm"));

        var roundGlasses = Add("Round Metal Güneş Gözlüğü", "İnce metal çerçeve ve %100 UV korumalı camlar.",
            "Gözlük", "Ray-Ban", "sunglasses-round.jpg");
        Variant(roundGlasses, "RB-RND-GLD", 5299m, 20, ("color", "Altın"), ("material", "Metal"));

        var wayfarer = Add("Wayfarer Güneş Gözlüğü", "Klasik asetat çerçeve, polarize cam seçeneği.",
            "Gözlük", "Ray-Ban", "sunglasses-wayfarer.jpg");
        Variant(wayfarer, "RB-WFR-BLK", 5799m, 17, ("color", "Siyah"), ("material", "Asetat"));

        // ---------------- Kahve & Mutfak ----------------

        var coffeeMachine = Add("Tassimo Kapsüllü Kahve Makinesi", "Tek tuşla espresso, latte ve çay. Otomatik temizleme programı.",
            "Kahve Makineleri", "Bosch", "coffee-machine.jpg", "coffee-cup.jpg");
        Variant(coffeeMachine, "BSH-TSM-BLK", 2499m, 35, ("color", "Siyah"), ("material", "Plastik"), ("warranty", "2 Yıl"));
        Variant(coffeeMachine, "BSH-TSM-WHT", 2499m, 20, ("color", "Beyaz"), ("material", "Plastik"), ("warranty", "2 Yıl"));

        var pourOver = Add("Filtre Kahve Demleme Seti", "Cam sürahi, paslanmaz çelik filtre ve ahşap tutacak.",
            "Kahve Makineleri", "Bosch", "coffee-pourover.jpg");
        Variant(pourOver, "BSH-POV-SET", 1299m, 27, ("color", "Şeffaf"), ("material", "Cam"), ("warranty", "1 Yıl"));

        var coffeeBeans = Add("Öğütülmüş Filtre Kahve 1 kg", "Orta kavrulmuş Arabica çekirdek, dengeli ve yumuşak içim.",
            "Mutfak", "Lavazza", "coffee-bag.jpg", "coffee-beans.jpg");
        Variant(coffeeBeans, "LVZ-FLT-1KG", 749m, 80, ("material", "Arabica"), ("dimension", "1 kg"));

        var mug = Add("Emaye Kupa 350 ml", "Kamp ve ofis için dayanıklı emaye kupa.",
            "Mutfak", "Decathlon", "mug.jpg");
        Variant(mug, "DEC-MUG-NVY", 249m, 90, ("color", "Lacivert"), ("material", "Emaye"), ("dimension", "350 ml"));

        var fridge = Add("Retro Buzdolabı 320 L", "A++ enerji sınıfı, No-Frost teknolojisi ve retro tasarım.",
            "Mutfak", "Bosch", "fridge.jpg", "kitchen.jpg");
        Variant(fridge, "BSH-RTR-MNT", 34999m, 6, ("color", "Mint"), ("material", "Metal"), ("dimension", "170x60x65 cm"), ("warranty", "3 Yıl"));

        // ---------------- Mobilya & Dekorasyon ----------------

        var sofa = Add("Kadife 3'lü Koltuk", "Kayın ağacı iskelet, yüksek yoğunluklu sünger ve kadife döşeme.",
            "Mobilya", "Vitra", "sofa-green.jpg", "sofa-grey.jpg");
        Variant(sofa, "VTR-SOF-GRN", 24999m, 4, ("color", "Yeşil"), ("material", "Kadife"), ("dimension", "210x85x80 cm"));
        Variant(sofa, "VTR-SOF-GRY", 24999m, 3, ("color", "Gri"), ("material", "Keten"), ("dimension", "210x85x80 cm"));

        var armchair = Add("Skandinav Berjer Koltuk", "Ahşap ayaklar ve ergonomik sırt desteği.",
            "Mobilya", "IKEA", "armchair.jpg");
        Variant(armchair, "IKEA-BRJ-SAR", 8999m, 11, ("color", "Sarı"), ("material", "Kumaş"), ("dimension", "70x75x85 cm"));

        var lamp = Add("TERTIAL Masa Lambası", "Ayarlanabilir kol ve yönlendirilebilir başlık.",
            "Dekorasyon", "IKEA", "lamp.jpg");
        Variant(lamp, "IKEA-TRT-BLK", 449m, 60, ("color", "Siyah"), ("material", "Metal"), ("dimension", "Yükseklik 50 cm"));

        var bedding = Add("Pamuklu Nevresim Takımı", "Çift kişilik, %100 pamuk ranforce kumaş.",
            "Dekorasyon", "IKEA", "bedding.jpg");
        Variant(bedding, "IKEA-NVR-KRM", 1899m, 23, ("color", "Krem"), ("material", "Pamuk"), ("dimension", "200x220 cm"));

        var blanket = Add("Örgü Koltuk Şalı", "Yumuşak akrilik örgü, saçaklı kenar detayı.",
            "Dekorasyon", "IKEA", "throw-blanket.jpg");
        Variant(blanket, "IKEA-SAL-BEY", 899m, 37, ("color", "Beyaz"), ("material", "Akrilik"), ("dimension", "130x170 cm"));

        // ---------------- Spor & Outdoor ----------------

        var yogaMat = Add("Fundamental Yoga Matı", "5 mm kalınlık, kaymaz yüzey ve taşıma askısı.",
            "Fitness", "Nike", "yoga-mat.jpg", "yoga-pose.jpg");
        foreach (var (color, code) in new[] { ("Mor", "PRP"), ("Siyah", "BLK"), ("Mavi", "BLU") })
            Variant(yogaMat, $"NIKE-YOGA-{code}", 599m, 40, ("color", color), ("weight", "1.2"), ("dimension", "183x61 cm"));

        var dumbbells = Add("Ayarlanabilir Dambıl Seti 20 kg", "Vidalı kilit sistemi ve kauçuk kaplı plakalar.",
            "Fitness", "Decathlon", "dumbbells.jpg");
        Variant(dumbbells, "DEC-DMB-20", 2299m, 16, ("color", "Siyah"), ("weight", "20"), ("dimension", "2x10 kg"));

        var tent = Add("4 Kişilik Kamp Çadırı", "İki dakikada kurulum, su geçirmez dış tente.",
            "Outdoor & Kamp", "Decathlon", "tent.jpg");
        Variant(tent, "DEC-TNT-4P", 5499m, 8, ("color", "Turuncu"), ("material", "Polyester"), ("dimension", "240x210x130 cm"));

        var bottle = Add("Termos Matara 750 ml", "Çift cidarlı çelik gövde, 12 saat sıcak tutma.",
            "Outdoor & Kamp", "Decathlon", "bottle.jpg");
        Variant(bottle, "DEC-BTL-GRN", 549m, 65, ("color", "Yeşil"), ("material", "Paslanmaz Çelik"), ("dimension", "750 ml"));

        // ---------------- Kitap ----------------

        var poetryBook = Add("Süt ve Bal - Şiir Seçkisi", "Modern şiirin sevilen seçkisi, ciltli özel baskı.",
            "Kitap", "Can Yayınları", "book-poetry.jpg");
        Variant(poetryBook, "KTP-SUT-BAL", 289m, 70, ("dimension", "13x19 cm"));

        var startupBooks = Add("Girişimcilik Kitap Seti (3 Kitap)", "Sıfırdan Bire, Yalın Startup ve Engel Yoldur bir arada.",
            "Kitap", "Can Yayınları", "book-startup.jpg");
        Variant(startupBooks, "KTP-GRS-SET", 749m, 42, ("dimension", "13x19 cm"));

        // ---------------- Kozmetik ----------------

        var chanel = Add("N°5 Eau de Parfum 100 ml", "Aldehitli çiçeksi kompozisyon, klasik ve kalıcı imza koku.",
            "Parfüm", "Chanel", "perfume-chanel.jpg");
        Variant(chanel, "CHN-N5-100", 8999m, 18, ("volume", "100 ml"));
        Variant(chanel, "CHN-N5-50", 5999m, 25, ("volume", "50 ml"));

        var floralPerfume = Add("Çiçeksi Eau de Toilette 75 ml", "Gül ve şakayık notaları, hafif ve gündüz kullanımına uygun.",
            "Parfüm", "Chanel", "perfume-pink.jpg");
        Variant(floralPerfume, "CHN-FLR-75", 4299m, 29, ("volume", "75 ml"));

        var skincare = Add("Nemlendirici Cilt Bakım Seti", "Temizleyici, serum ve nemlendiriciden oluşan üçlü günlük rutin.",
            "Cilt Bakımı", "Chanel", "skincare.jpg");
        Variant(skincare, "CLT-BKM-SET", 1899m, 31, ("volume", "3x50 ml"));

        return (products, variants, images);
    }

    /// <summary>Vitrinin dolu görünmesi için birkaç örnek yorum.</summary>
    private static List<ProductReview> SeedReviews(List<Product> products)
    {
        var samples = new (int Rating, string Title, string Comment, string UserName)[]
        {
            (5, "Beklediğimden iyi", "Kargo hızlıydı, ürün açıklamadaki gibi. Kesinlikle tavsiye ederim.", "Selim Y."),
            (4, "Fiyatına göre başarılı", "Küçük eksikleri var ama bu fiyata gayet iyi bir seçim.", "Ayşe K."),
            (5, "Çok memnun kaldım", "İkinci kez alıyorum, kalitesi ilk günkü gibi.", "Mert A."),
            (4, "Tavsiye ederim", "Günlük kullanımda hiç sorun yaşamadım.", "Zeynep D."),
            (3, "İdare eder", "Fena değil ama biraz daha iyisini bekliyordum.", "Burak T."),
        };

        var reviews = new List<ProductReview>();
        var index = 0;

        // Her ürüne sırayla farklı yorumlar dağıtılır; puan ortalamaları çeşitlensin diye
        // ürünlerin bir kısmı yorumsuz bırakılır.
        foreach (var product in products)
        {
            if (index % 3 == 2) { index++; continue; }

            var count = index % 2 == 0 ? 2 : 1;

            for (var i = 0; i < count; i++)
            {
                var sample = samples[(index + i) % samples.Length];

                reviews.Add(new ProductReview
                {
                    ProductId = product.Id,
                    UserId = $"seed-user-{(index + i) % 5 + 1}",
                    UserName = sample.UserName,
                    Rating = sample.Rating,
                    Title = sample.Title,
                    Comment = sample.Comment,
                    IsApproved = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-(index + i + 1))
                });
            }

            index++;
        }

        return reviews;
    }

    /// <summary>SEO adresi için başlığı sadeleştirir.</summary>
    private static string Slugify(string value)
    {
        var replacements = new Dictionary<char, char>
        {
            ['ı'] = 'i', ['İ'] = 'i', ['ğ'] = 'g', ['Ğ'] = 'g',
            ['ü'] = 'u', ['Ü'] = 'u', ['ş'] = 's', ['Ş'] = 's',
            ['ö'] = 'o', ['Ö'] = 'o', ['ç'] = 'c', ['Ç'] = 'c'
        };

        var builder = new System.Text.StringBuilder();

        foreach (var c in value.Trim().ToLowerInvariant())
        {
            var mapped = replacements.TryGetValue(c, out var r) ? r : c;

            if (char.IsLetterOrDigit(mapped)) builder.Append(mapped);
            else if (mapped is ' ' or '-' or '_') builder.Append('-');
        }

        return builder.ToString().Trim('-');
    }
}
