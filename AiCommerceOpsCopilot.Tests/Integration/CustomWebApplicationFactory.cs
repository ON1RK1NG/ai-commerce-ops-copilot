using API;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AiCommerceOpsCopilot.Tests.Integration;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"IntegrationTests_{Guid.NewGuid()}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll(typeof(DbContextOptions<AppDbContext>));
            services.RemoveAll(typeof(AppDbContext));

            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseInMemoryDatabase(_databaseName);
            });

            using var scope = services.BuildServiceProvider().CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            context.Database.EnsureDeleted();
            context.Database.EnsureCreated();

            SeedCatalog(context);
        });
    }

    public HttpClient CreateApiClient()
    {
        return CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
    }

    private static void SeedCatalog(AppDbContext context)
    {
        if (context.Categories.Any())
        {
            return;
        }

        var electronics = new Category
        {
            Id = 1,
            Name = "Electronics"
        };

        var apparel = new Category
        {
            Id = 2,
            Name = "Apparel"
        };

        var products = new List<Product>
        {
            new()
            {
                Id = 1,
                Sku = "MOUSE-001",
                Name = "Wireless Mouse",
                Description = "Compact wireless mouse",
                Price = 25m,
                CategoryId = electronics.Id,
                Category = electronics,
                IsActive = true,
                CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                InventoryItem = new InventoryItem
                {
                    Id = 1,
                    ProductId = 1,
                    StockOnHand = 100,
                    StockReserved = 10,
                    ReorderThreshold = 20,
                    UpdatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            },
            new()
            {
                Id = 2,
                Sku = "KEY-LOW",
                Name = "Mechanical Keyboard",
                Description = "RGB mechanical keyboard",
                Price = 80m,
                CategoryId = electronics.Id,
                Category = electronics,
                IsActive = true,
                CreatedAtUtc = new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc),
                InventoryItem = new InventoryItem
                {
                    Id = 2,
                    ProductId = 2,
                    StockOnHand = 15,
                    StockReserved = 5,
                    ReorderThreshold = 12,
                    UpdatedAtUtc = new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc)
                }
            },
            new()
            {
                Id = 3,
                Sku = "SHIRT-001",
                Name = "Running Shirt",
                Description = "Breathable sports shirt",
                Price = 30m,
                CategoryId = apparel.Id,
                Category = apparel,
                IsActive = true,
                CreatedAtUtc = new DateTime(2026, 1, 3, 0, 0, 0, DateTimeKind.Utc),
                InventoryItem = new InventoryItem
                {
                    Id = 3,
                    ProductId = 3,
                    StockOnHand = 50,
                    StockReserved = 10,
                    ReorderThreshold = 5,
                    UpdatedAtUtc = new DateTime(2026, 1, 3, 0, 0, 0, DateTimeKind.Utc)
                }
            },
            new()
            {
                Id = 4,
                Sku = "HEADSET-LOW",
                Name = "Gaming Headset",
                Description = "Noise-cancelling headset",
                Price = 120m,
                CategoryId = electronics.Id,
                Category = electronics,
                IsActive = true,
                CreatedAtUtc = new DateTime(2026, 1, 4, 0, 0, 0, DateTimeKind.Utc),
                InventoryItem = new InventoryItem
                {
                    Id = 4,
                    ProductId = 4,
                    StockOnHand = 8,
                    StockReserved = 3,
                    ReorderThreshold = 5,
                    UpdatedAtUtc = new DateTime(2026, 1, 4, 0, 0, 0, DateTimeKind.Utc)
                }
            }
        };

        context.Categories.AddRange(electronics, apparel);
        context.Products.AddRange(products);
        context.SaveChanges();
        context.ChangeTracker.Clear();
    }
}