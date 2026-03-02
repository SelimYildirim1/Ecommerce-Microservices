using System.Text.Json;
using Catalog.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Data;

/// <summary>
/// Catalog veritabanına başlangıç verilerini ekler.
/// Kategoriler, markalar, özellikler, ürünler ve varyantlar seed edilir.
/// </summary>
public static class CatalogDbSeeder
{
    public static async Task SeedAsync(CatalogDbContext context, ILogger logger, bool force = false, CancellationToken ct = default)
    {
        if (force)
        {
            // Sıralama önemli (FK bağımlılıkları)
            context.ProductImages.RemoveRange(await context.ProductImages.ToListAsync(ct));
            context.ProductVariants.RemoveRange(await context.ProductVariants.ToListAsync(ct));
            context.Products.RemoveRange(await context.Products.ToListAsync(ct));
            context.CategoryAttributes.RemoveRange(await context.CategoryAttributes.ToListAsync(ct));
            context.Categories.RemoveRange(await context.Categories.ToListAsync(ct));
            context.ProductAttributes.RemoveRange(await context.ProductAttributes.ToListAsync(ct));
            context.Brands.RemoveRange(await context.Brands.ToListAsync(ct));
            await context.SaveChangesAsync(ct);
            logger.LogInformation("CatalogDbSeeder: Mevcut veriler silindi, seed ekleniyor.");
        }
        else if (await context.Products.AnyAsync(ct))
        {
            logger.LogInformation("Products tablosu zaten dolu, seed atlanıyor.");
            return;
        }

        // 1. Markalar
        var brands = SeedBrands();
        await context.Brands.AddRangeAsync(brands, ct);

        // 2. Özellikler
        var attributes = SeedAttributes();
        await context.ProductAttributes.AddRangeAsync(attributes, ct);

        // 3. Kategoriler
        var categories = SeedCategories();
        await context.Categories.AddRangeAsync(categories, ct);
        await context.SaveChangesAsync(ct); // FK'lar için önce kaydet

        // 4. Kategori-Özellik ilişkileri
        var catAttrs = SeedCategoryAttributes(categories, attributes);
        await context.CategoryAttributes.AddRangeAsync(catAttrs, ct);

        // 5. Ürünler, Varyantlar ve Görseller
        var (products, variants, images) = SeedProducts(categories, brands);
        await context.Products.AddRangeAsync(products, ct);
        await context.SaveChangesAsync(ct); // FK'lar için önce kaydet

        await context.ProductVariants.AddRangeAsync(variants, ct);
        await context.ProductImages.AddRangeAsync(images, ct);
        await context.SaveChangesAsync(ct);

        logger.LogInformation("CatalogDbSeeder: {ProductCount} ürün, {VariantCount} varyant eklendi.",
            products.Count, variants.Count);
    }

    private static List<Brand> SeedBrands()
    {
        return new List<Brand>
        {
            new() { Name = "Apple", LogoUrl = "https://loremflickr.com/100/100/apple,logo" },
            new() { Name = "Samsung", LogoUrl = "https://loremflickr.com/100/100/samsung,logo" },
            new() { Name = "Nike", LogoUrl = "https://loremflickr.com/100/100/nike,logo" },
            new() { Name = "Adidas", LogoUrl = "https://loremflickr.com/100/100/adidas,logo" },
            new() { Name = "Sony", LogoUrl = "https://loremflickr.com/100/100/sony,logo" },
            new() { Name = "Zara", LogoUrl = "https://loremflickr.com/100/100/zara,logo" },
            new() { Name = "IKEA", LogoUrl = "https://loremflickr.com/100/100/ikea,logo" },
            new() { Name = "Bosch", LogoUrl = "https://loremflickr.com/100/100/bosch,logo" },
        };
    }

    private static List<ProductAttribute> SeedAttributes()
    {
        return new List<ProductAttribute>
        {
            // Giyim
            new() { Name = "Renk", Code = "color", DataType = "Color", IsRequired = true, IsVariant = true },
            new() { Name = "Beden", Code = "size", DataType = "Select", Options = "XS,S,M,L,XL,XXL", IsRequired = true, IsVariant = true },
            new() { Name = "Kumaş", Code = "fabric", DataType = "Select", Options = "Pamuk,Polyester,Keten,Yün,Denim", IsRequired = false, IsVariant = false },

            // Elektronik
            new() { Name = "RAM", Code = "ram", DataType = "Select", Options = "4GB,8GB,16GB,32GB,64GB", IsRequired = true, IsVariant = true },
            new() { Name = "Depolama", Code = "storage", DataType = "Select", Options = "128GB,256GB,512GB,1TB,2TB", IsRequired = true, IsVariant = true },
            new() { Name = "İşlemci", Code = "cpu", DataType = "Text", IsRequired = true, IsVariant = false },
            new() { Name = "Ekran Boyutu", Code = "screen_size", DataType = "Text", IsRequired = false, IsVariant = false },
            new() { Name = "Ekran Kartı", Code = "gpu", DataType = "Text", IsRequired = false, IsVariant = false },

            // Ev & Yaşam
            new() { Name = "Malzeme", Code = "material", DataType = "Text", IsRequired = false, IsVariant = false },
            new() { Name = "Boyut", Code = "dimension", DataType = "Text", IsRequired = false, IsVariant = false },
            new() { Name = "Ağırlık", Code = "weight", DataType = "Number", IsRequired = false, IsVariant = false },

            // Genel
            new() { Name = "Garanti Süresi", Code = "warranty", DataType = "Select", Options = "6 Ay,1 Yıl,2 Yıl,3 Yıl", IsRequired = false, IsVariant = false },
        };
    }

