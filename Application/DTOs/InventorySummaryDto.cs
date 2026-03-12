namespace Application.DTOs;

public class InventorySummaryDto
{
    public int TotalMatchingProducts { get; set; }
    public int HealthyProductsCount { get; set; }
    public int LowStockCount { get; set; }
    public int TotalStockOnHand { get; set; }
    public int TotalAvailableUnits { get; set; }
    public decimal AveragePrice { get; set; }
    public int LowStockPercentage { get; set; }
    public int CatalogHealthPercentage { get; set; }
    public IReadOnlyList<InventoryCategorySummaryDto> TopCategories { get; set; } = [];
}