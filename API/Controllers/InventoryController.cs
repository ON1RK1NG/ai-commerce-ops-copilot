using Application.DTOs;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly AppDbContext _context;

    private static readonly HashSet<string> AllowedAdjustmentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "add-stock",
        "remove-stock",
        "reserve-stock",
        "release-reserved-stock"
    };

    public InventoryController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<InventoryListResponseDto>> GetInventory([FromQuery] InventoryQueryParametersDto query)
    {
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize <= 0 ? 10 : Math.Min(query.PageSize, 100);

        var inventoryQuery = BuildInventoryQuery(query);

        var totalCount = await inventoryQuery.CountAsync();
        var lowStockCount = await inventoryQuery.CountAsync(x => x.IsLowStock);
        var outOfStockCount = await inventoryQuery.CountAsync(x => x.IsOutOfStock);
        var totalAvailableUnits = await inventoryQuery.SumAsync(x => x.StockAvailable);

        inventoryQuery = ApplySorting(inventoryQuery, query.SortBy);

        var items = await inventoryQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var response = new InventoryListResponseDto
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalCount == 0 ? 1 : (int)Math.Ceiling(totalCount / (double)pageSize),
            LowStockCount = lowStockCount,
            OutOfStockCount = outOfStockCount,
            HealthyCount = Math.Max(totalCount - lowStockCount, 0),
            TotalAvailableUnits = totalAvailableUnits
        };

        return Ok(response);
    }

    [HttpGet("{productId:int}")]
    public async Task<ActionResult<InventoryDetailDto>> GetInventoryByProductId(int productId)
    {
        var product = await _context.Products
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.InventoryItem)
            .FirstOrDefaultAsync(x => x.Id == productId);

        if (product is null)
        {
            return NotFound();
        }

        var stockOnHand = product.InventoryItem?.StockOnHand ?? 0;
        var stockReserved = product.InventoryItem?.StockReserved ?? 0;
        var reorderThreshold = product.InventoryItem?.ReorderThreshold ?? 0;
        var stockAvailable = stockOnHand - stockReserved;
        var isLowStock = stockAvailable <= reorderThreshold;
        var isOutOfStock = stockAvailable <= 0;

        var recentMovements = await BuildMovementQuery(productId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(10)
            .ToListAsync();

        var detail = new InventoryDetailDto
        {
            ProductId = product.Id,
            Sku = product.Sku ?? string.Empty,
            ProductName = product.Name ?? string.Empty,
            CategoryName = product.Category?.Name ?? string.Empty,
            StockOnHand = stockOnHand,
            StockReserved = stockReserved,
            StockAvailable = stockAvailable,
            ReorderThreshold = reorderThreshold,
            IsLowStock = isLowStock,
            IsOutOfStock = isOutOfStock,
            RecommendedRestockUnits = CalculateRecommendedRestockUnits(stockAvailable, reorderThreshold),
            UpdatedAtUtc = product.InventoryItem?.UpdatedAtUtc ?? product.CreatedAtUtc,
            RecentMovements = recentMovements
        };

        return Ok(detail);
    }

    [HttpGet("movements")]
    public async Task<ActionResult<List<InventoryMovementDto>>> GetMovements([FromQuery] int? productId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize <= 0 ? 20 : Math.Min(pageSize, 100);

        var movementQuery = BuildMovementQuery(productId)
            .OrderByDescending(x => x.CreatedAtUtc);

        var items = await movementQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("adjust")]
    public async Task<ActionResult<InventoryDetailDto>> AdjustInventory([FromBody] InventoryAdjustmentRequest request)
    {
        if (request.ProductId <= 0)
        {
            return BadRequest("A valid productId is required.");
        }

        if (!AllowedAdjustmentTypes.Contains(request.AdjustmentType))
        {
            return BadRequest("Adjustment type must be one of: add-stock, remove-stock, reserve-stock, release-reserved-stock.");
        }

        if (request.Quantity <= 0)
        {
            return BadRequest("Quantity must be greater than zero.");
        }

        var product = await _context.Products
            .Include(x => x.Category)
            .Include(x => x.InventoryItem)
            .FirstOrDefaultAsync(x => x.Id == request.ProductId);

        if (product is null)
        {
            return NotFound();
        }

        if (product.InventoryItem is null)
        {
            product.InventoryItem = new InventoryItem
            {
                ProductId = product.Id,
                StockOnHand = 0,
                StockReserved = 0,
                ReorderThreshold = 0,
                UpdatedAtUtc = DateTime.UtcNow
            };

            _context.InventoryItems.Add(product.InventoryItem);
        }

        var inventoryItem = product.InventoryItem;
        var movementType = request.AdjustmentType.Trim().ToLowerInvariant();

        switch (movementType)
        {
            case "add-stock":
                inventoryItem.StockOnHand += request.Quantity;
                break;

            case "remove-stock":
                if (inventoryItem.StockOnHand - request.Quantity < inventoryItem.StockReserved)
                {
                    return BadRequest("Cannot remove stock below reserved quantity.");
                }

                inventoryItem.StockOnHand -= request.Quantity;
                break;

            case "reserve-stock":
                if (inventoryItem.StockReserved + request.Quantity > inventoryItem.StockOnHand)
                {
                    return BadRequest("Reserved stock cannot exceed stock on hand.");
                }

                inventoryItem.StockReserved += request.Quantity;
                break;

            case "release-reserved-stock":
                if (inventoryItem.StockReserved - request.Quantity < 0)
                {
                    return BadRequest("Cannot release more reserved stock than currently reserved.");
                }

                inventoryItem.StockReserved -= request.Quantity;
                break;
        }

        inventoryItem.UpdatedAtUtc = DateTime.UtcNow;
        product.UpdatedAtUtc = DateTime.UtcNow;

        var movement = new InventoryMovement
        {
            ProductId = product.Id,
            MovementType = movementType,
            Quantity = request.Quantity,
            Reason = request.Reason?.Trim() ?? string.Empty,
            StockOnHandAfter = inventoryItem.StockOnHand,
            StockReservedAfter = inventoryItem.StockReserved,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.InventoryMovements.Add(movement);
        await _context.SaveChangesAsync();

        var stockAvailable = inventoryItem.StockOnHand - inventoryItem.StockReserved;
        var detail = new InventoryDetailDto
        {
            ProductId = product.Id,
            Sku = product.Sku ?? string.Empty,
            ProductName = product.Name ?? string.Empty,
            CategoryName = product.Category?.Name ?? string.Empty,
            StockOnHand = inventoryItem.StockOnHand,
            StockReserved = inventoryItem.StockReserved,
            StockAvailable = stockAvailable,
            ReorderThreshold = inventoryItem.ReorderThreshold,
            IsLowStock = stockAvailable <= inventoryItem.ReorderThreshold,
            IsOutOfStock = stockAvailable <= 0,
            RecommendedRestockUnits = CalculateRecommendedRestockUnits(stockAvailable, inventoryItem.ReorderThreshold),
            UpdatedAtUtc = inventoryItem.UpdatedAtUtc,
            RecentMovements = await BuildMovementQuery(product.Id)
                .OrderByDescending(x => x.CreatedAtUtc)
                .Take(10)
                .ToListAsync()
        };

        return Ok(detail);
    }

    private IQueryable<InventoryListItemDto> BuildInventoryQuery(InventoryQueryParametersDto query)
    {
        var inventoryQuery = _context.Products
            .AsNoTracking()
            .Select(x => new InventoryListItemDto
            {
                ProductId = x.Id,
                Sku = x.Sku ?? string.Empty,
                ProductName = x.Name ?? string.Empty,
                CategoryName = x.Category != null ? x.Category.Name ?? string.Empty : string.Empty,
                StockOnHand = x.InventoryItem != null ? x.InventoryItem.StockOnHand : 0,
                StockReserved = x.InventoryItem != null ? x.InventoryItem.StockReserved : 0,
                StockAvailable = (x.InventoryItem != null ? x.InventoryItem.StockOnHand : 0) - (x.InventoryItem != null ? x.InventoryItem.StockReserved : 0),
                ReorderThreshold = x.InventoryItem != null ? x.InventoryItem.ReorderThreshold : 0,
                IsLowStock = ((x.InventoryItem != null ? x.InventoryItem.StockOnHand : 0) - (x.InventoryItem != null ? x.InventoryItem.StockReserved : 0)) <= (x.InventoryItem != null ? x.InventoryItem.ReorderThreshold : 0),
                IsOutOfStock = ((x.InventoryItem != null ? x.InventoryItem.StockOnHand : 0) - (x.InventoryItem != null ? x.InventoryItem.StockReserved : 0)) <= 0,
                RecommendedRestockUnits = ((x.InventoryItem != null ? x.InventoryItem.StockOnHand : 0) - (x.InventoryItem != null ? x.InventoryItem.StockReserved : 0)) <= (x.InventoryItem != null ? x.InventoryItem.ReorderThreshold : 0)
                    ? Math.Max(((x.InventoryItem != null ? x.InventoryItem.ReorderThreshold : 0) * 2) - ((x.InventoryItem != null ? x.InventoryItem.StockOnHand : 0) - (x.InventoryItem != null ? x.InventoryItem.StockReserved : 0)), 1)
                    : 0,
                UpdatedAtUtc = x.InventoryItem != null ? x.InventoryItem.UpdatedAtUtc : x.CreatedAtUtc
            });

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            inventoryQuery = inventoryQuery.Where(x =>
                x.Sku.ToLower().Contains(search) ||
                x.ProductName.ToLower().Contains(search) ||
                x.CategoryName.ToLower().Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(query.StockStatus))
        {
            var stockStatus = query.StockStatus.Trim().ToLower();

            inventoryQuery = stockStatus switch
            {
                "low" => inventoryQuery.Where(x => x.IsLowStock && !x.IsOutOfStock),
                "out" => inventoryQuery.Where(x => x.IsOutOfStock),
                "healthy" => inventoryQuery.Where(x => !x.IsLowStock),
                _ => inventoryQuery
            };
        }

        return inventoryQuery;
    }

    private IQueryable<InventoryListItemDto> ApplySorting(IQueryable<InventoryListItemDto> query, string? sortBy)
    {
        var normalizedSort = sortBy?.Trim().ToLowerInvariant();

        return normalizedSort switch
        {
            "updated-asc" => query.OrderBy(x => x.UpdatedAtUtc),
            "name-asc" => query.OrderBy(x => x.ProductName),
            "name-desc" => query.OrderByDescending(x => x.ProductName),
            "available-asc" => query.OrderBy(x => x.StockAvailable),
            "available-desc" => query.OrderByDescending(x => x.StockAvailable),
            "reserved-desc" => query.OrderByDescending(x => x.StockReserved),
            _ => query.OrderByDescending(x => x.UpdatedAtUtc)
        };
    }

    private IQueryable<InventoryMovementDto> BuildMovementQuery(int? productId)
    {
        var movementQuery = _context.InventoryMovements
            .AsNoTracking()
            .Select(x => new InventoryMovementDto
            {
                Id = x.Id,
                ProductId = x.ProductId,
                Sku = x.Product.Sku ?? string.Empty,
                ProductName = x.Product.Name ?? string.Empty,
                MovementType = x.MovementType,
                Quantity = x.Quantity,
                Reason = x.Reason,
                StockOnHandAfter = x.StockOnHandAfter,
                StockReservedAfter = x.StockReservedAfter,
                StockAvailableAfter = x.StockOnHandAfter - x.StockReservedAfter,
                CreatedAtUtc = x.CreatedAtUtc
            });

        if (productId.HasValue && productId.Value > 0)
        {
            movementQuery = movementQuery.Where(x => x.ProductId == productId.Value);
        }

        return movementQuery;
    }

    private static int CalculateRecommendedRestockUnits(int available, int threshold)
    {
        if (available > threshold)
        {
            return 0;
        }

        return Math.Max((threshold * 2) - available, 1);
    }
}
