using API.Services;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly AlertRuleEvaluator _alertRuleEvaluator;

    public DashboardController(AppDbContext context, AlertRuleEvaluator alertRuleEvaluator)
    {
        _context = context;
        _alertRuleEvaluator = alertRuleEvaluator;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<object>> GetSummary(CancellationToken cancellationToken)
    {
        await _alertRuleEvaluator.SyncLowStockAlertsAsync(cancellationToken);

        var today = DateTime.UtcNow.Date;
        var last30Days = today.AddDays(-30);

        var totalProducts = await _context.Products.CountAsync(cancellationToken);

        var inventorySnapshot = await _context.Products
            .AsNoTracking()
            .Select(x => new
            {
                x.Id,
                StockOnHand = x.InventoryItem != null ? x.InventoryItem.StockOnHand : 0,
                StockReserved = x.InventoryItem != null ? x.InventoryItem.StockReserved : 0,
                ReorderThreshold = x.InventoryItem != null ? x.InventoryItem.ReorderThreshold : 0
            })
            .ToListAsync(cancellationToken);

        var lowStockCount = inventorySnapshot.Count(x =>
        {
            var availableStock = x.StockOnHand - x.StockReserved;
            return availableStock > 0 && availableStock <= x.ReorderThreshold;
        });

        var outOfStockCount = inventorySnapshot.Count(x =>
        {
            var availableStock = x.StockOnHand - x.StockReserved;
            return availableStock <= 0;
        });

        var stockAttentionCount = inventorySnapshot.Count(x =>
        {
            var availableStock = x.StockOnHand - x.StockReserved;
            return availableStock <= x.ReorderThreshold;
        });

        var todayOrdersQuery = _context.Orders
            .AsNoTracking()
            .Where(x => x.CreatedAtUtc >= today);

        var todayOrdersCount = await todayOrdersQuery.CountAsync(cancellationToken);
        var todayRevenue = await todayOrdersQuery.SumAsync(x => (decimal?)x.TotalAmount, cancellationToken) ?? 0m;

        var topSellingProducts = await _context.OrderItems
            .AsNoTracking()
            .Where(x => x.Order.CreatedAtUtc >= last30Days)
            .GroupBy(x => new
            {
                x.ProductId,
                Sku = x.Product.Sku,
                Name = x.Product.Name
            })
            .Select(g => new
            {
                productId = g.Key.ProductId,
                sku = g.Key.Sku,
                name = g.Key.Name,
                unitsSold = g.Sum(x => x.Quantity),
                ordersCount = g.Select(x => x.OrderId).Distinct().Count(),
                revenue = g.Sum(x => x.LineTotal)
            })
            .OrderByDescending(x => x.unitsSold)
            .ThenByDescending(x => x.revenue)
            .Take(5)
            .ToListAsync(cancellationToken);

        var recentOrders = await _context.Orders
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(5)
            .Select(x => new
            {
                id = x.Id,
                orderNumber = x.OrderNumber,
                totalAmount = x.TotalAmount,
                status = x.Status,
                paymentStatus = x.PaymentStatus,
                market = x.Market,
                customerCountry = x.CustomerCountry,
                createdAtUtc = x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            totalProducts,
            lowStockCount,
            outOfStockCount,
            todayOrdersCount,
            todayRevenue,
            stockAttentionCount,
            topSellingProducts,
            recentOrders
        });
    }
}