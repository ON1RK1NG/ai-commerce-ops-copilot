using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace API.Services;

public class AlertRuleEvaluator
{
    private readonly AppDbContext _context;

    public AlertRuleEvaluator(AppDbContext context)
    {
        _context = context;
    }

    public Task<int> EvaluateAsync(CancellationToken cancellationToken = default)
        => SyncLowStockAlertsAsync(cancellationToken);

    public Task<int> EvaluateLowStockAlertsAsync(CancellationToken cancellationToken = default)
        => SyncLowStockAlertsAsync(cancellationToken);

    public async Task<int> SyncLowStockAlertsAsync(CancellationToken cancellationToken = default)
    {
        var products = await _context.Products
            .Include(x => x.InventoryItem)
            .ToListAsync(cancellationToken);

        var changes = 0;

        foreach (var product in products)
        {
            var stockOnHand = product.InventoryItem?.StockOnHand ?? 0;
            var stockReserved = product.InventoryItem?.StockReserved ?? 0;
            var reorderThreshold = product.InventoryItem?.ReorderThreshold ?? 0;

            var availableStock = stockOnHand - stockReserved;
            var isLowStock = availableStock <= reorderThreshold;

            var existingOpenOrAcknowledgedAlert = await _context.Alerts.FirstOrDefaultAsync(
                x => x.ProductId == product.Id &&
                     x.AlertType == "low-stock" &&
                     !x.IsResolved,
                cancellationToken);

            if (isLowStock && existingOpenOrAcknowledgedAlert is null)
            {
                _context.Alerts.Add(new Alert
                {
                    ProductId = product.Id,
                    AlertType = "low-stock",
                    Severity = availableStock <= 0 ? "critical" : "warning",
                    Title = $"Low stock: {product.Name}",
                    Description = $"Available stock is {availableStock}, reorder threshold is {reorderThreshold}.",
                    IsAcknowledged = false,
                    IsResolved = false,
                    CreatedAtUtc = DateTime.UtcNow
                });

                changes++;
                continue;
            }

            if (!isLowStock && existingOpenOrAcknowledgedAlert is not null)
            {
                existingOpenOrAcknowledgedAlert.IsResolved = true;
                existingOpenOrAcknowledgedAlert.ResolvedAtUtc = DateTime.UtcNow;
                changes++;
            }
        }

        if (changes > 0)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        return changes;
    }

    public static string GetStatus(Alert alert)
    {
        if (alert.IsResolved)
            return "resolved";

        if (alert.IsAcknowledged)
            return "acknowledged";

        return "open";
    }
}