    private static List<Category> SeedCategories()
    {
        // Kök kategoriler
        var elektronik = new Category { Name = "Elektronik" };
        var giyim = new Category { Name = "Giyim & Aksesuar" };
        var evYasam = new Category { Name = "Ev & Yaşam" };
        var spor = new Category { Name = "Spor & Outdoor" };

        // Alt kategoriler
        var bilgisayar = new Category { Name = "Bilgisayar", ParentId = elektronik.Id };
        var telefon = new Category { Name = "Telefon", ParentId = elektronik.Id };
        var kulaklik = new Category { Name = "Kulaklık & Ses", ParentId = elektronik.Id };

        var erkekGiyim = new Category { Name = "Erkek Giyim", ParentId = giyim.Id };
        var kadinGiyim = new Category { Name = "Kadın Giyim", ParentId = giyim.Id };
        var ayakkabi = new Category { Name = "Ayakkabı", ParentId = giyim.Id };

        var mutfak = new Category { Name = "Mutfak", ParentId = evYasam.Id };
        var dekorasyon = new Category { Name = "Dekorasyon", ParentId = evYasam.Id };

        var fitness = new Category { Name = "Fitness", ParentId = spor.Id };

        return new List<Category>
        {
            elektronik, giyim, evYasam, spor,
            bilgisayar, telefon, kulaklik,
            erkekGiyim, kadinGiyim, ayakkabi,
            mutfak, dekorasyon,
            fitness
        };
    }

