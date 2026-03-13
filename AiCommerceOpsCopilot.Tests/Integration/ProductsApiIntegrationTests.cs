using System.Net;
using System.Net.Http.Json;
using Application.DTOs;
using Xunit;

namespace AiCommerceOpsCopilot.Tests.Integration;

public class ProductsApiIntegrationTests
{
    [Fact]
    public async Task GetProducts_ReturnsPagedFilteredResults()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateApiClient();

        var response = await client.GetAsync("/api/products?categoryId=1&stockStatus=low&sortBy=price-desc&page=1&pageSize=1");

        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<ProductListResponseDto>();

        Assert.NotNull(payload);
        Assert.Equal(2, payload.TotalCount);
        Assert.Equal(1, payload.Page);
        Assert.Equal(1, payload.PageSize);
        Assert.Equal(2, payload.TotalPages);
        Assert.Single(payload.Items);
        Assert.Equal("HEADSET-LOW", payload.Items[0].Sku);
    }

    [Fact]
    public async Task GetSummary_ReturnsExpectedMetrics()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateApiClient();

        var response = await client.GetAsync("/api/products/summary");

        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<InventorySummaryDto>();

        Assert.NotNull(payload);
        Assert.Equal(4, payload.TotalMatchingProducts);
        Assert.Equal(2, payload.HealthyProductsCount);
        Assert.Equal(2, payload.LowStockCount);
        Assert.Equal(173, payload.TotalStockOnHand);
        Assert.Equal(145, payload.TotalAvailableUnits);
        Assert.Equal(63.75m, payload.AveragePrice);
        Assert.Equal(50, payload.LowStockPercentage);
        Assert.Equal(50, payload.CatalogHealthPercentage);
        Assert.Equal(2, payload.TopCategories.Count);
        Assert.Equal("Electronics", payload.TopCategories[0].Name);
    }

    [Fact]
    public async Task CreateProduct_CreatesNewProduct()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateApiClient();

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

        var createResponse = await client.PostAsJsonAsync("/api/products", request);

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var created = await createResponse.Content.ReadFromJsonAsync<ProductDto>();

        Assert.NotNull(created);
        Assert.Equal("WEBCAM-001", created.Sku);
        Assert.Equal("HD Webcam", created.Name);
        Assert.Equal(25, created.StockOnHand);
        Assert.Equal(4, created.StockReserved);

        var getResponse = await client.GetAsync($"/api/products/{created.Id}");
        getResponse.EnsureSuccessStatusCode();

        var fetched = await getResponse.Content.ReadFromJsonAsync<ProductDto>();

        Assert.NotNull(fetched);
        Assert.Equal("WEBCAM-001", fetched.Sku);
        Assert.Equal("HD Webcam", fetched.Name);
        Assert.Equal(55m, fetched.Price);
    }

    [Fact]
    public async Task UpdateProduct_UpdatesExistingProduct()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateApiClient();

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

        var updateResponse = await client.PutAsJsonAsync("/api/products/1", request);

        updateResponse.EnsureSuccessStatusCode();

        var updated = await updateResponse.Content.ReadFromJsonAsync<ProductDto>();

        Assert.NotNull(updated);
        Assert.Equal(1, updated.Id);
        Assert.Equal("MOUSE-001-UPDATED", updated.Sku);
        Assert.Equal("Wireless Mouse Pro", updated.Name);
        Assert.Equal(2, updated.CategoryId);
        Assert.Equal(120, updated.StockOnHand);

        var getResponse = await client.GetAsync("/api/products/1");
        getResponse.EnsureSuccessStatusCode();

        var fetched = await getResponse.Content.ReadFromJsonAsync<ProductDto>();

        Assert.NotNull(fetched);
        Assert.Equal("MOUSE-001-UPDATED", fetched.Sku);
        Assert.Equal("Wireless Mouse Pro", fetched.Name);
        Assert.Equal(35m, fetched.Price);
        Assert.Equal(2, fetched.CategoryId);
    }

    [Fact]
    public async Task DeleteProduct_RemovesExistingProduct()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateApiClient();

        var deleteResponse = await client.DeleteAsync("/api/products/4");

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getResponse = await client.GetAsync("/api/products/4");

        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }
}