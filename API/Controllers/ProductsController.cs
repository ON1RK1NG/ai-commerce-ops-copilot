using Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProductsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var products = await _context.Products
            .Include(x => x.Category)
            .Include(x => x.InventoryItem)
            .OrderBy(x => x.Id)
            .Select(x => new
            {
                x.Id,
                x.Sku,
                x.Name,
                x.Description,
                x.Price,
                x.IsActive,
                Category = x.Category.Name,
                StockOnHand = x.InventoryItem != null ? x.InventoryItem.StockOnHand : 0,
                StockReserved = x.InventoryItem != null ? x.InventoryItem.StockReserved : 0,
                ReorderThreshold = x.InventoryItem != null ? x.InventoryItem.ReorderThreshold : 0,
                x.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(products);
    }
}