    private static List<CategoryAttribute> SeedCategoryAttributes(List<Category> categories, List<ProductAttribute> attributes)
    {
        var attrByCode = attributes.ToDictionary(a => a.Code);
        var catByName = categories.ToDictionary(c => c.Name);

        var result = new List<CategoryAttribute>();

        // filterableCodes: sol menüde filtre olarak görünecek özellik kodları
        void Map(string categoryName, string[] codes, string[]? filterableCodes = null)
        {
            var filterSet = new HashSet<string>(filterableCodes ?? Array.Empty<string>());
            int order = 0;
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

        // Elektronik alt kategorileri
        Map("Bilgisayar",
            new[] { "ram", "storage", "cpu", "screen_size", "gpu", "warranty" },
            new[] { "ram", "storage", "cpu", "gpu" });
        Map("Telefon",
            new[] { "ram", "storage", "cpu", "screen_size", "color", "warranty" },
            new[] { "ram", "storage", "color" });
        Map("Kulaklık & Ses",
            new[] { "color", "warranty" },
            new[] { "color" });

        // Giyim alt kategorileri
        Map("Erkek Giyim",
            new[] { "color", "size", "fabric" },
            new[] { "color", "size", "fabric" });
        Map("Kadın Giyim",
            new[] { "color", "size", "fabric" },
            new[] { "color", "size", "fabric" });
        Map("Ayakkabı",
            new[] { "color", "size" },
            new[] { "color", "size" });

        // Ev & Yaşam
        Map("Mutfak",
            new[] { "material", "dimension", "color", "warranty" },
            new[] { "material", "color" });
        Map("Dekorasyon",
            new[] { "material", "dimension", "color" },
            new[] { "material", "color" });

        // Spor
        Map("Fitness",
            new[] { "color", "weight", "dimension" },
            new[] { "color" });

        return result;
    }

    private static (List<Product>, List<ProductVariant>, List<ProductImage>) SeedProducts(
        List<Category> categories, List<Brand> brands)
    {
        var catByName = categories.ToDictionary(c => c.Name);
        var brandByName = brands.ToDictionary(b => b.Name);

        var products = new List<Product>();
        var variants = new List<ProductVariant>();
        var images = new List<ProductImage>();

        // --- 1. MacBook Pro (Bilgisayar - Apple) ---
        var macbook = new Product
        {
            Name = "MacBook Pro 16\"",
            Description = "Apple M3 Pro çipli profesyonel dizüstü bilgisayar",
            CategoryId = catByName["Bilgisayar"].Id,
            BrandId = brandByName["Apple"].Id
        };
        products.Add(macbook);
        images.Add(new ProductImage { ProductId = macbook.Id, Url = "https://loremflickr.com/400/400/macbook,laptop", IsPrimary = true, SortOrder = 0 });

        variants.Add(new ProductVariant
        {
            ProductId = macbook.Id, Sku = "MBP-16-M3-16-512",
            Price = 74999.00m, StockQuantity = 15,
            Specifics = JsonDocument.Parse(@"{""ram"":""16GB"",""storage"":""512GB"",""cpu"":""M3 Pro"",""screen_size"":""16 inç"",""gpu"":""Entegre 18 çekirdek"",""warranty"":""2 Yıl""}")
        });
        variants.Add(new ProductVariant
        {
            ProductId = macbook.Id, Sku = "MBP-16-M3-32-1TB",
            Price = 94999.00m, StockQuantity = 8,
            Specifics = JsonDocument.Parse(@"{""ram"":""32GB"",""storage"":""1TB"",""cpu"":""M3 Max"",""screen_size"":""16 inç"",""gpu"":""Entegre 40 çekirdek"",""warranty"":""2 Yıl""}")
        });

        // --- 2. Galaxy S24 Ultra (Telefon - Samsung) ---
        var galaxy = new Product
        {
            Name = "Galaxy S24 Ultra",
            Description = "Samsung'un amiral gemisi akıllı telefon, S Pen dahil",
            CategoryId = catByName["Telefon"].Id,
            BrandId = brandByName["Samsung"].Id
        };
        products.Add(galaxy);
        images.Add(new ProductImage { ProductId = galaxy.Id, Url = "https://loremflickr.com/400/400/samsung,phone", IsPrimary = true, SortOrder = 0 });

        variants.Add(new ProductVariant
        {
            ProductId = galaxy.Id, Sku = "S24U-BLK-256",
            Price = 49999.00m, StockQuantity = 25,
            Specifics = JsonDocument.Parse(@"{""ram"":""12GB"",""storage"":""256GB"",""cpu"":""Snapdragon 8 Gen 3"",""screen_size"":""6.8 inç"",""color"":""Siyah"",""warranty"":""2 Yıl""}")
        });
        variants.Add(new ProductVariant
        {
            ProductId = galaxy.Id, Sku = "S24U-GRY-512",
            Price = 57999.00m, StockQuantity = 12,
            Specifics = JsonDocument.Parse(@"{""ram"":""12GB"",""storage"":""512GB"",""cpu"":""Snapdragon 8 Gen 3"",""screen_size"":""6.8 inç"",""color"":""Gri"",""warranty"":""2 Yıl""}")
        });

        // --- 3. Kablosuz Kulaklık (Kulaklık - Sony) ---
        var headphone = new Product
        {
            Name = "WH-1000XM5",
            Description = "Sony gürültü önleyici kablosuz kulaklık",
            CategoryId = catByName["Kulaklık & Ses"].Id,
            BrandId = brandByName["Sony"].Id
        };
        products.Add(headphone);
        images.Add(new ProductImage { ProductId = headphone.Id, Url = "https://loremflickr.com/400/400/headphone,sony", IsPrimary = true, SortOrder = 0 });

        variants.Add(new ProductVariant
        {
            ProductId = headphone.Id, Sku = "WH1000XM5-BLK",
            Price = 8999.00m, StockQuantity = 40,
            Specifics = JsonDocument.Parse(@"{""color"":""Siyah"",""warranty"":""1 Yıl""}")
        });
        variants.Add(new ProductVariant
        {
            ProductId = headphone.Id, Sku = "WH1000XM5-SLV",
            Price = 8999.00m, StockQuantity = 30,
            Specifics = JsonDocument.Parse(@"{""color"":""Gümüş"",""warranty"":""1 Yıl""}")
        });

        // --- 4. Erkek Tişört (Erkek Giyim - Nike) ---
        var tshirt = new Product
        {
            Name = "Dri-FIT Tişört",
            Description = "Nike nefes alan spor tişört",
            CategoryId = catByName["Erkek Giyim"].Id,
            BrandId = brandByName["Nike"].Id
        };
        products.Add(tshirt);
        images.Add(new ProductImage { ProductId = tshirt.Id, Url = "https://loremflickr.com/400/400/nike,tshirt", IsPrimary = true, SortOrder = 0 });

        // Renk + Beden varyantları
        foreach (var color in new[] { ("Siyah", "BLK"), ("Beyaz", "WHT") })
        {
            foreach (var size in new[] { "M", "L", "XL" })
            {
                variants.Add(new ProductVariant
                {
                    ProductId = tshirt.Id,
                    Sku = $"NIKE-DRIFIT-{color.Item2}-{size}",
                    Price = 899.00m, StockQuantity = 50,
                    Specifics = JsonDocument.Parse($@"{{""color"":""{color.Item1}"",""size"":""{size}"",""fabric"":""Polyester""}}")
                });
            }
        }

        // --- 5. Spor Ayakkabı (Ayakkabı - Adidas) ---
        var sneaker = new Product
        {
            Name = "Ultraboost 23",
            Description = "Adidas koşu ayakkabısı, Boost teknolojisi",
            CategoryId = catByName["Ayakkabı"].Id,
            BrandId = brandByName["Adidas"].Id
        };
        products.Add(sneaker);
        images.Add(new ProductImage { ProductId = sneaker.Id, Url = "https://loremflickr.com/400/400/adidas,sneaker", IsPrimary = true, SortOrder = 0 });

        foreach (var size in new[] { "40", "41", "42", "43", "44" })
        {
            variants.Add(new ProductVariant
            {
                ProductId = sneaker.Id,
                Sku = $"ADIDAS-UB23-BLK-{size}",
                Price = 4299.00m, StockQuantity = 20,
                Specifics = JsonDocument.Parse($@"{{""color"":""Siyah"",""size"":""{size}""}}")
            });
        }

        // --- 6. Kahve Makinesi (Mutfak - Bosch) ---
        var coffee = new Product
        {
            Name = "Tassimo Kahve Makinesi",
            Description = "Bosch kapsüllü kahve makinesi, tek tuşla hazırlama",
            CategoryId = catByName["Mutfak"].Id,
            BrandId = brandByName["Bosch"].Id
        };
        products.Add(coffee);
        images.Add(new ProductImage { ProductId = coffee.Id, Url = "https://loremflickr.com/400/400/coffee,machine", IsPrimary = true, SortOrder = 0 });

        variants.Add(new ProductVariant
        {
            ProductId = coffee.Id, Sku = "BOSCH-TASSIMO-BLK",
            Price = 2499.00m, StockQuantity = 35,
            Specifics = JsonDocument.Parse(@"{""color"":""Siyah"",""material"":""Plastik"",""dimension"":""25x30x40 cm"",""warranty"":""2 Yıl""}")
        });
        variants.Add(new ProductVariant
        {
            ProductId = coffee.Id, Sku = "BOSCH-TASSIMO-WHT",
            Price = 2499.00m, StockQuantity = 20,
            Specifics = JsonDocument.Parse(@"{""color"":""Beyaz"",""material"":""Plastik"",""dimension"":""25x30x40 cm"",""warranty"":""2 Yıl""}")
        });

        // --- 7. Masa Lambası (Dekorasyon - IKEA) ---
        var lamp = new Product
        {
            Name = "TERTIAL Masa Lambası",
            Description = "IKEA ayarlanabilir masa lambası",
            CategoryId = catByName["Dekorasyon"].Id,
            BrandId = brandByName["IKEA"].Id
        };
        products.Add(lamp);
        images.Add(new ProductImage { ProductId = lamp.Id, Url = "https://loremflickr.com/400/400/lamp,desk", IsPrimary = true, SortOrder = 0 });

        variants.Add(new ProductVariant
        {
            ProductId = lamp.Id, Sku = "IKEA-TERTIAL-BLK",
            Price = 449.00m, StockQuantity = 60,
            Specifics = JsonDocument.Parse(@"{""color"":""Siyah"",""material"":""Metal"",""dimension"":""Yükseklik 50 cm""}")
        });

        // --- 8. Yoga Matı (Fitness - Nike) ---
        var yogaMat = new Product
        {
            Name = "Fundamental Yoga Matı",
            Description = "Nike 5mm kaymaz yoga matı",
            CategoryId = catByName["Fitness"].Id,
            BrandId = brandByName["Nike"].Id
        };
        products.Add(yogaMat);
        images.Add(new ProductImage { ProductId = yogaMat.Id, Url = "https://loremflickr.com/400/400/yoga,mat", IsPrimary = true, SortOrder = 0 });

        foreach (var color in new[] { ("Mor", "PRP"), ("Siyah", "BLK"), ("Mavi", "BLU") })
        {
            variants.Add(new ProductVariant
            {
                ProductId = yogaMat.Id,
                Sku = $"NIKE-YOGA-{color.Item2}",
                Price = 599.00m, StockQuantity = 40,
                Specifics = JsonDocument.Parse($@"{{""color"":""{color.Item1}"",""weight"":""1.2"",""dimension"":""183x61 cm""}}")
            });
        }

        return (products, variants, images);
    }
}
