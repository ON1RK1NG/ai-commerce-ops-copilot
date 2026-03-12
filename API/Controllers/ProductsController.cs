using System.Linq.Expressions;
using Application.DTOs;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _context;

    private static readonly Expression<Func<Product, ProductDto>> ProductProjection = x => new ProductDto
    {
        Id = x.Id,
        Sku = x.Sku,
        Name = x.Name,
        Description = x.Description,
        Price = x.Price,
        IsActive = x.IsActive,
        CategoryId = x.CategoryId,
        CategoryName = x.Category != null ? x.Category.Name : string.Empty,
        StockOnHand = x.InventoryItem != null ? x.InventoryItem.StockOnHand : 0,
        StockReserved = x.InventoryItem != null ? x.InventoryItem.StockReserved : 0,
        ReorderThreshold = x.InventoryItem != null ? x.InventoryItem.ReorderThreshold : 0,
        CreatedAtUtc = x.CreatedAtUtc
    };

    public ProductsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetAll()
    {
        var products = await _context.Products
            .AsNoTracking()
            .OrderBy(x => x.Id)
            .Select(ProductProjection)
            .ToListAsync();

        return Ok(products);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductDto>> GetById(int id)
    {
        var product = await _context.Products
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(ProductProjection)
            .FirstOrDefaultAsync();

        if (product is null)
            return NotFound();

        return Ok(product);
    }

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create([FromBody] CreateProductRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Sku))
            return BadRequest("SKU is required.");

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");

        if (request.CategoryId <= 0)
            return BadRequest("A valid category is required.");

        var normalizedSku = request.Sku.Trim();
        var normalizedName = request.Name.Trim();
        var normalizedDescription = request.Description?.Trim() ?? string.Empty;

        var categoryExists = await _context.Categories.AnyAsync(x => x.Id == request.CategoryId);
        if (!categoryExists)
            return BadRequest("Invalid category.");

        var skuExists = await _context.Products.AnyAsync(x => x.Sku == normalizedSku);
        if (skuExists)
            return BadRequest("SKU already exists.");

        var product = new Product
        {
            Sku = normalizedSku,
            Name = normalizedName,
            Description = normalizedDescription,
            Price = request.Price,
            CategoryId = request.CategoryId,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        var inventoryItem = new InventoryItem
        {
            ProductId = product.Id,
            StockOnHand = request.StockOnHand,
            StockReserved = request.StockReserved,
            ReorderThreshold = request.ReorderThreshold,
            UpdatedAtUtc = DateTime.UtcNow
        };

        _context.InventoryItems.Add(inventoryItem);
        await _context.SaveChangesAsync();

        var createdProduct = await _context.Products
            .AsNoTracking()
            .Where(x => x.Id == product.Id)
            .Select(ProductProjection)
            .FirstAsync();

        return CreatedAtAction(nameof(GetById), new { id = createdProduct.Id }, createdProduct);
    }
}