using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace API.Services;

public class LowStockAlertService
{
    private const string LowStockAlertType = "low-stock";

    private readonly AppDbContext _context;

    public LowStockAlertService(AppDbContext context)
    {
        _context = context;
    }

    public async Task SyncForProductAsync(int productId, CancellationToken cancellationToken = default)
    {
        if (productId <= 0)
        {
            return;
        }

        var product = await _context.Products
            .Include(x => x.InventoryItem)
            .FirstOrDefaultAsync(x => x.Id == productId, cancellationToken);

        if (product is null)
        {
            return;
        }

        var alertsForProduct = await _context.Alerts
            .Where(x =>
                x.ProductId == productId &&
                x.AlertType == LowStockAlertType)
            .ToListAsync(cancellationToken);

        SyncForLoadedProduct(product, alertsForProduct, DateTime.UtcNow);
    }

    public async Task SyncForProductsAsync(
        IEnumerable<int> productIds,
        CancellationToken cancellationToken = default)
    {
        var distinctProductIds = productIds
            .Where(x => x > 0)
            .Distinct()
            .ToList();

        if (distinctProductIds.Count == 0)
        {
            return;
        }

        var products = await _context.Products
            .Include(x => x.InventoryItem)
            .Where(x => distinctProductIds.Contains(x.Id))
            .ToListAsync(cancellationToken);

        if (products.Count == 0)
        {
            return;
        }

        var existingAlerts = await _context.Alerts
            .Where(x =>
                x.ProductId.HasValue &&
                distinctProductIds.Contains(x.ProductId.Value) &&
                x.AlertType == LowStockAlertType)
            .ToListAsync(cancellationToken);

        var alertsByProductId = existingAlerts
            .Where(x => x.ProductId.HasValue)
            .GroupBy(x => x.ProductId!.Value)
            .ToDictionary(x => x.Key, x => x.ToList());

        var utcNow = DateTime.UtcNow;

        foreach (var product in products)
        {
            var alertsForProduct = alertsByProductId.TryGetValue(product.Id, out var alerts)
                ? alerts
                : new List<Alert>();

            SyncForLoadedProduct(product, alertsForProduct, utcNow);
        }
    }

    private void SyncForLoadedProduct(Product product, List<Alert> alertsForProduct, DateTime utcNow)
    {
        var activeAlerts = alertsForProduct
            .Where(x => !x.IsResolved)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ThenByDescending(x => x.Id)
            .ToList();

        var primaryActiveAlert = activeAlerts.FirstOrDefault();
        var duplicateActiveAlerts = activeAlerts.Skip(1).ToList();

        foreach (var duplicateAlert in duplicateActiveAlerts)
        {
            ResolveAlertInternally(duplicateAlert, utcNow);
        }

        if (product.InventoryItem is null)
        {
            if (primaryActiveAlert is not null)
            {
                ResolveAlertInternally(primaryActiveAlert, utcNow);
            }

            return;
        }

        var stockOnHand = product.InventoryItem.StockOnHand;
        var stockReserved = product.InventoryItem.StockReserved;
        var reorderThreshold = product.InventoryItem.ReorderThreshold;
        var availableStock = stockOnHand - stockReserved;
        var isLowStock = availableStock <= reorderThreshold;

        if (isLowStock)
        {
            if (primaryActiveAlert is not null)
            {
                ApplyLowStockAlertValues(
                    primaryActiveAlert,
                    product.Name,
                    availableStock,
                    reorderThreshold);

                return;
            }

            var latestResolvedAlert = alertsForProduct
                .Where(x => x.IsResolved)
                .OrderByDescending(x => x.ResolvedAtUtc ?? x.CreatedAtUtc)
                .ThenByDescending(x => x.Id)
                .FirstOrDefault();

            if (latestResolvedAlert is not null)
            {
                ReopenAlert(latestResolvedAlert, utcNow);

                ApplyLowStockAlertValues(
                    latestResolvedAlert,
                    product.Name,
                    availableStock,
                    reorderThreshold);

                return;
            }

            var newAlert = new Alert
            {
                ProductId = product.Id,
                AlertType = LowStockAlertType,
                IsAcknowledged = false,
                IsResolved = false,
                CreatedAtUtc = utcNow
            };

            ApplyLowStockAlertValues(
                newAlert,
                product.Name,
                availableStock,
                reorderThreshold);

            _context.Alerts.Add(newAlert);
            return;
        }

        if (primaryActiveAlert is not null)
        {
            ResolveAlertInternally(primaryActiveAlert, utcNow);
        }
    }

    private static void ApplyLowStockAlertValues(
        Alert alert,
        string productName,
        int availableStock,
        int reorderThreshold)
    {
        alert.AlertType = LowStockAlertType;
        alert.Severity = availableStock <= 0 ? "critical" : "warning";
        alert.Title = $"Low stock: {productName}";
        alert.Description = $"Available stock is {availableStock}, reorder threshold is {reorderThreshold}.";
    }

    private static void ReopenAlert(Alert alert, DateTime utcNow)
    {
        alert.IsResolved = false;
        alert.IsAcknowledged = false;
        alert.AcknowledgedAtUtc = null;
        alert.ResolvedAtUtc = null;

        // Treat a reopened low-stock alert as a newly active occurrence
        // so it shows up immediately near the top of the Alerts list.
        alert.CreatedAtUtc = utcNow;
    }

    private static void ResolveAlertInternally(Alert alert, DateTime utcNow)
    {
        alert.IsResolved = true;

        if (!alert.IsAcknowledged)
        {
            alert.IsAcknowledged = true;
            alert.AcknowledgedAtUtc = utcNow;
        }

        alert.ResolvedAtUtc = utcNow;
    }
}