using API.Controllers;
using Application.DTOs;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace AiCommerceOpsCopilot.Tests.Controllers;

public class ProductsControllerTests
{
    [Fact]
    public async Task GetAll_AppliesFiltersSortingAndPagination()
    {
        var controller = CreateController();

        var query = new ProductQueryParametersDto
        {
            CategoryId = 1,
            StockStatus = "low",
            SortBy = "price-desc",
            Page = 1,
            PageSize = 1
        };

        var actionResult = await controller.GetAll(query);

        var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
        var response = Assert.IsType<ProductListResponseDto>(okResult.Value);

        Assert.Equal(2, response.TotalCount);
        Assert.Equal(1, response.Page);
        Assert.Equal(1, response.PageSize);
        Assert.Equal(2, response.TotalPages);
        Assert.Single(response.Items);

        var firstItem = response.Items[0];
        Assert.Equal("HEADSET-LOW", firstItem.Sku);
        Assert.Equal("Gaming Headset", firstItem.Name);
    }

    [Fact]
    public async Task GetSummary_ReturnsCorrectCatalogMetrics()
    {
        var controller = CreateController();

        var actionResult = await controller.GetSummary(new ProductQueryParametersDto());

        var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
        var summary = Assert.IsType<InventorySummaryDto>(okResult.Value);

        Assert.Equal(4, summary.TotalMatchingProducts);
        Assert.Equal(2, summary.HealthyProductsCount);
        Assert.Equal(2, summary.LowStockCount);
        Assert.Equal(173, summary.TotalStockOnHand);
        Assert.Equal(145, summary.TotalAvailableUnits);
        Assert.Equal(63.75m, summary.AveragePrice);
        Assert.Equal(50, summary.LowStockPercentage);
        Assert.Equal(50, summary.CatalogHealthPercentage);

        Assert.Equal(2, summary.TopCategories.Count);

        var topCategory = summary.TopCategories[0];
        Assert.Equal("Electronics", topCategory.Name);
        Assert.Equal(3, topCategory.Count);
        Assert.Equal(105, topCategory.AvailableUnits);
    }

    [Fact]
    public async Task GetSummary_AppliesSearchAndHealthyFilter()
    {
        var controller = CreateController();

        var query = new ProductQueryParametersDto
        {
            Search = "shirt",
            StockStatus = "healthy"
        };

        var actionResult = await controller.GetSummary(query);

        var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
        var summary = Assert.IsType<InventorySummaryDto>(okResult.Value);

        Assert.Equal(1, summary.TotalMatchingProducts);
        Assert.Equal(1, summary.HealthyProductsCount);
        Assert.Equal(0, summary.LowStockCount);
        Assert.Equal(50, summary.TotalStockOnHand);
        Assert.Equal(40, summary.TotalAvailableUnits);
        Assert.Equal(30m, summary.AveragePrice);
        Assert.Equal(0, summary.LowStockPercentage);
        Assert.Equal(100, summary.CatalogHealthPercentage);
        Assert.Single(summary.TopCategories);
        Assert.Equal("Apparel", summary.TopCategories[0].Name);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_WhenReservedStockExceedsStockOnHand()
    {
        var controller = CreateController();

        var request = new CreateProductRequest
        {
            Sku = "BAD-001",
            Name = "Invalid Product",
            Description = "Should fail validation",
            Price = 10m,
            CategoryId = 1,
            StockOnHand = 2,
            StockReserved = 3,
            ReorderThreshold = 1
        };

        var actionResult = await controller.Create(request);

        var badRequest = Assert.IsType<BadRequestObjectResult>(actionResult.Result);
        Assert.Equal("Reserved stock cannot be greater than stock on hand.", badRequest.Value);
    }

    private static ProductsController CreateController()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var context = new AppDbContext(options);

        context.Database.EnsureDeleted();
        context.Database.EnsureCreated();

        SeedCatalog(context);

        return new ProductsController(context);
    }

    private static void SeedCatalog(AppDbContext context)
    {
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