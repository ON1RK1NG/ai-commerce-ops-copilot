using API.Controllers;
using API.Services;
using Application.DTOs;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

namespace AiCommerceOpsCopilot.Tests.Controllers;

public class ProductsControllerTests
{
    [Fact]
    public async Task GetAll_AppliesFiltersSortingAndPagination()
    {
        var (controller, _) = CreateControllerWithContext();

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
        var (controller, _) = CreateControllerWithContext();

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
        var (controller, _) = CreateControllerWithContext();

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
        var (controller, _) = CreateControllerWithContext();

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

    [Fact]
    public async Task Create_CreatesProductAndInventoryItem()
    {
        var (controller, context) = CreateControllerWithContext();

        var request = new CreateProductRequest
        {
            Sku = "WEBCAM-001",
            Name = "HD Webcam",
            Description = "1080p webcam for meetings",
            Price = 55m,
            CategoryId = 1,
            StockOnHand = 25,
            StockReserved = 4,
            ReorderThreshold = 6
        };

        var actionResult = await controller.Create(request);

        var createdAt = Assert.IsType<CreatedAtActionResult>(actionResult.Result);
        var createdProduct = Assert.IsType<ProductDto>(createdAt.Value);

        Assert.Equal(nameof(ProductsController.GetById), createdAt.ActionName);
        Assert.Equal("WEBCAM-001", createdProduct.Sku);
        Assert.Equal("HD Webcam", createdProduct.Name);
        Assert.Equal(55m, createdProduct.Price);
        Assert.Equal(25, createdProduct.StockOnHand);
        Assert.Equal(4, createdProduct.StockReserved);
        Assert.Equal(6, createdProduct.ReorderThreshold);

        context.ChangeTracker.Clear();

        var productInDb = await context.Products
            .Include(x => x.InventoryItem)
            .SingleAsync(x => x.Sku == "WEBCAM-001");

        Assert.Equal("HD Webcam", productInDb.Name);
        Assert.Equal(55m, productInDb.Price);
        Assert.NotNull(productInDb.InventoryItem);
        Assert.Equal(25, productInDb.InventoryItem!.StockOnHand);
        Assert.Equal(4, productInDb.InventoryItem.StockReserved);
        Assert.Equal(6, productInDb.InventoryItem.ReorderThreshold);

        Assert.Equal(5, await context.Products.CountAsync());
        Assert.Equal(5, await context.InventoryItems.CountAsync());
    }

    [Fact]
    public async Task Update_UpdatesExistingProductAndInventory()
    {
        var (controller, context) = CreateControllerWithContext();

        var request = new CreateProductRequest
        {
            Sku = "MOUSE-001-UPDATED",
            Name = "Wireless Mouse Pro",
            Description = "Updated mouse description",
            Price = 35m,
            CategoryId = 2,
            StockOnHand = 120,
            StockReserved = 15,
            ReorderThreshold = 25
        };

        var actionResult = await controller.Update(1, request);

        var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
        var updatedProduct = Assert.IsType<ProductDto>(okResult.Value);

        Assert.Equal(1, updatedProduct.Id);
        Assert.Equal("MOUSE-001-UPDATED", updatedProduct.Sku);
        Assert.Equal("Wireless Mouse Pro", updatedProduct.Name);
        Assert.Equal("Updated mouse description", updatedProduct.Description);
        Assert.Equal(35m, updatedProduct.Price);
        Assert.Equal(2, updatedProduct.CategoryId);
        Assert.Equal(120, updatedProduct.StockOnHand);
        Assert.Equal(15, updatedProduct.StockReserved);
        Assert.Equal(25, updatedProduct.ReorderThreshold);

        context.ChangeTracker.Clear();

        var productInDb = await context.Products
            .Include(x => x.InventoryItem)
            .SingleAsync(x => x.Id == 1);

        Assert.Equal("MOUSE-001-UPDATED", productInDb.Sku);
        Assert.Equal("Wireless Mouse Pro", productInDb.Name);
        Assert.Equal("Updated mouse description", productInDb.Description);
        Assert.Equal(35m, productInDb.Price);
        Assert.Equal(2, productInDb.CategoryId);
        Assert.NotNull(productInDb.InventoryItem);
        Assert.Equal(120, productInDb.InventoryItem!.StockOnHand);
        Assert.Equal(15, productInDb.InventoryItem.StockReserved);
        Assert.Equal(25, productInDb.InventoryItem.ReorderThreshold);
    }

    [Fact]
    public async Task Delete_RemovesProductAndInventoryItem()
    {
        var (controller, context) = CreateControllerWithContext();

        var actionResult = await controller.Delete(4);

        Assert.IsType<NoContentResult>(actionResult);

        context.ChangeTracker.Clear();

        var productExists = await context.Products.AnyAsync(x => x.Id == 4);
        var inventoryExists = await context.InventoryItems.AnyAsync(x => x.ProductId == 4);

        Assert.False(productExists);
        Assert.False(inventoryExists);
        Assert.Equal(3, await context.Products.CountAsync());
        Assert.Equal(3, await context.InventoryItems.CountAsync());
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_WhenProductDoesNotExist()
    {
        var (controller, _) = CreateControllerWithContext();

        var actionResult = await controller.GetById(999);

        Assert.IsType<NotFoundResult>(actionResult.Result);
    }

    private static (ProductsController Controller, AppDbContext Context) CreateControllerWithContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        var context = new AppDbContext(options);

        context.Database.EnsureDeleted();
        context.Database.EnsureCreated();

        SeedCatalog(context);

        var lowStockAlertService = new LowStockAlertService(context);
        var controller = new ProductsController(context, lowStockAlertService);

        return (controller, context);
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